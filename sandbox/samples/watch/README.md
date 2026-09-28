# Watch kit G12 (K9.6-2) - generated 2026-09-28T00:30:02Z by sandbox/watch_kit.py

Open `index.html` from a local copy of this folder (no server, no network, 0 external resources).
4 trials per rater; each trial shows the same beat on two engines side by side in a pre-shuffled left/right
order (seed 20260929; sha256 of the order `c1880f3a886fadb27be1fd266dad5782bb5433fd3c62b7e7b90ea11fffc12453`). One forced choice per trial: "which one is alive?"
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

What each clip runs (kit v3): {"celebrate": {"v2": "triumph('large') performance (falls back to celebrate())", "v1": "celebrate()"}, "flight": {"v2": "states.fire('move:to', by dx 240 dy -140) then move:to home", "v1": "flyBy(240, -140) then flyBy back"}, "think": {"v2": "states.fire('answer:pending') -> state think -> RESOLVED clip body.ponder = rig.ponder(escalate) = the K9.5-2 calm think performance (spec acting.performances.think; eyes lift and hold, head tilt 5/7/9 deg, wing to chin, one blink, settle; no spiral); mouth mid; vfx off (sfx=0)", "v1": "think() (gaze roll 1.5 s, head +9 deg, wing to chin)"}, "sad": {"v2": "oops('large') performance (falls back to sad()) -> mouth plate beak_sad.webp (K9.5-3 authored art)", "v1": "sad() -> mouth plate beak_sad.webp (same art on both arms since K9.5-3)"}}
Previous kit: {"kit_version": 2, "generated_at": "2026-09-27T17:27:58Z", "seed": 20260928, "order_sha256": "8c83cf040514b75998cf5325a3aaabf1a22af979c996fe4e5a003d64fd26359b", "note": "beats ['sad', 'think'] re-recorded on arms ['v2']; all other clips reused byte-identical (sha256 checked before reuse)", "previous_kit": {"kit_version": 1, "generated_at": "2026-09-27T05:05:59Z", "seed": 20260927, "order_sha256": "bc00a361cefcc89ea4be4f7670fa27a7d585e108b91d0da955900bac0a0202e1", "note": "beats ['think'] re-recorded; all other clips reused byte-identical (sha256 checked before reuse)"}}. Clips reused byte-identical from it: v2_celebrate.webm, v2_flight.webm, v1_celebrate.webm, v1_flight.webm, v1_think.webm, v1_sad.webm.

Kit v3 protocol additions: answer buttons locked until 5500 ms into each trial (countdown shown; enforced in the click handler too); blink seeded at recording time (seed 20260928, URL param on both arms); resolved clips read live at recording time: {"v2_celebrate": "reused from kit v2 (recorded before resolved-clip labelling; unseeded blink)", "v2_flight": "reused from kit v2 (recorded before resolved-clip labelling; unseeded blink)", "v2_think": "state think -> body ponder -> rig.ponder (acting.performances.think)", "v2_sad": "oops(large) -> sad plate beak_sad.webp", "v1_celebrate": "reused from kit v2 (recorded before resolved-clip labelling; unseeded blink)", "v1_flight": "reused from kit v2 (recorded before resolved-clip labelling; unseeded blink)", "v1_think": "reused from kit v2 (recorded before resolved-clip labelling; unseeded blink)", "v1_sad": "reused from kit v2 (recorded before resolved-clip labelling; unseeded blink)"}.

Results: one JSON file per rater session in `results/` (append-only), scored together. Blocks are valid only against the kit
(generated_at, seed, order_sha256) they were rated on; sessions from an earlier kit are kept in `results/` and documented there.

Limits: Control arm = v1 (frozen K7 engine on this branch). The gist asks for a still from the reference video; no such file exists in the repository, so none is shown. Raters are not independent of the owner; the p-value is indicative only. 4 trials per rater; 3-5 raters give 12-20 trials.

| clip | bytes | sha256 (16) | duration s |
|---|---|---|---|
| v2_celebrate | 842534 | 87b2509b6bfd033c | 10.4 |
| v2_flight | 1111386 | cf2426fa83121042 | 10.4 |
| v2_think | 669171 | ee41f2580d5cbcdb | 10.4 |
| v2_sad | 812993 | 44a9b72ece5e7756 | 10.4 |
| v1_celebrate | 789910 | 724059b1ba5cff8d | 10.4 |
| v1_flight | 646210 | ec53f49b8745eace | 10.4 |
| v1_think | 838606 | 87e9d6b487b24e5b | 10.4 |
| v1_sad | 1019739 | 055c95d123c1c114 | 10.4 |

Total 6.74 MB (budget 12.0 MB): PASS; clip duration <= 10.5 s: PASS; page errors: none.
