import { PROVIDERS, UI_SELECTORS, defaultSettings } from './constants.js';
import { runtimeState } from './state.js';
import { getSettings } from './settings.js';
import { getContext } from './sillytavern.js';
import { validateSetupBeforeListening } from './validation.js';

const CHATBAR_BUTTON_CLASSES = [
    'fa-microphone',
    'fa-ear-listen',
    'fa-assistive-listening-systems',
    'fa-microphone-slash',
    'fa-spinner',
    'fa-spin',
    'active',
    'hf-enabled',
    'hf-listening',
    'hf-processing'
];

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

                <label>Mic Sensitivity (volume threshold)</label>
                <input type="number" id="hf_volume_threshold" class="text_pole" min="1" max="100">
                <small>Lower values trigger on quieter sound. Default: 25.</small>

                <hr>
                <b>Formatting</b>

                <label><input type="checkbox" id="hf_quote_speech"> Wrap speech in quotation marks</label>
                <small>When enabled, transcribed text is sent as "text" instead of plain text.</small>
            </div>
        </div>
    </div>`;

    $('#extensions_settings2').append(html);
    bindSettingsUI();
    addChatbarMicButton();
    renderHandsFreeControls();
}

function bindSettingsUI() {
    const context = getContext();
    const settings = getSettings();

    $(UI_SELECTORS.enabledToggle).prop('checked', settings.enabled).on('change', function () {
        setHandsFreeEnabled(this.checked);
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

    $('#hf_volume_threshold').val(settings.volume_threshold).on('input', function () {
        settings.volume_threshold = parseFloat(this.value) || defaultSettings.volume_threshold;
        context.saveSettingsDebounced();
    });

    $('#hf_quote_speech').prop('checked', settings.quote_speech).on('change', function () {
        settings.quote_speech = this.checked;
        context.saveSettingsDebounced();
    });

    updateCustomEndpointVisibility();
}

function addChatbarMicButton() {
    if ($(UI_SELECTORS.chatbarButton).length) return;

    const $container = $(UI_SELECTORS.primaryChatbarContainer).length
        ? $(UI_SELECTORS.primaryChatbarContainer)
        : $(UI_SELECTORS.fallbackChatbarContainer);

    if (!$container.length) {
        console.warn("⚠️ Hands-Free Voice: chatbar send controls not found");
        return;
    }

    const $button = $('<div>', {
        id: UI_SELECTORS.chatbarButton.slice(1),
        class: 'fa-solid fa-microphone-slash interactable',
        role: 'button',
        tabindex: 0,
        title: 'Enable Hands-Free Voice',
        'aria-label': 'Enable Hands-Free Voice',
        'aria-pressed': 'false'
    });

    $button.on('click', () => {
        setHandsFreeEnabled(!getSettings().enabled);
    });

    $button.on('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        setHandsFreeEnabled(!getSettings().enabled);
    });

    $container.prepend($button);
}

async function setHandsFreeEnabled(enabled) {
    const context = getContext();
    const settings = getSettings();

    settings.enabled = !!enabled;
    context.saveSettingsDebounced();
    renderHandsFreeControls();

    if (!settings.enabled) {
        console.log("[Hands-Free Voice] Disabled");
        return;
    }

    if (!validateSetupBeforeListening()) {
        settings.enabled = false;
        context.saveSettingsDebounced();
        renderHandsFreeControls();
        return;
    }

    if (isTTSPlaybackActive()) {
        console.log("[Hands-Free Voice] Enabled; waiting for current TTS playback to finish");
        return;
    }

    if (runtimeState.isListening || runtimeState.recorder) {
        console.log("[Hands-Free Voice] Enabled");
        return;
    }

    console.log("[Hands-Free Voice] Enabled; starting listening because no TTS is active");
    const { onTTSPlaybackEnded } = await import('./controller.js');
    await onTTSPlaybackEnded();
}

export function renderHandsFreeControls() {
    const settings = getSettings();
    const enabled = !!settings.enabled;
    const recording = runtimeState.recorder?.state === 'recording';
    const active = enabled && (runtimeState.isListening || recording);
    const processing = !!runtimeState.isTranscribing;
    const $button = $(UI_SELECTORS.chatbarButton);

    $(UI_SELECTORS.enabledToggle).prop('checked', enabled);

    if (!$button.length) return;

    $button.removeClass(CHATBAR_BUTTON_CLASSES.join(' '));
    $button.addClass('fa-solid interactable');
    $button.toggleClass('hf-enabled', enabled);
    $button.toggleClass('hf-listening active', active);
    $button.toggleClass('hf-processing', processing);

    if (processing) {
        $button.addClass('fa-spinner fa-spin');
        $button.prop('title', 'Hands-Free Voice is transcribing');
        $button.attr('aria-label', 'Hands-Free Voice is transcribing');
        $button.attr('aria-busy', 'true');
    } else if (recording) {
        $button.addClass('fa-microphone fa-assistive-listening-systems fa-ear-listen');
        $button.prop('title', 'Hands-Free Voice: Recording');
        $button.attr('aria-label', 'Hands-Free Voice: Recording');
        $button.attr('aria-busy', 'false');
    } else if (active) {
        $button.addClass('fa-microphone fa-assistive-listening-systems fa-ear-listen');
        $button.prop('title', 'Hands-Free Voice: Listening');
        $button.attr('aria-label', 'Hands-Free Voice: Listening');
        $button.attr('aria-busy', 'false');
    } else if (enabled) {
        $button.addClass('fa-microphone');
        $button.prop('title', 'Disable Hands-Free Voice');
        $button.attr('aria-label', 'Disable Hands-Free Voice');
        $button.attr('aria-busy', 'false');
    } else {
        $button.addClass('fa-microphone-slash');
        $button.prop('title', 'Enable Hands-Free Voice');
        $button.attr('aria-label', 'Enable Hands-Free Voice');
        $button.attr('aria-busy', 'false');
    }

    $button.attr('aria-pressed', String(enabled));
}

function isTTSPlaybackActive() {
    const audio = document.getElementById('tts_audio');
    return !!(audio && !audio.paused && !audio.ended && audio.currentTime > 0);
}

function updateCustomEndpointVisibility() {
    $('#hf_custom_endpoint_row').toggle(getSettings().provider === 'local');
}
