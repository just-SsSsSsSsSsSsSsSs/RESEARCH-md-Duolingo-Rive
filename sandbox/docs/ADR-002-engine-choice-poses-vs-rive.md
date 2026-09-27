# ADR-002: Engine for the acting layer - SVG poses + flex vs custom Canvas2D rig vs Rive

- Date: 2026-09-26  - Branch: sandbox/a1-gate5-art-sw  - Status: proposed (decision = owner)
- Provenance rule applied: every number below is tagged [measured], [primary source] or [inference].

## Context
Owner verdict on the v2 owl: motion quality is measured and good, but the character reads
"cold, traditional, no soul". Independent review (gist a402871d rev 49d30cd9) located six causes
inside owl.motion.json; all six were verified in this repo [measured, 2026-09-26]:
1. flight.bankLimit = 24 deg -> loops / barrel rolls structurally impossible.
2. holdMs appears exactly once (takeoff crouch) -> no snaps, no holds, springs never rest.
3. armL/armR are exact mirrors, legL == legR numerically -> perfect symmetry.
4. all secondary gains are driven by the owl's own velocity/acceleration -> reactive, no intent.
5. hierarchy.eyes { parent: head, delayMs: 60 } -> eyes lag the head (dead gaze); no eye-lead.
6. states name clips ("ponder", "jumpJoy") whose shape lives in engine code, not in data.

A proposal circulated to "adopt Rive like Duolingo". Facts checked at the primary source
(blog.duolingo.com/world-character-visemes, fetched 2026-09-26, 8/8 quotes verbatim):
Duolingo uses Rive; poses are separate states from mouth states; a State Machine blends them;
"the handoff from animator to engineer was seamless" - i.e. an animator authors the performance.
Not in that source: any claim that CSS/cutout was tried and rejected, any ".riv 25-35 KB" figure,
any mention of bones/mesh deformation in their pipeline [audit in gist, confirmed here].

## Constraint discovered in this repo [measured]
sandbox/companions/owl_p2.svg is 12 raster <image> parts (webp, 113 KB total) inside
<g data-joint> groups, 0 <path>. Any "wing tip path morph" or "mesh deformation" requires either
a vector redraw of the parts or a raster warp technique. This is not a blocker for poses, holds,
asymmetry, eye-lead or intent (all are joint transforms), but it caps K9.3 until art is decided.

## Options
| | A: SVG joints + Pose Library + limited flex | B: custom Canvas2D rig (bones + 2D mesh warp) | C: Rive runtime (canvas-lite) |
|---|---|---|---|
| Wire size added | 0 KB runtime; spec grows by a few KB [inference: poses are JSON] | 0 external deps; est. 15-30 KB engine code [inference] | 457 KB gz (wasm 362 + js 95) for canvas-lite; 1012 KB gz for webgl2 [measured unpkg 2.43.1] |
| Current engine size for comparison | 22 KB gz (engine + spec) [measured] | | 20x current engine |
| Runtime deps | 0 | 0 | 1 (MIT) [primary: npm license field] |
| RAM delta | ~0 (transforms only, already measured 0.71-0.84 MB heap for 1-5 owls) | canvas per owl + mesh buffers: must be measured | wasm heap; must be measured; guard "RAM delta ~0" at risk |
| Authoring | JSON poses; agent + owner review via pose sheet | JSON + mesh definitions; more engineering | .riv in Rive editor (human animator); Free plan = limited export [secondary source, not verified here] |
| Deformation | joint transforms, skew/scale flex, 3-segment wing from sliced raster or redrawn vector | true warp | true bones + mesh |
| Portability to a State Machine later | same state/pose names | same | native |
| Fits K9 asks (holds, asymmetry, eye-lead, intent, loop flight) | yes, all are transforms | yes | yes, but needs an animator |
| Risk | limited "soft" feel until art is vector | large engineering, new perf surface | breaks "0 deps" guard, needs animator and subscription |

