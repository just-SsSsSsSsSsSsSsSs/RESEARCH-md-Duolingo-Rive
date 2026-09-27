#!/usr/bin/env python3
"""K9.5-2 experiment: which band construction gives a seam-free REST render of the 3-band wing?

Background (PROGRESS resume-check #55): with full-plate canvases every remaining rest-diff pixel sits on
the two cut rows (1 device row at DPR1, 6 at DPR2, max diff about 60). Cause: the renderer's bilinear
filter blends the upper band's last opaque row with its own transparent neighbour instead of the real
next row of the plate, and the lower band's first row likewise. This tool renders wingL variants in
headless Chromium (DPR1 and DPR2, 3 renders each, per-pixel median) against the original single-plate
SVG (git ref) and prints one row per variant. It writes nothing under art/; band images go to
sandbox/tmp_wing/ (git-ignored by the run: the directory is removed at the end unless --keep).

Variants (each = how the three full-plate canvases are built):
  v1_current      : partition at the cut rows + hidden extension of the lower bands (as slice_wing.py).
  v2_lip_eroded   : v1 + the upper band also carries LIP rows of the band below, only where the plate is
                    opaque after an erosion (interior only, edges stay sharp).
  v3_lip_full     : v1 + full LIP rows (alpha > 0) of the band below copied into the upper band.
  v4_lip_clipAA   : v3, and every band is clipped in the SVG to its own side of the cut line with an
                    anti-aliased clipPath (the lip only fixes the filter neighbourhood; the clip restores
                    the exact partition).
  v5_lip_clipCrisp: v4 with shape-rendering="crispEdges" on the clip rects.
  v6_dup_row      : v1, but the upper band keeps ONE extra row (c) and the lower band starts at c as well
                    (both bands own the cut row; the over operator with alpha 255 on top is exact).
Result JSON: samples/proofs/g14_wing_seam_variants.json (numbers copied into PROGRESS from this file).
"""
import argparse, asyncio, io, json, os, re, shutil, subprocess, sys, time
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(ROOT)
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import slice_wing as S  # noqa: E402

URL = os.environ.get('SANDBOX_BASE', 'http://localhost:8080/sandbox/')
REF = os.environ.get('WING_REF', '317bd3c')
TMP = os.path.join(ROOT, 'tmp_wing')
PROOFS = os.path.join(ROOT, 'samples', 'proofs')
LIP = 6
REPS = 3
PAGE = ('<!doctype html><html><head><base href="%s"><style>html,body{margin:0;background:#fff}'
        '#box{width:400px;height:480px}#box svg{width:400px;height:480px;display:block}</style></head>'
        '<body><div id="box">%s</div></body></html>')


def build_variants(plate, c1, c2):
    H, W = plate.shape[:2]
    rows = np.arange(H)[:, None]
    op = plate[..., 3] == 255
    vis = plate[..., 3] > 0

    def band(r0, r1):
        b = np.zeros_like(plate); b[r0:r1] = plate[r0:r1]; return b

    def with_ext(b, above, r0):
        m = S.erode(above, S.ERODE) & (rows >= r0); b[m] = plate[m]; return b

    def with_lip(b, r0, r1, eroded):
        m = (rows >= r0) & (rows < r1) & ((S.erode(op, S.ERODE)) if eroded else vis); b[m] = plate[m]; return b

    base_sh = band(0, c1)
    base_mid = with_ext(band(c1, c2), op & (rows < c1), c1 - S.EXT)
    base_tip = with_ext(band(c2, H), op & (rows >= c1) & (rows < c2), c2 - S.EXT)
    V = {}
    V['v1_current'] = (base_sh, base_mid, base_tip, None)
    V['v2_lip_eroded'] = (with_lip(base_sh.copy(), c1, c1 + LIP, True), with_lip(base_mid.copy(), c2, c2 + LIP, True), base_tip, None)
    V['v3_lip_full'] = (with_lip(base_sh.copy(), c1, c1 + LIP, False), with_lip(base_mid.copy(), c2, c2 + LIP, False), base_tip, None)
    V['v4_lip_clipAA'] = (V['v3_lip_full'][0], V['v3_lip_full'][1], base_tip, 'aa')
    V['v5_lip_clipCrisp'] = (V['v3_lip_full'][0], V['v3_lip_full'][1], base_tip, 'crisp')
    sh6 = band(0, c1 + 1); mid6 = with_ext(band(c1, c2 + 1), op & (rows < c1), c1 - S.EXT)
    V['v6_dup_row'] = (sh6, mid6, base_tip, None)
    return V


