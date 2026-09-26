#!/usr/bin/env python3
"""
K9.2b-2  add_brows.py  -  vector eyebrows for the P2 owl, behind a feature flag.

Owner decision (b), gist b5d111c1: brows as vector <path> (condition 1), behind a
feature flag with zero regression when off (condition 2).

Design inputs are MEASURED, not guessed:
  * eye centres (iris circle fit, K9.2b-1): L (81.29, 85.19)  R (118.27, 85.19) viewBox units
  * eye disc top: 85.19 - 19.4 = 65.8 units (half plate 38.86 wide -> disc r ~19.4)
  * head plate colours in the brow band (y 58..66, x 60..140), sampled from head.webp:
      dark  p10 luminance  rgb(89, 44, 23)  -> brow body
      mid   p40-60         rgb(186, 132, 84) -> feather highlight
  * mirror axis = midpoint of the two eye centres = 99.78

Geometry: a tapered feather crescent per eye (upper arch peaks slightly to the
temple side, as on horned owls), thickness 3.8 units at the peak, ends 0.
Pivot = brow centre on its lower edge (cx, 64.2) so rot = tilt, y = raise/lower.

Flag contract:
  * SVG: <g data-feature="brows" style="display:none"> ... </g> -> hidden by default
  * runtime (index.html): shown only when ?brows!=0 AND spec.acting.brows === true
  * with the flag off the element is display:none -> not painted -> pixel identical
    to the pre-brow SVG (proved by brows_proof.py)

Idempotent: re-running replaces the existing brows block and spec joints.
Writes: companions/owl_p2.svg, companions/owl.motion.json (acting.brows, poses[*].joints.brow*),
        samples/proofs/g11b_brows_design.json (all numbers used).
"""
import json
import os
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SVG = os.path.join(ROOT, 'companions', 'owl_p2.svg')
SPEC = os.path.join(ROOT, 'companions', 'owl.motion.json')
PROOFS = os.path.join(ROOT, 'samples', 'proofs')

EYE = {'L': (81.2872, 85.1917), 'R': (118.2701, 85.1868)}
EYE_TOP = 65.8
AXIS = (EYE['L'][0] + EYE['R'][0]) / 2
DARK = (89, 44, 23)
MID = (186, 132, 84)
PIVOT_Y = 64.2


def hexc(c):
    return '#%02x%02x%02x' % c


def f(v):
    return ('%.2f' % v).rstrip('0').rstrip('.')


def brow_paths(cx, side):
    """Return (body_d, highlight_d) for a brow centred on cx, authored for the LEFT eye and mirrored for R.
    Coordinates are relative to cx: negative = temple side for L."""
    # left-eye authoring: temple side is -x
    body = [('M', -17.5, 65.6), ('C', -12.0, 59.4, 3.0, 55.9, 16.5, 61.4), ('C', 16.0, 62.9, 14.6, 63.6, 13.0, 63.3),
            ('C', 3.5, 59.6, -8.5, 60.6, -15.5, 66.6), ('Z',)]
    hi = [('M', -12.0, 61.6), ('C', -6.0, 58.3, 4.0, 57.2, 12.0, 59.8), ('C', 4.0, 58.6, -5.0, 59.3, -12.0, 61.6), ('Z',)]
    sgn = -1 if side == 'R' else 1

    def d(cmds):
        out = []
        for c in cmds:
            if c[0] == 'Z':
                out.append('Z')
                continue
            nums = c[1:]
            pts = []
            for i in range(0, len(nums), 2):
                pts.append('%s %s' % (f(cx + sgn * nums[i]), f(nums[i + 1])))
            out.append(c[0] + ' ' + ', '.join(pts))
        return ' '.join(out)
    return d(body), d(hi)


def build_block():
    parts = ['<g data-feature="brows" style="display:none">']
    for side in ('L', 'R'):
        cx = EYE[side][0]
        body, hi = brow_paths(cx, side)
        parts.append('  <g data-joint="brow%s" data-pivot="%s %s"><path d="%s" fill="%s"/><path d="%s" fill="%s" opacity="0.55"/></g>'
                     % (side, f(cx), f(PIVOT_Y), body, hexc(DARK), hi, hexc(MID)))
    parts.append('</g>')
    return '\n      '.join(parts)


def main():
    svg = open(SVG, encoding='utf-8').read()
    block = build_block()
    svg, n = re.subn(r'<g data-feature="brows".*?</g>\s*</g>', block, svg, count=1, flags=re.S)
    if n == 0:
        # insert right before the mouth group (brows sit above eyes, below beak in z-order is irrelevant: no overlap)
        svg, n = re.subn(r'(\n\s*)(<g data-joint="mouth")', r'\1' + block.replace('\\', '\\\\') + r'\1\2', svg, count=1)
        assert n == 1, 'mouth group not found'
    open(SVG, 'w', encoding='utf-8').write(svg)

    spec = json.load(open(SPEC, encoding='utf-8'))
    spec.setdefault('acting', {})['brows'] = True
    spec['acting']['browsComment'] = 'vector brows (data-feature=brows in owl_p2.svg); shown only when acting.brows is true and the page flag ?brows!=0; joints browL/browR, pivot at brow centre lower edge; channels rot (tilt, deg) and y (raise, px)'
    # minimal brow channels per existing pose; silhouette-first redo is K9.2b-5 (G11 v2)
    brow_pose = {
        'alert':   {'browL': {'y': -2.5}, 'browR': {'y': -2.5}},
        'charged': {'browL': {'rot': 10, 'y': 1.5}, 'browR': {'rot': -10, 'y': 1.5}},
        'launch':  {'browL': {'y': -3, 'rot': -6}, 'browR': {'y': -3, 'rot': 6}},
        'puzzled': {'browL': {'y': -4, 'rot': -9}, 'browR': {'y': 1, 'rot': 7}},
        'triumph': {'browL': {'y': -3.5, 'rot': -5}, 'browR': {'y': -3.5, 'rot': 5}},
        'oops':    {'browL': {'y': -1, 'rot': 12}, 'browR': {'y': -1, 'rot': -12}},
    }
    for name, js in brow_pose.items():
        if name in spec.get('poses', {}):
            spec['poses'][name].setdefault('joints', {}).update(js)
    json.dump(spec, open(SPEC, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
    open(SPEC, 'a', encoding='utf-8').write('\n')

    os.makedirs(PROOFS, exist_ok=True)
    design = dict(tool='sandbox/tools/add_brows.py', eye_centres=EYE, eye_top_units=EYE_TOP, mirror_axis=round(AXIS, 3),
                  colours=dict(body=hexc(DARK), body_rgb=DARK, highlight=hexc(MID), highlight_rgb=MID, highlight_opacity=0.55,
                               source='head.webp brow band y 58..66 x 60..140: p10 luminance (dark) and p40-60 (mid)'),
                  pivot_y=PIVOT_Y, peak_thickness_units=3.8, span_units=34.0, brow_pose_channels=brow_pose,
                  flag=dict(svg='data-feature="brows" style="display:none"', spec='acting.brows', url='?brows=0 disables'))
    json.dump(design, open(os.path.join(PROOFS, 'g11b_brows_design.json'), 'w'), indent=2)
    print(block)


if __name__ == '__main__':
    main()