## Decision (recommendation - owner decides)
Option A now. It is the only option that adds performance quality without touching the
size/RAM guards, and every artifact (pose names, beat maps, state names) is portable to B or C.
Reopen this ADR after G11/G12 if the pose sheet proves the raster parts cannot read as alive;
at that point the fork is "redraw parts as vector (stay A)" vs "B".

## Consequences
- validateSpec grows: poses, beats, asymmetry, eyeLead must resolve or the spec is rejected.
- Performance budget stays: p95 <= 16.7 ms, jank < 1 % with 5 owls, idle loops 0; any flex work is
  measured before merge and applied to the active owl only if it costs.
- Escalation rule for reactions: small (default) -> medium (streak 3) -> large (rare).

## Rollback
Feature flag: ?acting=0 (or spec.acting.enabled=false) restores the v2 behaviour exactly.
Pose Library is additive data; removing it returns to K8 state.

## Visual proof
To be attached: sandbox/samples/proofs/g11_pose_sheet.png (K9.0).

## Addendum (d) - raster flex ceiling, measured (2026-09-26, K9.2b-4, directive #03)
Question from the owner: how far can the raster parts flex before we need Option B (custom mesh warp)
or a vector re-author? Answered by building and measuring, not by estimating.

Prototype: `sandbox/proto/meshwarp.html` (80 lines, 0 deps). wingL.webp is cut into a GRID x GRID mesh,
vertices displaced by a quadratic bend + tip flutter, each cell drawn as two affine-textured triangles
(setTransform + clip + drawImage, the standard Canvas2D technique). Harness: `sandbox/meshwarp_measure.py`,
same host, same headless Chromium, same rAF-delta metric and CDP CPU throttle as `sandbox/measure.py`;
3 runs x 240 frames per cell, median of medians. Raw: `samples/proofs/g11d_meshwarp_cost.json`,
frame: `samples/proofs/g11d_meshwarp.png`.

| renderer | cpu | owls | parts/owl | tris/frame | JS draw ms p50 | rAF p50 ms | rAF p95 ms | jank >20 ms |
|---|---|---|---|---|---|---|---|---|
| mesh-warp Canvas2D | 1x | 1 | 2 wings only | 64 | 1.0 | 16.7 | 16.9 | 0.8 % |
| mesh-warp Canvas2D | 1x | 5 | 2 wings only | 320 | 1.1 | 18.2 | 28.0 | 14.2 % |
| mesh-warp Canvas2D | 1x | 5 | 2 wings only, grid 6 | 720 | 2.5 | 27.7 | 59.7 | 100 % |
| mesh-warp Canvas2D | 4x | 1 | 2 wings only | 64 | 1.6 | 20.6 | 28.8 | 65.7 % |
| mesh-warp Canvas2D | 4x | 5 | 2 wings only | 320 | 1.2 | 76.2 | 86.0 | 100 % |
| mesh-warp Canvas2D | 4x | 5 | 2 wings only, grid 6 | 720 | 3.5 | 117.8 | 129.3 | 100 % |
| SVG engine v2 (current, sfx=0) | 1x | 1 | 12 parts, full acting | - | - | 16.7 | 16.7 | 0.0 % |
| SVG engine v2 (current, sfx=0) | 1x | 5 | 12 parts, full acting | - | - | 16.7 | 16.7 | 0.0 % |
| SVG engine v2 (current, sfx=0) | 4x | 1 | 12 parts, full acting | - | - | 16.7 | 16.7 | 0.3 % |
| SVG engine v2 (current, sfx=0) | 4x | 5 | 12 parts, full acting | - | - | 16.7 | 33.3 | 6.2 % |

All rows [measured] on the sandbox host (2 cores, headless Chromium; `host` block in each JSON).
SVG rows: `samples/measure_p2_v2_nosfx.json`, `samples/measure_p2_v2_cpu4x_nosfx.json`.

Findings:
1. The JS-side `draw_ms` (1-3.5 ms) hides the real cost: per-triangle clip + drawImage is rasterised by
   Skia after the script returns, so only the frame delta shows it [measured: rAF p50 76 ms while draw_ms 1.2].
   Any "it only takes 1 ms" claim for Canvas2D texture triangles is therefore untrustworthy without rAF data.
