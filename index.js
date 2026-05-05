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
    console.log("✅ Hands-Free Voice activated");

    const { extensionSettings, saveSettingsDebounced, eventSource, event_types, renderExtensionTemplateAsync } = SillyTavern.getContext();

    // Load / init settings
    if (!extensionSettings[MODULE_NAME]) {
        extensionSettings[MODULE_NAME] = structuredClone(defaultSettings);
    }
    settings = extensionSettings[MODULE_NAME];

    // Ensure all keys exist
    Object.keys(defaultSettings).forEach(key => {
        if (settings[key] === undefined) settings[key] = defaultSettings[key];
    });

    // Add settings panel
    const html = await renderExtensionTemplateAsync("Hands-Free-Voice", "settings", {});
    $('#extensions_settings2').append(html);
    bindSettingsUI();

    // Listen to TTS completion
    eventSource.on(event_types.TTS_JOB_COMPLETE, onTTSComplete);

    console.log("Hands-Free Voice ready – waiting for TTS to finish");
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

// ─────────────────────────────────────────────────────────────
// TTS finished → start hands-free listening window
// ─────────────────────────────────────────────────────────────
async function onTTSComplete() {
    if (!settings.enabled) return;

    console.log("🎤 TTS complete – starting hands-free listening window");

    // Start listening immediately
    await startVoiceDetection();

    // Start the auto-continue timer
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
        if (!isListening) return;
        console.log("⏰ No speech detected – auto-continuing character message");
        autoContinue();
        stopListening();
    }, settings.delay * 1000);
}

// ─────────────────────────────────────────────────────────────
// Voice detection + recording (simple but reliable VAD)
// ─────────────────────────────────────────────────────────────
async function startVoiceDetection() {
    if (isListening) return;

    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(mediaStream);

        // Simple volume-based VAD
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        isListening = true;
        let speechDetected = false;

        const checkAudioLevel = () => {
            if (!isListening) return;

            analyser.getByteFrequencyData(dataArray);
            const volume = dataArray.reduce((a, b) => a + b) / bufferLength;

            if (volume > 25 && !speechDetected) {
                speechDetected = true;
                console.log("🗣️ Speech detected – starting recording");
                clearTimeout(silenceTimer);
                startRecording();
            }

            requestAnimationFrame(checkAudioLevel);
        };

        checkAudioLevel();
    } catch (err) {
        console.error("Microphone access failed:", err);
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
    // Stop recording after ~8 seconds max or when silence is detected (we'll improve this later)
    setTimeout(() => {
        if (recorder && recorder.state === "recording") recorder.stop();
    }, 8000);
}

function stopListening() {
    isListening = false;
    if (recorder && recorder.state === "recording") recorder.stop();
    if (mediaStream) mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
    audioContext = null;
    recorder = null;
}

// ─────────────────────────────────────────────────────────────
// Send audio to OpenRouter Whisper → get text → send as user message
// ─────────────────────────────────────────────────────────────
async function transcribeAndSend(audioBlob) {
    if (!settings.api_key) {
        console.error("No API key set for Hands-Free Voice");
        stopListening();
        return;
    }

    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");
    formData.append("model", settings.model);

    try {
        const response = await fetch(`${settings.endpoint}/audio/transcriptions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${settings.api_key}`
            },
            body: formData
        });

        const result = await response.json();

        if (result.text && result.text.trim()) {
            const userText = result.text.trim();
            console.log("📝 Transcription:", userText);

            // Send as user message
            const context = SillyTavern.getContext();
            await context.sendUserMessage(userText);   // This is the clean way in 1.17+
        } else {
            console.log("No speech recognized");
        }
    } catch (err) {
        console.error("Whisper transcription failed:", err);
    }

    stopListening();
}

// Auto-continue (next character message)
async function autoContinue() {
    const context = SillyTavern.getContext();
    // This triggers the same behaviour as the "Continue" button / /continue slash command
    await context.generate('continue');
}

console.log("Hands-Free Voice module loaded");