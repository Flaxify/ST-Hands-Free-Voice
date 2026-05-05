import { eventSource, event_types, sendMessageAsUser } from '../../../../script.js';

const MODULE_NAME = "HandsFreeVoice";

const PROVIDERS = {
    openrouter: {
        label: "OpenRouter",
        endpoint: "https://openrouter.ai/api/v1",
        defaultModel: "openai/whisper-large-v3-turbo",
        format: "json_base64"
    },
    groq: {
        label: "Groq",
        endpoint: "https://api.groq.com/openai/v1",
        defaultModel: "whisper-large-v3-turbo",
        format: "multipart"
    },
    local: {
        label: "Local / Custom",
        endpoint: "",
        defaultModel: "whisper-1",
        format: "multipart"
    }
};

const defaultSettings = Object.freeze({
    enabled: false,
    provider: "openrouter",
    api_key: "",
    model: "openai/whisper-large-v3-turbo",
    custom_endpoint: "",
    delay: 5
});

let settings = {};
let mediaStream = null;
let audioContext = null;
let recorder = null;
let silenceTimer = null;
let isListening = false;

// ─────────────────────────────────────────────────────────────
// TTS playback-end detection via ST's #tts_audio element
// ─────────────────────────────────────────────────────────────
let ttsEndTimer = null;

/**
 * Wait for ST's <audio id="tts_audio"> element to appear in the DOM,
 * then attach ended/play listeners so we know when speech truly stops.
 * ST appends this element to document.body during its TTS init.
 */
function hookAudioElement() {
    const audio = document.getElementById('tts_audio');
    if (!audio) {
        setTimeout(hookAudioElement, 500);
        return;
    }

    // A new audio segment started — cancel any pending "all done" timer
    audio.addEventListener('play', () => {
        if (ttsEndTimer) {
            clearTimeout(ttsEndTimer);
            ttsEndTimer = null;
        }
    });

    // An audio segment ended — start debounce timer.
    // If no new segment starts within 500 ms, TTS is truly done.
    audio.addEventListener('ended', () => {
        if (ttsEndTimer) clearTimeout(ttsEndTimer);
        ttsEndTimer = setTimeout(() => {
            ttsEndTimer = null;
            if (settings.enabled && !isListening) {
                console.log("🎤 TTS playback fully ended – starting hands-free listening");
                onTTSPlaybackEnded();
            }
        }, 500);
    });

    console.log("🔊 Hands-Free Voice: hooked into #tts_audio element");
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function getEffectiveEndpoint() {
    const provider = PROVIDERS[settings.provider];
    if (!provider) return settings.custom_endpoint || '';
    return settings.provider === 'local'
        ? (settings.custom_endpoint || '').replace(/\/$/, '')
        : provider.endpoint;
}

// ─────────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────────
console.log("🚀 Hands-Free Voice v2.6 loaded");

jQuery(() => {
    eventSource.on(event_types.APP_READY, () => {
        console.log("✅ Hands-Free Voice: APP_READY → initializing");

        const context = SillyTavern.getContext();

        if (!context.extensionSettings[MODULE_NAME]) {
            context.extensionSettings[MODULE_NAME] = structuredClone(defaultSettings);
        }
        settings = context.extensionSettings[MODULE_NAME];

        // Migrate old "endpoint" field → provider
        if (settings.endpoint !== undefined && settings.provider === undefined) {
            const ep = settings.endpoint || '';
            if (ep.includes('openrouter.ai')) settings.provider = 'openrouter';
            else if (ep.includes('groq.com'))  settings.provider = 'groq';
            else { settings.provider = 'local'; settings.custom_endpoint = ep; }
            delete settings.endpoint;
        }

        Object.keys(defaultSettings).forEach(key => {
            if (settings[key] === undefined) settings[key] = defaultSettings[key];
        });

        addSettingsPanel();
        console.log("✅ Settings panel added");

        hookAudioElement();

        console.log("🎤 Hands-Free Voice v2.6 ready");
    });
});

// ─────────────────────────────────────────────────────────────
// Settings UI
// ─────────────────────────────────────────────────────────────
function addSettingsPanel() {
    const providerOptions = Object.entries(PROVIDERS)
        .map(([key, p]) => `<option value="${key}">${p.label}</option>`)
        .join('');

    const html = `
    <div class="handsfree-settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>Hands-Free Voice</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <label><input type="checkbox" id="hf_enabled"> Enable Hands-Free Mode</label>

                <label>API Provider</label>
                <select id="hf_provider" class="text_pole">
                    ${providerOptions}
                </select>

                <label>API Key</label>
                <input type="password" id="hf_api_key" class="text_pole" placeholder="sk-or-... / gsk_...">

                <label>Whisper Model</label>
                <input type="text" id="hf_model" class="text_pole" placeholder="openai/whisper-large-v3-turbo">

                <div id="hf_custom_endpoint_row" style="display:none">
                    <label>Custom Endpoint URL</label>
                    <input type="text" id="hf_custom_endpoint" class="text_pole" placeholder="http://localhost:8080/v1">
                </div>

                <label>Silence timeout (seconds)</label>
                <input type="number" id="hf_delay" class="text_pole" value="5" min="1" max="30">
                <small>If you don't speak within this time, the character will continue automatically.</small>
            </div>
        </div>
    </div>`;

    $('#extensions_settings2').append(html);
    bindSettingsUI();
}

function bindSettingsUI() {
    const context = SillyTavern.getContext();

    $('#hf_enabled').prop('checked', settings.enabled).on('change', function () {
        settings.enabled = this.checked;
        context.saveSettingsDebounced();
    });

    $('#hf_provider').val(settings.provider).on('change', function () {
        settings.provider = this.value;
        const provider = PROVIDERS[settings.provider];
        if (provider) {
            // Auto-fill default model when provider changes
            settings.model = provider.defaultModel;
            $('#hf_model').val(settings.model);
        }
        updateCustomEndpointVisibility();
        context.saveSettingsDebounced();
    });

    $('#hf_api_key').val(settings.api_key).on('input', function () {
        settings.api_key = this.value.trim();
        context.saveSettingsDebounced();
    });

    $('#hf_model').val(settings.model).on('input', function () {
        settings.model = this.value.trim();
        context.saveSettingsDebounced();
    });

    $('#hf_custom_endpoint').val(settings.custom_endpoint).on('input', function () {
        settings.custom_endpoint = this.value.trim();
        context.saveSettingsDebounced();
    });

    $('#hf_delay').val(settings.delay).on('input', function () {
        settings.delay = parseFloat(this.value) || 5;
        context.saveSettingsDebounced();
    });

    updateCustomEndpointVisibility();
}

function updateCustomEndpointVisibility() {
    const isLocal = settings.provider === 'local';
    $('#hf_custom_endpoint_row').toggle(isLocal);
}

// ─────────────────────────────────────────────────────────────
// Core logic (TTS playback done → listen → transcribe → send)
// ─────────────────────────────────────────────────────────────
async function onTTSPlaybackEnded() {
    await startVoiceDetection();

    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
        if (!isListening) return;
        console.log("⏰ No speech detected – auto-continuing");
        autoContinue();
        stopListening();
    }, settings.delay * 1000);
}