2. With 1 owl and only 2 warped parts at CPU 4x the mesh warp already misses the budget (jank 66 % vs 0.3 %
   for the whole 12-part SVG owl). The full owl (12 parts) would be at least 6x that triangle count.
3. Visible seams appear at cell edges (screenshot); the standard fix (overlapping clips, edge padding) adds
   more fill per triangle, i.e. more cost, not less.
4. Wire cost of B is small (proto 80 lines; engine estimate 15-30 KB) - the cost is CPU, not bytes.
   C (Rive canvas-lite) stays at 457-1012 KB gz vs the current 22 KB gz engine + spec [measured earlier].

Trade-off (time, perf, who):
| route | time | perf on mid-tier proxy (CPU 4x) | who | what it unlocks |
|---|---|---|---|---|
| (1) B: custom Canvas2D mesh warp, 0 deps | 2-4 weeks engineering + a WebGL rewrite to recover perf [inference] | fails at 1 owl / 2 parts [measured] | engineer only | true bend of raster parts |
| (2) vector re-author of the 12 parts as `<path>` | art work per part; slicing tool already exists for pivots [inference: hours per part] | joint transforms unchanged; path `d` morphs are cheap for a few paths (to be measured per part) | artist or agent-authored paths + owner review (pose sheet) | wing-tip / feather morph, soft silhouettes, smaller bytes than webp |
| (3) stay A: raster slices + joints (proven) | 0 | 16.7 ms p50, 6.2 % jank at 5 owls [measured] | agent | 2-3 segment wing via `tools/slice_parts.py` (same technique as the eye slice, pixel_diff 0), holds, asymmetry, eye-lead, roll |

Recommendation (owner decides): keep A; do not pursue B - the measured frame cost rules it out on this host
before any engineering. The only route to real soft deformation is (2), a vector re-author, and that is an
art decision, not an engine decision: open it only if G11 v2 (silhouette-first poses + blur test) shows the
silhouettes do not read at 8 %+ delta with slicing alone.
Rollback: the prototype lives only under `sandbox/proto/`; nothing in the engine references it.

## Visual proof update - G11 v2 silhouette-first (2026-09-26, K9.2b-5)
`sandbox/pose_sheet.py` now scores every pose as a silhouette: area(neutral XOR pose) / area(neutral), alpha > 0.5,
DPR 2, sharp and after a 6 px gaussian blur of both masks (the squint test). Gate: blurred delta >= 8 %.
Sheet `samples/proofs/g11_pose_sheet.png` row 2 = the blurred stills with scores; raw in `g11_pose_sheet.json`.

| pose | before (blur %) | after (blur %) | gate 8 % |
|---|---|---|---|
| alert | 7.9 (face-only: pupils + brows + 6 deg head) | 12.3-13.7 over 3 runs (body tall/narrow from the feet pivot, wings tucked, neck up) | PASS |
| charged | 19.5 | 19.6 | PASS |
| launch | 27.4 | 26.8 | PASS |
| puzzled | 20.3 | 19.9 | PASS |
| triumph | 21.4 | 21.8 | PASS |
| oops | 21.8 | 22.2 | PASS |

Result [measured]: 6/6 poses read as silhouettes with joint transforms on the raster slices alone; the
vector re-author route (2) in addendum (d) is therefore NOT opened by G11 v2. Calibration note: the 8 % gate sits
between the face-only value (7.9) and the weakest true body pose (12.3), so it separates "face beat" from
"silhouette pose" on this rig; it is a floor, not a target.

## Performance matrix under identical conditions (2026-09-26, K9.2b-6) [measured]
`sandbox/measure_matrix.py` (reuses `measure.measure()`), n = 5 owls, 10 s scene (fly, celebrate, talk),
3 interleaved rounds, medians; raw `samples/measure_matrix.json`.

