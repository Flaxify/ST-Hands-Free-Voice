import { runtimeState } from './state.js';
import { getSettings } from './settings.js';
import { startVoiceDetection, stopListening } from './audio.js';
import { getContext } from './sillytavern.js';

export async function onTTSPlaybackEnded() {
    await startVoiceDetection();

    // Start silence timeout — if user never speaks, auto-continue
    if (runtimeState.silenceTimer) {
        clearTimeout(runtimeState.silenceTimer);
        runtimeState.silenceTimer = null;
    }
    runtimeState.silenceTimer = setTimeout(() => {
        runtimeState.silenceTimer = null;
        if (!runtimeState.isListening) return;
        console.log("⏰ No speech detected – auto-continuing");
        autoContinue();
        stopListening();
    }, getSettings().delay * 1000);
}

export async function autoContinue() {
    const context = getContext();
    await context.generate('normal');
}
