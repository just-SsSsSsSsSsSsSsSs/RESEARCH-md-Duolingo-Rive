# Preview - how to see the owl (K9.2c, stable instructions)

Sandbox URLs change after every reset (3 different links in 3 cycles), so this file is the
stable entry point. Every path below is relative to the branch checkout.

## Option A - local, 20 seconds, Python 3 only (no dependencies)

    git clone -b sandbox/a1-gate5-art-sw https://github.com/just-SsSsSsSsSsSsSsSs/RESEARCH-md-Duolingo-Rive.git
    cd RESEARCH-md-Duolingo-Rive
    python3 tools/serve.py 8080
    # open http://127.0.0.1:8080/sandbox/index.html?engine=v2

## Option B - GitHub Pages (one repository setting, owner only)

Pages currently serves `main`; this branch is not merged (Gate 6 closed by decision).
If the owner sets Pages source to branch `sandbox/a1-gate5-art-sw` (Settings -> Pages -> Branch),
the stable URL becomes:

    https://just-ssssssssssssssss.github.io/RESEARCH-md-Duolingo-Rive/sandbox/index.html?engine=v2

The agent cannot change repository settings; this is a one-click owner action. Until then the
sandbox URL of the current session is written at the end of each PROGRESS.md line.

## The 60-second checklist (owner closure criteria, gist 44e55e13)

| # | do | see / hear | flag |
|---|----|-----------|------|
| 1 | open `?engine=v2` | the owl, brows visible, micro-saccades in the pupils | default |
| 2 | bar "acting" -> button wink | one eye closes, the other squints, head tilts, glint + soft chime | `?wink=0` disables the automatic wink on celebrate |
| 3 | button brows | brows toggle; `&brows=0` starts hidden | `?brows=0` |
| 4 | button roll | full 360 aerial roll, whoosh + speed lines, level landing | escalation: small, small, medium, ... large every 7th |
| 5 | `&poses=1` then buttons 1..6 | the owl freezes on each pose; compare with `samples/proofs/g11_pose_sheet.png` | `?poses=1` |
| 6 | `&reel=1` or button "30 s" | 9 captioned beats in about 27 s | `?reel=1` |
| 7 | `&sfx=0` | silence, visuals unchanged. Measured (g11c_ship_visible.json 7_sfx0): same flight, 12 cues fired, sounds played 0, active voices 0, audio elements 0, audio files fetched 0; control page after one click: bus running, sounds played >= 1 | `?sfx=0` |
| 8 | button "intent" (K9.3) | before every flight: pupils snap toward the target first, the head turns 40-50 ms later, the body crouches 200-280 ms after the eyes, then take-off; press again to fly home the same way. Strip: `samples/proofs/g12_intent_strip.png` | `?intent=0` disables (flight unchanged) |
| 9 | buttons "triumph" / "oops" / "puzzled" (K9.4) | escalating performances per channel: presses 1-2 small, 3rd medium, 7th large (then the cycle repeats). Triumph large = crouch, jump with a full 360 roll centred on the apex, wink, stars + hearts. Oops large = double take (two anticipations), stretch, hold, recoil with a 3-cycle decaying jiggle, shrug. Puzzled large = 2-turn pupil spiral, 14 deg head tilt, hand to chin, thought bubble, shrug. Idle owl: named moving-hold impulses (foot shift, wing settle, head micro-turn, double blink) every 2.5-6 s, never during a flight. Measured: `samples/proofs/g13_performances.json` (pass_all true, 3 runs) + `g13_performances_strip.png` | `?perf=0` restores the pre-K9.4 clips (celebrate / sad / think) |
| 9b | OS "reduce motion" + the same three buttons | face only (mouth + blink), no body or root motion, no VFX; the caption still names the tier. Measured (g11c_ship_visible.json 9b_reduced): added root/body layers 0, performances counted 3 | `prefers-reduced-motion` |

Automated version of this table: `python3 sandbox/ship_visible_proof.py` -> `samples/proofs/g11c_ship_visible.json`.

## Preview log (commit, date, URL)

- 2026-09-26 fd0999b: sandbox URL issued per session, recorded in the PROGRESS.md line of that session.
