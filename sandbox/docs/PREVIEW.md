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
| 7 | `&sfx=0` | silence, visuals unchanged | `?sfx=0` |

Automated version of this table: `python3 sandbox/ship_visible_proof.py` -> `samples/proofs/g11c_ship_visible.json`.

## Preview log (commit, date, URL)

- 2026-09-26 fd0999b: sandbox URL issued per session, recorded in the PROGRESS.md line of that session.