async function startVoiceDetection() {
    if (isListening) return;
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(mediaStream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        isListening = true;
        let speechDetected = false;

        const checkLevel = () => {
            if (!isListening) return;
            analyser.getByteFrequencyData(dataArray);
            const volume = dataArray.reduce((a, b) => a + b) / dataArray.length;
            if (volume > 25 && !speechDetected) {
                speechDetected = true;
                console.log("🗣️ Speech detected – recording");
                clearTimeout(silenceTimer);
                startRecording();
            }
            requestAnimationFrame(checkLevel);
        };
        checkLevel();
    } catch (err) {
        console.error("❌ Mic access failed:", err);
    }
}

async function startRecording() {
    if (!mediaStream) return;
    recorder = new MediaRecorder(mediaStream);
    const chunks = [];

    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        await transcribeAndSend(blob);
    };

    recorder.start();
    setTimeout(() => {
        if (recorder && recorder.state === "recording") recorder.stop();
    }, 8000);
}

function stopListening() {
    isListening = false;
    if (recorder && recorder.state === "recording") recorder.stop();
    if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
    audioContext = null;
    recorder = null;
}

async function transcribeAndSend(audioBlob) {
    if (!settings.api_key) {
        console.error("❌ No API key set in Hands-Free Voice settings");
        stopListening();
        return;
    }

    const endpoint = getEffectiveEndpoint();
    if (!endpoint) {
        console.error("❌ No endpoint configured. Set a custom endpoint URL in settings.");
        stopListening();
        return;
    }

    const providerFormat = PROVIDERS[settings.provider]?.format ?? 'multipart';

    console.log(`🎙️ Transcribing via ${settings.provider} (${providerFormat}), blob: ${audioBlob.size} bytes`);

    let res;
    try {
        if (providerFormat === 'json_base64') {
            // ── OpenRouter: JSON body with base64-encoded audio ──────────────
            const arrayBuffer = await audioBlob.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            // btoa with large arrays needs chunked approach to avoid stack overflow
            let binary = '';
            const chunkSize = 8192;
            for (let i = 0; i < bytes.length; i += chunkSize) {
                binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
            }
            const base64 = btoa(binary);

            // Derive format from MIME type
            const mimeType = audioBlob.type || 'audio/webm';
            const format = mimeType.includes('ogg')  ? 'ogg'
                         : mimeType.includes('mp4')  ? 'mp4'
                         : mimeType.includes('wav')  ? 'wav'
                         : 'webm';

            res = await fetch(`${endpoint}/audio/transcriptions`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${settings.api_key}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    input_audio: { data: base64, format },
                    model: settings.model
                })
            });
        } else {
            // ── Groq / Local / OpenAI-compatible: multipart FormData ─────────
            const formData = new FormData();
            formData.append("file", audioBlob, "recording.webm");
            formData.append("model", settings.model);

            res = await fetch(`${endpoint}/audio/transcriptions`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${settings.api_key}` },
                body: formData
            });
        }

        if (!res.ok) {
            const errorBody = await res.text();
            console.error(`❌ Whisper API error ${res.status}:`, errorBody);
            stopListening();
            return;
        }

        const data = await res.json();
        const transcribed = (data.text || data.transcript || '').trim();
        if (transcribed) {
            console.log("📝 Whisper transcribed:", transcribed);
            await sendMessageAsUser(transcribed);
        } else {
            console.log("🔇 No speech recognized in audio");
        }
    } catch (err) {
        console.error("❌ Whisper API error:", err);
    }

    stopListening();
}

async function autoContinue() {
    const context = SillyTavern.getContext();
    await context.generate('continue');
}
