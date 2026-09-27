# Watch kit G12 (K9.6-2) - generated 2026-09-27T05:05:59Z by sandbox/watch_kit.py

Open `index.html` from a local copy of this folder (no server, no network, 0 external resources).
4 trials per rater; each trial shows the same beat on two engines side by side in a pre-shuffled left/right
order (seed 20260927; sha256 of the order `bc00a361cefcc89ea4be4f7670fa27a7d585e108b91d0da955900bac0a0202e1`). One forced choice per trial: "which one is alive?"
(2AFC). Replay at most 2. The key is revealed after the last trial. The rater copies the JSON result block back.

Read-out: count for v2 out of n and the exact two-sided binomial p. Examples (k/n: p): {"12/12": 0.0005, "11/12": 0.0063, "10/12": 0.0386, "9/12": 0.146, "8/12": 0.3877, "7/12": 0.7744, "16/16": 0.0, "15/16": 0.0005, "14/16": 0.0042, "13/16": 0.0213, "12/16": 0.0768, "11/16": 0.2101, "20/20": 0.0, "19/20": 0.0, "18/20": 0.0004, "17/20": 0.0026, "16/20": 0.0118, "15/20": 0.0414}
Claim rule declared here: v2 "reads alive" only if two-sided p <= 0.05 AND v2_chosen > n/2 (v2 in the UPPER tail),
over >= 12 trials from >= 3 named raters; anything else is reported as no evidence (FAIL / INSUFFICIENT).
Direction matters (owner audit, gist rev d33eaf03): the two-sided p is symmetric, so 10/12 and 2/12 both give
0.0386 and 0/12 gives 0.0005 - a small p with v2 losing is a LOSS, never a pass. Score with `score.html`
(offline, next to this file) or `node sandbox/tests/g12_score.mjs`; never by reading p alone.

| trials n | v2 must win at least | two-sided p at that k | mirror |
|---|---|---|---|
| 12 | 10/12 | 0.0386 | 2/12 gives the SAME p and is a LOSS |
| 16 | 13/16 | 0.0213 | 3/16 gives the SAME p and is a LOSS |
| 20 | 15/20 | 0.0414 | 5/20 gives the SAME p and is a LOSS |

Results: one JSON file per rater session in `results/` (append-only), scored together.

Limits: Control arm = v1 (frozen K7 engine on this branch). The gist asks for a still from the reference video; no such file exists in the repository, so none is shown. Raters are not independent of the owner; the p-value is indicative only. 4 trials per rater; 3-5 raters give 12-20 trials.

| clip | bytes | sha256 (16) | duration s |
|---|---|---|---|
| v2_celebrate | 842534 | 87b2509b6bfd033c | 10.4 |
| v2_flight | 1111386 | cf2426fa83121042 | 10.4 |
| v2_think | 741296 | be50bc2b1d5fc3d1 | 10.4 |
| v2_sad | 909707 | f9aa5c168c7399d0 | 10.4 |
| v1_celebrate | 789910 | 724059b1ba5cff8d | 10.4 |
| v1_flight | 646210 | ec53f49b8745eace | 10.4 |
| v1_think | 811691 | a686cdba5b42c8d5 | 10.4 |
| v1_sad | 1019739 | 055c95d123c1c114 | 10.4 |

Total 6.88 MB (budget 12.0 MB): PASS; clip duration <= 10.5 s: PASS; page errors: none.
