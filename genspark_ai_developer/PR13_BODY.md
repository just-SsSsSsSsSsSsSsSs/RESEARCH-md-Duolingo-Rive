# Phase 12.1 — UX polish from the owner's live mouse+keyboard test (gist 1187b2e8)

Follow-up to merged PR #12. Three defects were reported from the live preview; each was **verified in code before fixing** (RULES.md).

## Live preview
**https://8090-i97dii80goc0mrecx4o1g-2e1b9533.sandbox.novita.ai/app/index.html#/play/distributive**
(Temporary sandbox URL, verified from outside: HTTP 200, `version.json` = 7.10. GitHub Pages after merge.)
Try: type a wrong digit in a slot -> orange pill appears **above** the card for 3.5s and never covers "المجموع"; press Enter repeatedly -> the question never skips; type the expected digits -> the slot verifies and focus moves without tapping the green check.

## Verified causes
1. **Enter skipped the question** - `play.js` feedback bar armed a window `keydown` listener (Enter/Space -> `go()`) 300ms after appearing; the branch renderer's own Enter handler did not stop propagation.
2. **Encouragement covered the sum row and vanished in ~1s** - `fx.floater` at screen centre in `slotMiss`.
3. **Green check required after every digit** - no auto-advance in the branch renderer.

## Fixes
- Branch renderer: Enter/Space captured (`capture` + `stopImmediatePropagation`), verifies the active slot only, released once the tree is complete (`finished` guard). Arabic-Indic digits from mobile keyboards accepted.
- Feedback bar: Enter listener arms after 900ms, ignores `repeat`, requires the bar to still be mounted.
- `nudgePill()`: encouragement pinned above the card (`.nudge-pill`, 3.5s, slide in/out) instead of a floater over the tree.
- Smart auto-advance: expected digit count per slot -> auto-verify; tapping another slot verifies the current entry first; green check kept as optional.
- **Regression found by the suite and fixed**: auto-check + explicit check could verify the same value twice -> phantom miss. Now a single pending auto-check timer, cancelled by any explicit check/del/backspace.
- `math_random` solver relies on auto-advance (the numpad locks on completion, so tapping the check key would hang).

## Tests
- New `app/tests/phase12_ux.py` - **16 checks** (Enter isolation incl. right after completion, pill geometry vs card/sum row, >= 3s visibility, auto-advance via numpad + keyboard, tap-to-move verifies first, green check optional).
- **All 19 suites PASS** on this tree in a fresh sandbox: emoji_audit, svg_leak, cachebust, e2e, layering, math_random, viewports, navoverlap, quran_reader, plant_story, phase10 x3, phase11 x3, phase12_branch (43), phase12_loop_all (31), phase12_ux (16).
- Protected originals sha256 unchanged: fb197ed2… / aac6bafb… / 694859aa… / 52758e3f….

## Docs
README append-only "Phase 12.1" section (header now v7.10); PROGRESS.md M1-M4; version bump **v7.10**.
