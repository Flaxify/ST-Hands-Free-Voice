import { eventSource, event_types, getContext } from './sillytavern.js';
import { initializeSettings } from './settings.js';
import { addSettingsPanel } from './ui.js';
import { hookAudioElement } from './tts.js';

console.log("🚀 Hands-Free Voice v2.8 loaded");

jQuery(() => {
    eventSource.on(event_types.APP_READY, () => {
        console.log("✅ Hands-Free Voice: APP_READY → initializing");

        const context = getContext();
        initializeSettings(context);

        addSettingsPanel();
        console.log("✅ Settings panel added");

        hookAudioElement();

        console.log("🎤 Hands-Free Voice v2.8 ready");
    });
});
