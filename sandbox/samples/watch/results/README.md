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
| 2026-09-28_gist-795870df_rater-salim-kitv3.json | سليم | 4 | 2 | 1.0 | INSUFFICIENT (kit v3, first named rater) |
| 2026-09-28_gist-795870df_rater-karma-kitv3.DUPLICATE-of-salim.json | كارما | 4 | 2 | - | NOT COUNTED (byte-for-byte the Salim answers incl. ms) |
| 2026-09-28_gist-795870df_rater-baba-kitv3.DUPLICATE-of-salim.json | بابا | 4 | 2 | - | NOT COUNTED (byte-for-byte the Salim answers incl. ms) |
| 2026-09-28_gist-98611011_rater-karma-kitv3.json | كارما | 4 | 2 | 1.0 | INSUFFICIENT alone (kit v3, own timings) |
| 2026-09-28_gist-98611011_rater-baba-kitv3.json | بابا | 4 | 2 | 1.0 | INSUFFICIENT alone; third named rater -> pooled FAIL (kit v3) |

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

## Kit v3 (K9.5-4, owner decision 2026-09-27 gist 4f70a2dc rev ab621e74) - no session yet

Kit v3 = kit v2 protocol + three changes the kit-v2 record asked for: (1) the answer buttons are LOCKED until
second_beat_ms = 5500 ms into each trial with a visible countdown (attribute + click-handler guard), so a rating cannot
precede the second beat (Baba 2459 ms on kit v2); (2) the blink scheduler is seeded at recording time on both arms
(`&seed=20260928` on the recording URL, K9.5-1) - pinned for the recording only, the shipped page stays unseeded;
(3) every per-clip label names the clip the state RESOLVES to, read live from the page at recording time
(`manifest.resolved_clips`): v2_think -> `state think -> body ponder -> rig.ponder (acting.performances.think)` (the
K9.5-2 calm think; kit v2 ran the puzzled spiral under the label "body ponder"), v2_sad -> `oops(large) -> sad plate
beak_sad.webp` (the K9.5-3 authored plate). Only v2 think and v2 sad were re-recorded (`--only think,sad --arms v2`); the
six other clips are reused byte-identical from kit v2 (sha256-checked). Kit v3: seed 20260929, order_sha256 in
`../manifest.json`, 6.74 MB, 0 page errors, 8 clips x 10.4 s. `SCORE.generated.json` is now written by
`../score_results.mjs` (committed tool): under kit v3 it reads REJECTED, 0 accepted / 7 earlier-kit blocks rejected by
design - the kit-v2 verdict above stays the record until >= 3 named raters rate kit v3 (owner side; after the phone
session of 2026-09-28/29). PASS rule unchanged: v2 >= 10/12 from >= 3 named raters.

## Kit v3 session 1 (gist 4f70a2dc rev 795870df, rated on the LIVE page after PR #15 merged fa845c2 01:11:25Z, Pages built 01:11:51Z)

Three blocks were pasted, labelled Salim, Karma and Baba. All three carry kit 2026-09-28T00:30:02Z / seed 20260929 /
order c1880f3a... / kit_version 3 / lock_ms 5500 and pass `validateBlock` ([]). But the three answer arrays are
byte-identical - beat, choice, replays AND milliseconds (think 15884 with 1 replay, flight 9383, celebrate 8489, sad 9179).
Two independent sessions cannot share millisecond timings, so by the rule already applied to the kit-v2 Mama file only the
FIRST block (Salim) is counted; the Karma and Baba copies are kept verbatim as DUPLICATE files and excluded by name in
`score_results.mjs`. Only the owner can say whether Karma and Baba rated at all; real sessions would carry their own ms.

Counted so far on kit v3: Salim 2/4 (flight -> v2, celebrate -> v2, think -> v1, sad -> v1), p 1.0 = INSUFFICIENT
(`SCORE.generated.json`: accepted 1, rejected 7 earlier-kit blocks, excluded 3 DUPLICATE files). The lock worked as
designed: every answer came after 5500 ms (fastest 8489 ms; on kit v2 the fastest was 2459 ms). Read as data, not meaning:
the same per-beat pattern as kit v2 on one rater. If the three raters had been independent, the pool would be 6/12, p 1.0
= FAIL under the fixed rule (>= 10/12); that arithmetic is stated here so nobody has to recompute it, but it is NOT the
verdict - the verdict needs two more NAMED, independent kit-v3 sessions (each with its own timings). Nothing here unfreezes
engine, art, celebrate or flight.

