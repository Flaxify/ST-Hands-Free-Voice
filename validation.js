import { PROVIDERS } from './constants.js';
import { getSettings } from './settings.js';

const LOG_PREFIX = '[ST-Hands-Free-Voice]';
const TOAST_TITLE = 'ST-Hands-Free-Voice';

export function reportSetupError(message) {
    console.error(`${LOG_PREFIX} ${message}`);

    if (globalThis.toastr?.error) {
        globalThis.toastr.error(message, TOAST_TITLE);
    } else if (globalThis.toastr?.warning) {
        globalThis.toastr.warning(message, TOAST_TITLE);
    }
}

export function validateSetupBeforeListening() {
    const settings = getSettings();
    const provider = PROVIDERS[settings.provider];

    if (isOfficialSpeechRecognitionLoaded()) {
        return fail('The official Speech Recognition extension appears to be active. Please disable/uninstall it before using ST-Hands-Free-Voice to avoid microphone/button conflicts.');
    }

    if (!settings.provider || !provider) {
        return fail('No speech-to-text provider is configured. Please choose a provider in the extension settings.');
    }

    if (settings.provider === 'local') {
        if (!isValidLocalEndpoint(settings.custom_endpoint)) {
            return fail('Local/custom speech-to-text endpoint is missing or invalid. Check the endpoint URL in the extension settings.');
        }
        return true;
    }

    if (!settings.api_key?.trim()) {
        return fail('API key missing for the selected speech-to-text provider. Add it in the extension settings.');
    }

    return true;
}

export function reportMicrophonePermissionError() {
    reportSetupError('Microphone permission denied. Allow microphone access in your browser and try again.');
}

function fail(message) {
    reportSetupError(message);
    return false;
}

function isOfficialSpeechRecognitionLoaded() {
    const officialButton = document.getElementById('microphone_button');
    return !!(officialButton && officialButton.id !== 'handsfree_voice_button');
}

function isValidLocalEndpoint(endpoint) {
    if (!endpoint?.trim()) return false;

    try {
        const url = new URL(endpoint.trim());
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}
