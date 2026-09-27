# G12 rater results (append-only)

One JSON file per rater session, pasted verbatim from the kit's result block, plus a `_record` field (source, time,
verdict of that block alone). Score all files together with `../score.html` (offline) or check the scorer with
`node sandbox/tests/g12_score.mjs`. The verdict is never written by hand: PASS iff two-sided p <= 0.05 AND
v2_chosen > n/2 over >= 12 trials from >= 3 named raters; a small p in the lower tail is a LOSS (FAIL).

| file | rater | n | v2 | p (two-sided) | alone |
|---|---|---|---|---|---|
| 2026-09-27_gist-d33eaf03_rater-null.json | (unnamed) | 4 | 3 | 0.625 | INSUFFICIENT |
