# Risk log - K9 acting layer (K9.6-3), branch `sandbox/a1-gate5-art-sw`, 2026-09-27

Hand-written. Every row names who owns the risk, what would trigger it, how it is rolled back (a flag that exists in the code
today - inventory from `index.html` / `engine/*.js` on 2026-09-27: `?engine=v1 ?acting=0 ?brows=0 ?wink=0 ?intent=0 ?perf=0
?flex=0 ?sfx=0 ?sw=0`, plus the OS `prefers-reduced-motion`), and the file that measured it. Status: OPEN = not closed by a number
on the branch; WATCH = closed by a number but worth re-measuring each cycle; CLOSED = measured and inside the declared budget.

| # | risk | owner | trigger / symptom | rollback that exists | evidence | status |
|---|---|---|---|---|---|---|
| R1 | Human "alive" judgement fails: the acting layer reads as code motion, not a character | owner | watch kit result p > 0.05 or v2 chosen < 10/12 | none needed (judgement); per-feature flags let the owner switch off what reads wrong | `samples/watch/` kit + README claim rule | OPEN (human gate G12) |
| R2 | 3-band wing seam visible on high-DPR phones (faint line at the two cuts) | agent + owner accepted budget | a rater or the owner sees the seam at rest at DPR 3 (never measured; DPR1/2 only) | `?flex=0` removes the followers but NOT the bands; reverting to the single plate = regenerate `owl_p2.svg` without `--svg` slice (tool on the branch) | `g14_wing_render.json` rest max 35 DPR2 (budget 35) | WATCH (DPR3 unmeasured, disclosed) |
| R3 | Bend pinholes (64 px DPR2 at 20 deg per segment) show on a large screen | agent | visible background specks through the wing during the 480 ms flap | `?flex=0` (followers off, wing moves as one plate: 0 holes at rest) | `g14_wing_render.json` bend holes per wing 3 / 64 (budget 6 / 64) | WATCH (at the budget edge at DPR2) |
| R4 | Jank under a 4x CPU throttle above 1 % (mid-tier phone proxy) | owner decision pending | matrix 6.38 % at 4x, flex on 13.79 % vs off 7.99 % | `?flex=0`, `?sfx=0`, `?perf=0` each reduce load; `?engine=v1` is the frozen reference | `measure_matrix.json` 02:08:40Z; `g14_flex.json` 04:23:36Z | OPEN (no 4x budget was ever declared - K9_BUDGETS row) |
| R5 | Heap growth with many owls or long sessions | agent | heap delta after the scene > 1 MB, idle loops > 0 | `?n=1` (the app case), `?sfx=0` (drops the noise buffers) | `measure_matrix.json` +0.9 MB (5 owls), idle loops 0; no numeric cap declared | OPEN (cap undeclared) |
| R6 | Autoplay / iOS mute switch: no sound on a real phone | owner (device test) | silence after the first tap on iPhone with the ringer switch off | `?sfx=0` explicit; visuals never depend on audio (measured: 0 cues played, 2 VFX spawned while locked) | `samples/sfx/sfx_autoplay.json` | OPEN (device unverified) |
| R7 | Foley over the teacher's voice | agent | speech intelligibility complaints | duck is automatic (-9 dB while `talk`); `?sfx=0` | `sfx_mix.json` duck -9 dB | CLOSED (measured) |
| R8 | Reduced-motion users get body motion | agent | any root/body layer added under `prefers-reduced-motion` | built in: REDUCED short-circuits performances, flex, intent, VFX | `g11c_ship_visible.json` 9b_reduced addedRootBodyLayers 0; `g14_flex.json` reduced arm 0 followers | CLOSED |
| R9 | Escalation reads as repetition (large performance too often) | owner (pedagogy) | large tier more than 1 in 7 presses | spec `acting.escalation` sequence; `?perf=0` | `g11c_ship_visible.json` 9_performances tiers s s m s s m L | CLOSED |
| R10 | Regression in `app/` (Gate 6 closed) | agent | any diff in `app/` vs main | none needed - the branch never touched it | `git diff origin/main -- app/` = 0 lines at every resume-check | CLOSED (verified each resume) |
| R11 | Service-worker cache serves stale spec after a bump | agent | old `owl.motion.json` behaviour after deploy | `?sw=0`; VERSION bump `g5-19` + `?v=k95a` cache key | `sw.js` SHELL list precaches the current versions | WATCH (bump on every spec change) |
| R12 | Sandbox resets lose uncommitted work | agent (process) | a tool or measurement missing from the branch at resume | rule: commit every tool before its first run; every artefact committed; resume-check compares PROGRESS claims with `git log` | PROGRESS resume-checks #53-#63 (5 losses recorded and redone) | WATCH (process, not code) |
| R13 | Owner-only actions block the phase end | owner | PR unmerged, Pages source not switched, device tests not run | none (merge is owner-only by the constitution) | DIRECTIVES.md #07 request 5, #08 item 4 | OPEN |
| R14 | Numbers in prose drift from the files | agent | a PROGRESS/RESEARCH number differs from its JSON | generated docs (`tools/report_k9.py --check` fails when stale); AGENTS section 13 | K9_MATRIX / K9_BUDGETS / SOUND_CUES generated; two prose corrections already recorded (K9.6-2 timestamp, sfx drop counts) | WATCH |

Not a risk row on purpose: "engine choice" (ADR-002 keeps poses+flex, Rive/canvas ruled out by measurement) is a decision with its own
reopen clause (after G11/G12), not an open risk.