| cell (n=5) | cpu | rAF p50 | p95 | p99 | max | jank >20 ms % (3 rounds) | heap MB | anims idle | idle loops | p95 <= 20 | jank < 1 % |
|---|---|---|---|---|---|---|---|---|---|---|---|
| v2 + Foley | 1x | 16.7 | 16.8 | 16.8 | 16.8 | 0.0 (0.0, 1.7, 0.0) | 0.86 | 73 | 0 | yes | yes |
| v2 no-Foley | 1x | 16.7 | 16.7 | 16.8 | 16.8 | 0.0 (0.0, 1.2, 0.0) | 0.80 | 73 | 0 | yes | yes |
| v1 reference | 1x | 16.7 | 16.8 | 33.4 | 50 | 2.8 (3.7, 0.8, 2.8) | 0.65 | 38 | 0 | yes | NO |
| v2 + Foley | 4x | 16.7 | 33.3 | 33.4 | 50 | 5.8 (5.8, 5.8, 7.2) | 0.86 | 73 | 0 | NO | NO |
| v2 no-Foley | 4x | 16.7 | 16.8 | 33.4 | 50 | 4.5 (2.2, 4.5, 5.5) | 0.80 | 73 | 0 | yes | NO |
| v1 reference | 4x | 16.7 | 16.8 | 33.4 | 50 | 2.9 (2.2, 2.9, 3.8) | 0.65 | 38 | 0 | yes | NO |

Reading: at CPU 1x the v2 engine (with all K9.2c acting: brows, saccades, wink, roll, poses) holds the budget with
5 owls and is cleaner than v1 (v1 drops frames during its own flight clip). At the 4x mid-tier proxy nobody holds
jank < 1 % with 5 owls; v2 + Foley is the worst cell (p95 33 ms), and Foley alone costs about 1.3 jank points there.
Idle-loop guard is 0 in every cell (a 6 s window had shown 5 - it was the still-running 3.2 s talk clip, verified
with a probe, not a leak). Consequence for K9.3: keep the Foley bus gated on the active owl only when the device
proxy is slow (existing `?sfx=0` path becomes the automatic fallback), and measure again after beats + intent land.

## Addendum (d2) - third route requested by the owner: vector re-author of the WING only (2026-09-26, DIRECTIVES #06)
Facts [measured on the branch]: wingL.webp + wingR.webp = 27.1 KB of the 113 KB active plates (24 %); the two wings
are 16.6 % of the owl's drawn opaque area (upper bound, overlaps counted); they are the only parts whose acting asks
for bend (flap, fold, wing-tip curl) - head, body, eyes, beak and legs act fully with rigid transforms today.
Every wing pose already reads at silhouette level (G11 v2: charged 19.6 %, launch 26.8 %, oops 22.2 %).

| route | scope | time | perf | who | unlocks | risk |
|---|---|---|---|---|---|---|
| (2a) vector re-author, whole owl | 12 parts | weeks of art | fine (few paths) | artist | everything soft | style drift across 12 parts; eyes/beak gain nothing |
| (2b) vector re-author, wings only | 2 parts (mirror-authored once) | days of art + 1 day rig | fine: 2 paths with `d` morph, measured before merge | artist or agent-authored path + owner review | wing-tip curl, fold, feather-edge morph = the whole "soft" ask; keeps 10 raster plates and pixel_diff 0 elsewhere | style seam between vector wing and raster body (must be checked on the pose sheet at DPR 1/2) |
| (3) stay A with a 2-3 segment sliced wing | 2 parts sliced | hours (tools/slice_parts.py exists) | 0 measurable | agent | fold + tip lag by joint transforms only; no curl | ceiling: no continuous bend |

Assessment: (2b) is the best return/cost ratio of the three IF continuous bend is required, because the wings carry
the entire deformation need at a quarter of the art bytes and a sixth of the silhouette. It is still an art decision:
the trigger stays the same as in (d) - open (2b) only if a K9.3+ beat cannot read with (3). Until then (3) is the
path (0 art work, measured 0 cost, same silhouette technique that made the eye slices pixel-exact).
Provenance: all numbers above are internal measurements (parts.json byte sizes, alpha masks, g11_pose_sheet.json).

