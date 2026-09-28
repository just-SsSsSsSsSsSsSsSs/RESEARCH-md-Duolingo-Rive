#!/usr/bin/env python3
"""
K9.5-3 proof (owner decision 2026-09-27, item c): real smile / sad beak plates, 137 x 126, wired.

Checks (file facts + live Playwright render of the real page, DPR 2):
  files      beak_smile.webp and beak_sad.webp exist, RGBA, exactly 137 x 126, WEBP, byte-identical to a fresh run of
             art/author_mouth_plates.py (--check), parts.json entries present with derived_from beak_closed.webp
  distinct   each new plate differs from beak_closed (mean abs RGB diff over solid pixels > 4/255) and from each other;
             the pinned top (rows above the widest row) is identical to the source on visible pixels (+-1)
  soft edge  alpha has > 20 intermediate values (2..253) along the silhouette - no hard cut
  wiring     owl_p2.svg data-mouth smile / sad reference the new plates; closed / mid / open unchanged; sw.js precaches;
             the live rig (window.__rigs[0].mouthShapes) has all five shapes and setMouth(shape) shows exactly one group
  render     for smile / sad / open: setMouth(shape) with every animation paused, screenshot the owl svg; the diff against
             the closed render is confined to the mouth joint's box (<= 2 pct differing pixels OUTSIDE it - the frozen
             K9.5 budget) and is non-trivial INSIDE it (>= 3 pct differing pixels)
  freeze     P.puzzled sha16 still c9b154b0ecc7e837; git diff origin/main on engine/flight.js empty (celebrate/flight)
  errors     0 page errors
Outputs samples/proofs/k95_plates.json and samples/proofs/k95_plates_sheet.png (plates at 3x + three live mouth crops).
Run: python3 tools/serve.py 8080 (detached) -> python3 sandbox/plates_proof.py
"""
import asyncio
import hashlib
import io
import json
import os
import subprocess
import sys
from datetime import datetime, timezone

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from playwright.async_api import async_playwright

ROOT = os.path.abspath(os.path.dirname(__file__))
REPO = os.path.dirname(ROOT)
PARTS = os.path.join(ROOT, 'art', 'parts', 'owl')
OUT = os.path.join(ROOT, 'samples', 'proofs')
BASE = os.environ.get('SANDBOX_BASE', 'http://127.0.0.1:8080/sandbox/')
QS = 'index.html?engine=v2&art=p2&n=1&auto=0&sw=0&hud=0&sfx=0&seed=20260928'
URL = BASE + QS
READY = 'window.__rigs && window.__rigs.length && window.__rigs[0].mouthShapes && typeof window.__rigs[0].setMouth === "function"'
PUZZLED_SHA16 = 'c9b154b0ecc7e837'
OUTSIDE_BUDGET_PCT = 2.0
INSIDE_MIN_PCT = 3.0


def load(name):
    im = Image.open(os.path.join(PARTS, name))
    return im, np.asarray(im.convert('RGBA')).astype(np.int32)


