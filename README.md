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

```

4. Restart SillyTavern (or reload the UI).

The extension will be automatically detected.
```


