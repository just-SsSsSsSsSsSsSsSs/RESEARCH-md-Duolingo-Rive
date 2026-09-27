#!/usr/bin/env python3
"""K9.5-2 rendered proof for the 3-band wing (owl_p2.svg nested armL/armR joints).

Two questions, both answered in headless Chromium at DPR1 and DPR2, 3 renders per document
in fresh contexts, per-pixel MEDIAN compared (same discipline as tools/slice_parts.py render_proof:
Chromium has an intermittent one-column resampling flicker, so raw pairs and same-doc controls are
reported next to the median):

  A. rest: original SVG (git ref, single wing plate) vs new SVG (3 bands) -> median pixel diff inside
     the two wing boxes must be 0; whole-canvas diff reported.
  B. bend ("edge width proof" of the frozen plan): new SVG with armX_mid rotated by BEND deg and
     armX_tip by BEND deg more (static CSS transforms, no engine) -> along each cut line no background
     pixel may show through inside the wing silhouette (seam gap columns = 0). The seam band is the
     rows [cut-3, cut+3]; a column counts as "inside" when the wing is solid 8 rows above AND below.
     The same check on the unbent new render must also be 0.

Output: samples/proofs/g14_wing_render.json (+ g14_wing_rest_dpr{1,2}.png, g14_wing_bend_dpr{1,2}.png,
g14_wing_diff_dpr{1,2}.png). Exit 1 if any declared check fails.
"""
import asyncio, io, json, os, re, subprocess, sys, time
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(ROOT)
PROOFS = os.path.join(ROOT, 'samples', 'proofs')
SVG = os.path.join(ROOT, 'companions', 'owl_p2.svg')
URL = os.environ.get('SANDBOX_BASE', 'http://localhost:8080/sandbox/')
REF = os.environ.get('WING_REF', '317bd3c')   # last commit with the single-plate wing SVG
BEND = float(os.environ.get('WING_BEND', '20'))   # deg per segment (PROGRESS K9.5 RESEARCH budget)
SWEEP = [float(v) for v in os.environ.get('WING_SWEEP', '5,10,15,20').split(',')]   # gap columns per angle, reported
CSS = 2.0                                     # css px per viewBox unit (400 px box for 200 units)
REPS = 3
SHRINK = 6                                    # device px erosion of the reference silhouette (interior-only test)
BG = (255, 0, 255)                            # magenta background: any seam shows as pure BG
H_SRC = 330                                   # wing plate rows
BOXES = {'L': (30.0, 116.0, 50.0, 71.6), 'R': (120.0, 116.0, 50.0, 71.0)}   # from the SVG placement

PAGE = ('<!doctype html><html><head><base href="%s"><style>html,body{margin:0;background:rgb(%d,%d,%d)}'
        '#box{width:400px;height:480px}#box svg{width:400px;height:480px;display:block}%s</style></head>'
        '<body><div id="box">%s</div></body></html>')

BEND_CSS = ('[data-joint$="_mid"],[data-joint$="_tip"]{transform-box:view-box}'
            '[data-joint="armL_mid"]{transform-origin:%s;transform:rotate(%sdeg)}'
            '[data-joint="armL_tip"]{transform-origin:%s;transform:rotate(%sdeg)}'
            '[data-joint="armR_mid"]{transform-origin:%s;transform:rotate(-%sdeg)}'
            '[data-joint="armR_tip"]{transform-origin:%s;transform:rotate(-%sdeg)}')


def pivots_from_svg(svg):
    out = {}
    for m in re.finditer(r'data-joint="(arm[LR]_(?:mid|tip))" data-pivot="([^"]+)"', svg):
        x, y = m.group(2).split(); out[m.group(1)] = f'{x}px {y}px'
    return out


async def shots(b, doc, dpr, css=''):
    arr = []
    for _ in range(REPS):
        ctx = await b.new_context(viewport=dict(width=420, height=500), device_scale_factor=dpr)
        page = await ctx.new_page()
        await page.set_content(PAGE % ((URL,) + BG + (css, doc)), wait_until='networkidle')
        await page.wait_for_timeout(300)
        png = await page.locator('#box').screenshot(omit_background=False)
        arr.append(np.array(Image.open(io.BytesIO(png)).convert('RGB')).astype(int))
        await ctx.close()
    return arr


def summarize(d):
    ys, xs = np.nonzero(d > 0)
    return dict(max_abs_diff=int(d.max()), pixels_differing=int((d > 0).sum()),
                diff_bbox_px=[int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())] if len(xs) else None)


def seam_gaps(img, ref, cut_rows, x0, x1, tol=4):
    """A gap = a background pixel in the seam band [cut-3, cut+3] at a position where the REFERENCE
    render (same document, unbent) is solid wing, after eroding that silhouette by SHRINK device px so the
    test is strictly interior. Earlier version tested "solid 8 rows above and below" and was confounded
    by the curved silhouette at DPR2 (non-monotonic sweep, PROGRESS K9.5-2 status). Under a bend the
    silhouette moves outward only where the segment rotates away, so an interior hole between two bands is
    the only thing that can register."""
    isbg = (np.abs(img - np.array(BG)).max(-1) <= tol)
    solid = ~(np.abs(ref - np.array(BG)).max(-1) <= tol)
    for _ in range(SHRINK):
        n = solid.copy()
        n[1:, :] &= solid[:-1, :]; n[:-1, :] &= solid[1:, :]; n[:, 1:] &= solid[:, :-1]; n[:, :-1] &= solid[:, 1:]
        solid = n
    out = []
    for cy in cut_rows:
        cy = int(round(cy)); sl = (slice(cy - 3, cy + 4), slice(x0, x1))
        inside = solid[sl]; gap = inside & isbg[sl]
        out.append(dict(cut_css_y=cy, inside_px=int(inside.sum()), gap_px=int(gap.sum()), gap_cols=int(gap.any(0).sum())))
    return out


