/**
 * Hands-Free Voice v2 - Automatic TTS → Listen → Whisper → Auto-continue
 * Forked & updated for SillyTavern 1.17.0+ using proven OpenVault pattern
 */

import { eventSource, event_types } from '../../../../script.js';
import { getContext, extension_settings, saveSettingsDebounced } from '../../../extensions.js';

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

// ─────────────────────────────────────────────────────────────
// SETTINGS UI (simple inline HTML — no templates folder needed)
// ─────────────────────────────────────────────────────────────
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

                <label>API Key (OpenRouter / Groq compatible)</label>
                <input type="password" id="hf_api_key" class="text_pole">

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
// INIT — same pattern as the working OpenVault extension
// ─────────────────────────────────────────────────────────────
jQuery(() => {
    eventSource.on(event_types.APP_READY, async () => {
        console.log("✅ Hands-Free Voice v2 activated");

        // Load settings
        if (!extension_settings[MODULE_NAME]) {
            extension_settings[MODULE_NAME] = structuredClone(defaultSettings);
        }
        settings = extension_settings[MODULE_NAME];

        Object.keys(defaultSettings).forEach(key => {
            if (settings[key] === undefined) settings[key] = defaultSettings[key];
        });

        addSettingsPanel();

        // Listen for TTS finish
        eventSource.on(event_types.TTS_JOB_COMPLETE, onTTSComplete);

        console.log("🎤 Hands-Free Voice ready – waiting for TTS to finish");
    });
});

// ─────────────────────────────────────────────────────────────
// The rest of the logic (unchanged from before)
// ─────────────────────────────────────────────────────────────
async function onTTSComplete() {
    if (!settings.enabled) return;
    console.log("🎤 TTS complete – starting hands-free listening window");
    await startVoiceDetection();

    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
        if (!isListening) return;
        console.log("⏰ No speech detected – auto-continuing");
        autoContinue();
        stopListening();
    }, settings.delay * 1000);
}

async function startVoiceDetection() { /* [same as previous version] */ }
async function startRecording() { /* [same as previous version] */ }
function stopListening() { /* [same as previous version] */ }
async function transcribeAndSend(audioBlob) { /* [same as previous version] */ }
async function autoContinue() { /* [same as previous version] */ }

// Paste the full functions from my previous message here (startVoiceDetection through autoContinue)
// I kept them out to save space — just copy them into this file at the bottom.

console.log("Hands-Free Voice module loaded");