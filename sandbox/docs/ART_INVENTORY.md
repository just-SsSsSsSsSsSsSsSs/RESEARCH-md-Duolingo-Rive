# ART_INVENTORY - owl P2 layered art, what exists and what moves (K9.2c-6)

Source of truth: `sandbox/art/parts/owl/parts.json` + `sandbox/companions/owl_p2.svg`.
All numbers measured on 2026-09-26 (alpha > 16 bounding boxes; viewBox 200 x 240 units).

## Raster plates (webp) and the joints that own them

| plate | px | units on stage | joint(s) | moves today | note |
|---|---|---|---|---|---|
| head.webp | 340 x 279 | 112 x 91.9 | head | rot/x/y via poses, breath, talk tilt | opaque, no separable brow region |
| body.webp | 290 x 286 | 88 x 86.9 | body | squash sx/sy, breath | |
| wingL / wingR.webp | 232 x 330 | 50 x 71.6 | armL / armR | flap, springs, poses rot | symmetric pair |
| legs.webp | 340 x 172 | 74 x 37.7 | legL (legR group is empty) | springs | one plate for both legs: legR cannot move alone |
| eyesL / eyesR.webp (K9.2b-1) | 168 x 166 | 38.9 x 38.4 | eyeL / eyeR | poses | sclera with iris disc inpainted |
| pupilL / pupilR.webp (K9.2b-1) | 107 x 107 | 24.3 x 24.3 | pupilL / pupilR | look, dart, saccades, talk onsets, poses | independent L/R since K9.2b-1 |
| lidsL / lidsR.webp (K9.2b-1) | 168 x 166 | 38.9 x 38.4 | lidL / lidR | blink, wink, pose lids 0..1 | scaleY(0) = open |
| beak_closed.webp | 137 x 126 | 22 x 20.3 | mouth > data-mouth closed | display toggle | source of the smile/sad plates (K9.5-3) |
| beak_smile.webp (K9.5-3) | 137 x 126 | 22 x 20.3 | mouth > data-mouth smile | display toggle | authored by art/author_mouth_plates.py from beak_closed: chevron crease healed, corners up 16 px / out 5 px, painted U mouth line; proof samples/proofs/k95_plates.json |
| beak_sad.webp (K9.5-3) | 137 x 126 | 22 x 20.3 | mouth > data-mouth sad | display toggle | same tool: corners down 14 px / in 4 px, painted arch mouth line; lossless webp, --check reproduces the bytes |
| beak_open.webp | 140 x 163 | 24 x 27.7 | mouth > data-mouth mid, open | display toggle | has tongue |
| eyes.webp, lids.webp | 336 x 166 | - | superseded | - | kept only as the recomposite reference |

Vector: browL / browR (`<path>`, K9.2b-2) - the only vector art on the owl.

## Mouth shapes: wired vs distinct art

| shape | plate | distinct art | wired where |
|---|---|---|---|
| closed | beak_closed | yes | idle, talk quiet, landing |
| mid | beak_open (22.1 x 25.5) | yes | talk envelope > mouth.levels.mid (0.28) |
| open | beak_open (24 x 27.7) | yes | talk envelope > mouth.levels.open (0.62), celebrate, triumph pose |
| smile | beak_smile (22 x 20.3, same box as closed) since K9.5-3 | yes | flight, celebrate end, launch pose |
| sad | beak_sad (22 x 20.3, same box as closed) since K9.5-3 | yes | wrong/sad, oops pose |

Verdict on the gist claim "five mouth shapes drawn and unwired" (as of K9.2c): all five were wired
(talk(), states.js mouth map, sad(), poses), but only three had distinct art. Smile and sad
differed from closed by <= 1.8 units of scale/offset, below the perceptual budget.
K9.5-3 (owner decision 2026-09-27, item c) closed this: five shapes, five distinct plates; live render
diff vs closed confined to the mouth box (smile 0.6 pct / sad 0.0 pct outside, 8.0 / 7.5 pct inside).

## Beak readability (K9.2b-3 measurement)

| ratio | measured | typical cartoon-owl range (references below) |
|---|---|---|
| beak width / head width | 19.4 pct | 20-30 pct |
| beak width / one eye disc | 55 pct | 60-100 pct |
| beak_open height / head height | 30.1 pct | 30-45 pct |

The beak is at the low edge of readability. A `mouth.scale` of 1.25 (spec-level, applied as
`scale()` on the mouth joint about its pivot 100 104) brings width to 24 pct of head and 69 pct
of the eye disc without touching art. Trade-off: the closed beak then overlaps the lower eye
rims by about 1 unit; acceptable in cartoon proportion but must be judged on the pose sheet.
Recommendation: ship `mouth.scale: 1.25` behind the same default-on rule, verify on
`g11_pose_sheet.png`; the smile/sad plates should be authored as art (two new 137 x 126 plates)
in the vector re-author decision (ADR-002 addendum), not faked by scaling.

References for the range (proportions read from published character sheets, not measured
pixel-exact): Duolingo Duo (beak ~ 1/4 of head width, open mouth ~ 1/3 head height);
classic Disney owl (Bambi's Friend Owl) beak ~ 1/5 head width; both use the mouth
interior (tongue/dark) as the readability device, which our beak_open already has.
Evidence level: L3 (visual reading of public reference art), disclosed as such.
