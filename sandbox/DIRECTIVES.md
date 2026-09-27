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

#03 G11 v2 update | 2026-09-26 22:05 | ref #03 (gist rev b5d111c1: G11 v2 silhouette-first) | done
    pose_sheet.py: silhouette_delta_pct + 6 px blur test, gate 8 pct; alert restaged 7.9 -> 12.3-13.7 pct; 6/6 PASS.
    Evidence: samples/proofs/g11_pose_sheet.png (2 rows), g11_pose_sheet.json (silhouette block), commit "feat(g11-v2)".
    Consequence: vector re-author not opened (ADR-002 visual proof update). Perf matrix (K9.2b-6) still OPEN, then K9.3.

#03 perf-matrix update | 2026-09-26 22:40 | ref #03 (gist rev b5d111c1: perf matrix identical conditions) | done
    sandbox/measure_matrix.py + samples/measure_matrix.json (v2+Foley / v2 no-Foley / v1 x CPU 1x/4x, n=5, 3 interleaved rounds, 10 s).
    Result: CPU 1x v2 holds budget (p95 16.8, jank 0), v1 janks 2.8 pct; CPU 4x no cell holds jank < 1 pct, v2+Foley worst (p95 33.3, 5.8 pct).
    All #03 items now done; next = K9.3 (beats + intent), K9.4-K9.6.

#06 | 2026-09-26 22:13 | gist a402871d rev 97041677 | received | Owner decision: K9.2c accepted "with distinction"; 3 notes recorded; 5 small items; next-cycle plan approved; new constitution rules (annex L)
    Verified on receipt against the branch (5e5c3d0):
      item 1 ?sfx=0 measured -> ALREADY DONE: g11c_ship_visible.json check "7_sfx0" {bus:false, foley:false, winkRan:true, lidR_sy 0.367} (added 1892e03, before this review was written).
      item 2 bankLimit 24 "dead number" -> NOT dead: flight.js reads it (1 use) as the clamp of the velocity-driven bank in small flights only; the 360 roll is a separate layer. Action: scope documented in the spec (flight.bankLimitScope), value kept.
      item 3 DIRECTIVES.md -> DONE (1c278aa).
      item 4 stable URL -> owner-side (Pages source), unchanged.
      item 5 NEXT line said G11 v2 remaining -> at the time of the review it WAS remaining (the silhouette metric landed later in fd262dc); line now reads K9.2b-5 DONE. No misleading line remains.
    Approved plan (ADR-002 addendum -> perf matrix -> K9.3) already executed for the first two (c5af00b, 5e5c3d0); the ADR extra requirements were met:
      measured trade-off table (time, perf, who) - yes; one recommendation with evidence - yes (stay A); explicit link to the perf matrix (p95/p99, 5 owls, CPU x4) - yes;
      third option "vector re-author of the wing only" -> to be added as an explicit row (this cycle).
    New rules adopted into AGENTS.md section 13: "commit message is not evidence" (result file is), stale-constraint rule (every review greps numeric constraints for readers), visible-cycle rule already in section 11.
    Three notes recorded with thanks; the honesty incident (9ffc0fd/f6730aa) stays documented in PROGRESS.md as the model to follow.
    Update 2026-09-26 (K9.3 close-out): approved plan fully executed. ADR-002 addendum (d2) wing-only row: 2ee3535's predecessor 5e5c3d0 (already recorded);
      K9.3 "look then leap" landed in 6 chunks (1ffb865, 887fbd1, 82f1407, 2e4d1c0, 2ee3535, b34f6df). Evidence files (not commit messages):
      samples/proofs/g12_intent.json (pass_all true; 5 consecutive runs after the bodyLag fix), g12_intent_strip.png (4 frames),
      g11c_ship_visible.json (10/10 incl. 8_intent, 8b_intent_off), samples/measure_matrix.json (new control cell v2 no-intent).
      Evidence-integrity annex (d): budgets were declared in owl.motion.json (acting.intent.budget, 1ffb865) before the engine code (887fbd1); >= 4 samples in every event window (rAF 16.7 ms); slow_rate not used (CPU 1x, disclosed in g12_intent.json env).