## Kit v3 verdict (gist 4f70a2dc rev 98611011, 2026-09-28T01:40:42Z; verdict written by score_results.mjs, not by hand)

The owner re-pasted Karma and Baba from the live page with their own blocks: Karma 2/4 (ms 15578 / 8233 / 8048 / 79274,
replays 1/0/0/2), Baba 2/4 (ms 9157 / 20669 / 10544 / 11308, replays 0/1/1/1) - distinct timings, independent sessions,
`validateBlock` [] on both, lock honoured (min 8048 ms >= 5500). The two same-named copies of the Salim block from
rev 795870df stay on record as DUPLICATE files and stay excluded.

Pooled over 3 named raters (Salim, Karma, Baba), 12 trials: v2 6/12, two-sided p 1.0, PASS needed >= 10/12 ->
**G12 on kit v3 = FAIL** (`SCORE.generated.json`, scored 2026-09-28T01:43:40Z; accepted 3 / rejected 7 / excluded 3).

Per beat, kit v3: celebrate 3/3, flight 3/3, think 0/3, sad 0/3 - the same split as kit v2, now with the answer lock
(no rating before the second beat), a seeded blink on the v2 clips, and the two clips that K9.5 actually changed
(calm think, authored sad plate). Across the three kits: celebrate 10/10 and flight 10/10 for v2 - a stable signal;
think 0/10 over three different think clips (puzzled spiral, real think state, calm ponder) - the loss is in the
performance idea, not in the harness; sad 4/10 - 4/4 on kit v1, then 0/6 on kits v2 and v3 (kit v2 byte-identical to
kit v1; kit v3 the new plate) - the sad beat has never carried a stable signal.

What this record does NOT say: it does not say v2 is worse than v1 on think and sad (p 1.0 overall; 3 trials per beat
carry no statistical weight on their own), and it does not authorise any engine or art work. The next step is a
phase-boundary decision in the owner's own words; the freeze holds (app/ 0, Gate 6 closed, K10 NOT STARTED,
celebrate / flight untouched).

## Kit v4 (recorded 2026-09-28T05:31:59Z, K9.6-6b) - awaiting rater blocks

Owner decision (gist 4f70a2dc rev a3e73842 / cf3d3a8a / 0b1f96bc): the kit v3 result stands as official; the winner (v1 think / sad) was
carried into v2 as DATA (acting.performances.think.choreo, .sad.choreo, played by the generic choreo player). The primary proof of the
port is automatic - samples/proofs/k96_think.json and k96_sad.json: every channel scheduled within 16.7 ms of v1, identical timing,
keyframes, mouth plates, end state (see V1_CHOREOGRAPHY.md section 4). Kit v4 is the perceptual sanity check.

Kit v4 protocol: beats think + sad ONLY (celebrate 10/10 and flight 10/10 were decided on kits v1-v3 and are not re-tested), 2 trials per
beat per session (4 per rater; 12 from 3 named raters, 16 with a 4th), v1 clips reused byte-identical from kit v3, v2 clips re-recorded
on the choreo player (resolved live at recording time: think -> rig.perform(think) 8 channels 3500 ms; sad -> rig.perform(sad) 10
channels 2500 ms), lock 5500 ms, seeded blink, seed 20260930, order sha256 cbf5d81b470bbeef...

Scoring: manifest.scoring_mode = tie (score_core.js, written and tested BEFORE this recording, commit 953c287). FAIL iff any beat has v2
below its floor (1 of its trials; 2 when the beat has >= 8 trials, i.e. a 4th named rater) OR two-sided p <= 0.05 with v2 < n/2; PASS
otherwise as a perceived tie, and on an outright win (>= 10/12, 13/16). Exact false-FAIL probability for a perfect port: 3.98 pct at 12
trials, 6.91 pct at 16 (score_core.tieFalseFail). Blocks from kits v1-v3 are REJECTED by design (kit / seed / order mismatch).

Status: SCORE.generated.json = REJECTED (no kit-v4 block yet). Rater blocks arrive through the owner's gist and are appended here as
`2026-09-28_gist-<rev>_rater-<name>-kitv4.json`; the verdict is written only by `node sandbox/samples/watch/score_results.mjs`.
