## Phase 16 - reach the reference render (issue #10 image 7) + Fish clips for the rewritten stories (v7.19)

Owner direction (gist be1a1308 + voice note): "nothing less than the reference picture".

### What changed
- **Real rendered sprites** in `app/assets/3d/` (transparent WebP, 4-11KB each): 6 cubes (one colour per tray), sun, monkey in 3 poses (idle / happy / encourage). Honest finding: CSS box-shadow can not reach a CGI clay render, so the look now comes from assets. The **tray sprite was dropped** (a perspective render can not be 9-sliced without warping); trays stay a layered CSS box (rim, opening, front wall with a face) and the cubes inside are the real renders. Numbers remain HTML text over the sprite, so the K3 numbering (1..b during the question, 1..a*b count-up after the answer) is untouched.
- **Safe fallback**: one image probe per page load; on failure `html.no-3d` restores the CSS cubes and the monkey keeps its inline SVG (never an empty corner). The sky sun is now `sun.webp`.
- **Stories on the a-groups-of-b convention** (`explain.js`): *missing* -> "a groups, the same unknown count in each; share one by one, every round adds a - how many in each?"; *distributive* -> "a groups of b; take s1 from every group, the remainder per group is b - s1" (the split happens inside every group, like the bar). **49 new Fish fragments** recorded ("شاب مصري حماسي"): 373 clips, 2.1MB; `tools/explain_segments.mjs --check` = 3,523 texts, 0 missing fragments, 0 missing numbers. Transcription of the new clips matched word for word ("جراج" re-verified alone with a second engine).

### Verified, not assumed
- `behaviour.py` timeout reproduced on `origin/main` v7.18 too: it is a Phase 2 legacy suite that predates K3 (expects a reveal on the first miss). Listed as legacy in AUDIT_REPORT.md; not part of the 26-suite cycle; not a regression.
- Gist claim "CHANGELOG_DECISIONS.md updated in .agents/memory": path does not exist in this repo (irrelevant).

### Open point for the owner
- The play-view close button [X] sits over the sun in the top-left corner (since 15.3). Move the sun, or leave it?

### Tests
- New `app/tests/phase16_render.py` (28 checks): assets served <= 40KB, one sprite per tray and neighbours differ, numbers are text, probe-failure fallback, mascot poses swap by opacity only, sun.webp, story wording + full clip coverage, `--check` gate, manifest completeness.
- `phase15_3_sunny.py` rule 7 now allows image downloads only from `app/assets/3d/`.
- 27/27 suites pass on v7.19 (see PROGRESS.md); protected files (`plant.html`, `math.html`, `albayyinah.html`, `quran-alqadr/index.html`) and `PROJECT_VISION.md` unchanged (sha256).