def svg_for(orig, name, clips, x, y, w, h, Y1, Y2):
    im = lambda k, extra='': f'<image href="tmp_wing/{name}_{k}.webp" x="{x}" y="{y}" width="{w}" height="{h}" {extra}/>'  # noqa: E731
    defs = csh = cmid = cw1 = cw2 = ''
    if clips:
        cr = 'shape-rendering="crispEdges"' if clips == 'crisp' else ''
        defs = (f'<clipPath id="k_sh"><rect x="0" y="0" width="200" height="{Y1}" {cr}/></clipPath>'
                f'<clipPath id="k_w1"><rect x="0" y="{Y1}" width="200" height="200" {cr}/></clipPath>'
                f'<clipPath id="k_mid"><rect x="0" y="0" width="200" height="{Y2}" {cr}/></clipPath>'
                f'<clipPath id="k_w2"><rect x="0" y="{Y2}" width="200" height="200" {cr}/></clipPath>')
        csh, cmid, cw1, cw2 = 'clip-path="url(#k_sh)"', 'clip-path="url(#k_mid)"', 'clip-path="url(#k_w1)"', 'clip-path="url(#k_w2)"'
    body = (f'<g data-joint="armL" data-pivot="64 122"><g {cw1}><g data-joint="armL_mid" data-pivot="55 {Y1}">'
            f'<g {cw2}><g data-joint="armL_tip" data-pivot="60 {Y2}">{im("tip")}</g></g>{im("mid", cmid)}</g></g>{im("sh", csh)}</g>')
    out = orig.replace('<defs>', '<defs>' + defs, 1)
    return re.sub(r'<g data-joint="armL"[^>]*>.*?</g>', body, out, count=1, flags=re.S)


async def shot(b, doc, dpr):
    ctx = await b.new_context(viewport=dict(width=420, height=500), device_scale_factor=dpr)
    pg = await ctx.new_page()
    await pg.set_content(PAGE % (URL, doc), wait_until='networkidle'); await pg.wait_for_timeout(250)
    png = await pg.locator('#box').screenshot(); await ctx.close()
    return np.array(Image.open(io.BytesIO(png)).convert('RGB')).astype(int)


async def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--keep', action='store_true'); a = ap.parse_args()
    from playwright.async_api import async_playwright
    orig = subprocess.check_output(['git', 'show', f'{REF}:sandbox/companions/owl_p2.svg'], cwd=REPO).decode()
    plate = S.load('wingL'); H, W = plate.shape[:2]
    cuts = json.load(open(os.path.join(ROOT, 'art', 'parts', 'owl', 'parts.json')))['wing_slice']['cuts']['wingL']
    c1, c2 = cuts
    x, y, w, h = S.WING_BOX['wingL']; s = min(w / W, h / H); yr = y + (h - H * s) / 2
    Y1, Y2 = yr + c1 * s, yr + c2 * s
    os.makedirs(TMP, exist_ok=True)
    V = build_variants(plate, c1, c2)
    for name, (sh, mid, tip, _) in V.items():
        for k, arr in (('sh', sh), ('mid', mid), ('tip', tip)):
            Image.fromarray(np.ascontiguousarray(arr), 'RGBA').save(os.path.join(TMP, f'{name}_{k}.webp'), 'WEBP', lossless=True, quality=100, method=4)
    X0, Y0, X1, Y1d = None, None, None, None
    out = dict(generated_at=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), ref_original=REF, cuts=cuts, lip_rows=LIP,
               renders_per_doc=REPS, variants={})
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for dpr in (1, 2):
            o = np.median(np.stack([await shot(b, orig, dpr) for _ in range(REPS)]), 0)
            X0, Y0, X1, Y1d = (int(v * 2 * dpr) for v in (x, y, x + w, y + h))
            for name, (_, _, _, clips) in V.items():
                doc = svg_for(orig, name, clips, x, y, w, h, Y1, Y2)
                n = np.median(np.stack([await shot(b, doc, dpr) for _ in range(REPS)]), 0)
                d = np.abs(o - n).max(-1)[Y0:Y1d, X0:X1]
                rws = sorted(set((np.nonzero(d > 0)[0] + Y0).tolist()))
                r = dict(max_abs_diff=int(d.max()), pixels_differing=int((d > 0).sum()), diff_rows_dev=rws[:12])
                out['variants'].setdefault(name, {})[f'dpr{dpr}'] = r
                print(f"dpr{dpr} {name:17s} max {r['max_abs_diff']:3d} px {r['pixels_differing']:5d} rows {rws[:8]}")
        await b.close()
    for name, v in out['variants'].items():
        v['pass_rest_0_both_dpr'] = all(v[k]['pixels_differing'] == 0 for k in ('dpr1', 'dpr2'))
    os.makedirs(PROOFS, exist_ok=True)
    json.dump(out, open(os.path.join(PROOFS, 'g14_wing_seam_variants.json'), 'w'), indent=1)
    if not a.keep: shutil.rmtree(TMP, ignore_errors=True)
    print('winners (0 px at both DPR):', [k for k, v in out['variants'].items() if v['pass_rest_0_both_dpr']])


if __name__ == '__main__':
    asyncio.run(main())
