# ADR-001: Cinematic motion engine for the owl - physics-driven secondary motion on native WAAPI, data-driven Character Spec

- Date: 2026-09-26 - Branch: `sandbox/a1-gate5-art-sw` - Status: approved for sandbox implementation (owner constitution gist 015a32a6 rev 555a2147)
- Scope: the owl only. Nothing in `app/` changes.

## Context
The owner reviewed PR #9 (curated waypoint flights, keyframed acting) and judged it "better, but acceptable, not above excellent". The new constitution demands: the 12 animation principles applied physically (not hard-coded tweens), a data-driven character engine (new character = data, not code), a performance budget (60 fps, jank under 1 percent, RAM delta about 0, no idle render loops), ADRs, and an original composition "nobody shipped before".

Current state (inspected, `sandbox/rig.js` 598 lines): WAAPI keyframes on `data-joint` groups; flights are polylines between waypoints with per-segment easing (arcs are approximated, not real curves); anticipation/squash are fixed keyframe numbers inside methods; follow-through exists only as one spring easing on the arms; no feather-level secondary motion; no state machine (methods + a `busy` flag); behaviours are code, not data.

## Options considered
| # | Option | Motion quality ceiling | Bundle / RAM | Audio sync | New character = data? | Evidence |
|---|---|---|---|---|---|---|
| 1 | Rive runtime + state machine (Duolingo's route) | highest authored quality; visemes via 20+ mouths per character | 222 KB brotli WASM (E3), 276 MB RSS in Callstack test (E9), Safari canvas leak class (E5) | timings precomputed server-side by speech models (Duolingo blog, L2) | yes, but authored in a paid editor (9 USD/seat, E7) | blog.duolingo.com/world-character-visemes (2022-11-10, L2); rive.app docs (L1) |
| 2 | dotLottie + LottieFiles state machines (2025) | After Effects keyframes; state machine is no-code but transitions are between pre-rendered clips, no runtime physics | 33 KB gz runtime (bundlephobia) | none native; audio must drive state switches from JS | new character = new AE project | lottiefiles.com/state-machine, docs.lottiefiles.com interactivity (2026-08-25, L1) |
| 3 | Sprite strips on Canvas | video-like frames if the art is consistent | 4-12 MB decoded per action set (H3) | frame index per envelope level | new character = full strip set | arithmetic + Phase 17 credit history (L3) |
| 4 | Native SVG skeleton + WAAPI (current) + procedural physics layer + data spec (this ADR) | limited only by the part count and our physics; compositor-only transforms | 0 KB library; owl 110 KB parts; heap delta 0.6 MB measured | real-time envelope from AnalyserNode (measured in round 3) | yes: JSON spec (joints, springs, states) | MDN WAAPI (L1), MDN KeyframeEffect.composite add (L1, 2023-04-07), CSS `linear()` easing Baseline widely available (caniuse/MDN 2026-04, L1), web.dev compositor-only properties (L1) |

## Evidence notes
- Duolingo (L2): quality comes from (a) state machine blending mouths and poses concurrently, (b) precomputed phoneme timings. Their cost: a paid authoring tool and a speech pipeline. We can copy (a) as a data-defined state machine with concurrent "layers" (body state + mouth state + gaze state), and replace (b) with the real-time RMS envelope (owner decision Q-A1-4: no visemes).
- WAAPI `composite: 'add'` (L1) lets many independent layers stack on one joint transform without fighting - this is what makes a physics layer possible on top of authored keyframes without a scene graph library.
- CSS `linear()` (L1, Baseline) lets a sampled spring or any physical curve become an easing - we already sample springs into it.
- No source in the market survey ships procedural, velocity-driven feather physics computed from the character's own flight velocity on pure web standards without a runtime library. That is the original element.

## Decision
Option 4, extended with three modules and one data contract:
1. `motion-spec` (data): `sandbox/companions/owl.motion.json` - Character Spec: joint hierarchy delays (overlap), spring parameters per secondary group (wing tips, ear tufts, body), squash/anticipation amplitudes and durations per state, timing ranges (never constant), gaze/blink distributions, state machine (states, layers, transitions, blend durations). A new character = a new JSON + SVG parts.
2. `physics.js`: tiny spring-damper integrator (semi-implicit Euler, fixed 120 Hz sub-steps) that runs ONLY while a primary motion is active plus a settling window, then stops (no idle loop). Inputs: primary velocity (derived analytically from the flight curve, not from layout reads); outputs: per-group rotation written through short additive WAAPI segments (`composite:'add'`, `fill:'forwards'` replaced each frame via `commitStyles`-free approach: one persistent animation per group whose `currentTime` we do not touch; instead we update via `effect.setKeyframes` once per frame). This keeps transforms on the compositor and avoids style recalculation of the whole tree.
3. `states.js`: data-driven state machine with concurrent layers (body, mouth, gaze) and blend-out durations, events in/out, so lesson code says `owl.fire('answer:correct')` and never calls animation methods.
4. Flight: real curves (quadratic/cubic Bezier through a chosen apex) sampled into WAAPI keyframes with arc-length parameterisation so speed follows easing not segment length; anticipation (crouch 150-250 ms, data) and landing squash (scaleY 0.8 then damped rebound, volume preserved via scaleX = 1/scaleY) become spec numbers.
5. Feature flag: `?engine=v1` keeps the round-3 engine for side-by-side comparison; `v2` default. Rollback = flag.

## Consequences
- Performance: physics loop costs one rAF only during motion (about 1-5 s per action); per frame: 6 groups x 2 sub-steps of arithmetic + 6 `setKeyframes` calls. Expected p95 unchanged (16.7 ms); to be measured, with jank counted as frames over 20 ms.
- Complexity: three small modules instead of one; the API surface for the app becomes `mount(spec) -> fire(event)`.
- Risk: `setKeyframes` per frame is uncommon; fallback is `style.transform` writes on the 6 secondary groups only (still compositor-friendly, no layout). Both measured.

## Rollback
`?engine=v1` in the demo, or delete `physics.js`/`states.js`; the SVG skeleton and parts contract do not change.

## Visual proof plan (G2-G8)
Slow-motion capture (Playwright screenshots at 30 ms steps) for landing squash; path trace overlay drawn from the sampled Bezier; sequential frames after landing for feather settling; recording with real audio for secondary action; side-by-side v1/v2 video.
