import { PROVIDERS, defaultSettings } from './constants.js';
import { getSettings } from './settings.js';
import { getContext } from './sillytavern.js';

export function addSettingsPanel() {
    const providerOptions = Object.entries(PROVIDERS)
        .map(([key, p]) => `<option value="${key}">${p.label}</option>`)
        .join('');

    const html = `
    <div class="handsfree-settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>Hands-Free Voice</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <label><input type="checkbox" id="hf_enabled"> Enable Hands-Free Mode</label>

                <hr>
                <b>API Settings</b>

                <label>API Provider</label>
                <select id="hf_provider" class="text_pole">
                    ${providerOptions}
                </select>

                <label>API Key</label>
                <input type="password" id="hf_api_key" class="text_pole" placeholder="sk-or-... / gsk_...">

                <label>Whisper Model</label>
                <input type="text" id="hf_model" class="text_pole" placeholder="openai/whisper-large-v3-turbo">

                <div id="hf_custom_endpoint_row" style="display:none">
                    <label>Custom Endpoint URL</label>
                    <input type="text" id="hf_custom_endpoint" class="text_pole" placeholder="http://localhost:8080/v1">
                </div>

                <hr>
                <b>Timing</b>

                <label>Silence Timeout (seconds)</label>
                <input type="number" id="hf_delay" class="text_pole" min="1" max="60">
                <small>After TTS ends, how long to wait for you to start speaking before the character auto-continues.</small>

                <label>Speech Pause Tolerance (seconds)</label>
                <input type="number" id="hf_speech_pause" class="text_pole" min="0.1" max="10" step="0.1">
                <small>How long a pause mid-speech before recording stops and is sent for transcription. Allows natural pauses.</small>

                <label>Max Recording Length (seconds)</label>
                <input type="number" id="hf_max_recording" class="text_pole" min="5" max="600">
                <small>Safety cap on recording length. Prevents the mic running indefinitely if you step away.</small>

                <hr>
                <b>Formatting</b>

                <label><input type="checkbox" id="hf_quote_speech"> Wrap speech in quotation marks</label>
                <small>When enabled, transcribed text is sent as "text" instead of plain text.</small>
            </div>
        </div>
    </div>`;

    $('#extensions_settings2').append(html);
    bindSettingsUI();
}

function bindSettingsUI() {
    const context = getContext();
    const settings = getSettings();

    $('#hf_enabled').prop('checked', settings.enabled).on('change', function () {
        settings.enabled = this.checked;
        context.saveSettingsDebounced();
    });

    $('#hf_provider').val(settings.provider).on('change', function () {
        settings.provider = this.value;
        const provider = PROVIDERS[settings.provider];
        if (provider) {
            settings.model = provider.defaultModel;
            $('#hf_model').val(settings.model);
        }
        updateCustomEndpointVisibility();
        context.saveSettingsDebounced();
    });

    $('#hf_api_key').val(settings.api_key).on('input', function () {
        settings.api_key = this.value.trim();
        context.saveSettingsDebounced();
    });

    $('#hf_model').val(settings.model).on('input', function () {
        settings.model = this.value.trim();
        context.saveSettingsDebounced();
    });

    $('#hf_custom_endpoint').val(settings.custom_endpoint).on('input', function () {
        settings.custom_endpoint = this.value.trim();
        context.saveSettingsDebounced();
    });

    $('#hf_delay').val(settings.delay).on('input', function () {
        settings.delay = parseFloat(this.value) || defaultSettings.delay;
        context.saveSettingsDebounced();
    });

    $('#hf_speech_pause').val(settings.speech_pause).on('input', function () {
        settings.speech_pause = parseFloat(this.value) || defaultSettings.speech_pause;
        context.saveSettingsDebounced();
    });

    $('#hf_max_recording').val(settings.max_recording).on('input', function () {
        settings.max_recording = parseFloat(this.value) || defaultSettings.max_recording;
        context.saveSettingsDebounced();
    });

    $('#hf_quote_speech').prop('checked', settings.quote_speech).on('change', function () {
        settings.quote_speech = this.checked;
        context.saveSettingsDebounced();
    });

    updateCustomEndpointVisibility();
}

function updateCustomEndpointVisibility() {
    $('#hf_custom_endpoint_row').toggle(getSettings().provider === 'local');
}
