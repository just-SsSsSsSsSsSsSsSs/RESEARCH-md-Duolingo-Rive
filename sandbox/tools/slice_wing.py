#!/usr/bin/env python3
"""K9.5-1: slice each owl wing plate into 3 overlapping bands (shoulder / mid / tip).

Why (PROGRESS K9.5 RESEARCH): a 3-segment wing gives drag + follow-through [P9 Lasseter 2.5]
without a mesh warp (ruled out by ADR-002 addendum d). Cut-out pieces must OVERLAP at the
joint and the upper piece covers the seam [P10 Toon Boom "About Articulations"].

What it does
  1. Reads art/parts/owl/wingL.webp and wingR.webp (232 x 330 RGBA, shoulder at the top).
  2. Finds two cut rows from the alpha profile (narrow shoulder -> wide middle -> narrowing tip)
     or takes --cuts R1,R2.
  3. Writes three lossless bands per wing:
       <wing>_sh  rows [0, c1)                  (no extension; it is on top)
       <wing>_mid rows [c1 - EXT, c2)           (EXT rows of hidden extension under the shoulder)
       <wing>_tip rows [c2 - EXT, H)            (EXT rows of hidden extension under the mid)
     Extension pixels = the original plate pixels, masked to where the band ABOVE is fully
     opaque after an erosion of ERODE px, so the resting composite is byte-identical to the plate
     (upper band alpha 255 wins in the over operator) and under a bend the extension fills the seam.
  4. Recomposites sh over mid over tip with the standard "over" operator and asserts
     max_abs_diff == 0 against the original plate (same proof idea as K9.2b-1).
  5. Updates parts.json (new entries + supersedes) and writes samples/proofs/g14_wing_slice.json.
     The SVG rewrite is K9.5-2 (this tool prints the numbers the SVG needs: pivots in viewBox px).

No new dependencies: PIL + numpy (already used by tools/slice_parts.py).
"""
import argparse, json, os, sys, time
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SANDBOX = os.path.dirname(HERE)
PARTS = os.path.join(SANDBOX, 'art', 'parts', 'owl')
PROOFS = os.path.join(SANDBOX, 'samples', 'proofs')

EXT = 18        # rows of hidden extension under the band above (source px)
ERODE = 6       # erosion of the "band above is opaque" mask (source px); > bilinear kernel at DPR1 (232/50 = 4.6 px per CSS px)
ALPHA_ON = 16   # alpha threshold for the fill profile

# placement of the whole wing in owl_p2.svg (viewBox px) - read from the SVG, not assumed
WING_BOX = {'wingL': (30.0, 116.0, 50.0, 71.6), 'wingR': (120.0, 116.0, 50.0, 71.0)}


def load(part):
    return np.array(Image.open(os.path.join(PARTS, part + '.webp')).convert('RGBA'))


def save_lossless(arr, part):
    path = os.path.join(PARTS, part + '.webp')
    Image.fromarray(arr, 'RGBA').save(path, 'WEBP', lossless=True, quality=100, method=6)
    return os.path.getsize(path)


def fill_profile(alpha):
    return (alpha > ALPHA_ON).sum(1)


def auto_cuts(alpha):
    """Two cut rows: where the fill first reaches 80 % of its max (end of the shoulder) and where it
    last falls back under 80 % (start of the tip). Snapped so each band is at least 40 rows."""
    prof = fill_profile(alpha).astype(float)
    hi = prof.max() * 0.8
    wide = np.where(prof >= hi)[0]
    c1, c2 = int(wide[0]), int(wide[-1]) + 1
    H = alpha.shape[0]
    c1 = max(40, min(c1, H - 80))
    c2 = max(c1 + 40, min(c2, H - 40))
    return c1, c2


def erode(mask, r):
    """Binary erosion by a square of radius r (numpy only)."""
    m = mask.copy()
    for _ in range(r):
        n = m.copy()
        n[1:, :] &= m[:-1, :]; n[:-1, :] &= m[1:, :]
        n[:, 1:] &= m[:, :-1]; n[:, :-1] &= m[:, 1:]
        m = n
    return m


def over(dst, src):
    """src over dst, both RGBA uint8, same shape (in place on dst)."""
    sa = src[..., 3:4].astype(np.float32) / 255
    da = dst[..., 3:4].astype(np.float32) / 255
    oa = sa + da * (1 - sa)
    rgb = (src[..., :3] * sa + dst[..., :3] * da * (1 - sa)) / np.maximum(oa, 1e-6)
    dst[..., :3] = np.rint(rgb).astype(np.uint8)
    dst[..., 3:4] = np.rint(oa * 255).astype(np.uint8)


def premul(rgba):
    a = rgba[..., 3:4].astype(np.float32) / 255
    out = rgba.copy()
    out[..., :3] = np.rint(rgba[..., :3] * a).astype(np.uint8)
    return out


