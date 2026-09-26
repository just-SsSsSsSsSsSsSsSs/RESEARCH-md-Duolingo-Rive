#!/usr/bin/env python3
"""
K9.2b-1  slice_parts.py  -  split the owl eye and lid plates into independent
left / right parts and extract each iris disc as its own layer.

Why: eyes.webp and lids.webp are single 336x166 plates covering both eyes, so
the rig could never move one eye, one lid or one pupil independently (pupilR,
eyeR and lidR groups in owl_p2.svg were empty).  Owner decision (a), gist
b5d111c1: slice L/R plus extract iris/pupil per eye; acceptance = recompositing
L+R in the original position gives pixel_diff = 0 with no visible seam at DPR1
and DPR2.

What it does (deterministic, no guessing):
  1. Finds the fully transparent column gap between the two eyes and cuts in
     its middle (both plates share the same layout).
  2. Segments each iris (saturated orange or dark pixels), closes it, keeps the
     largest component, then fits a circle to its boundary with a least-squares
     (Kasa) fit plus residual-based outlier rejection, so the specular highlight
     that bites into the right iris cannot distort the fit.
  3. Writes pupilL/pupilR plates = the disc pixels (radius + 2.5 px to keep the
     anti-aliased rim), and eyesL/eyesR = the half plate with the disc region
     inpainted from the sclera ring just outside the disc (radial nearest
     sample), so the white stays intact when the pupil moves.
  4. Writes lidsL/lidsR = plain halves of lids.webp.
  5. All outputs are LOSSLESS webp so the plate-level recomposite is exact.
  6. Updates parts.json (new entries + supersedes) and rewrites owl_p2.svg:
     eyeL/eyeR each get their white plate + a pupil child, lidL/lidR get their
     plate, pivots move to each eye centre.  Image rects reproduce the exact
     rendered rect of the original plate (which used the default
     preserveAspectRatio xMidYMid meet) and use preserveAspectRatio="none".
  7. Proof (plate level, numpy): recomposite of all new plates over a blank
     canvas == original plate  ->  diff must be 0.
     Proof (render level, Playwright, DPR1 and DPR2, lids forced visible, each document
     rendered 3x, per-pixel median compared): original SVG (from git history) vs
     new SVG -> median diff must be 0; raw pairwise and same-document control
     diffs are reported unfiltered; no raw pair may differ inside the eye region.
  Results -> sandbox/samples/proofs/g11b_slice_diff.json (+ png evidence).

Usage:
  python3 sandbox/tools/slice_parts.py            # slice + plate proof
  python3 sandbox/tools/slice_parts.py --render   # + rendered proof (needs
                                                  #   server on :8080 and playwright)
  python3 sandbox/tools/slice_parts.py --ref d75e792   # git ref of the original SVG
"""
import argparse
import asyncio
import io
import json
import os
import re
import subprocess
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PARTS = os.path.join(ROOT, 'art', 'parts', 'owl')
SVG = os.path.join(ROOT, 'companions', 'owl_p2.svg')
PROOFS = os.path.join(ROOT, 'samples', 'proofs')

# Original placement of both plates in owl_p2.svg (viewBox units)
PLATE_BOX = dict(x=61.0, y=66.0, w=78.0, h=38.4)


def load(name):
    return np.array(Image.open(os.path.join(PARTS, name)).convert('RGBA'))


def save_lossless(arr, name):
    path = os.path.join(PARTS, name)
    Image.fromarray(arr, 'RGBA').save(path, 'WEBP', lossless=True, quality=100, method=6)
    return os.path.getsize(path)


def transparent_gap(alpha):
    cols = (alpha > 0).sum(0)
    idx = [i for i in range(alpha.shape[1]) if cols[i] == 0]
    # keep the run nearest the middle
    mid = alpha.shape[1] // 2
    runs, cur = [], []
    for i in idx:
        if cur and i != cur[-1] + 1:
            runs.append(cur)
            cur = []
        cur.append(i)
    if cur:
        runs.append(cur)
    if not runs:
        raise SystemExit('no transparent column gap found')
    run = min(runs, key=lambda r: abs((r[0] + r[-1]) / 2 - mid))
    return run[0], run[-1]


