# Phase 12.2 - Mobile TTS + paced karaoke (v7.11)

Source: owner's field report + gist 250138e4 (ROLE7_.md). On Android and iOS the explain sheet
("يعني إيه يا بابا؟") produced no sound and the karaoke highlight flashed from the first word to the
last in a split second, while the Web Audio effects (sound.js) worked fine on the same phones.

## Gist claims verified against the code BEFORE acting (RULES.md - zero blind acceptance)

| Claim | Evidence in code | Verdict |
|---|---|---|
| `explainSheet.js:80` calls `speak()` inside `setTimeout(...,120)` | Exactly that line; the "اسمع تاني" button (line 71) calls `speak` synchronously, which is why replay worked | Confirmed -> fixed |
| `speech.js:136` chains `next()` on `onend` without a timing check | `u.onend = () => { if (fallbackStarted) return; next(); }`; `finish()` (107) clears the 1200ms guard timer (140); `onEnd` in the sheet marks every word `.said` at once = the observed flash | Confirmed -> fixed |
| "The code assumes `ar-EG` is always installed and stalls silently" | `rank()` (78/83) accepts any `ar-*` (ar-EG +20, ar-SA/001 +5); `onvoiceschanged` bound (153); `onerror` + 1200ms guard already fall back to visual karaoke | Rejected - already handled, not rebuilt |
| Use a fixed 300-350ms per word | `schedule()` (112) paces per word length, min 260ms - better for reading | Rejected - kept, reused by the guard |
| "Open PR #14" | GitHub assigns the number | Noted |

## Root-cause fixes

1. **User gesture kept (`app/js/ui/explainSheet.js`)** - `say()` is now synchronous inside the tap
   path (open -> show -> say). Mobile browsers only honour the first `speechSynthesis.speak()` when it
   runs inside the gesture.
2. **Pacing guard (`app/js/engines/speech.js`)** - if a sentence's utterance ends sooner than
   `max(250ms, spokenWords x 120ms)` or never fired `onstart`, the words were not heard: the engine
   does NOT chain the next sentence; it hands over to the paced visual karaoke **from that same word**
   (`schedule(from)`). `onerror` / exceptions / the no-onstart guard all go through the same `pace()`.
3. **Engine warm-up (`speech.warm()`)** - bound once to `pointerdown/touchstart/keydown` (same pattern as
   the AudioContext unlock in sound.js:37): empty utterance + `cancel()` unlocks speechSynthesis on
   iOS/Android without producing sound. Idempotent (`speech.warmed`).

## Tests

- New `app/tests/phase12_mobile_tts.py` - 17 checks on a Pixel 5 emulation:
  - A) silent engine mock (onstart + onend after 5ms): first real `speak()` runs synchronously inside the
    click dispatch; 8 words take ~4.8s (>= 2.5s), min dwell 313ms, words strictly in order, text not
    fully `.said` while pacing, only ONE real utterance (no chaining), `warm()` ran on first gesture;
  - B) engine that never fires `onstart` (no voice installed): 1200ms guard starts the paced karaoke;
  - C) desktop/headless regression without voices: fallback still highlights, no flash-through.
- All 20 suites PASS (19 previous + the new one). Protected root files untouched (sha256 unchanged).

## Docs / version

- README append-only section "Phase 12.2" + header version -> **v7.11** (importmap cache-bust).
- `genspark_ai_developer/PROGRESS.md` - plan frozen after verification, chunk log N1-N4.

## Live preview (verified from outside: 200, version.json v7.11, fixed speech.js/explainSheet.js served)

https://8090-irbfdwdys21fw69guwt6g-b32ec7bb.sandbox.novita.ai/app/index.html#/play/mult_3

Open a question -> tap "يعني إيه يا بابا؟" on a phone (or with the device muted): the words must be
highlighted one by one at reading pace, never flash through.
Note: the sandbox URL dies on sandbox reset; a fresh one is generated on request.
