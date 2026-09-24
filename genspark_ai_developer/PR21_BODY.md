## Phase 15.3 + 15.4 - sunny joyful kids world + real 3D toy trays/cubes (v7.18)

### 15.3 (gist e8e6b1f3)
- The sunny theme is now the default: sky gradient plus a code-drawn sun, clouds and balloons. Existing installs migrate once (`meta.themeV=2`); dark is still selectable and a later dark choice sticks.
- Each tray gets its own colour (6-colour palette); cubes are identical inside a tray; grid rows are coloured per row.
- Code-drawn monkey companion (aria-hidden, pointer-events none): idle breathing, claps on a correct answer, nods and waves on the first miss.

### 15.4 (gist 5c01d3fb, reference = issue #10 image 7)
- `groupsBar.layout`: up to 3 tray rows, penalty for trays thinner than 1.6:1 (no more "pill strip" trays), cubes 14-40px. Height adapts per question and is reserved before paint (<= 176 + 12px).
- Chunky clay trays: rim, recessed well, front lip with a face, 3D bottom edge. Square cubes with a lit top face, bevel and drop shadow, carrying white numbers.
- K3: while the question is open, each tray is numbered 1..b (never the running total). After the answer, `countUp` renumbers 1..a*b in a wave.
- Sun shaded into 3D; the monkey now has a full body and is bigger. The quit button and level bar get solid backgrounds over the sun.

### Tests
- New: `phase15_3_sunny.py`, 25 checks.
- Updated: `phase15_2_groups_bar.py`.
- 26/26 suites pass on v7.18; protected files unchanged.
