import { eventSource, event_types } from '../../../../script.js';

const MODULE_NAME = "HandsFreeVoice";
const SECRET_KEY_NAME = "api_key_handsfree_voice";

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

console.log("🚀 Hands-Free Voice v2.2 loaded (secure API key like TTS)");

jQuery(() => {
    eventSource.on(event_types.APP_READY, async () => {
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
        console.log("✅ Settings panel with green 🔑 button added");

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
                    <input type="password" id="hf_api_key_display" class="text_pole" readonly placeholder="Click the green 🔑 button →">
                    <button class="menu_button fa-solid fa-key" onclick="openHandsFreeKeyEditor()" title="Store API Key securely"></button>
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

// Global function called by the green key button
window.openHandsFreeKeyEditor = function () {
    openKeyManagerDialog(SECRET_KEY_NAME);   // ← This is the correct function
};

// Get the active secure API key (works with the new secret system)
async function getSecureApiKey() {
    const context = SillyTavern.getContext();
    await context.readSecretState();                 // refresh latest secrets
    const secrets = context.secret_state || {};     // secret_state is populated by readSecretState
    const keyData = secrets[SECRET_KEY_NAME];
    if (!keyData || keyData.length === 0) return '';
    const activeSecret = keyData.find(s => s.active) || keyData[0];
    return activeSecret ? activeSecret.value : '';
}

// ─────────────────────────────────────────────────────────────
// TTS → Listen → Whisper → Send / Auto-continue
// ─────────────────────────────────────────────────────────────
async function onTTSComplete() {
    if (!settings.enabled) return;
    console.log("🎤 TTS complete – starting hands-free listening");
    await startVoiceDetection();

    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
        if (!isListening) return;
        console.log("⏰ No speech – auto-continuing");
        autoContinue();
        stopListening();
    }, settings.delay * 1000);
}

async function startVoiceDetection() { /* unchanged – same as v2.1 */ }
async function startRecording() { /* unchanged */ }
function stopListening() { /* unchanged */ }

async function transcribeAndSend(audioBlob) {
    const apiKey = await getSecureApiKey();
    if (!apiKey) {
        console.error("❌ No API key set – click the green 🔑 button");
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

// Keep the remaining functions (startVoiceDetection, startRecording, stopListening) exactly as in v2.1
// (copy them from the previous full version I gave you)

console.log("Hands-Free Voice v2.2 (secure API key) ready");