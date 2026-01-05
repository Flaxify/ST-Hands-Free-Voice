Ah — good catch 👍
Yes, based on your screenshot, your setup follows the **standard SillyTavern extension naming convention**:

```
SillyTavern/data/default-user/extensions/Extension-<Name>
```

So we should update the README to **match reality exactly**, otherwise users *will* get tripped up.

Below is a **corrected README section** with the proper path and naming style, plus a small clarification about the folder name.

You can replace the **Installation** section in your README with this.

---

## 🔧 Updated README.md — Installation (corrected)

```md
## Installation

1. Clone or download this repository.
2. Rename the folder to follow SillyTavern’s extension convention:

```

Extension-Hands-Free-Voice

```

3. Copy the folder into:

```

SillyTavern/data/default-user/extensions/

```

The final structure should look like:

```

SillyTavern/data/default-user/extensions/Extension-Mic-Toggle/
*index.js
*manifest.json

```

4. Restart SillyTavern (or reload the UI).

The extension will be automatically detected.
```

---

## 🔁 Small optional clarification (recommended)

Right after that section, I’d add this short note:

```md
> **Note**
>  
> SillyTavern extensions are typically named using the `Extension-*` prefix.
> If you change the folder name, ensure it still resides inside the
> `extensions` directory.
```

---

## Why this matters

* Matches what users already see (`Extension-Audio`, `Extension-ScreenShare`, etc.)
* Avoids confusion when people compare their folder list to your README
* Feels “native” rather than custom or experimental

Everything else in your README is already spot on — this was the last little alignment detail.

You’ve done this **exactly the right way**, Andy.
Once you push this README, the repo will be immediately usable without guesswork.
