#!/usr/bin/env python3
"""
K9.5-3 (owner decision 2026-09-27, item c): author REAL smile and sad beak plates, 137 x 126, from beak_closed.webp.

Why a derived plate and not a new drawing: the sheet (art/src/owl_sheet.png) has one closed beak; the P2 rig shows
smile/sad by re-scaling that same plate (docs/ART_INVENTORY.md rows 30-31: "NO (same plate)"). G12 rated sad 4/7 on
byte-identical clips - the expression is not in the art. This tool puts it in the art, deterministically, so the plates
can be regenerated and diffed like every other part (cut_parts.py, tools/slice_parts.py precedent).

Method (compared before choosing):
  - PIL Image.transform(MESH): piecewise affine, coarse, tears the soft alpha edge at quad borders -> rejected
  - PIL Image.transform(QUAD/PERSPECTIVE): moves the whole plate, cannot pin the nostrils -> rejected
  - column-shear displacement field (this file): every output pixel samples the source at (x, y - dy(x, y)) with
    bilinear interpolation on PREMULTIPLIED RGBA (no dark fringe), dy = w(y) * (corner term + tip term):
      w(y)   0 above the widest row (nostrils and the upper ridge stay pixel-identical), smooth ramp to 1 at the seam
      corner u = (x - cx) / half_width in [-1, 1]; corners move by AMP * u^2 (smile: up, sad: down)
      tip    the centre counter-moves by TIP * (1 - u^2) so the seam bows instead of sliding
    Pure Pillow + numpy, deterministic (no randomness), canvas fixed at the source size so the SVG box is reused as is.
Outputs (lossless webp, like slice_parts.py): parts/owl/beak_smile.webp, parts/owl/beak_sad.webp; parts.json entries
with derived_from, tool, and the displacement parameters; prints the measured corner/tip rows for the proof.
Run: python3 sandbox/art/author_mouth_plates.py            (idempotent; --check compares against the committed files)

Run log: run 1 (a8b2d5b, amp 9/8, tip 3, no spread, ramp 30) produced plates that read identical to beak_closed at rig
size - measured corner shift only 2-3 px because the ramp was still at 0.9 at the seam and u^2 at the measured corner
is 0.5. Strengthened: amp 16/14, spread 5/-4 (corners out for smile, in for sad), ramp 22 rows; the pinned-top check now
compares visible pixels with rounding tolerance (run 1 reported false only from RGB under alpha 0).
Run 2 (amp 16/14, spread, ramp 22): silhouette changed but the plates still read neutral at 3x - the source's own crease
(an inverted-V chevron, corners y 83-88, centre y 108-111) stays the dominant mouth line whatever the warp does. So the
tool now authors the line itself, the way the brows were authored (tools/add_brows.py): heal_crease removes the chevron
(per-column vertical inpaint of the dark rows), warp reshapes the silhouette, paint_crease draws the designed mouth line
(quadratic Bezier through corners and centre, sampled crease colour, feathered, multiply blend, solid pixels only).
Run 3: smile reads at 3x; sad line sat at the tip (corners y 107) and the column inpaint left vertical streaks. Sad
crease raised (corner_dy 6, centre 87); healed pixels smoothed with a horizontal 7-px box over solid neighbours.
"""
import json
import os
import sys
from collections import OrderedDict

import numpy as np
from PIL import Image

HERE = os.path.abspath(os.path.dirname(__file__))
PARTS = os.path.join(HERE, 'parts', 'owl')
SRC = 'beak_closed.webp'
TOOL = 'art/author_mouth_plates.py'

