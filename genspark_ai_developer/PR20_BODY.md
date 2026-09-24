# Phase 15.2 - equal-groups bar (a trays x b cubes) + explanations follow a x b = a groups of b - v7.16

## What
- New `app/js/ui/groupsBar.js`: above plain `a x b = ?` questions (numpad / quiz; mult_3, mult_4, mult_mix) - a trays side by side, b identical plain blue cubes in each (rows of 5 when they fit). Fixed 104px height reserved before paint, HTML/CSS only (no SVG ids, no filters). Pure `layout()` picks the grid.
- Not shown on missing-factor (would reveal the unknown), grid (own picture), pick / commutative / distributive.
- K3 kept: operands only - no total, no count; aria-label "a مجموعات، في كل مجموعة b"; unchanged after a first miss and on the retry.
- `explain.js`: mult readaloud / story / reallife / steps + commutative_tf and distributive_sum skip-counts now say a groups of b (skip by b). All new text is covered by the existing recorded clips (`tools/explain_segments.mjs --check`: 3,523 texts, 0 missing) - no new recording.

## Evidence
- All 72 combinations a<=6, b<=12 fit 300px x 104px, trays always in one row, smallest cube 13px (360px screen gives 314px).
- Card height on 360x740: mult numpad 599 -> 713 (+114). That card already scrolled before (599 + header > 740).
- Bug found by the test and fixed: 6x6 trays overflowed the bar by 4px (tray border not in the fit) -> border counted + the card's real inner width.

## Not done (needs new recordings; no Fish key in the sandbox)
- "missing" story ("في كل شنطة فيه كام؟" has no clip) and "distributive" story still use the old b-groups-of-a wording.
- Dropped one sentence ("يعني ٣ مرة، ٤ مرات"): its correct form has no clip.

## Tests
- New `app/tests/phase15_2_groups_bar.py`: 72-combination fit, convention in 6 explanation checks, bar = on-screen numbers for 10 real questions, fixed height, nothing overflows, no answer, K3.
- 25/25 suites PASS on v7.16. Protected files sha256 unchanged; PROJECT_VISION.md untouched.

## Live preview
https://8090-i5svpommqbite2zklvdrd-b32ec7bb.sandbox.novita.ai/app/index.html#/play/mult_3
