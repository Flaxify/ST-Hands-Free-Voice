import { eventSource, event_types } from '../../../../script.js';

const MODULE_NAME = "HandsFreeVoice";

const defaultSettings = Object.freeze({
    enabled: false,
    endpoint: "https://openrouter.ai/v1",
    api_key: "",
    model: "openai/whisper-large-v3-turbo",
    delay: 5
});

let settings = {};
let mediaStream = null;
let audioContext = null;
let recorder = null;
let silenceTimer = null;
let isListening = false;

console.log("🚀 Hands-Free Voice v2.3 loaded (simple secure password field)");

jQuery(() => {
    eventSource.on(event_types.APP_READY, () => {
        console.log("✅ Hands-Free Voice: APP_READY → initializing");

        const context = SillyTavern.getContext();

        if (!context.extensionSettings[MODULE_NAME]) {
            context.extensionSettings[MODULE_NAME] = structuredClone(defaultSettings);
        }
        settings = context.extensionSettings[MODULE_NAME];

        Object.keys(defaultSettings).forEach(key => {
            if (settings[key] === undefined) settings[key] = defaultSettings[key];
        });

        addSettingsPanel();
        console.log("✅ Settings panel added");
        eventSource.on(event_types.TTS_JOB_COMPLETE, onTTSComplete);

        console.log("🎤 Hands-Free Voice ready");
    });
});

function addSettingsPanel() {
    const html = `
    <div class="handsfree-settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>Hands-Free Voice</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <label><input type="checkbox" id="hf_enabled"> Enable Hands-Free Mode</label>

                <label>Provider Endpoint</label>
                <input type="text" id="hf_endpoint" class="text_pole" value="https://openrouter.ai/v1">

                <label>API Key (OpenRouter)</label>
                <input type="password" id="hf_api_key" class="text_pole" placeholder="sk-or-...">

                <label>Whisper Model</label>
                <input type="text" id="hf_model" class="text_pole" value="openai/whisper-large-v3-turbo">

                <label>Wait time before auto-continue (seconds)</label>
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

    $('#hf_endpoint').val(settings.endpoint).on('input', function () {
        settings.endpoint = this.value.trim();
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

    $('#hf_delay').val(settings.delay).on('input', function () {
        settings.delay = parseFloat(this.value) || 5;
        context.saveSettingsDebounced();
    });
}

// ─────────────────────────────────────────────────────────────
// Core logic (TTS complete → listen → transcribe → send)
// ─────────────────────────────────────────────────────────────
async function onTTSComplete() {
    if (!settings.enabled) return;
    console.log("🎤 TTS complete – starting hands-free listening");
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

    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");
    formData.append("model", settings.model);

    try {
        const res = await fetch(`${settings.endpoint}/audio/transcriptions`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${settings.api_key}` },
            body: formData
        });

        const data = await res.json();
        if (data.text && data.text.trim()) {
            const userText = data.text.trim();
            console.log("📝 Whisper transcribed:", userText);
            const context = SillyTavern.getContext();
            await context.sendUserMessage(userText);
        } else {
            console.log("No speech recognized");
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

console.log("Hands-Free Voice v2.3 ready");