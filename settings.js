import { MODULE_NAME, PROVIDERS, defaultSettings } from './constants.js';

let settings = {};

export function initializeSettings(context) {
    if (!context.extensionSettings[MODULE_NAME]) {
        context.extensionSettings[MODULE_NAME] = structuredClone(defaultSettings);
    }
    settings = context.extensionSettings[MODULE_NAME];

    migrateOldEndpointSetting();
    applyDefaultSettings();

    return settings;
}

export function getSettings() {
    return settings;
}

export function getEffectiveEndpoint() {
    const provider = PROVIDERS[settings.provider];
    if (!provider) return settings.custom_endpoint || '';
    return settings.provider === 'local'
        ? (settings.custom_endpoint || '').replace(/\/$/, '')
        : provider.endpoint;
}

function migrateOldEndpointSetting() {
    if (settings.endpoint !== undefined && settings.provider === undefined) {
        const ep = settings.endpoint || '';
        if (ep.includes('openrouter.ai')) settings.provider = 'openrouter';
        else if (ep.includes('groq.com'))  settings.provider = 'groq';
        else { settings.provider = 'local'; settings.custom_endpoint = ep; }
        delete settings.endpoint;
    }
}

function applyDefaultSettings() {
    Object.keys(defaultSettings).forEach(key => {
        if (settings[key] === undefined) settings[key] = defaultSettings[key];
    });
}
