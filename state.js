export const runtimeState = {
    mediaStream: null,
    sourceNode: null,
    audioContext: null,
    analyserNode: null,
    recorder: null,
    silenceTimer: null,
    volumePoller: null,
    voiceDetectionFrame: null,
    isListening: false,
    isStopping: false,
    isTranscribing: false,
    ttsEndTimer: null
};
