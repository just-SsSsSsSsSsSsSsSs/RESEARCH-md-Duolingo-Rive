# Watch kit G12 (kit v4) - generated 2026-09-28T05:31:59Z by sandbox/watch_kit.py

Open `index.html` from a local copy of this folder (no server, no network, 0 external resources).
4 trials per rater; each trial shows the same beat on two engines side by side in a pre-shuffled left/right
order (seed 20260930; sha256 of the order `cbf5d81b470bbeef12b51ebf38d021272ac15b392ee7232b631026a75a2e234e`). One forced choice per trial: "which one is alive?"
(2AFC). Replay at most 2. The key is revealed after the last trial. The rater copies the JSON result block back.

Read-out: count for v2 out of n and the exact two-sided binomial p. Examples (k/n: p): {"12/12": 0.0005, "11/12": 0.0063, "10/12": 0.0386, "9/12": 0.146, "8/12": 0.3877, "7/12": 0.7744, "16/16": 0.0, "15/16": 0.0005, "14/16": 0.0042, "13/16": 0.0213, "12/16": 0.0768, "11/16": 0.2101, "20/20": 0.0, "19/20": 0.0, "18/20": 0.0004, "17/20": 0.0026, "16/20": 0.0118, "15/20": 0.0414}
Claim rule declared here (kit v4, scoring_mode tie - owner decision gist 0b1f96bc, frozen in DIRECTIVES.md before recording): FAIL iff any beat has v2 below its floor (1 of its trials; 2 when the beat has >= 8 trials, i.e. a 4th named rater) OR two-sided p <= 0.05 with v2 < n/2 (a significant loss); PASS otherwise as a perceived tie, and on an outright win (>= 10/12, 13/16); over >= 12 trials from >= 3 named raters. Exact false-FAIL for a perfect port: 3.98 pct at 12 trials, 6.91 pct at 16. The primary proof of the port is automatic (samples/proofs/k96_think.json, k96_sad.json: every channel within 16.7 ms); this kit is the perceptual sanity check.
Direction matters (owner audit, gist rev d33eaf03): the two-sided p is symmetric, so 10/12 and 2/12 both give
0.0386 and 0/12 gives 0.0005 - a small p with v2 losing is a LOSS, never a pass. Score with `score.html`
(offline, next to this file) or `node sandbox/tests/g12_score.mjs`; never by reading p alone.

| trials n | v2 must win at least | two-sided p at that k | mirror |
|---|---|---|---|
| 12 | 10/12 | 0.0386 | 2/12 gives the SAME p and is a LOSS |
| 16 | 13/16 | 0.0213 | 3/16 gives the SAME p and is a LOSS |
| 20 | 15/20 | 0.0414 | 5/20 gives the SAME p and is a LOSS |

What each clip runs (kit v4): {"think": {"v2": "states.fire('answer:pending') -> state think -> RESOLVED clip body.ponder = rig.ponder -> rig.perform('think') = the v1 think() choreography played from acting.performances.think.choreo (K9.6-2/3: T1-T8, 3500 ms, aha at 2600, mouth mid/closed/mid/open/smile/closed); vfx off (sfx=0)", "v1": "think() (gaze roll 1.5 s, head +9 deg, wing to chin)"}, "sad": {"v2": "states.fire('answer:wrong') -> state wrong -> RESOLVED clip body.recoil = rig.perform('sad') = the v1 sad() choreography played from acting.performances.sad.choreo (K9.6-5: S1-S8, 2500 ms, mouth open/sad/smile/closed, plate beak_sad.webp); vfx off (sfx=0)", "v1": "sad() -> mouth plate beak_sad.webp (same art on both arms since K9.5-3)"}}
Previous kit: {"kit_version": 3, "generated_at": "2026-09-28T00:30:02Z", "seed": 20260929, "order_sha256": "c1880f3a886fadb27be1fd266dad5782bb5433fd3c62b7e7b90ea11fffc12453", "note": "beats ['sad', 'think'] re-recorded on arms ['v2']; all other clips reused byte-identical (sha256 checked before reuse)", "previous_kit": {"kit_version": 2, "generated_at": "2026-09-27T17:27:58Z", "seed": 20260928, "order_sha256": "8c83cf040514b75998cf5325a3aaabf1a22af979c996fe4e5a003d64fd26359b", "note": "beats ['sad', 'think'] re-recorded on arms ['v2']; all other clips reused byte-identical (sha256 checked before reuse)", "previous_kit": {"kit_version": 1, "generated_at": "2026-09-27T05:05:59Z", "seed": 20260927, "order_sha256": "bc00a361cefcc89ea4be4f7670fa27a7d585e108b91d0da955900bac0a0202e1", "note": "beats ['think'] re-recorded; all other clips reused byte-identical (sha256 checked before reuse)"}}, "beats_dropped": ["celebrate", "flight"]}. Clips reused byte-identical from it: v1_think.webm, v1_sad.webm.

Kit v3 protocol additions: answer buttons locked until 5500 ms into each trial (countdown shown; enforced in the click handler too); blink seeded at recording time (seed 20260928, URL param on both arms); resolved clips read live at recording time: {"v2_think": "state think -> body ponder -> rig.perform(think) choreo 8 channels 3500 ms", "v2_sad": "state wrong -> body recoil -> rig.perform(sad) choreo 10 channels 2500 ms -> sad plate beak_sad.webp", "v1_think": "reused from kit v2 (recorded before resolved-clip labelling; unseeded blink)", "v1_sad": "reused from kit v2 (recorded before resolved-clip labelling; unseeded blink)"}.

Results: one JSON file per rater session in `results/` (append-only), scored together. Blocks are valid only against the kit
(generated_at, seed, order_sha256) they were rated on; sessions from an earlier kit are kept in `results/` and documented there.

Limits: Control arm = v1 (frozen K7 engine on this branch). The gist asks for a still from the reference video; no such file exists in the repository, so none is shown. Raters are not independent of the owner; the p-value is indicative only. 4 trials per rater; 3-5 raters give 12-20 trials. Kit v4 scoring is TIE mode (score_core.js): the v2 arm is a port of the v1 choreography, so it passes when raters cannot tell it apart (no significant loss, every beat above its floor), not only when it wins.

| clip | bytes | sha256 (16) | duration s |
|---|---|---|---|
| v2_think | 809416 | f021d13de883f3b4 | 10.4 |
| v2_sad | 932067 | da7e18b661404ac5 | 10.4 |
| v1_think | 838606 | 87e9d6b487b24e5b | 10.4 |
| v1_sad | 1019739 | 055c95d123c1c114 | 10.4 |

Total 3.61 MB (budget 12.0 MB): PASS; clip duration <= 10.5 s: PASS; page errors: none.
