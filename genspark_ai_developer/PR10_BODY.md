# Phase 12 — Schoolbook visual parity (خواص الضرب بالتفكيك) + shared mistake-learning loop

Source: issue #10 (Ministry textbook pages 8-9, lesson 2-1 "distributive property, part 2") + gists 6f2f6c95 (directive) and 3f69e14a (frozen decisions). Per RULES.md: every claim verified in code/DOM; **design was proposed first (A/B1/B2) and A was approved** before any code.

## Live preview (mandatory per directive)
**https://8090-i3gsj0npx7otyfkt7gdp5-d0b9e1e2.sandbox.novita.ai/app/index.html#/play/distributive**
(Temporary sandbox URL - alive while this session lives. Verified from outside: HTTP 200, `version.json` = 7.9, first distributive question renders as `branch` with SVG connectors.)
GitHub Pages after merge: https://html-mobile-audio.github.io/html-mobile-audio/app/index.html#/play/distributive

## Verified gap (before design)
- Textbook: root problem on the right -> "<" branch -> two rows `(factor x part) = [ ]` -> horizontal sum line -> "المجموع [ ]".
- `math.html` (protected): `.tree-container`/`.branch-connector` exist (lines 310-336) but rows are stacked vertically with no drawn connectors. Untouched.
- `app/` `generators.distributive`: linear equation `4 x 7 = (4 x 5) + (4 x ?)` only. No tree renderer existed.

## L1-L2 — `branch` renderer (design A)
- Root capsule -> trunk + rounded elbows drawn as **one dynamic SVG** computed from the real slot rectangles (re-laid out on resize; test asserts 0px endpoint error on 3 widths). First-pass side curve overlapped the boxes in the screenshot review -> redesigned as trunk-from-root-bottom with elbows.
- Slots >= 56px, filled via the existing `.numpad`, auto-advance (part 2 -> branch 1 result -> branch 2 result -> sum), any slot tappable.
- Per-slot check: correct -> green + locked; wrong -> **existing mistake loop at slot level** (`ctx.slotMiss`: heart once via `session.retry`, shake, warm nudge, pulsing explain button, **no reveal**). `ctx.done(true)` fires once when the tree is complete; `meta.slots` records which slots were missed.
- Generator: mode 2 -> `type:'branch'` alongside the two previous modes; `meta.kind:'distributive'` so "يعني إيه يا بابا؟" strategies work unchanged. `math_random` solver extended.

## L4 — shared `ui/mistakeLoop.js` -> phaseRunner (Quran) + story (plant)
Owner decision applied: on a wrong answer in "ترتيب الآيات"/"إكمال الكلمة"/story questions, **highlight only the wrong position** (soft orange + light shake), never show the right item; "جرّب تاني"/"هجرّب أحلّ" re-ask the same question empty; recovered cheer on second-try success; reveal only after the second miss.

## Tests
- New: `app/tests/phase12_branch.py` (**43 checks**), `app/tests/phase12_loop_all.py` (**31 checks**).
- All **18 suites PASS** in a fresh sandbox on this exact tree: emoji_audit, svg_leak, cachebust, e2e, layering, math_random, viewports, navoverlap, quran_reader, plant_story, phase10 x3, phase11 x3, phase12 x2.
- Note: `e2e` once reported 7 live bubbles instead of >= 8 (physics-timing flake) and passed on rerun; no bubbles code was changed in this phase (`git diff --stat` confirms).
- Protected originals sha256 unchanged: plant.html fb197ed2…, albayyinah.html aac6bafb…, math.html 694859aa…, quran-alqadr/index.html 52758e3f….

## Docs
README.md append-only section for Phase 12 (header now "المراحل 9-12 … v7.9"); PROGRESS.md L0-L5; version bumped to **v7.9** (importmap includes `ui/mistakeLoop.js`).
