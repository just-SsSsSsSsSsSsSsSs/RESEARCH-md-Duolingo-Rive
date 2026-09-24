# Phase 14.1 HOTFIX - explain sheet [X] froze the question after a miss (gist b2075ed8) - v7.14

## Root cause (verified in code + reproduced in Chromium before the fix)
- renderers.js:11 lock() disables every answer button except .explain-btn after a first miss (Phase 11 K3).
- play.js:178 opening the explain sheet hides the "جرّب تاني" retry bar.
- explainSheet.js:70 [X] only called close() -> no bar, 0 enabled answer buttons = dead screen.

## Fix (one line, architecture unchanged)
- [X] now does close(); onTry?.() - exactly like "هجرّب أحلّ". The same question is re-asked empty and enabled.
- K3 untouched: first miss = -1 heart, no reveal, retry bar, pulsing explain button; only the second miss reveals + next.
- onTry is guarded by every caller (play.js:148, mistakeLoop.js:61 for phaseRunner/story): no-op unless a retry is pending, so [X] before answering changes nothing. No Escape/backdrop dismiss path exists.

## Tests
- New app/tests/phase14_1_deadlock.py: FAILED on the old code ("0 enabled buttons after [X]"), PASSES after the fix.
  A wrong -> explain -> [X] -> same question retry, 12 enabled buttons, right -> recovered, 1 heart lost.
  B [X] before answering -> no state change, still answerable.
  C wrong -> [X] -> wrong again -> reveal + next intact. Session completes 9/10, recovered=1.
- phase14_cheers.py: gender check made whole-word (the correct feminine plural "نقولها" in c20g matched the substring "قولها" -> random false failure). Content unchanged.
- 23/23 suites PASS on v7.14 (e2e bubbles timing flake passed on rerun, known since Phase 13). Protected files sha256 unchanged; PROJECT_VISION.md untouched.

## Live preview
https://8090-i7n1dehr8e0ydwyhqlbuj-3844e1b6.sandbox.novita.ai/app/index.html#/play/mult_3