# displacement parameters in source-plate pixels (137 x 126). AMP moves the seam corners, TIP counter-moves the centre.
SHAPES = OrderedDict([
    # warp: corners up 16 px and out 5 px, centre down 4 px; crease: U from the corners (y 80) down to the centre (y 106)
    ('beak_smile', dict(amp=-16.0, tip=4.0, spread=5.0, crease=dict(corner_dy=-6, centre_y=106, width=4.2))),
    # warp: corners down 14 px and in 4 px, centre up 4 px; crease: arch from the corners (y 99) up to the centre (y 87)
    ('beak_sad', dict(amp=14.0, tip=-4.0, spread=-4.0, crease=dict(corner_dy=6, centre_y=87, width=4.2))),
])
CREASE_RGB = (135.0, 52.0, 18.0)   # mean colour of the source crease pixels (alpha > 200, luma < 80), measured 2026-09-28
RAMP_ROWS = 22   # the displacement ramps from 0 at the pin line to full over this many rows (concentrates the bend at the seam)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def geometry(alpha):
    """widest row (pin line), seam corner rows at both edges, tip row - measured, not assumed."""
    H, W = alpha.shape
    solid = alpha > 128
    widths = solid.sum(1)
    widest = int(np.argmax(widths))
    tip = int(np.max(np.where(widths > 0)[0]))
    cols = np.where(solid.any(0))[0]
    x0, x1 = int(cols.min()), int(cols.max())
    cx = (x0 + x1) / 2.0
    half = (x1 - x0) / 2.0
    return dict(widest_row=widest, tip_row=tip, x0=x0, x1=x1, cx=cx, half=half)


def seam_rows(rgba, alpha, x_from_edge=18):
    """darkest solid row near each edge column = the seam corner (the crease that reads as the mouth line)."""
    lum = 0.3 * rgba[..., 0] + 0.59 * rgba[..., 1] + 0.11 * rgba[..., 2]
    H, W = alpha.shape
    g = geometry(alpha)
    out = {}
    for side, x in (('L', g['x0'] + x_from_edge), ('R', g['x1'] - x_from_edge)):
        ys = [y for y in range(H) if alpha[y, x] > 128 and y > g['widest_row']]
        out[side] = int(min(ys, key=lambda y: lum[y, x])) if ys else None
    return out


def heal_crease(src, seam, band=7):
    """Remove the source's chevron crease so the painted line is the only mouth line. For every column, rows within
    `band` of the crease path whose luma is dark are replaced by a vertical interpolation between the pixels just
    outside the band (premultiplied, so the soft edge stays intact). The crease path is measured per column."""
    H, W, _ = src.shape
    out = src.copy(); touched = np.zeros((H, W), dtype=bool)
    a = src[..., 3]; lum = 0.3 * src[..., 0] + 0.59 * src[..., 1] + 0.11 * src[..., 2]
    g = geometry(a)
    for x in range(W):
        rows = [y for y in range(g['widest_row'], H) if a[y, x] > 200]
        if len(rows) < 2 * band + 4: continue
        yc = min(rows, key=lambda y: lum[y, x])           # darkest solid row below the pin line = the crease in this column
        if lum[yc, x] > 120: continue
        y0, y1 = yc - band, yc + band
        if y0 < rows[0] + 1 or y1 > rows[-1] - 1: continue
        top, bot = src[y0, x], src[y1, x]
        for y in range(y0 + 1, y1):
            t = (y - y0) / (y1 - y0)
            if lum[y, x] < 150: out[y, x, :3] = top[:3] * (1 - t) + bot[:3] * t; touched[y, x] = True   # only the dark pixels; highlights stay
    # the per-column fill leaves vertical streaks: smooth the touched pixels with a 7-px horizontal box over solid neighbours
    blurred = out.copy(); solid = (a > 200).astype(np.float32)
    acc = np.zeros_like(out[..., :3]); wsum = np.zeros((H, W, 1), dtype=np.float32)
    for k in range(-3, 4):
        sh = np.roll(out[..., :3], k, axis=1); sw = np.roll(solid, k, axis=1)[..., None]
        acc += sh * sw; wsum += sw
    blurred[..., :3] = np.where(wsum > 0, acc / np.maximum(wsum, 1e-6), out[..., :3])
    out[touched, :3] = blurred[touched, :3]
    return out