def sha16(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()[:16]


def fn_sha16(src, name):
    i = src.index(f'P.{name} = function'); j = src.index('\n};\n', i) + 4
    return hashlib.sha256(src[i:j].encode()).hexdigest()[:16]


def file_checks():
    closed_im, closed = load('beak_closed.webp')
    widest = int(np.argmax((closed[..., 3] > 128).sum(1)))
    R = {'source': {'file': 'beak_closed.webp', 'size': list(closed_im.size), 'widest_row': widest}, 'plates': {}}
    arrs = {}
    for name in ('beak_smile', 'beak_sad'):
        im, a = load(f'{name}.webp'); arrs[name] = a
        solid = (closed[..., 3] > 200) & (a[..., 3] > 200)
        diff_rgb = float(np.abs(a[..., :3] - closed[..., :3])[solid].mean()) if solid.any() else 0.0
        vis = closed[:widest, :, 3] > 0
        top_dev = int(np.abs(a[:widest][vis] - closed[:widest][vis]).max()) if vis.any() else 0
        alpha = a[..., 3]; inter = int(((alpha > 1) & (alpha < 254)).sum())
        path = os.path.join(PARTS, f'{name}.webp')
        R['plates'][name] = {'file': f'{name}.webp', 'size': list(im.size), 'mode': im.mode, 'format': im.format, 'bytes': os.path.getsize(path), 'sha16': sha16(path),
                             'mean_abs_rgb_diff_vs_closed': round(diff_rgb, 2), 'top_pinned_max_dev': top_dev, 'intermediate_alpha_px': inter,
                             'checks': {'size_137x126': im.size == (137, 126), 'rgba': im.mode == 'RGBA', 'webp': im.format == 'WEBP',
                                        'distinct_from_closed': diff_rgb > 4.0, 'top_pinned_identical': top_dev <= 1, 'soft_alpha_edge': inter > 20}}
    d = float(np.abs(arrs['beak_smile'][..., :3] - arrs['beak_sad'][..., :3]).mean())
    R['smile_vs_sad_mean_abs_diff'] = round(d, 2)
    R['checks'] = {'smile_and_sad_distinct': d > 4.0}
    man = json.load(open(os.path.join(PARTS, 'parts.json'), encoding='utf8'))
    R['checks']['parts_json_entries'] = all(k in man['parts'] and man['parts'][k].get('derived_from') == 'beak_closed.webp' and man['parts'][k]['w'] == 137 and man['parts'][k]['h'] == 126 for k in ('beak_smile', 'beak_sad'))
    chk = subprocess.run([sys.executable, os.path.join(ROOT, 'art', 'author_mouth_plates.py'), '--check'], capture_output=True, text=True, cwd=REPO)
    R['author_check'] = chk.stdout.strip().splitlines()[-1] if chk.stdout.strip() else chk.stderr[-200:]
    R['checks']['author_tool_reproduces_committed_bytes'] = chk.returncode == 0
    svg = open(os.path.join(ROOT, 'companions', 'owl_p2.svg'), encoding='utf8').read()
    R['checks']['svg_smile_wired'] = 'data-mouth="smile"><image href="art/parts/owl/beak_smile.webp"' in svg
    R['checks']['svg_sad_wired'] = 'data-mouth="sad"><image href="art/parts/owl/beak_sad.webp"' in svg
    R['checks']['svg_closed_mid_open_unchanged'] = ('data-mouth="closed"><image href="art/parts/owl/beak_closed.webp"' in svg and svg.count('beak_open.webp') == 2)
    sw = open(os.path.join(ROOT, 'sw.js'), encoding='utf8').read()
    R['checks']['sw_precaches_plates'] = 'beak_smile.webp' in sw and 'beak_sad.webp' in sw
    acting = open(os.path.join(ROOT, 'engine', 'acting.js'), encoding='utf8').read()
    R['puzzled_sha16'] = fn_sha16(acting, 'puzzled')
    R['checks']['puzzled_function_unchanged'] = R['puzzled_sha16'] == PUZZLED_SHA16
    fl = subprocess.run(['git', 'diff', 'origin/main', '--', 'sandbox/engine/flight.js'], cwd=REPO, capture_output=True, text=True).stdout
    R['flight_js_diff_lines'] = len(fl.splitlines())
    R['checks']['flight_js_unchanged_vs_main'] = R['flight_js_diff_lines'] == 0
    return R


async def live(R):
    errs = []
    renders = {}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport=dict(width=1000, height=900), device_scale_factor=2); pg = await ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'favicon' not in m.text else None)
        await pg.goto(URL, wait_until='networkidle'); await pg.wait_for_function(READY); await pg.wait_for_timeout(600)
        info = await pg.evaluate("""() => { const r = window.__rigs[0]; const shapes = Object.keys(r.mouthShapes);
          const box = r.j('mouth').getBoundingClientRect(); const svg = r.svg.getBoundingClientRect();
          const hrefs = {}; for (const k of shapes) { const im = r.mouthShapes[k].querySelector('image'); hrefs[k] = im ? im.getAttribute('href') : null; }
          return { shapes, hrefs, mouthBox: { x: box.left - svg.left, y: box.top - svg.top, w: box.width, h: box.height }, svg: { w: svg.width, h: svg.height } }; }""")
        R['live'] = info
        # freeze the idle so the diffs measure the plate, not the breath
        await pg.evaluate("() => { document.getAnimations().forEach(a => { try { a.pause(); } catch (e) {} }); document.querySelectorAll('.star').forEach(e => e.remove()); }")
        for shape in ('closed', 'smile', 'sad', 'open'):
            vis = await pg.evaluate("(s) => { const r = window.__rigs[0]; r.setMouth(s); return Object.entries(r.mouthShapes).filter(([k, g]) => g.style.display !== 'none').map(([k]) => k); }", shape)
            await pg.wait_for_timeout(150)
            png = await pg.locator('svg.rig-owl').first.screenshot(omit_background=False)
            renders[shape] = {'img': Image.open(io.BytesIO(png)).convert('RGB'), 'visible': vis}
        await pg.evaluate("() => window.__rigs[0].setMouth('closed')")
        await b.close()
    R['errors'] = errs
    base = np.asarray(renders['closed']['img']).astype(np.int32)
    H, W = base.shape[:2]
    mb = R['live']['mouthBox']; sx = W / R['live']['svg']['w']; sy = H / R['live']['svg']['h']
    pad = 6
    x0, y0 = max(0, int(mb['x'] * sx) - pad), max(0, int(mb['y'] * sy) - pad)
    x1, y1 = min(W, int((mb['x'] + mb['w']) * sx) + pad), min(H, int((mb['y'] + mb['h']) * sy) + pad)
    inside = np.zeros((H, W), dtype=bool); inside[y0:y1, x0:x1] = True
    R['render'] = {'svg_px': [W, H], 'mouth_box_px': [x0, y0, x1, y1], 'shapes': {}}
    for shape in ('smile', 'sad', 'open'):
        im = np.asarray(renders[shape]['img']).astype(np.int32)
        d = np.abs(im - base).max(2) > 12
        out_pct = 100.0 * d[~inside].sum() / max(1, (~inside).sum())
        in_pct = 100.0 * d[inside].sum() / max(1, inside.sum())
        R['render']['shapes'][shape] = {'visible_groups': renders[shape]['visible'], 'diff_outside_mouth_pct': round(out_pct, 3), 'diff_inside_mouth_pct': round(in_pct, 2),
                                        'checks': {'exactly_one_group_visible': renders[shape]['visible'] == [shape],
                                                   'diff_confined_to_mouth': out_pct <= OUTSIDE_BUDGET_PCT,
                                                   'diff_visible_inside_mouth': in_pct >= INSIDE_MIN_PCT}}
    R['checks']['live_five_shapes'] = sorted(R['live']['shapes']) == sorted(['closed', 'mid', 'open', 'smile', 'sad'])
    R['checks']['live_hrefs_new_plates'] = (R['live']['hrefs'].get('smile') or '').endswith('beak_smile.webp') and (R['live']['hrefs'].get('sad') or '').endswith('beak_sad.webp')
    R['checks']['no_page_errors'] = len(errs) == 0
    return renders, (x0, y0, x1, y1)