def centroid_col(alpha_row):
    cols = np.where(alpha_row > ALPHA_ON)[0]
    return float(cols.mean()) if len(cols) else alpha_row.shape[0] / 2


def slice_wing(part, cuts):
    plate = load(part)
    H, W = plate.shape[:2]
    c1, c2 = cuts if cuts else auto_cuts(plate[..., 3])
    opaque = plate[..., 3] == 255

    sh = np.zeros_like(plate); sh[:c1] = plate[:c1]
    mid = np.zeros_like(plate); mid[c1:c2] = plate[c1:c2]
    tip = np.zeros_like(plate); tip[c2:] = plate[c2:]

    # hidden extensions: original pixels where the band above is opaque (eroded), only inside the EXT rows
    m_sh = erode(opaque & (np.arange(H)[:, None] < c1), ERODE)
    m_mid = erode(opaque & (np.arange(H)[:, None] >= c1) & (np.arange(H)[:, None] < c2), ERODE)
    ext_mid = m_sh & (np.arange(H)[:, None] >= c1 - EXT)
    ext_tip = m_mid & (np.arange(H)[:, None] >= c2 - EXT)
    mid[ext_mid] = plate[ext_mid]
    tip[ext_tip] = plate[ext_tip]

    # recomposite: tip, then mid over, then shoulder over
    canvas = np.zeros_like(plate)
    over(canvas, tip); over(canvas, mid); over(canvas, sh)
    # compare what a renderer sees: premultiplied RGB + alpha. The source plate carries colour in alpha-0
    # pixels (e.g. [255,60,156,0]) that no compositor can show; the raw diff on visible pixels is reported too.
    diff = np.abs(premul(canvas).astype(int) - premul(plate).astype(int))
    vis = plate[..., 3] > 0
    raw_vis = np.abs(canvas.astype(int) - plate.astype(int))[vis]

    # Bands are FULL-PLATE canvases (W x H, transparent outside their rows), placed with exactly the
    # original <image> box and its default preserveAspectRatio (xMidYMid meet). Measured reasons
    # (PROGRESS resume-check #55): (1) a non-uniform per-band scale resampled every pixel (DPR1 max diff 84,
    # 3971 px); (2) cropped band bitmaps resample differently from the whole plate because the filter
    # phase aligns to the bitmap origin (3577 px left after fix 1). Full-plate canvases leave only the
    # seam rows themselves. Transparent rows cost about nothing in lossless WebP.
    bands = {'sh': (0, c1, sh), 'mid': (c1 - EXT, c2, mid), 'tip': (c2 - EXT, H, tip)}
    bx, by, bw, bh = WING_BOX[part]
    s_uni = min(bw / W, bh / H)
    sx = sy = s_uni
    bx_r = bx + (bw - W * s_uni) / 2; by_r = by + (bh - H * s_uni) / 2   # rendered rect, for the child pivots
    out_parts, layout = {}, {}
    for key, (r0, r1, arr) in bands.items():
        name = f'{part}_{key}'
        nbytes = save_lossless(np.ascontiguousarray(arr), name)
        out_parts[name] = dict(file=name + '.webp', w=int(W), h=int(H), plate_offset=[0, 0],
                               derived_from=part + '.webp', lossless=True, bytes=nbytes,
                               rows=[int(r0), int(r1)], extension_rows=(0 if key == 'sh' else EXT),
                               note='full-plate canvas wing band; extension rows sit under the band above (Toon Boom overlap)')
        layout[name] = dict(x=bx, y=by, w=bw, h=bh)
    bx, by = bx_r, by_r
    # child pivots at the cut lines (viewBox px): x = alpha centroid of the cut row
    piv = {
        f'{part}_mid': (round(bx + centroid_col(plate[c1, :, 3]) * sx, 4), round(by + c1 * sy, 4)),
        f'{part}_tip': (round(bx + centroid_col(plate[c2, :, 3]) * sx, 4), round(by + c2 * sy, 4)),
    }
    report = dict(part=part, size=[int(W), int(H)], cuts=[int(c1), int(c2)], ext_rows=EXT, erode_px=ERODE,
                  fill_profile_30=[int(v) for v in fill_profile(plate[..., 3]).reshape(-1, 30).mean(1)] if H % 30 == 0 else None,
                  extension_pixels=dict(mid=int(ext_mid.sum()), tip=int(ext_tip.sum())),
                  plate_recomposite=dict(premultiplied_max_abs_diff=int(diff.max()), premultiplied_pixels_differing=int((diff.max(-1) > 0).sum()),
                                         raw_visible_max_abs_diff=int(raw_vis.max()) if raw_vis.size else 0,
                                         alpha0_pixels_with_colour_in_source=int(((plate[..., 3] == 0) & (plate[..., :3].max(-1) > 0)).sum()),
                                         pass_pixel_diff_0=bool(diff.max() == 0 and (raw_vis.size == 0 or raw_vis.max() == 0))),
                  bands={k: dict(rows=v['rows'], bytes=v['bytes']) for k, v in out_parts.items()},
                  layout_viewbox=layout, child_pivots_viewbox=piv)
    return out_parts, report


