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
