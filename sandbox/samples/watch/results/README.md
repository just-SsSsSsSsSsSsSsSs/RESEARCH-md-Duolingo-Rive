# G12 rater results (append-only)

One JSON file per rater session, pasted verbatim from the kit's result block, plus a `_record` field (source, time,
verdict of that block alone). Score all files together with `../score.html` (offline) or check the scorer with
`node sandbox/tests/g12_score.mjs`. The verdict is never written by hand: PASS iff two-sided p <= 0.05 AND
v2_chosen > n/2 over >= 12 trials from >= 3 named raters; a small p in the lower tail is a LOSS (FAIL).

| file | rater | n | v2 | p (two-sided) | alone |
|---|---|---|---|---|---|
| 2026-09-27_gist-d33eaf03_rater-null.json | (unnamed) | 4 | 3 | 0.625 | INSUFFICIENT |
| 2026-09-27_gist-6ed35984_rater-null-2.json | (unnamed) | 4 | 3 | 0.625 | INSUFFICIENT |
| 2026-09-27_gist-6ed35984_rater-salim.json | سليم | 4 | 3 | 0.625 | INSUFFICIENT |
| 2026-09-27_gist-6ed35984_rater-karma.json | كارما | 4 | 3 | 0.625 | INSUFFICIENT |

## Kit v1 sessions (owner finding, gist rev b693458e)

The four sessions above were rated on kit v1 (generated 2026-09-27T05:05:59Z, seed 20260927, order_sha256
bc00a361cefcc89ea4be4f7670fa27a7d585e108b91d0da955900bac0a0202e1). In that kit the v2 think clip ran the `puzzled('large')`
performance (poses.puzzled: mouth "mid", lids 0.3, head rot -19; the beak_open plate with tongue), not the state `think`
(body ponder, gaze rollUp, vfx question, sfx hmm) that `answer:pending` fires in the app. Per beat the four sessions gave
v2 4/4 on celebrate, flight and sad and 0/4 on think, so the kit measured a performance the app never plays for that beat.
Kit v2 re-records only the think clip on both arms with the real state (v2 `states.fire('answer:pending')`, v1 `think()`)
under a new seed and order_sha256; the other six clips are reused byte-identical. These four files stay here untouched as
kit-v1 sessions: the scorer validates a block against the kit it was rated on, so under the kit-v2 manifest they read
REJECTED by design (kit / seed / order mismatch), not as evidence for or against v2. Kit-v2 ratings need >= 3 named raters
and >= 12 trials before any verdict; nothing from kit v1 is pooled with them.