def iris_mask(rgba):
    rgb = rgba[..., :3].astype(np.float32)
    a = rgba[..., 3]
    mx = rgb.max(-1)
    mn = rgb.min(-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    orange = (sat > 0.45) & (r > g) & (g >= b) & (mx > 60)
    dark = mx < 90
    return (orange | dark) & (a > 200)


def fit_circle(points):
    """Kasa algebraic least-squares circle fit. points: (N,2) as x,y."""
    x, y = points[:, 0], points[:, 1]
    A = np.c_[2 * x, 2 * y, np.ones_like(x)]
    b = x * x + y * y
    sol, *_ = np.linalg.lstsq(A, b, rcond=None)
    cx, cy, c = sol
    r = np.sqrt(c + cx * cx + cy * cy)
    return cx, cy, r


def robust_circle(mask, iters=4, tol=2.0):
    lab, n = ndi.label(mask)
    if n == 0:
        raise SystemExit('iris mask empty')
    sizes = ndi.sum(mask, lab, range(1, n + 1))
    comp = lab == (int(np.argmax(sizes)) + 1)
    comp = ndi.binary_fill_holes(ndi.binary_closing(comp, iterations=3))
    edge = comp & ~ndi.binary_erosion(comp)
    ys, xs = np.nonzero(edge)
    pts = np.c_[xs, ys].astype(np.float64)
    keep = np.ones(len(pts), bool)
    stats = {}
    for it in range(iters):
        cx, cy, r = fit_circle(pts[keep])
        res = np.abs(np.hypot(pts[:, 0] - cx, pts[:, 1] - cy) - r)
        new_keep = res < tol
        stats = dict(iter=it, inliers=int(new_keep.sum()), boundary_points=int(len(pts)),
                     rms_residual_px=float(np.sqrt((res[new_keep] ** 2).mean())))
        if new_keep.sum() == keep.sum() and (new_keep == keep).all():
            break
        keep = new_keep
    cx, cy, r = fit_circle(pts[keep])
    stats.update(cx=float(cx), cy=float(cy), r=float(r))
    return stats


def disc_mask(shape, cx, cy, r):
    yy, xx = np.mgrid[0:shape[0], 0:shape[1]]
    return np.hypot(xx - cx, yy - cy) <= r


def inpaint_radial(rgba, cx, cy, r, ring=(3.0, 7.0), sigma_deg=12.0):
    """Fill the iris disc with a smooth sclera field so the white looks intact
    when the pupil is moved off-centre.  Method: sample the sclera ring just
    outside the disc at 720 angles, smooth the samples circularly (gaussian,
    sigma_deg) to remove pixel streaks, then blend radially from the ring
    colour at the rim toward the ring mean at the centre (quadratic falloff).
    Alpha is kept from the source (all disc pixels are opaque, asserted by caller)."""
    out = rgba.copy()
    h, w = rgba.shape[:2]
    n = 720
    ang = np.linspace(0, 2 * np.pi, n, endpoint=False)
    ringc = np.zeros((n, 3))
    offs = np.arange(ring[0], ring[1] + 0.5, 1.0)
    for o in offs:  # band mean: skips the anti-aliased iris rim, averages sclera texture
        sx = np.clip(np.rint(cx + np.cos(ang) * (r + o)), 0, w - 1).astype(int)
        sy = np.clip(np.rint(cy + np.sin(ang) * (r + o)), 0, h - 1).astype(int)
        ringc += rgba[sy, sx, :3].astype(np.float64)
    ringc /= len(offs)
    k = int(round(sigma_deg / 360 * n))
    ringc = ndi.gaussian_filter1d(ringc, k, axis=0, mode='wrap')
    mean = ringc.mean(0)
    yy, xx = np.nonzero(disc_mask(rgba.shape, cx, cy, r))
    dx, dy = xx - cx, yy - cy
    d = np.hypot(dx, dy)
    a_idx = (np.rint((np.arctan2(dy, dx) % (2 * np.pi)) / (2 * np.pi) * n).astype(int)) % n
    t = np.clip(d / max(r, 1e-6), 0, 1)[:, None] ** 2
    col = mean[None, :] * (1 - t) + ringc[a_idx] * t
    out[yy, xx, :3] = np.clip(np.rint(col), 0, 255).astype(np.uint8)
    return out


def crop_bbox(mask, margin=1):
    ys, xs = np.nonzero(mask)
    return (max(int(xs.min()) - margin, 0), max(int(ys.min()) - margin, 0),
            int(xs.max()) + margin + 1, int(ys.max()) + margin + 1)


def rendered_rect(src_w, src_h, box):
    """Rect actually painted by <image> with default preserveAspectRatio (xMidYMid meet)."""
    s = min(box['w'] / src_w, box['h'] / src_h)
    rw, rh = src_w * s, src_h * s
    return dict(x=box['x'] + (box['w'] - rw) / 2, y=box['y'] + (box['h'] - rh) / 2, w=rw, h=rh, s=s)


def f(v):
    return ('%.4f' % v).rstrip('0').rstrip('.')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--render', action='store_true', help='also run the DPR1/DPR2 rendered proof')
    ap.add_argument('--ref', default='d75e792', help='git ref holding the original owl_p2.svg')
    ap.add_argument('--url', default='http://127.0.0.1:8080/sandbox/')
    ap.add_argument('--runs', type=int, default=3, help='renders per document for the per-pixel median (renderer flicker is intermittent)')
    args = ap.parse_args()

    eyes = load('eyes.webp')
    lids = load('lids.webp')
    H, W = eyes.shape[:2]
    assert lids.shape == eyes.shape, 'eyes and lids plates must share layout'

    g0, g1 = transparent_gap(eyes[..., 3])
    lg0, lg1 = transparent_gap(lids[..., 3])
    cut = (g0 + g1 + 1) // 2
    assert lg0 <= cut <= lg1 + 1, 'lids gap does not contain the cut column'

    report = dict(tool='sandbox/tools/slice_parts.py', plate=dict(w=W, h=H),
                  transparent_gap_cols=dict(eyes=[g0, g1], lids=[lg0, lg1]), cut_col=cut,
                  halves=dict(L=[0, cut], R=[cut, W]))

    # ---- iris circle fits (per half, in full-plate coordinates) ----
    im = iris_mask(eyes)
    fits = {}
    for side, (a, b) in (('L', (0, cut)), ('R', (cut, W))):
        m = np.zeros_like(im)
        m[:, a:b] = im[:, a:b]
        st = robust_circle(m)
        fits[side] = st
    report['iris_fit'] = fits

    # ---- build plates ----
    rr = rendered_rect(W, H, PLATE_BOX)
    report['original_rendered_rect'] = rr
    out_parts = {}
    plates = {}
    for side, (a, b) in (('L', (0, cut)), ('R', (cut, W))):
        st = fits[side]
        r_cut = st['r'] + 2.5  # measured: anti-aliased iris rim reaches r+2 (sat 0.19 at r+1, 0.12 at r+2, sclera 0.09)
        disc = disc_mask(eyes.shape, st['cx'], st['cy'], r_cut)
        white = inpaint_radial(eyes, st['cx'], st['cy'], r_cut)
        half = white[:, a:b].copy()
        pupil = eyes.copy()
        pupil[~disc] = 0
        x0, y0, x1, y1 = crop_bbox(disc)
        pupil_crop = pupil[y0:y1, x0:x1].copy()
        # every opaque pupil pixel must have been opaque in the source (inside sclera)
        assert (eyes[..., 3][disc] == 255).all(), 'iris disc touches non-opaque pixels'
        lid_half = lids[:, a:b].copy()
        names = dict(white='eyes%s.webp' % side, pupil='pupil%s.webp' % side, lid='lids%s.webp' % side)
        bytes_ = dict(white=save_lossless(half, names['white']),
                      pupil=save_lossless(pupil_crop, names['pupil']),
                      lid=save_lossless(lid_half, names['lid']))
        plates[side] = dict(white=half, pupil=pupil_crop, pupil_box=(x0, y0, x1, y1), lid=lid_half, disc=disc, a=a, b=b)
        out_parts['eyes' + side] = dict(file=names['white'], w=b - a, h=H, plate_offset=[a, 0], derived_from='eyes.webp',
                                        lossless=True, bytes=bytes_['white'], note='iris disc inpainted from sclera ring')
        out_parts['pupil' + side] = dict(file=names['pupil'], w=x1 - x0, h=y1 - y0, plate_offset=[x0, y0], derived_from='eyes.webp',
                                         lossless=True, bytes=bytes_['pupil'],
                                         iris=dict(cx=round(st['cx'], 2), cy=round(st['cy'], 2), r=round(st['r'], 2), cut_r=round(r_cut, 2)))
        out_parts['lids' + side] = dict(file=names['lid'], w=b - a, h=H, plate_offset=[a, 0], derived_from='lids.webp',
                                        lossless=True, bytes=bytes_['lid'])

    # ---- plate-level recomposite proof (exact) ----
    def over(dst, src, x, y):
        h, w = src.shape[:2]
        region = dst[y:y + h, x:x + w]
        sa = src[..., 3:4].astype(np.float32) / 255
        da = region[..., 3:4].astype(np.float32) / 255
        oa = sa + da * (1 - sa)
        rgb = (src[..., :3] * sa + region[..., :3] * da * (1 - sa)) / np.maximum(oa, 1e-6)
        region[..., :3] = np.rint(rgb).astype(np.uint8)
        region[..., 3:4] = np.rint(oa * 255).astype(np.uint8)

    canvas_eyes = np.zeros_like(eyes)
    canvas_lids = np.zeros_like(lids)
    for side in ('L', 'R'):
        p = plates[side]
        # halves do not overlap: plain placement, then pupil over (binary partition)
        canvas_eyes[:, p['a']:p['b']] = p['white']
        canvas_lids[:, p['a']:p['b']] = p['lid']
    for side in ('L', 'R'):
        p = plates[side]
        x0, y0, x1, y1 = p['pupil_box']
        # binary partition: pupil pixels replace white pixels exactly where disc is set
        sub = canvas_eyes[y0:y1, x0:x1]
        m = p['pupil'][..., 3] > 0
        sub[m] = p['pupil'][m]
    diff_e = np.abs(canvas_eyes.astype(int) - eyes.astype(int))
    diff_l = np.abs(canvas_lids.astype(int) - lids.astype(int))
    report['plate_recomposite'] = dict(eyes_max_abs_diff=int(diff_e.max()), eyes_pixels_differing=int((diff_e.max(-1) > 0).sum()),
                                       lids_max_abs_diff=int(diff_l.max()), lids_pixels_differing=int((diff_l.max(-1) > 0).sum()))
    report['plate_recomposite']['pass_pixel_diff_0'] = bool(diff_e.max() == 0 and diff_l.max() == 0)

    # ---- parts.json ----
    pj_path = os.path.join(PARTS, 'parts.json')
    pj = json.load(open(pj_path))
    for k in ('eyes', 'lids'):
        pj['parts'][k]['superseded_by'] = [k + 'L', k + 'R'] + (['pupilL', 'pupilR'] if k == 'eyes' else [])
        pj['parts'][k]['kept_for'] = 'recomposite proof reference (samples/proofs/g11b_slice_diff.json)'
    pj['parts'].update(out_parts)
    pj['slice'] = dict(tool='tools/slice_parts.py', cut_col=cut, transparent_gap_cols=[g0, g1])
    pj['total_bytes'] = sum(v['bytes'] for v in pj['parts'].values())
    pj['total_bytes_active'] = sum(v['bytes'] for k, v in pj['parts'].items() if 'superseded_by' not in v)
    json.dump(pj, open(pj_path, 'w'), indent=2)
    report['bytes'] = dict(note=('slices are LOSSLESS webp so the recomposite is exact (pixel_diff = 0 is the owner acceptance); '
                                 'this costs bytes versus the lossy originals. A lossy re-encode of the 6 slices is possible later '
                                 'but would break pixel_diff = 0 by construction (lossy over lossy) and must be a separate, disclosed decision.'),
                           total_all=pj['total_bytes'], total_active=pj['total_bytes_active'],
                           new={k: v['bytes'] for k, v in out_parts.items()},
                           superseded={k: pj['parts'][k]['bytes'] for k in ('eyes', 'lids')})

    # ---- SVG rewrite ----
    s = rr['s']

    def rect(px, py, pw, ph):
        return dict(x=rr['x'] + px * s, y=rr['y'] + py * s, w=pw * s, h=ph * s)

    def img(name, r):
        return ('<image href="art/parts/owl/%s" x="%s" y="%s" width="%s" height="%s" preserveAspectRatio="none" />'
                % (name, f(r['x']), f(r['y']), f(r['w']), f(r['h'])))

    svg = open(SVG, encoding='utf-8').read()
    piv = {}
    for side in ('L', 'R'):
        p = plates[side]
        st = fits[side]
        cx_u, cy_u = rr['x'] + st['cx'] * s, rr['y'] + st['cy'] * s
        piv[side] = (cx_u, cy_u)
        x0, y0, x1, y1 = p['pupil_box']
        white_r = rect(p['a'], 0, p['b'] - p['a'], H)
        pupil_r = rect(x0, y0, x1 - x0, y1 - y0)
        eye_new = ('<g data-joint="eye%s" data-pivot="%s %s">%s<g data-joint="pupil%s" data-pivot="%s %s">%s</g></g>'
                   % (side, f(cx_u), f(cy_u), img('eyes%s.webp' % side, white_r), side, f(cx_u), f(cy_u), img('pupil%s.webp' % side, pupil_r)))
        lid_top_u = rr['y']
        lid_new = ('<g data-joint="lid%s" data-pivot="%s %s" style="transform: scaleY(0)">%s</g>'
                   % (side, f(cx_u), f(lid_top_u), img('lids%s.webp' % side, white_r)))
        svg, n1 = re.subn(r'<g data-joint="eye%s"[^>]*>.*?<g data-joint="pupil%s"[^>]*>.*?</g></g>' % (side, side), eye_new, svg, count=1, flags=re.S)
        svg, n2 = re.subn(r'<g data-joint="lid%s"[^>]*>.*?</g>' % side, lid_new, svg, count=1, flags=re.S)
        assert n1 == 1 and n2 == 1, 'svg groups for side %s not found' % side
    open(SVG, 'w', encoding='utf-8').write(svg)
    report['svg'] = dict(path='sandbox/companions/owl_p2.svg', pivots_units={k: [round(v[0], 3), round(v[1], 3)] for k, v in piv.items()},
                         image_rects_preserveAspectRatio='none', scale_units_per_px=s)

    os.makedirs(PROOFS, exist_ok=True)
    # evidence sheet: original | white L/R | pupils | lids
    sheet = Image.new('RGBA', (W, H * 3 + 8), (40, 40, 40, 255))
    sheet.alpha_composite(Image.fromarray(eyes), (0, 0))
    sheet.alpha_composite(Image.fromarray(canvas_eyes), (0, H + 4))
    whites = np.zeros_like(eyes)
    for side in ('L', 'R'):
        p = plates[side]
        whites[:, p['a']:p['b']] = p['white']
    sheet.alpha_composite(Image.fromarray(whites), (0, 2 * H + 8))
    sheet.save(os.path.join(PROOFS, 'g11b_slice_sheet.png'))

    if args.render:
        report['rendered'] = asyncio.run(render_proof(args.ref, args.url, reps=args.runs))
        allv = list(report['rendered'].values())
        report['pass_rendered_pixel_diff_0'] = all(v['pass_median_pixel_diff_0'] for v in allv)
        report['pass_rendered_eye_region_exact'] = all(v['pass_eye_region_exact_every_raw_pair'] for v in allv)
        report['rendered_note'] = ('Each document rendered %d times in fresh contexts; per-pixel median compared. Raw pairwise and '
                                   'same-document control diffs are listed unfiltered: Chromium headless shows an intermittent one-column '
                                   'flicker inside untouched raster parts (css x=97, wingL, DPR1) that also appears original-vs-original. '
                                   'Acceptance: median diff 0 at DPR1 and DPR2, and no differing pixel inside the eye/lid region in any raw pair.' % args.runs)
    json.dump(report, open(os.path.join(PROOFS, 'g11b_slice_diff.json'), 'w'), indent=2)
    print(json.dumps({k: report[k] for k in report if k in ('cut_col', 'iris_fit', 'plate_recomposite', 'bytes', 'rendered', 'pass_rendered_pixel_diff_0', 'pass_rendered_eye_region_exact')}, indent=1))
    ok = report['plate_recomposite']['pass_pixel_diff_0']
    if args.render:
        ok = ok and report['pass_rendered_pixel_diff_0'] and report['pass_rendered_eye_region_exact']
    return 0 if ok else 1


async def render_proof(ref, url, reps=3):
    """Render original (git ref) vs new SVG at DPR1 and DPR2 and diff pixels.
    Chromium headless has an intermittent one-column resampling flicker inside untouched raster
    parts (observed at css x=97, wingL, DPR1, 46 px, max 13) that appears at random in ANY render,
    including original-vs-original.  So each document is rendered `reps` times in fresh contexts
    and the per-pixel MEDIAN is compared (a single flicker cannot survive a 3-sample median).
    Reported honestly: raw pairwise diffs, control (orig vs orig) diffs, and the median diff.
    Strict on every raw pair: no differing pixel inside the eye/lid region.
    Lids are forced visible so the lid split is covered."""
    from playwright.async_api import async_playwright
    orig = subprocess.check_output(['git', 'show', '%s:sandbox/companions/owl_p2.svg' % ref], cwd=os.path.join(ROOT, '..')).decode()
    new = open(SVG, encoding='utf-8').read()
    pj = json.load(open(os.path.join(PARTS, 'parts.json')))
    rr = rendered_rect(pj['parts']['eyes']['w'], pj['parts']['eyes']['h'], PLATE_BOX)
    CSS_PX_PER_UNIT = 2.0  # 400 px wide box for a 200-unit viewBox
    page_html = ('<!doctype html><html><head><base href="%s"><style>html,body{margin:0;background:#fff}'
                 '#box{width:400px;height:480px}#box svg{width:400px;height:480px;display:block}'
                 '[data-joint^="lid"]{transform:none !important}</style></head><body><div id="box">%s</div></body></html>')
    out = {}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for dpr in (1, 2):
            shots = {'orig': [], 'new': []}
            for i in range(reps):
                for tag, doc in (('orig', orig), ('new', new)):
                    ctx = await b.new_context(viewport=dict(width=420, height=500), device_scale_factor=dpr)
                    page = await ctx.new_page()
                    await page.set_content(page_html % (url, doc), wait_until='networkidle')
                    await page.wait_for_timeout(300)
                    png = await page.locator('#box').screenshot(omit_background=False)
                    shots[tag].append(np.array(Image.open(io.BytesIO(png)).convert('RGBA')).astype(int))
                    await ctx.close()
            eye_px = dict(x0=rr['x'] * CSS_PX_PER_UNIT * dpr, x1=(rr['x'] + rr['w']) * CSS_PX_PER_UNIT * dpr,
                          y0=rr['y'] * CSS_PX_PER_UNIT * dpr, y1=(rr['y'] + rr['h']) * CSS_PX_PER_UNIT * dpr)

            def summarize(d):
                ys, xs = np.nonzero(d > 0)
                bbox = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())] if len(xs) else None
                in_eye = bool(len(xs)) and bool(((xs >= eye_px['x0']) & (xs <= eye_px['x1']) & (ys >= eye_px['y0']) & (ys <= eye_px['y1'])).any())
                return dict(max_abs_diff=int(d.max()), pixels_differing=int((d > 0).sum()), diff_bbox_px=bbox, diff_touches_eye_region=in_eye)

            raw_pairs = [summarize(np.abs(o - n).max(-1)) for o in shots['orig'] for n in shots['new']]
            controls = [summarize(np.abs(shots['orig'][i] - shots['orig'][j]).max(-1)) for i in range(reps) for j in range(i + 1, reps)]
            controls += [summarize(np.abs(shots['new'][i] - shots['new'][j]).max(-1)) for i in range(reps) for j in range(i + 1, reps)]
            med_o = np.median(np.stack(shots['orig']), axis=0)
            med_n = np.median(np.stack(shots['new']), axis=0)
            d = np.abs(med_o - med_n).max(-1)
            Image.fromarray(np.clip(d * 40, 0, 255).astype(np.uint8)).save(os.path.join(PROOFS, 'g11b_render_diff_dpr%d.png' % dpr))
            Image.fromarray(med_n.astype(np.uint8)).save(os.path.join(PROOFS, 'g11b_render_new_dpr%d.png' % dpr))
            # eye-region crop pair for visual seam check
            x0, y0, x1, y1 = (int(eye_px['x0']) - 4, int(eye_px['y0']) - 4, int(eye_px['x1']) + 5, int(eye_px['y1']) + 5)
            pair = np.concatenate([med_o[y0:y1, x0:x1], med_n[y0:y1, x0:x1]], axis=1).astype(np.uint8)
            Image.fromarray(pair).save(os.path.join(PROOFS, 'g11b_eye_region_orig_vs_new_dpr%d.png' % dpr))
            out['dpr%d' % dpr] = dict(shape=list(d.shape), pixels_total=int(d.size), renders_per_doc=reps,
                                     median_diff=summarize(d), raw_pairs=raw_pairs, control_same_doc_pairs=controls,
                                     eye_region_px={k: round(v, 1) for k, v in eye_px.items()},
                                     pass_median_pixel_diff_0=bool(d.max() == 0),
                                     pass_eye_region_exact_every_raw_pair=all(not r['diff_touches_eye_region'] for r in raw_pairs))
        await b.close()
    return out


if __name__ == '__main__':
    sys.exit(main())
