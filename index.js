const MODULE_NAME = "HandsFreeVoice";

// Default settings
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

async function onActivate() {
    console.log("✅ Hands-Free Voice activated (v2)");

    const { extensionSettings, saveSettingsDebounced, eventSource, event_types, renderExtensionTemplateAsync } = SillyTavern.getContext();

    // Load / init settings
    if (!extensionSettings[MODULE_NAME]) {
        extensionSettings[MODULE_NAME] = structuredClone(defaultSettings);
    }
    settings = extensionSettings[MODULE_NAME];

    Object.keys(defaultSettings).forEach(key => {
        if (settings[key] === undefined) settings[key] = defaultSettings[key];
    });

    // === THIS WAS THE BROKEN LINE ===
    const html = await renderExtensionTemplateAsync(
        "ST-Hands-Free-Voice",   // ← MUST match your exact folder name
        "settings",
        {}
    );
    $('#extensions_settings2').append(html);

    bindSettingsUI();

    // Listen to TTS finish
    eventSource.on(event_types.TTS_JOB_COMPLETE, onTTSComplete);

    console.log("🎤 Hands-Free Voice ready – waiting for TTS");
}

function onDisable() {
    console.log("Hands-Free Voice disabled");
    stopListening();
}

function bindSettingsUI() {
    $('#hf_enabled').prop('checked', settings.enabled).on('change', function () {
        settings.enabled = this.checked;
        saveSettingsDebounced();
    });

    $('#hf_endpoint').val(settings.endpoint).on('change', function () {
        settings.endpoint = this.value.trim();
        saveSettingsDebounced();
    });

    $('#hf_api_key').val(settings.api_key).on('change', function () {
        settings.api_key = this.value.trim();
        saveSettingsDebounced();
    });

    $('#hf_model').val(settings.model).on('change', function () {
        settings.model = this.value.trim();
        saveSettingsDebounced();
    });

    $('#hf_delay').val(settings.delay).on('change', function () {
        settings.delay = parseFloat(this.value);
        saveSettingsDebounced();
    });
}

// TTS finished → start listening window
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

// ... (the rest of the file stays exactly the same as I gave you last time: startVoiceDetection, startRecording, stopListening, transcribeAndSend, autoContinue)

async function startVoiceDetection() { /* unchanged from previous version */ }
async function startRecording() { /* unchanged */ }
function stopListening() { /* unchanged */ }
async function transcribeAndSend(audioBlob) { /* unchanged */ }
async function autoContinue() { /* unchanged */ }

console.log("Hands-Free Voice module loaded");