def sheet(renders, box):
    plates = [Image.open(os.path.join(PARTS, f'{n}.webp')).convert('RGBA') for n in ('beak_sad', 'beak_closed', 'beak_smile')]
    labels = ['beak_sad.webp (new)', 'beak_closed.webp (source)', 'beak_smile.webp (new)']
    try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
    except Exception: font = None
    pw, ph = 137 * 3, 126 * 3
    row1 = Image.new('RGB', (pw * 3 + 40, ph + 40), (24, 26, 34)); d = ImageDraw.Draw(row1)
    for i, (im, lab) in enumerate(zip(plates, labels)):
        big = im.resize((pw, ph), Image.LANCZOS); row1.paste(big, (10 + i * (pw + 10), 32), big); d.text((10 + i * (pw + 10), 8), lab, fill=(255, 209, 102), font=font)
    x0, y0, x1, y1 = box; cx, cy = (x0 + x1) // 2, (y0 + y1) // 2; half = 110
    crops = []
    for shape in ('sad', 'closed', 'smile'):
        im = renders[shape]['img']
        c = im.crop((max(0, cx - half), max(0, cy - half), min(im.width, cx + half), min(im.height, cy + half))).resize((half * 4, half * 4), Image.LANCZOS)
        crops.append((shape, c))
    cw = crops[0][1].width
    row2 = Image.new('RGB', (cw * 3 + 40, cw + 40), (24, 26, 34)); d2 = ImageDraw.Draw(row2)
    for i, (shape, c) in enumerate(crops):
        row2.paste(c, (10 + i * (cw + 10), 32)); d2.text((10 + i * (cw + 10), 8), f'live setMouth({shape}) DPR2, mouth region 2x', fill=(255, 209, 102), font=font)
    W = max(row1.width, row2.width)
    out = Image.new('RGB', (W, row1.height + row2.height), (24, 26, 34)); out.paste(row1, (0, 0)); out.paste(row2, (0, row1.height))
    out.save(os.path.join(OUT, 'k95_plates_sheet.png'))
    return 'k95_plates_sheet.png'


async def main():
    os.makedirs(OUT, exist_ok=True)
    R = file_checks()
    R['captured'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'); R['url'] = QS
    R['budgets'] = {'plate_size': [137, 126], 'render_diff_outside_mouth_pct_max': OUTSIDE_BUDGET_PCT, 'render_diff_inside_mouth_pct_min': INSIDE_MIN_PCT}
    renders, box = await live(R)
    R['sheet'] = sheet(renders, box)
    flat = dict(R['checks'])
    for n, p in R['plates'].items():
        for k, ok in p['checks'].items(): flat[f'{n}.{k}'] = ok
    for s, v in R['render']['shapes'].items():
        for k, ok in v['checks'].items(): flat[f'render.{s}.{k}'] = ok
    R['checks_flat'] = flat; R['pass_all'] = all(flat.values())
    json.dump(R, open(os.path.join(OUT, 'k95_plates.json'), 'w', encoding='utf8'), indent=2, ensure_ascii=False, default=str)
    for k, ok in flat.items(): print(('PASS ' if ok else 'FAIL ') + k)
    for s, v in R['render']['shapes'].items(): print(f"  {s}: outside {v['diff_outside_mouth_pct']} pct, inside {v['diff_inside_mouth_pct']} pct, visible {v['visible_groups']}")
    print('K95 PLATES PROOF ' + ('PASS' if R['pass_all'] else 'FAIL') + f" -> {os.path.relpath(os.path.join(OUT, 'k95_plates.json'), REPO)}")
    return 0 if R['pass_all'] else 1


if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
