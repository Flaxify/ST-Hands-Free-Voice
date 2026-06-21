import { defaultSettings, VOLUME_THRESHOLD } from './constants.js';
import { runtimeState } from './state.js';
import { getSettings } from './settings.js';
import { transcribeAndSend } from './transcription.js';

export function getCurrentVolume() {
    if (!runtimeState.analyserNode) return 0;
    const data = new Uint8Array(runtimeState.analyserNode.frequencyBinCount);
    runtimeState.analyserNode.getByteFrequencyData(data);
    return data.reduce((a, b) => a + b, 0) / data.length;
}

export async function startVoiceDetection() {
    if (runtimeState.isListening) return;
    try {
        runtimeState.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        runtimeState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = runtimeState.audioContext.createMediaStreamSource(runtimeState.mediaStream);
        runtimeState.analyserNode = runtimeState.audioContext.createAnalyser();
        runtimeState.analyserNode.fftSize = 512;
        source.connect(runtimeState.analyserNode);

        runtimeState.isListening = true;
        let speechDetected = false;

        const checkLevel = () => {
            if (!runtimeState.isListening) return;
            const volume = getCurrentVolume();
            if (volume > VOLUME_THRESHOLD && !speechDetected) {
                speechDetected = true;
                console.log("🗣️ Speech detected – recording");
                clearTimeout(runtimeState.silenceTimer);
                startRecording();
            }
            requestAnimationFrame(checkLevel);
        };
        checkLevel();
    } catch (err) {
        console.error("❌ Mic access failed:", err);
    }
}

export async function startRecording() {
    if (!runtimeState.mediaStream) return;
    runtimeState.recorder = new MediaRecorder(runtimeState.mediaStream);
    const chunks = [];

    runtimeState.recorder.ondataavailable = e => chunks.push(e.data);
    runtimeState.recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        await transcribeAndSend(blob, stopListening);
    };

    runtimeState.recorder.start();

    const settings = getSettings();
    const speechPauseMs = (settings.speech_pause || defaultSettings.speech_pause) * 1000;
    const maxRecordingMs = (settings.max_recording || defaultSettings.max_recording) * 1000;
    const pollIntervalMs = 100;

    let silentFor = 0;
    const startTime = Date.now();

    // Poll for in-speech silence and max-length cutoff
    const silencePoller = setInterval(() => {
        if (!runtimeState.recorder || runtimeState.recorder.state !== "recording") {
            clearInterval(silencePoller);
            return;
        }

        // Safety cap: max recording length
        if (Date.now() - startTime >= maxRecordingMs) {
            console.log(`⏱️ Max recording length (${getSettings().max_recording}s) reached – stopping`);
            clearInterval(silencePoller);
            runtimeState.recorder.stop();
            return;
        }

        // Check for post-speech silence
        const volume = getCurrentVolume();
        if (volume <= VOLUME_THRESHOLD) {
            silentFor += pollIntervalMs;
            if (silentFor >= speechPauseMs) {
                console.log(`🤫 Speech pause (${getSettings().speech_pause}s) reached – stopping recording`);
                clearInterval(silencePoller);
                runtimeState.recorder.stop();
            }
        } else {
            silentFor = 0; // reset on any sound
        }
    }, pollIntervalMs);
}

export function stopListening() {
    runtimeState.isListening = false;
    if (runtimeState.recorder && runtimeState.recorder.state === "recording") runtimeState.recorder.stop();
    if (runtimeState.mediaStream) runtimeState.mediaStream.getTracks().forEach(t => t.stop());
    runtimeState.mediaStream = null;
    runtimeState.audioContext = null;
    runtimeState.analyserNode = null;
    runtimeState.recorder = null;
}
