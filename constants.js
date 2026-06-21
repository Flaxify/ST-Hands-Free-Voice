export const MODULE_NAME = "HandsFreeVoice";

export const PROVIDERS = {
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

export const defaultSettings = Object.freeze({
    enabled: false,
    provider: "openrouter",
    api_key: "",
    model: "openai/whisper-large-v3-turbo",
    custom_endpoint: "",
    // Timing
    delay: 5,           // seconds of initial silence before auto-continue
    speech_pause: 1.5,  // seconds of in-speech silence before recording cutoff
    max_recording: 120, // seconds maximum recording length (safety cap)
    // Formatting
    quote_speech: false // wrap transcribed text in quotation marks
});

export const VOLUME_THRESHOLD = 25;
