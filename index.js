(() => {
  const MIC_SELECTOR = "#microphone_button";

  // ---- Feature Toggle (persisted, OFF by default) ----
  const EXT_KEY = "handsfree_seq_enabled";

  // ⬇️ DEFAULT = false if not yet set
  let handsfreeEnabled = (localStorage.getItem(EXT_KEY) ?? "false") === "true";

  function setHandsfreeEnabled(v) {
    handsfreeEnabled = !!v;
    localStorage.setItem(EXT_KEY, handsfreeEnabled ? "true" : "false");

    if (!handsfreeEnabled) {
      try { clearTimers(); } catch {}
      try { stopVad(); } catch {}
    }

    updateToggleUI();
  }

  function toggleHandsfree() {
    setHandsfreeEnabled(!handsfreeEnabled);
  }

  // ---- Tunables ----
  const RESUME_COOLDOWN_MS = 300;
  const TTS_GAP_GRACE_MS = 2000;
  const CLICK_VERIFY_MS = 120;
  const MAX_RETRIES = 4;

  // VAD / silence endpointing
  const LEVEL_THRESHOLD = 0.028;
  const MIN_SPEECH_MS = 350;
  const SILENCE_MS_TO_STOP = 1100;
  const POLL_MS = 50;

  const DEBUG = true;
  const log = (...a) => DEBUG && console.log("[SEQ]", ...a);
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // ---- Mic state ----
  function micBtn() {
    return document.querySelector(MIC_SELECTOR);
  }

  function micIsRecording(btn) {
    if (!btn) return false;

    const cls = (btn.className || "").toLowerCase();
    if (cls.includes("fa-microphone-slash")) return true;
    if (cls.includes("fa-microphone") && !cls.includes("fa-microphone-slash")) return false;

    const title = (btn.getAttribute("title") || "").toLowerCase();
    if (title.includes("end and transcribe")) return true;
    if (title.includes("click to speak")) return false;

    return false;
  }

  async function enforceMic(shouldRecord) {
    if (!handsfreeEnabled) return false;

    const btn = micBtn();
    if (!btn) return false;

    for (let i = 1; i <= MAX_RETRIES; i++) {
      if (micIsRecording(btn) === shouldRecord) return true;
      btn.click();
      await sleep(CLICK_VERIFY_MS);
    }
    return false;
  }

  // ---- UI Toggle Button ----
  function ensureToggleButton() {
    if (document.querySelector("#handsfree_toggle_btn")) return;

    const mic = micBtn();
    if (!mic) return;

    const btn = document.createElement("button");
    btn.id = "handsfree_toggle_btn";
    btn.type = "button";
    btn.title = "Toggle hands-free voice sequencing";
    btn.style.marginLeft = "8px";
    btn.style.padding = "2px 8px";
    btn.style.borderRadius = "8px";
    btn.style.border = "1px solid var(--SmartThemeBorderColor, #666)";
    btn.style.background = "var(--SmartThemeBodyColor, transparent)";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "12px";
    btn.style.lineHeight = "18px";
    btn.style.userSelect = "none";

    btn.addEventListener("click", toggleHandsfree);

    mic.parentElement?.appendChild(btn);
    updateToggleUI();
  }

  function updateToggleUI() {
    const btn = document.querySelector("#handsfree_toggle_btn");
    if (!btn) return;

    btn.textContent = handsfreeEnabled ? "HF:ON" : "HF:OFF";
    btn.style.opacity = handsfreeEnabled ? "1" : "0.55";
  }

  // Optional hotkey: Ctrl+Shift+H
  function installHotkey() {
    if (window.__handsfree_hotkey_installed) return;
    window.__handsfree_hotkey_installed = true;

    window.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && e.code === "KeyH") {
        toggleHandsfree();
        e.preventDefault();
      }
    });
  }

  // ---- TTS sequencing ----
  let ttsCount = 0;
  let resumeTimer = null;
  let gapTimer = null;

  function clearTimers() {
    if (resumeTimer) clearTimeout(resumeTimer);
    if (gapTimer) clearTimeout(gapTimer);
    resumeTimer = null;
    gapTimer = null;
  }

  function ttsStart() {
    if (!handsfreeEnabled) return;

    ttsCount++;
    clearTimers();
    enforceMic(false);
  }

  function scheduleGapCheck() {
    if (!handsfreeEnabled) return;

    if (gapTimer) clearTimeout(gapTimer);

    gapTimer = setTimeout(() => {
      gapTimer = null;

      if (ttsCount === 0) {
        resumeTimer = setTimeout(() => {
          if (handsfreeEnabled && ttsCount === 0) {
            enforceMic(true);
          }
        }, RESUME_COOLDOWN_MS);
      }
    }, TTS_GAP_GRACE_MS);
  }

  function ttsEnd() {
    if (!handsfreeEnabled) return;

    ttsCount = Math.max(0, ttsCount - 1);
    if (ttsCount === 0) scheduleGapCheck();
  }

  // ---- VAD endpointing ----
  let audioCtx = null, analyser = null, source = null, stream = null, pollTimer = null;
  let speechStartedAt = 0, lastLoudAt = 0;

  function rms() {
    const buf = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / buf.length);
  }

  async function ensureVadRunning() {
    if (!handsfreeEnabled || pollTimer) return;

    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;

    source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    speechStartedAt = 0;
    lastLoudAt = performance.now();

    pollTimer = setInterval(() => {
      if (!handsfreeEnabled) return;

      const btn = micBtn();
      if (!btn || !micIsRecording(btn)) return;
      if (ttsCount > 0 || gapTimer) return;

      const level = rms();
      const now = performance.now();

      if (level >= LEVEL_THRESHOLD) {
        if (!speechStartedAt) speechStartedAt = now;
        lastLoudAt = now;
      }

      if (
        speechStartedAt &&
        now - speechStartedAt >= MIN_SPEECH_MS &&
        now - lastLoudAt >= SILENCE_MS_TO_STOP
      ) {
        btn.click();
        speechStartedAt = 0;
        lastLoudAt = performance.now();
      }
    }, POLL_MS);
  }

  function stopVad() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;

    try { source?.disconnect(); } catch {}
    try { analyser?.disconnect?.(); } catch {}
    try { audioCtx?.close?.(); } catch {}
    try { stream?.getTracks()?.forEach(t => t.stop()); } catch {}

    source = analyser = audioCtx = stream = null;
  }

  function installMicObserver() {
    const btn = micBtn();
    if (!btn) return;

    const obs = new MutationObserver(() => {
      if (!handsfreeEnabled) {
        stopVad();
        return;
      }
      micIsRecording(btn) ? ensureVadRunning().catch(() => {}) : stopVad();
    });

    obs.observe(btn, { attributes: true, attributeFilter: ["class", "title", "aria-label"] });

    if (handsfreeEnabled && micIsRecording(btn)) ensureVadRunning().catch(() => {});
  }

  // ---- Native-safe TTS hook ----
  function installTtsHook() {
    const ss = window.speechSynthesis;
    if (!ss?.speak) return;

    if (!window.__st_nativeSpeak) {
      window.__st_nativeSpeak = ss.speak.bind(ss);
      window.__st_nativeCancel = ss.cancel?.bind(ss);
    }

    if (window.__st_seq_installed_final) return;
    window.__st_seq_installed_final = true;

    ss.speak = function (utterance) {
      if (handsfreeEnabled) ttsStart();

      try {
        const pe = utterance.onend;
        const pr = utterance.onerror;

        utterance.onend = e => {
          if (handsfreeEnabled) ttsEnd();
          pe?.call(utterance, e);
        };
        utterance.onerror = e => {
          if (handsfreeEnabled) ttsEnd();
          pr?.call(utterance, e);
        };
      } catch {}

      return window.__st_nativeSpeak(utterance);
    };

    if (window.__st_nativeCancel) {
      ss.cancel = function () {
        const r = window.__st_nativeCancel();
        if (handsfreeEnabled) {
          ttsCount = 0;
          clearTimers();
          scheduleGapCheck();
        }
        return r;
      };
    }
  }

  // ---- Boot ----
  installTtsHook();

  const boot = setInterval(() => {
    if (micBtn()) {
      clearInterval(boot);
      ensureToggleButton();
      installHotkey();
      installMicObserver();
      updateToggleUI();
      if (DEBUG) log("Hands-free voice sequencing ready", { handsfreeEnabled });
    }
  }, 200);
})();
