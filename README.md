# ST Hands-Free Voice

A **SillyTavern extension** that enables natural, hands-free voice interaction by coordinating **TTS ↔ STT sequencing** with **silence detection**.

It solves common issues such as:
- The AI hearing its own TTS output
- Awkward push-to-talk workflows
- Mic re-arming during TTS pauses
- Needing manual control to end speech input

The extension is **opt-in, safe, and fully reversible**.

---

## Features

- Half-duplex TTS ↔ STT sequencing  
- Silence-based automatic transcription  
- Long TTS pause tolerance (handles delayed or chunked playback)  
- One-click enable / disable toggle  
- OFF by default (no behaviour changes unless enabled)  
- Works with Whisper (Extras) + System TTS  

---
## Installation

1. Clone or download this repository.


```

3. Copy the folder into:

```

SillyTavern/data/default-user/extensions/

```

The final structure should look like:

```

SillyTavern/data/default-user/extensions/Extension-Mic-Toggle/

```

4. Restart SillyTavern (or reload the UI).

The extension will be automatically detected.