#07 | 2026-09-27 00:10 | gist a402871d rev a2a05a8d | received | Owner review of resume #40 (+ K9.3 as seen on the branch): accepted with 4 notes and 5 requests; K9.4 approved (research first, frozen plan in small chunks)
    Verified on receipt against the branch (914fd08):
      note 1 (perf conclusion inverted between throttles) -> TRUE. measure_matrix.json (b34f6df): 1x jank v2+Foley 0.84 / no-intent 2.76 / no-Foley 3.69 / v1 2.77; 4x 6.24 / 6.19 / 4.37 / 3.47.
        The ADR-002 sentence "Foley alone costs about 1.3 jank points there ... keep the Foley bus gated when the device proxy is slow" was written from the
        K9.2b-6 file (fad583b: 4x 5.84 vs 4.53) and is not supported once the 1x direction reverses. Per-round spread inside one cell (e.g. no-Foley 1x: 5.54, 3.69, 0.0)
        exceeds the between-cell gap. Action: ADR-002 conclusion re-worded (noise, no attribution, no Foley-gating recommendation) - this cycle.
      note 1 (numbers in the report vs the file: "jank 0 %, 5.8 %" vs 0.84 / 6.24) -> TRUE and explained: the report quoted the K9.2b-6 file (fad583b: 0.0 / 5.84,
        still in the ADR table) while the branch already had the K9.3-5 rerun (b34f6df: 0.84 / 6.24). Same root cause as before: a number written from memory of an
        older file. Action: ADR table replaced by the current file's numbers; report numbers are now copied from files (rule added to AGENTS.md section 13).
      note 2 (pose sheet byte-identical, "visible change" already delivered before #40) -> TRUE: g11_pose_sheet.png md5 b4161f4c..., last changed ca08a2d 21:53Z,
        before the #40 report. Correction recorded: #40 = code + ADR decision + matrix, no new visible change. (K9.3 in #45 did carry a new visible change: intent.)
      note 3 (bodyLag re-derived after measurement) -> acknowledged; justified by P2 + old/new disclosed (bodyLagNote). Rule: not a pattern; any future budget
        change after measurement needs an external reference + old/new disclosure BEFORE the rerun.
      note 4 (report behind the branch) -> TRUE at the time of the review (branch had K9.3 DONE). Rule: every report states the branch head it describes.
      request "?sfx=0 measured" -> ALREADY on the branch: g11c_ship_visible.json check 7_sfx0 {bus:false, foley:false, winkRan:true, lidR_sy .37} (1892e03).
        Gap accepted: it proves no SoundBus exists, not "sounds played = 0" as a number. Action: add played-count 0 via the SoundBus stats path on a normal page vs sfx=0.
      request "bankLimit dead number" -> NOT dead (flight.js line 62 reads it; scope note bankLimitScope in the spec since 5e5c3d0). Kept, documented. No change.
      Pages / permanent URL -> gist says "not enabled (API 404)". VERIFIED FALSE now: GET /pages = 200, status built, source main:/ (legacy build), and
        https://just-SsSsSsSsSsSsSsSs.github.io/RESEARCH-md-Duolingo-Rive/sandbox/index.html serves the MAIN copy (spec v=k5, no acting bar). The permanent URL exists
        but shows the old sandbox; switching the source branch (Settings -> Pages -> Branch = sandbox/a1-gate5-art-sw) is owner-only and remains open.
      K9.4 approved: owner-vision performances (triumph roll, showoff flight, cartoon humour, reduced-motion). Research first, frozen plan, small chunks.
      Close-out of #07 (2026-09-27, branch head after K9.4-6):
        request 1 "reword the perf conclusion honestly" -> DONE bec37bc: ADR-002 appendix generated by script from measure_matrix.json (Foley-gating retracted; in-cell spread 5.54 > between-cell gap 2.85).
          Re-confirmed by the K9.4-6 rerun (measure_matrix.json 2026-09-27T02:08:40Z): the round-to-round spread inside one cell is again wider than any between-cell gap.
        request 2 "?sfx=0 as a number" -> DONE cb48546: g11c_ship_visible.json 7_sfx0 sounds_played 0 (control page after a real click: 1); PREVIEW row 7 carries the numbers.
        request 3 "bankLimit dead number" -> verified NOT dead (flight.js reads it); kept + documented, no change (see above).
        request 4 "every number copied from its uploaded file" -> rule written AGENTS.md section 13 (bec37bc); applied in every PROGRESS line since (file + hash named next to the numbers).
        request 5 "Pages permanent URL" -> exists, serves main:/ (old sandbox); switching the Pages source branch is owner-only (Settings -> Pages -> Branch = sandbox/a1-gate5-art-sw). Open on the owner side.
        K9.4 (approved here) -> DONE on the branch: research b5ef05e, chunks 43fac8e f0751b7 1fc5184 d4aa2e4 83146a6 c89c475 79c180e 32ab289 7f0878c + matrix rerun. Visible change: new (g13_performances_strip.png md5 06a6c1f4, no such file before K9.4).
      OPEN QUESTION for the owner (K9.5-2, 2026-09-27): 3-band wing seam. Rest seam cannot reach pixel diff 0 by any of 14 measured bitmap constructions (best: max 29-35 on the cut rows, samples/proofs/g14_wing_seam_variants.json); 20 deg bend opens 63 px of pinholes at DPR2 (g14_wing_render.json). Options: (a) accept a renegotiated budget (max diff <= 35 on <= 2 device rows per cut; pinholes <= 64 px at 20 deg DPR2, 0 at rest), (b) revert to the single-plate wing and drop K9.5 flex, (c) vector re-author of the wing (ADR-002 route 2). Default until answered: child joints inert, nothing in the engine references them.

#08 | 2026-09-27 03:53 | gist a402871d revs 699d0076 + 15953320 | received | (1) Owner decision on the K9.5-2 open question: option (a) - renegotiated seam budget, proceed to K9.5-3 (engine flex) and then K9.6. (2) Independent K9.3 review: accepted "with distinction"; 3 practices fixed as rules (engine fix not threshold; A/B control arm per feature; numbers copied from files); perf question closed with a mandated wording; 2 notes; 1 governance question (PR per cycle vs per phase). (3) Binding "above-excellent" directive (Articles 0-13, gates G1-G10, 10-item report template, principle matrix, ADR template, evidence-integrity annex d, SFX/VFX annex e). (4) Permanent URL: Pages now built from this branch.
      Verification before acting (AGENTS: every claim checked):
      (1) option (a) -> ADOPTED. Renegotiated budget written below as numbers, old -> new, with the reason, not silently: rest seam median diff in the wing boxes 0 -> max_abs_diff <= 35 on <= 2 device rows per cut and 0 enclosed background px at rest (measured v6: 29/35 max, rows on the cuts only, rest holes 0-1 px); bend 20 deg/segment enclosed holes 0 -> <= 64 px at DPR2 and <= 6 px at DPR1 (measured 63/64, 1/3). Reason: 14 constructions measured, the residual is compositor conflation of two AA edges (samples/proofs/g14_wing_seam_variants.json), not a slicing error. Gist claim "29-35 sub-pixel difference invisible on a phone" -> partly TRUE: the rest line is 1 device row, max 35/255 luminance; the 20 deg pinholes at DPR2 are 63 isolated pixels along the cuts - visible under zoom, not at 1x (screenshot inspected). Kept as a stated risk in the K9.5 risk log.
      (2) note "5/5 consecutive runs not in the artifact" -> TRUE: g12_intent.json summary.A_pass_per_flight = [true,true,true] (3 flights, one run), no runs field. Wording corrected in PROGRESS: "3 flights, pass_all true (one committed run); 5 consecutive runs were operational, not in the artifact". Rule (AGENTS 13) already covers it; applied retroactively here.
      (2) note "report 0.84 % vs file 0.0 %" -> FALSE as stated: the K9.3-5 line (b34f6df, 2026-09-26 23:55Z file) reported 0.84 % and that file says 0.84 % (checked: git show 914fd08:sandbox/samples/measure_matrix.json -> v2 + Foley 1x jank 0.84). The 0.0 % is the K9.4-6 rerun (4f06e88, 02:08Z file). Two files, two readings, both matching. Not a fourth discrepancy. Owner's "correct row" (16.7 / 0.00 / max 16.8) is the K9.4-6 row and is already in PROGRESS copied from that file.
      (2) mandated perf wording -> written verbatim (translated) into PROGRESS below and cross-referenced from ADR-002; no product decision from the 2-core host.
      (2) governance PR per cycle vs per phase -> owner's own recommendation (b) accepted: PR at phase end. Fixed here: "PR when K9 closes; until then the review surface is the branch + the permanent Pages URL". DIRECTIVES #01 "PR #11 merged" described the K8 phase end, so no conflict remains.
      (3) binding directive -> received. Verified against the branch: G1 scope (branch only, app/ diff 0) holds; G9 budget (60 fps, jank < 1 %, RAM delta ~0) is measured per cycle (measure_matrix.json); G10 data-driven (owl.motion.json spec + validateSpec/validateActing/validatePoses) holds; G2-G8 have proofs on the branch (g11-g14) but the "12 principles" matrix (annex b) and the 10-item report template (Article 12) are NOT yet produced as one document -> they become K9.6 deliverables (RESEARCH.md report "Gate 5 cycle 6" + principle matrix filled from existing proof files). Article 9 "no fixed defaults" -> already the spec model (every number in owl.motion.json, flags ON with kill switches). Article 13 escalation -> was followed for the wing question (numbers + 3 options + default).
      (4) Pages -> VERIFIED: GET /pages source = {branch: sandbox/a1-gate5-art-sw, path: /}, but the last build was 120ce1a (main, 18:10Z) so the URL still served v=k5 with no acting bar. Rebuild requested via POST /pages/builds (queued). The page will serve this branch only after that build; checked again at the end of this session (see PROGRESS).
