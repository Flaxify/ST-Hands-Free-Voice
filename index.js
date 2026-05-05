import { eventSource, event_types } from '../../../../script.js';

console.log("🚀 Hands-Free Voice: module file loaded (clean version)");

jQuery(() => {
    eventSource.on(event_types.APP_READY, () => {
        console.log("✅ Hands-Free Voice: APP_READY fired → adding TEST panel");

        const testHtml = `
        <div style="border: 5px solid #00ff00; background: #111; padding: 20px; margin: 20px 0; text-align: center; font-size: 18px; color: #0f0;">
            <h2>✅ HANDS-FREE VOICE TEST PANEL (WORKING)</h2>
            <p>The extension is now loading correctly!</p>
            <p><strong>No more import errors.</strong></p>
            <button onclick="alert('Hands-Free Voice is alive! 🚀')">Click me to test</button>
            <small>Next step: real settings + TTS listener</small>
        </div>`;

        $('#extensions_settings2').append(testHtml);
        console.log("✅ Test panel appended successfully");
    });
});

console.log("Hands-Free Voice test version ready");