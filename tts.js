import { runtimeState } from './state.js';
import { getSettings } from './settings.js';
import { onTTSPlaybackEnded } from './controller.js';

/**
 * Wait for ST's <audio id="tts_audio"> element to appear in the DOM,
 * then attach ended/play listeners so we know when speech truly stops.
 */
export function hookAudioElement() {
    const audio = document.getElementById('tts_audio');
    if (!audio) {
        setTimeout(hookAudioElement, 500);
        return;
    }

    audio.addEventListener('play', () => {
        if (runtimeState.ttsEndTimer) {
            clearTimeout(runtimeState.ttsEndTimer);
            runtimeState.ttsEndTimer = null;
        }
    });

    audio.addEventListener('ended', () => {
        if (runtimeState.ttsEndTimer) clearTimeout(runtimeState.ttsEndTimer);
        runtimeState.ttsEndTimer = setTimeout(() => {
            runtimeState.ttsEndTimer = null;
            if (getSettings().enabled && !runtimeState.isListening) {
                console.log("🎤 TTS playback fully ended – starting hands-free listening");
                onTTSPlaybackEnded();
            }
        }, 500);
    });

    console.log("🔊 Hands-Free Voice: hooked into #tts_audio element");
}
