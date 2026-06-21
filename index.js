import { eventSource, event_types, getContext } from './sillytavern.js';
import { initializeSettings } from './settings.js';
import { addSettingsPanel, forceHandsFreeOff } from './ui.js';
import { hookAudioElement } from './tts.js';

console.log("🚀 Hands-Free Voice v2.8 loaded");

jQuery(() => {
    eventSource.on(event_types.APP_READY, async () => {
        console.log("✅ Hands-Free Voice: APP_READY → initializing");

        const context = getContext();
        initializeSettings(context);
        await forceHandsFreeOff('reset on extension load');

        addSettingsPanel();
        console.log("✅ Settings panel added");

        hookAudioElement();

        eventSource.on(event_types.CHAT_CHANGED, () => {
            forceHandsFreeOff('character changed');
        });

        console.log("🎤 Hands-Free Voice v2.8 ready");
    });
});
