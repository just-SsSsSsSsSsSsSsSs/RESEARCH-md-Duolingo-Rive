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
    ('beak_smile', dict(amp=-9.0, tip=3.0)),    # corners up 9 px, centre down 3 px -> the seam bows into a smile
    ('beak_sad', dict(amp=8.0, tip=-3.0)),      # corners down 8 px, centre up 3 px -> the seam bows into a frown
])


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


def warp(src, amp, tip):
    """src: float32 RGBA (H, W, 4) straight alpha 0..255 -> warped straight-alpha uint8 RGBA of the same size."""
    H, W, _ = src.shape
    a = src[..., 3:4] / 255.0
    pre = np.concatenate([src[..., :3] * a, a], axis=2)       # premultiplied RGB + alpha
    g = geometry(src[..., 3])
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    u = np.clip((xs - g['cx']) / g['half'], -1.0, 1.0)
    w = smoothstep(g['widest_row'], g['widest_row'] + 30, ys)   # 0 at the pin line, 1 from the seam down
    dy = w * (amp * u * u + tip * (1.0 - u * u))
    sy = np.clip(ys - dy, 0, H - 1)                             # inverse map: where does this output pixel come from
    y0 = np.floor(sy).astype(np.int32); y1 = np.minimum(y0 + 1, H - 1); fy = (sy - y0)[..., None]
    xi = xs.astype(np.int32)
    out = pre[y0, xi] * (1 - fy) + pre[y1, xi] * fy            # bilinear along y (x is not displaced)
    oa = out[..., 3:4]
    rgb = np.where(oa > 1e-4, out[..., :3] / np.maximum(oa, 1e-4), 0.0)
    res = np.concatenate([np.clip(rgb, 0, 255), np.clip(oa * 255.0, 0, 255)], axis=2)
    return np.rint(res).astype(np.uint8), dict(amp=amp, tip=tip, pin_row=g['widest_row'], ramp_rows=30)


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
        arr, params = warp(src, P['amp'], P['tip'])
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
        top_identical = bool(np.array_equal(arr[:params['pin_row']], np.rint(src[:params['pin_row']]).astype(np.uint8)))
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
            json.dump(manifest, f, indent=1, ensure_ascii=False); f.write('\n')
    print(json.dumps(report, indent=1))
    if check:
        print('author_mouth_plates --check:', 'up to date' if not changed else f'STALE {changed}')
        return 0 if not changed else 1
    return 0


if __name__ == '__main__':
    sys.exit(main(check='--check' in sys.argv[1:]))
