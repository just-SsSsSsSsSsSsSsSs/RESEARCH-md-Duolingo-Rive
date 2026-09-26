# DIRECTIVES - owner directives, append-only, the single binding source

Rule (owner, gist a402871d rev 4c9848c9, 2026-09-26): every owner directive is recorded here
with an ID, a date and its source reference. The first action of every resume is to read this
file and commit an acknowledgement line `ack: DIRECTIVES #NN received`. If this file and any
other channel disagree, this file wins. Never rewrite or delete an entry; append corrections.

Format: `#NN | date (UTC) | source | status | summary` then indented detail and evidence.

---

#01 | 2026-09-26 15:39 | gist a402871d rev 71391abf | done | K8 directive (Foley + sync gates)
    Evidence: PROGRESS.md K8 close-out; PR #11 merged by owner 18:10Z (main 120ce1a).

#02 | 2026-09-26 18:26 | gist a402871d rev 49d30cd9 | done | K9 acting overhaul + evidence audit + ADR-002
    Evidence: ADR-002 written; K9.1 Gate 5.5 closure (proofs.json); K9.2 poses + pose sheet.

#03 | 2026-09-26 19:40 | gist a402871d rev b5d111c1 | done (a, b, c) / open (d) | decisions on K9.0-K9.2
    (a) slice eyes/lids L/R + iris per eye, acceptance pixel_diff 0 at DPR1/2 -> DONE 02df388, 96c2267 (g11b_slice_diff.json: 0/192000, 0/768000).
    (b) vector brows behind flag, zero regression off -> DONE dcbc6ec, 103071d (g11b_brows_flag.json); shipped ON by default in K9.2c per #04.
    (c) beak claim "never moves" -> verified FALSE with evidence; beak readability measured (ART_INVENTORY.md), mouth.scale 1.25 shipped 5e97b8f.
    (d) ADR-002 addendum (raster flex ceiling: mesh-warp vs vector re-author, measured) -> OPEN, next (K9.2b-4).
    Also: G11 v2 silhouette-first + blur test -> OPEN (K9.2b-5); perf matrix -> OPEN (K9.2b-6); K9.3 after G11 v2.

#04 | 2026-09-26 20:38 | gist a402871d rev 44e55e13 | done | "Ship Visible" + "Flip the switches"
    Received: recorded in PROGRESS.md resume-check #35 (commit 9d720bd) with claim-by-claim verification.
    Delivered (commit 0352aaf + proofs f35630f, f6730aa, 1892e03, c2651e7, 5e97b8f, 2c976dd; record f32d058):
      roll by escalation (bank / 360 roll / roll+flip; measured 360 deg, lands 0.00 deg), wink + eye-dart + idle saccades,
      ?poses=1 with buttons 1..6, ?reel=1 (26.7 s, 9 beats), brows ON by default (?brows=0 hides), ?sfx=0 verified,
      eye-lead A/B (34 ms vs 0 ms; hierarchy.eyes removed), PREVIEW.md, AGENTS.md section 11 (visible-cycle rules).
    Proof: samples/proofs/g11c_ship_visible.json pass_all true (3 consecutive runs).

#05 | 2026-09-26 21:28 | gist a402871d rev 4c9848c9 | received | MASTER DIRECTIVE (supersedes #04's two texts) + DIRECTIVES.md rule
    Premise stated in the directive: "#04 never reached the agent; roll/wink/poses/reel/preview still locked".
    Verified against the branch on receipt: #04 DID reach (PROGRESS.md mentions rev 44e55e13 four times, first at 9d720bd)
    and its 5 items are shipped and proven (see #04). The premise reflects the branch state at 6d9bc3d, before 0352aaf.
    Nothing to redo from items 1-4. Item 5 (stable preview): PREVIEW.md committed; a permanent URL needs the owner to point
    GitHub Pages at branch sandbox/a1-gate5-art-sw (repository setting the agent cannot change) - OPEN on the owner side.
    Structural rule adopted now: this file + ack commit on every resume (AGENTS.md section 12).
    Owner's closure table (7 checks) = sandbox/ship_visible_proof.py; latest run pass_all true.

#03-d update | 2026-09-26 21:50 | ref #03 (gist rev b5d111c1 item d) | done
    ADR-002 addendum (d) written: sandbox/docs/ADR-002-engine-choice-poses-vs-rive.md "Addendum (d)".
    Evidence: proto sandbox/proto/meshwarp.html + sandbox/meshwarp_measure.py; samples/proofs/g11d_meshwarp_cost.json,
    g11d_meshwarp.png; SVG baseline re-measured same host (samples/measure_p2_v2_nosfx.json, measure_p2_v2_cpu4x_nosfx.json).
    Result: mesh-warp rAF p50 76 ms at 5 owls/CPU 4x vs SVG engine 16.7 ms; recommendation = stay A, vector re-author only if G11 v2 fails.