SVG = os.path.join(SANDBOX, 'companions', 'owl_p2.svg')


def rewrite_svg(reports):
    """K9.5-2: replace each <g data-joint="armL|armR"><image wingX/></g> with nested joints
    armX (unchanged name + pivot) > armX_mid > armX_tip, three band images, draw order tip, mid, shoulder
    (the shoulder covers the mid extension, the mid covers the tip extension). Idempotent: an already
    nested group is replaced whole."""
    import re
    svg = open(SVG, encoding='utf-8').read()
    for rep in reports:
        part = rep['part']; side = 'armL' if part == 'wingL' else 'armR'
        L = rep['layout_viewbox']; P = rep['child_pivots_viewbox']
        def im(key):
            b = L[f'{part}_{key}']
            return f'<image href="art/parts/owl/{part}_{key}.webp" x="{b["x"]}" y="{b["y"]}" width="{b["w"]}" height="{b["h"]}" />'
        pm, pt = P[f'{part}_mid'], P[f'{part}_tip']
        m = re.search(r'<g data-joint="%s" data-pivot="([^"]+)"(?: data-flex="\d+")?>' % side, svg)
        if not m: raise SystemExit(f'{side} not found in {SVG}')
        pivot = m.group(1)
        new = (f'<g data-joint="{side}" data-pivot="{pivot}" data-flex="3">'
               f'<g data-joint="{side}_mid" data-pivot="{pm[0]} {pm[1]}">'
               f'<g data-joint="{side}_tip" data-pivot="{pt[0]} {pt[1]}">{im("tip")}</g>'
               f'{im("mid")}</g>{im("sh")}</g>')
        # whole group: nested or flat. Match from the opening tag to the closing of the outermost armX group.
        start = m.start(); depth = 0; i = start
        for tag in re.finditer(r'<g\b|</g>', svg[start:]):
            depth += 1 if tag.group(0) == '<g' else -1
            if depth == 0:
                i = start + tag.end(); break
        svg = svg[:start] + new + svg[i:]
    open(SVG, 'w', encoding='utf-8').write(svg)
    return os.path.getsize(SVG)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cuts', help='R1,R2 source rows (default: auto from the alpha profile)')
    ap.add_argument('--dry', action='store_true', help='compute and print, write nothing')
    ap.add_argument('--svg', action='store_true', help='also rewrite companions/owl_p2.svg with the nested wing joints (K9.5-2)')
    a = ap.parse_args()
    cuts = tuple(int(v) for v in a.cuts.split(',')) if a.cuts else None
    if a.dry:
        global save_lossless
        save_lossless = lambda arr, part: 0  # noqa: E731
    pj_path = os.path.join(PARTS, 'parts.json')
    pj = json.load(open(pj_path))
    reports, all_parts = [], {}
    for part in ('wingL', 'wingR'):
        out_parts, rep = slice_wing(part, cuts)
        reports.append(rep); all_parts.update(out_parts)
        print(json.dumps({k: rep[k] for k in ('part', 'cuts', 'extension_pixels', 'plate_recomposite', 'child_pivots_viewbox')}))
    ok = all(r['plate_recomposite']['pass_pixel_diff_0'] for r in reports)
    if not a.dry:
        for part in ('wingL', 'wingR'):
            pj['parts'][part]['superseded_by'] = [f'{part}_sh', f'{part}_mid', f'{part}_tip']
            pj['parts'][part]['kept_for'] = 'recomposite proof reference (samples/proofs/g14_wing_slice.json)'
        pj['parts'].update(all_parts)
        pj['wing_slice'] = dict(tool='tools/slice_wing.py', cuts={r['part']: r['cuts'] for r in reports}, ext_rows=EXT, erode_px=ERODE)
        pj['total_bytes'] = sum(v['bytes'] for v in pj['parts'].values())
        json.dump(pj, open(pj_path, 'w'), indent=1)
        os.makedirs(PROOFS, exist_ok=True)
        json.dump(dict(generated_at=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), tool='tools/slice_wing.py',
                       pass_all=ok, wings=reports), open(os.path.join(PROOFS, 'g14_wing_slice.json'), 'w'), indent=1)
    if a.svg and not a.dry and ok:
        print('svg rewritten', rewrite_svg(reports), 'bytes')
    print('pass_pixel_diff_0', ok)
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