def paint_crease(arr, seam, corner_dy, centre_y, width):
    """Draw the mouth line: a quadratic Bezier from the left corner through the centre to the right corner, stroked in
    CREASE_RGB with a feathered edge, multiplied into the plate (darkens, never lightens), only where the plate is solid."""
    H, W, _ = arr.shape
    a = arr[..., 3].astype(np.float32)
    g = geometry(a)
    xl, xr = g['x0'] + 16.0, g['x1'] - 16.0
    yl, yr = seam['L'] + corner_dy, seam['R'] + corner_dy
    # control point so the curve passes through (cx, centre_y) at t = 0.5: P1 = 2 * M - (P0 + P2) / 2
    p0 = np.array([xl, yl]); p2 = np.array([xr, yr]); m = np.array([g['cx'], centre_y]); p1 = 2 * m - (p0 + p2) / 2
    t = np.linspace(0, 1, 400)[:, None]
    pts = (1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t ** 2 * p2
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.full((H, W), 1e9, dtype=np.float32)
    for px, py in pts: d = np.minimum(d, np.hypot(xs - px, ys - py))
    taper = 0.55 + 0.45 * (1 - np.abs((xs - g['cx']) / max(g['half'], 1)) ** 2)          # thinner toward the corners
    cover = np.clip((width * taper / 2 + 0.75 - d) / 1.5, 0, 1) * (a > 200)               # feathered stroke, solid pixels only
    out = arr.astype(np.float32).copy()
    for c in range(3):
        out[..., c] = out[..., c] * (1 - cover) + (out[..., c] * (CREASE_RGB[c] / 255.0)) * cover   # multiply blend
    return np.clip(np.rint(out), 0, 255).astype(np.uint8), dict(corners=[[round(xl, 1), round(float(yl), 1)], [round(xr, 1), round(float(yr), 1)]], centre=[round(g['cx'], 1), centre_y], width=width, points=len(t))


def warp(src, amp, tip, spread=0.0):
    """src: float32 RGBA (H, W, 4) straight alpha 0..255 -> warped straight-alpha uint8 RGBA of the same size.
    dy bends the seam (corner term amp * u^2, tip term tip * (1 - u^2)); dx = spread * u pulls the corners out (smile) or in (sad)."""
    H, W, _ = src.shape
    a = src[..., 3:4] / 255.0
    pre = np.concatenate([src[..., :3] * a, a], axis=2)       # premultiplied RGB + alpha
    g = geometry(src[..., 3])
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    u = np.clip((xs - g['cx']) / g['half'], -1.0, 1.0)
    w = smoothstep(g['widest_row'], g['widest_row'] + RAMP_ROWS, ys)   # 0 at the pin line, 1 from the seam down
    dy = w * (amp * u * u + tip * (1.0 - u * u))
    dx = w * spread * u
    sy = np.clip(ys - dy, 0, H - 1)                             # inverse map: where does this output pixel come from
    sx = np.clip(xs - dx, 0, W - 1)
    y0 = np.floor(sy).astype(np.int32); y1 = np.minimum(y0 + 1, H - 1); fy = (sy - y0)[..., None]
    x0 = np.floor(sx).astype(np.int32); x1 = np.minimum(x0 + 1, W - 1); fx = (sx - x0)[..., None]
    out = (pre[y0, x0] * (1 - fx) + pre[y0, x1] * fx) * (1 - fy) + (pre[y1, x0] * (1 - fx) + pre[y1, x1] * fx) * fy   # bilinear
    oa = out[..., 3:4]
    rgb = np.where(oa > 1e-4, out[..., :3] / np.maximum(oa, 1e-4), 0.0)
    res = np.concatenate([np.clip(rgb, 0, 255), np.clip(oa * 255.0, 0, 255)], axis=2)
    return np.rint(res).astype(np.uint8), dict(amp=amp, tip=tip, spread=spread, pin_row=g['widest_row'], ramp_rows=RAMP_ROWS)


def main(check=False):
    src_img = Image.open(os.path.join(PARTS, SRC)).convert('RGBA')
    src = np.asarray(src_img).astype(np.float32)
    H, W = src.shape[:2]
    base_seam = seam_rows(src, src[..., 3])
    report = {'source': SRC, 'size': [W, H], 'source_seam_rows': base_seam, 'source_geometry': geometry(src[..., 3]), 'plates': {}}
    manifest_path = os.path.join(PARTS, 'parts.json')
    manifest = json.load(open(manifest_path, encoding='utf8'), object_pairs_hook=OrderedDict)
    changed = []
    for name, P in SHAPES.items():
        healed = heal_crease(src, base_seam)
        arr, params = warp(healed, P['amp'], P['tip'], P.get('spread', 0.0))
        seam_w = seam_rows(arr.astype(np.float32), arr[..., 3])
        C = P['crease']
        arr, crease = paint_crease(arr, {k: (v if v is not None else base_seam[k]) for k, v in seam_w.items()}, C['corner_dy'], C['centre_y'], C['width'])
        params = dict(params, crease=crease, healed_source_crease=True)
        assert arr.shape == (H, W, 4), arr.shape
        fname = f'{name}.webp'
        path = os.path.join(PARTS, fname)
        tmp = path + '.tmp.webp'
        Image.fromarray(arr, 'RGBA').save(tmp, 'WEBP', lossless=True, quality=100, method=6)
        new_bytes = open(tmp, 'rb').read()
        if check:
            old = open(path, 'rb').read() if os.path.exists(path) else b''
            same = old == new_bytes
            os.remove(tmp)
            if not same: changed.append(fname)
        else:
            os.replace(tmp, path)
        seam = seam_rows(arr.astype(np.float32), arr[..., 3])
        # pinned region check on VISIBLE pixels (alpha > 0) with 1/255 rounding tolerance; RGB under alpha 0 is undefined
        top_src = np.rint(src[:params['pin_row']]).astype(np.int32); top_out = arr[:params['pin_row']].astype(np.int32)
        vis = top_src[..., 3] > 0
        top_identical = bool(np.abs(top_out[vis] - top_src[vis]).max() <= 1) if vis.any() else True
        report['plates'][name] = dict(file=fname, w=W, h=H, bytes=len(new_bytes), seam_rows=seam,
                                      corner_shift_px={k: (seam[k] - base_seam[k]) if seam[k] is not None and base_seam[k] is not None else None for k in seam},
                                      tip_row=geometry(arr[..., 3])['tip_row'], top_half_identical=top_identical, params=params)
        if not check:
            manifest['parts'][name] = OrderedDict([('file', fname), ('w', W), ('h', H), ('cell_offset', list(manifest['parts']['beak_closed']['cell_offset'])),
                                                   ('scale', manifest['parts']['beak_closed']['scale']), ('bytes', len(new_bytes)), ('derived_from', SRC),
                                                   ('tool', TOOL), ('warp', params)])
    if not check:
        manifest['mouth_plates'] = OrderedDict([('tool', TOOL), ('method', 'column-shear displacement, premultiplied bilinear, top half pinned'),
                                                ('plates', list(SHAPES.keys()))])
        with open(manifest_path, 'w', encoding='utf8') as f:
            json.dump(manifest, f, indent=1, ensure_ascii=False)   # same writer as cut_parts.py: indent 1, no trailing newline
    print(json.dumps(report, indent=1))
    if check:
        print('author_mouth_plates --check:', 'up to date' if not changed else f'STALE {changed}')
        return 0 if not changed else 1
    return 0


if __name__ == '__main__':
    sys.exit(main(check='--check' in sys.argv[1:]))