## Correction to the performance reading (2026-09-27, DIRECTIVES #07 note 1) [generated from samples/measure_matrix.json, commit b34f6df]
The table above is the K9.2b-6 file (fad583b). The branch file was re-measured in K9.3-5 with intent ON and a control
cell; the current numbers are these (every value below is printed by a script from the JSON, not typed):

| cell (n=5) | cpu | rAF p50 | p95 | p99 | max | jank >20 ms % (3 rounds) | heap MB | anims idle | idle loops | p95 <= 20 | jank < 1 % |
|---|---|---|---|---|---|---|---|---|---|---|---|
| v2 + Foley | 1x | 16.7 | 16.7 | 16.8 | 33.4 | 0.84 (0.84, 0.84, 0.0) | 0.88 | 73 | 0 | yes | yes |
| v2 no-intent | 1x | 16.7 | 16.8 | 33.4 | 50 | 2.76 (0.0, 4.36, 2.76) | 0.88 | 73 | 0 | yes | NO |
| v2 no-Foley | 1x | 16.7 | 16.8 | 50 | 66.6 | 3.69 (5.54, 3.69, 0.0) | 0.82 | 73 | 0 | yes | NO |
| v1 reference | 1x | 16.7 | 16.8 | 50 | 50.1 | 2.77 (2.77, 1.02, 3.87) | 0.65 | 38 | 0 | yes | NO |
| v2 + Foley | 4x | 16.7 | 33.3 | 33.4 | 50 | 6.24 (5.81, 6.24, 6.98) | 0.88 | 73 | 0 | NO | NO |
| v2 no-intent | 4x | 16.7 | 33.3 | 33.4 | 50 | 6.19 (4.18, 6.19, 8.36) | 0.88 | 73 | 0 | NO | NO |
| v2 no-Foley | 4x | 16.7 | 16.8 | 33.4 | 50.1 | 4.37 (2.56, 4.37, 4.96) | 0.82 | 73 | 0 | yes | NO |
| v1 reference | 4x | 16.7 | 16.8 | 33.4 | 50.1 | 3.47 (2.04, 4.03, 3.47) | 0.65 | 38 | 0 | yes | NO |

Measured at 2026-09-26T23:55:50Z, host 2 cores (Intel(R) Xeon(R) Processor @ 2.50GHz), HeadlessChrome/153.0.8010.12.

What the data supports:
- At CPU 1x, every cell holds p95 <= 20 ms; only the shipped cell (v2 + Foley) holds jank < 1 % in this run.
- At CPU 4x with 5 owls, no cell holds jank < 1 % (range 3.47-6.24 %); v2 + Foley and v2 no-intent miss p95 (33.3 ms), v2 no-Foley and v1 hold it.
- Intent cost: v2 + Foley vs v2 no-intent differ by 0.05 jank points at 4x and both sit at p95 33.3 -> no measurable cost of K9.3.

What the data does NOT support (retracted): "Foley alone costs about 1.3 jank points" and the consequence "gate the Foley
bus when the device proxy is slow". The direction reverses between throttles (Foley is the best cell at 1x, the worst
at 4x) and the per-round spread inside a single cell reaches 5.54 points, larger than the between-cell gap at 1x
(2.85) and comparable to it at 4x (2.77). On a shared 2-core host, 10 s = about 600 frames, so 1 jank point = 6 frames;
differences of this size are host noise, not subsystem behaviour. Trend only: the simplest cell (v1) is the most stable,
the full v2 the least. No product decision (Foley gating or otherwise) is taken from this host; it needs a real device
measurement, which the owner holds. The 4x p95 miss of the full v2 cell is real, repeatable (3/3 rounds in both files),
and stays an open item.

Rule for reports (AGENTS.md section 13): a number quoted in a report or PROGRESS line is copied from the committed file
that carries it, with the file's commit hash; tables in docs are generated by script where possible.
