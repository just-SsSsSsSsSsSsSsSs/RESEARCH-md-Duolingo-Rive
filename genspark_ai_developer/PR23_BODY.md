## Phase 17 — «رفقاء التشجيع» Companion Cast + fx v3 + [X]/sun fix — v7.20

**Owner brief (voice note + gist eafceafc):** encouragement visuals that grab the child, are not static, are not stuck in a corner, look respectable/modern, work for every current and future subject, with many characters (not just the monkey with 2-3 moves) that keep changing. Plus: the [X] quit button sat on top of the sun.

### Research (RESEARCH.md, Phase 17 appendix)
Duolingo's world characters are Rive state machines driven by the app (idle / blink / eye-darts / correct / wrong). The principle is adopted; Rive and Lottie are rejected (40-60KB runtime + WASM/canvas, authoring tools unavailable, external dependency). Decision: our own state machine on the Web Animations API over rendered WebP sprites (compositor-only transform/opacity), a data-driven cast, and a DOM-particle fx layer.

### What changed
- `app/js/engines/companion.js` (new) + `app/content/companions.json` (new): cast = monkey (math), owl (quran/deen), cat (arabic + `'*'` fallback for any subject without its own companion), parrot (podcast + arabic). 5 poses each (idle/think/happy/encourage/celebrate). Idle micro-actions from a shuffled bag with no immediate repeat (breath/blink/glance/hop/lean/wiggle); think after 0.9s; happy on correct; encourage on the first miss (K3 untouched); celebrate on a recovered answer. Cast rotation via `meta.lastCompanion`; the child can pin a favourite (`profile.settings.companion`) or keep "surprise".
- `app/assets/companions/{owl,cat,parrot}/*.webp` (new, ~10KB each) + `tools/cut_sprite_sheet.py` (new): sheet -> transparent per-pose sprites.
- `app/js/ui/views/play.js`, `app/js/app.js`: use the companion engine (subject-aware), pass `recovered` to fx.
- `app/js/engines/fx.js` + `app/css/fx.css` (v3): `burstAt(x,y,level)` at the answer point: pulse ring + starburst (star/heart/spark/dot rotating, no repeat) + ribbons + rays on level 3 (recovered / big combo). Miss = one warm soft ring. `meta.celebration` 0..3 governs intensity; `prefers-reduced-motion` disables everything.
- `app/js/ui/views/profile.js` + `app/css/components.css`: companion picker in settings (surprise + one radio per companion).
- `app/css/sunny.css`: sun moved to the top-right, cloud to the left -> quit [X] no longer intersects the sun (DOM-verified).
- Cache-bust: `companions.json` and sprite URLs carry `?v=APP_VERSION`; importmap regenerated for v7.20.
- README (append-only) Phase 17 section; RESEARCH.md appendix; PROGRESS.md.

### Adding a companion later (no code)
Drop `app/assets/companions/<id>/{idle,think,happy,encourage,celebrate}.webp` and add one entry to `companions.json` with `subjects` (or `'*'`). Bee/turtle/robot are deferred (image-generation credits exhausted).

### Tests
- New `app/tests/phase17_companions.py`: 45 checks (see docstring) — PASS.
- Full batch (28 suites incl. phase16 + phase17, servers :8080 and :8090): 28/28 PASS (per-suite log in `genspark_ai_developer/PROGRESS.md`, R5d + reruns; the two batch reruns were an e2e bubbles-count flake under load and the parrot widening the arabic pool).
- Legacy suites excluded as before: `behaviour.py` (pre-K3, fails on main too), `emoji_sweep.py`, `shots_calmjoy.py`.
- Zero-Emoji sweep on all new/changed files: clean. Protected files (plant.html, math.html, albayyinah.html, quran-alqadr/index.html, PROJECT_VISION.md): 0 diff vs main.

### Screenshots
Think pose (monkey) / level-1 burst on a correct answer / owl on a quran fill / profile picker: https://www.genspark.ai/api/files/s/QHsW9SY0 ; parrot sprites (5 poses): https://www.genspark.ai/api/files/s/SOZmE9Fy

### Fallback
If a companion sprite fails to load (offline/blocked), the engine removes the companion and mounts the Phase 16 code-drawn monkey, so the card corner is never empty (covered by `phase16_render.py` section 3).
