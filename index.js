import { eventSource, event_types } from '../../../../script.js';

const MODULE_NAME = "HandsFreeVoice";

const defaultSettings = Object.freeze({
    enabled: false,
    endpoint: "https://openrouter.ai/v1",
    model: "openai/whisper-large-v3-turbo",
    delay: 5
});

let settings = {};
let mediaStream = null;
let audioContext = null;
let recorder = null;
let silenceTimer = null;
let isListening = false;

const SECRET_KEY_NAME = "api_key_handsfree_voice";   // ← secure storage like TTS

console.log("🚀 Hands-Free Voice v2.1 loaded (secure API key like TTS)");

jQuery(() => {
    eventSource.on(event_types.APP_READY, async () => {
        console.log("✅ Hands-Free Voice: APP_READY → initializing with secure API key");

        const context = SillyTavern.getContext();

        // Load normal settings
        if (!context.extensionSettings[MODULE_NAME]) {
            context.extensionSettings[MODULE_NAME] = structuredClone(defaultSettings);
        }
        settings = context.extensionSettings[MODULE_NAME];

        Object.keys(defaultSettings).forEach(key => {
            if (settings[key] === undefined) settings[key] = defaultSettings[key];
        });

        addSettingsPanel();
        console.log("✅ Settings panel with secure key button added");

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

                <label>API Key <span style="color:#0f0">(secure like TTS)</span></label>
                <div class="flex-container" style="gap: 8px;">
                    <input type="password" id="hf_api_key_display" class="text_pole" readonly placeholder="Click the 🔑 button to set securely">
                    <button class="menu_button fa-solid fa-key" onclick="openHandsFreeApiKeyEditor()" title="Store API Key securely (TTS-style)"></button>
                </div>

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

    $('#hf_model').val(settings.model).on('input', function () {
        settings.model = this.value.trim();
        context.saveSettingsDebounced();
    });

    $('#hf_delay').val(settings.delay).on('input', function () {
        settings.delay = parseFloat(this.value) || 5;
        context.saveSettingsDebounced();
    });
}

// Open the secure secret editor (exactly like TTS plugin)
window.openHandsFreeApiKeyEditor = function () {
    const context = SillyTavern.getContext();
    context.openSecretEditor(SECRET_KEY_NAME, "Hands-Free Voice API Key");
};

// Get the secure API key when needed
async function getSecureApiKey() {
    const context = SillyTavern.getContext();
    const secrets = await context.readSecretState();
    return secrets[SECRET_KEY_NAME] || '';
}

// ─────────────────────────────────────────────────────────────
// The rest of the logic (unchanged except API key source)
// ─────────────────────────────────────────────────────────────
async function onTTSComplete() { /* same as before */ }
async function startVoiceDetection() { /* same as before */ }
async function startRecording() { /* same as before */ }
function stopListening() { /* same as before */ }

async function transcribeAndSend(audioBlob) {
    const apiKey = await getSecureApiKey();
    if (!apiKey) {
        console.error("❌ No API key set (use the green 🔑 button)");
        stopListening();
        return;
    }

    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");
    formData.append("model", settings.model);

    try {
        const res = await fetch(`${settings.endpoint}/audio/transcriptions`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}` },
            body: formData
        });

        const data = await res.json();
        if (data.text && data.text.trim()) {
            const userText = data.text.trim();
            console.log("📝 Whisper transcribed:", userText);
            const context = SillyTavern.getContext();
            await context.sendUserMessage(userText);
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

console.log("Hands-Free Voice v2.1 (secure API key) ready");