def seams_for(img, ref, cuts, dpr):
    out = {}
    for side, (x, y, w, h) in BOXES.items():
        part = 'wingL' if side == 'L' else 'wingR'
        rows = [(y + c * h / H_SRC) * CSS * dpr for c in cuts[part]]
        out[side] = seam_gaps(img, ref, rows, int((x - 6) * CSS * dpr), int((x + w + 6) * CSS * dpr))
    return out


async def main():
    from playwright.async_api import async_playwright
    orig = subprocess.check_output(['git', 'show', f'{REF}:sandbox/companions/owl_p2.svg'], cwd=REPO).decode()
    new = open(SVG, encoding='utf-8').read()
    if 'data-flex="3"' not in new: raise SystemExit('owl_p2.svg has no nested wing joints; run tools/slice_wing.py --svg first')
    cuts = json.load(open(os.path.join(ROOT, 'art', 'parts', 'owl', 'parts.json')))['wing_slice']['cuts']
    piv = pivots_from_svg(new)
    bend_css = BEND_CSS % (piv['armL_mid'], BEND, piv['armL_tip'], BEND, piv['armR_mid'], BEND, piv['armR_tip'], BEND)
    report = dict(generated_at=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), ref_original=REF, bend_deg_per_segment=BEND,
                  renders_per_doc=REPS, url=URL, cuts=cuts, dpr={})
    os.makedirs(PROOFS, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for dpr in (1, 2):
            so = await shots(b, orig, dpr); sn = await shots(b, new, dpr); sb = await shots(b, new, dpr, bend_css)
            mo, mn, mb = (np.median(np.stack(s), 0) for s in (so, sn, sb))
            d = np.abs(mo - mn).max(-1)
            wing = {}
            for side, (x, y, w, h) in BOXES.items():
                X0, Y0, X1, Y1 = (int(v * CSS * dpr) for v in (x, y, x + w, y + h))
                wing[side] = summarize(d[Y0:Y1, X0:X1])
            raw = [summarize(np.abs(o - n).max(-1)) for o in so for n in sn]
            ctrl = [summarize(np.abs(so[i] - so[j]).max(-1)) for i in range(REPS) for j in range(i + 1, REPS)]
            ctrl += [summarize(np.abs(sn[i] - sn[j]).max(-1)) for i in range(REPS) for j in range(i + 1, REPS)]
            seams_bend, seams_rest = seams_for(mb, mn, cuts, dpr), seams_for(mn, mn, cuts, dpr)
            sweep = {}
            for ang in SWEEP:
                css = BEND_CSS % (piv['armL_mid'], ang, piv['armL_tip'], ang, piv['armR_mid'], ang, piv['armR_tip'], ang)
                ms = np.median(np.stack(await shots(b, new, dpr, css)), 0)
                sweep[str(ang)] = {side: [c['gap_cols'] for c in v] for side, v in seams_for(ms, mn, cuts, dpr).items()}
            Image.fromarray(mn.astype(np.uint8)).save(os.path.join(PROOFS, f'g14_wing_rest_dpr{dpr}.png'))
            Image.fromarray(mb.astype(np.uint8)).save(os.path.join(PROOFS, f'g14_wing_bend_dpr{dpr}.png'))
            Image.fromarray(np.clip(d * 40, 0, 255).astype(np.uint8)).save(os.path.join(PROOFS, f'g14_wing_diff_dpr{dpr}.png'))
            gb = sum(s['gap_cols'] for v in seams_bend.values() for s in v)
            gr = sum(s['gap_cols'] for v in seams_rest.values() for s in v)
            report['dpr'][str(dpr)] = dict(shape=list(d.shape), median_diff_whole=summarize(d), median_diff_wing_boxes=wing,
                                          raw_pairs=raw, control_same_doc_pairs=ctrl, seam_bend=seams_bend, seam_rest=seams_rest,
                                          seam_gap_sweep=sweep,
                                          pass_rest_wing_median_diff_0=all(v['max_abs_diff'] == 0 for v in wing.values()),
                                          pass_seam_gap_0_bend=gb == 0, pass_seam_gap_0_rest=gr == 0)
        await b.close()
    report['pass_all'] = all(v[k] for v in report['dpr'].values()
                             for k in ('pass_rest_wing_median_diff_0', 'pass_seam_gap_0_bend', 'pass_seam_gap_0_rest'))
    json.dump(report, open(os.path.join(PROOFS, 'g14_wing_render.json'), 'w'), indent=1)
    for k, v in report['dpr'].items():
        print(f"dpr{k}: rest wing diff {[(s, w['max_abs_diff'], w['pixels_differing']) for s, w in v['median_diff_wing_boxes'].items()]} "
              f"whole {v['median_diff_whole']['max_abs_diff']}/{v['median_diff_whole']['pixels_differing']}")
        print(f"      seam bend {v['seam_bend']}")
        print(f"      seam rest {v['seam_rest']}")
        print(f"      gap sweep (deg -> gap cols per cut, L/R) {v['seam_gap_sweep']}")
    print('pass_all', report['pass_all'])
    sys.exit(0 if report['pass_all'] else 1)


if __name__ == '__main__':
    asyncio.run(main())
