# Phase 15.1 - math question read aloud from the recorded Egyptian clips + replay button (gist c5203c99) - v7.15

## What
- New `app/js/engines/voice/questionVoice.js`: builds the spoken sentence from the question's numbers (`q.meta`, never the display text, so the answer is never spoken) and plays it with the existing clips only (Phase 13 library - no new recording, no API key). Uncovered text -> stays silent (no robotic OS voice for questions).
- `play.js`: question spoken when it appears (not repeated on the retry re-render); speaker button `.q-hear` in the card corner; clips unlocked inside the "ابدأ" tap (mobile autoplay policy).
- `renderers.js` lock(): `.q-hear` excluded like `.explain-btn` - Phase 11 K3 logic unchanged (answer buttons still locked after a first miss).
- `cheers.js`: `playing()` busy from the request; a stale play() rejection can no longer clear a newer line (reqId) -> the question waits for a verse/cheer to finish.
- Parent panel: per-child switch "قراءة سؤال الماث بالصوت أول ما يظهر" (default on); log entries labelled "سؤال".

## Evidence
- 45,914 generated questions (5 activities x 3 difficulty levels): 0 missing clips, 0 empty sentences, 10 kinds. "يا بطل" ending dropped: no clip (needs masculine + feminine recordings).
- Card +34px (numpad 565 -> 599 on 360x740), replay button never overlaps the text (measured).
- Cheer wait measured: question started 5335ms after a 5136ms line.

## Tests
- New `app/tests/phase15_1_question_voice.py` (23 checks: coverage, clips playback with zero OS voices, log, replay, K3, cheer wait, parent switch).
- Two old tests had assumptions that became false (not broken behaviour):
  - `phase14_1_deadlock`: counted the replay button as an answer button -> excluded like the explain button.
  - `phase13_voice`: guessed "no clip" from a substring; the grid sentence owns a full clip -> expectation from the real coverage rule + a direct check that the speech fallback still works.
- 24/24 suites PASS on v7.15. Protected files sha256 unchanged; PROJECT_VISION.md untouched.

## Known, for 15.2
- The explain "story"/"readaloud" text still says "b groups of a" (opposite of the approved a x b = a groups of b) -> unified with the visual bar in 15.2.

## Live preview
https://8090-ivpoj0ctmre1e6heqhq52-ecea8f22.sandbox.novita.ai/app/index.html#/play/mult_3
