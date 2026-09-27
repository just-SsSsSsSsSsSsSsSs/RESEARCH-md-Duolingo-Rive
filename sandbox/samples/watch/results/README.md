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
| 2026-09-27_gist-df1b7d02_rater-salim-kitv2.json | سليم | 4 | 2 | 1.0 | INSUFFICIENT (kit v2) |
| 2026-09-27_gist-df1b7d02_rater-baba-kitv2.json | بابا | 4 | 2 | 1.0 | INSUFFICIENT (kit v2) |
| 2026-09-27_gist-0c05fdfc_rater-karma-kitv2.json | كارما | 4 | 2 | 1.0 | INSUFFICIENT alone; third named rater -> pooled FAIL |
| 2026-09-27_gist-0c05fdfc_rater-mama-kitv2.DUPLICATE-of-karma.json | ماما | 4 | 2 | - | NOT COUNTED (byte-for-byte the Karma answers incl. ms) |

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

## Kit v2 sessions (gist rev df1b7d02, rated on the live page after PR #14 merged 19:29:05Z)

Two named sessions, both kit 2026-09-27T17:27:58Z / seed 20260928 / order 8c83cf04..., both accepted by the scorer:
Salim 2/4 and Baba 2/4 with the same pattern - think -> v1, celebrate -> v2, flight -> v2, sad -> v1. Pooled: 4/8, p 1.0,
2 named raters = INSUFFICIENT. Read as data, not meaning: on kit v2 the think beat still went to v1 (0/2, was 0/4 on kit v1),
and the sad beat flipped to v1 (0/2, was 4/4 for v2 on kit v1) although its clips are byte-identical to kit v1 - a reminder
that 2 trials per beat carry no signal on their own and that the single-recording random component (results/README above,
DIRECTIVES rev 9a6e90aa) is not excluded. A third NAMED rater is required before any verdict; if the same pattern holds
the pooled count is 6/12 (p 1.0) = FAIL. No engine work follows from this under the freeze.

## Kit v2 verdict (gist rev 0c05fdfc; owner directive: record the verdict as the tool outputs it)

Third named rater Karma (2/4, same pattern: think -> v1, celebrate -> v2, flight -> v2, sad -> v1). Pooled over 3 named
raters (Salim, Baba, Karma), 12 trials: v2 6/12, two-sided p 1.0, PASS needed >= 10/12 -> **G12 on kit v2 = FAIL**
(`SCORE.generated.json`, scored 2026-09-27T20:55:46Z). It was already decided arithmetically after 4/8: the maximum at 12
trials was 8 < 10 and at 16 trials 12 < 13; the owner refuses an extension to 20 trials in advance (same rule as kit v1).

Per beat, kit v2: celebrate 3/3, flight 3/3, think 0/3, sad 0/3. Over both kits (kit-v1 sessions on record, REJECTED by
the kit-v2 scorer): celebrate 7/7 and flight 7/7 for v2 (real signal); think 0/7 - 4 on the puzzled clip and 3 on the real
think state, so the loss sits in the performance itself, not in the harness; sad 4/7 - 4/4 for v2 on kit v1 then 0/3 on kit v2
on byte-identical clips, which demonstrates the noise floor of 1 trial per beat per rater.

Methodological notes (documentation only, no tool change now): Baba answered think in 2459 ms and Salim in 163638 ms with a
replay; the second beat of every clip starts at second_beat_ms = 5500 ms, so the fast answers were given before the scene
finished. Karma's think answer took 78754 ms with a replay. Deferred kit v3 idea (owner): keep the answer buttons disabled
until second_beat_ms. The "Mama" block pasted in the same revision is byte-for-byte the Karma block (same ms values), so it
is kept as a file for the record but not counted; only the owner can say whether a Mama session took place.

The human gate did its job twice: it caught the harness defect in kit v1 (puzzled instead of think) and the performance
defect in kit v2 (the still acting loses). What follows is a phase-boundary decision in the owner's own words; nothing
here unfreezes engine, art, puzzled or blink randomness.
