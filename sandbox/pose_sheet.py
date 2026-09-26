#!/usr/bin/env python3
"""
G11 pose sheet: six signature poses as STILLS (no motion) + neutral reference, DPR 2.
The gate question is whether the static pose alone reads as alive; if it does not, physics cannot save it.
Also writes samples/proofs/g11_pose_sheet.json with per-pose joint deltas actually applied (read back from the WAAPI layers).

G11 v2 (silhouette-first, directive #03): every pose is also captured as an alpha SILHOUETTE (backgrounds and
stars removed inside this tool only, omitBackground screenshot) and scored:
  silhouette_delta_pct      = area(neutral XOR pose) / area(neutral) * 100   (alpha > 0.5)
  silhouette_delta_blur_pct = same after a 6 px gaussian blur of both alpha masks (the "squint / from afar" test)
Gate: silhouette_delta_blur_pct >= SIL_GATE_PCT (8, calibrated on this sheet; a pose that only moves pupils and
brows scores near 0 and is not a silhouette pose - it must then be justified as a face-only beat).
Sheet: row 1 = stills with the page background, row 2 = the same stills blurred 6 px (what a player sees at a glance).
Usage: python3 sandbox/pose_sheet.py   (server on :8080)
"""
import asyncio, json, os, time
from playwright.async_api import async_playwright
try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
    import numpy as np
except ImportError:
    Image = None

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'samples', 'proofs')
BASE = 'http://localhost:8080/sandbox/'
POSES = ['alert', 'charged', 'launch', 'puzzled', 'triumph', 'oops']
SIL_GATE_PCT = 8.0
BLUR_PX = 6
# proof-only: strip page decoration so the alpha channel is exactly the owl (never shipped; the page is untouched)
STRIP_BG = """(() => { for (const el of [document.documentElement, document.body, document.getElementById('stage'), ...document.querySelectorAll('.slot')]) if (el) el.style.background = 'none';
  document.querySelectorAll('.star, .perch, #hud, #acting, #caption, #controls, header, footer, h1, p').forEach(e => e.style.visibility = 'hidden');
  const st = document.getElementById('stage'); if (st) st.style.background = 'none'; })()"""
LABEL = {'neutral': 'neutral (idle)', 'alert': '1 alert / yaqza', 'charged': '2 charged / tahafuz', 'launch': '3 launch / intilaq', 'puzzled': '4 puzzled / hayra', 'triumph': '5 triumph / intisar', 'oops': '6 oops / khata'}


async def shot(pg, path, pad=40):
    box = await pg.evaluate("(() => { const r = window.__rigs[0].svg.getBoundingClientRect(); return {x: r.left, y: r.top + scrollY, w: r.width, h: r.height}; })()")
    await pg.screenshot(path=path, full_page=True, clip={'x': box['x'] - pad, 'y': box['y'] - pad, 'width': box['w'] + 2 * pad, 'height': box['h'] + 2 * pad})


async def silhouette(pg, path, pad=40):
    """RGBA still of the owl on a transparent page; returns the clip box used (same box for all poses)."""
    box = await pg.evaluate("(() => { const r = window.__rigs[0].svg.getBoundingClientRect(); return {x: r.left, y: r.top + scrollY, w: r.width, h: r.height}; })()")
    await pg.screenshot(path=path, full_page=True, omit_background=True, clip={'x': box['x'] - pad, 'y': box['y'] - pad, 'width': box['w'] + 2 * pad, 'height': box['h'] + 2 * pad})
    return box


def sil_metrics(neutral_png, pose_png):
    """alpha-mask XOR vs neutral, sharp and blurred (both masks blurred, re-thresholded at 0.5)."""
    a0 = np.asarray(Image.open(neutral_png).convert('RGBA'))[..., 3].astype(np.float32) / 255
    a1 = np.asarray(Image.open(pose_png).convert('RGBA'))[..., 3].astype(np.float32) / 255
    h = min(a0.shape[0], a1.shape[0]); w = min(a0.shape[1], a1.shape[1]); a0 = a0[:h, :w]; a1 = a1[:h, :w]
    m0 = a0 > 0.5; m1 = a1 > 0.5
    area0 = int(m0.sum())
    sharp = 100.0 * int(np.logical_xor(m0, m1).sum()) / max(1, area0)
    def blur(a):
        im = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(BLUR_PX))
        return (np.asarray(im).astype(np.float32) / 255) > 0.5
    b0 = blur(a0); b1 = blur(a1)
    blurred = 100.0 * int(np.logical_xor(b0, b1).sum()) / max(1, int(b0.sum()))
    # bounding-box change of the silhouette (px at DPR 2) - how much the outline moved, not just flickered
    def bbox(m):
        ys, xs = np.where(m); return (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())) if len(xs) else (0, 0, 0, 0)
    return {'neutral_area_px': area0, 'silhouette_delta_pct': round(sharp, 2), 'silhouette_delta_blur_pct': round(blurred, 2),
            'bbox_neutral': bbox(m0), 'bbox_pose': bbox(m1), 'pass_gate': blurred >= SIL_GATE_PCT}


async def main():
    os.makedirs(OUT, exist_ok=True)
    report = {'captured_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'dpr': 2, 'poses': {}}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 1000, 'height': 800}, device_scale_factor=2)
        pg = await ctx.new_page()
        await pg.goto(BASE + 'index.html?engine=v2&art=p2&n=1&auto=0&sw=0&hud=0&sfx=0', wait_until='networkidle')
        await pg.wait_for_function('window.__rigs && window.__rigs.length===1 && window.__rigs[0].poses')
        await pg.wait_for_timeout(600)
        # freeze idle motion so every still is comparable: pause breath/hover/blink animations
        await pg.evaluate("document.getAnimations().forEach(a => a.pause())")
        paths = []; sils = {}
        pth = os.path.join(OUT, 'g11_pose_neutral.png'); await shot(pg, pth); paths.append(('neutral', pth))
        await pg.evaluate(STRIP_BG)
        sil_neutral = os.path.join(OUT, 'g11_sil_neutral.png'); await silhouette(pg, sil_neutral)
        for name in POSES:
            await pg.evaluate(f"void window.__rigs[0].poses.apply('{name}', {{stay: true, snapMs: 1}})")
            await pg.wait_for_timeout(250)
            await pg.evaluate("window.__rigs[0].poses.freeze(); document.getAnimations().forEach(a => { if (a.playState === 'running') a.pause(); })")
            await pg.wait_for_timeout(120)
            applied = await pg.evaluate("Object.fromEntries(Object.entries(window.__rigs[0].poses.layers).map(([j, a]) => [j, a.effect.getKeyframes()[1].transform]))")
            mouth = await pg.evaluate("(() => { const m = window.__rigs[0].j('mouth'); const on = [...m.querySelectorAll('[data-mouth]')].find(g => g.style.display !== 'none' && getComputedStyle(g).opacity !== '0'); return on ? on.dataset.mouth : null; })()")
            sp = os.path.join(OUT, f'g11_sil_{name}.png'); await silhouette(pg, sp); sils[name] = sp
            pth = os.path.join(OUT, f'g11_pose_{name}.png'); await shot(pg, pth); paths.append((name, pth))
            report['poses'][name] = {'joints_applied': applied, 'mouth': mouth}
            await pg.evaluate("window.__rigs[0].poses.release(1)"); await pg.wait_for_timeout(200)
            await pg.evaluate("window.__rigs[0].poses.freeze()")
        await b.close()
    if Image:
        report['silhouette'] = {'gate_pct': SIL_GATE_PCT, 'blur_px': BLUR_PX, 'metric': 'area(neutral XOR pose)/area(neutral), alpha>0.5, DPR 2; blur = both masks gaussian 6 px then re-threshold'}
        for name in POSES:
            report['poses'][name]['silhouette'] = sil_metrics(sil_neutral, sils[name])
        report['silhouette']['pass_all'] = all(report['poses'][n]['silhouette']['pass_gate'] for n in POSES)
        report['silhouette']['failing'] = [n for n in POSES if not report['poses'][n]['silhouette']['pass_gate']]
        ims = [Image.open(p_).convert('RGB') for _, p_ in paths]
        w = max(i.width for i in ims); h = max(i.height for i in ims); cap = 44
        sheet = Image.new('RGB', (w * len(ims), 2 * (h + cap)), (24, 26, 34))
        d = ImageDraw.Draw(sheet)
        try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
        except Exception: font = None
        for k, ((name, _), im) in enumerate(zip(paths, ims)):
            sheet.paste(im, (k * w + (w - im.width) // 2, cap + (h - im.height) // 2))
            d.text((k * w + 12, 10), LABEL[name], fill=(255, 209, 102), font=font)
            # row 2: the squint test - same still blurred 6 px, with the silhouette score
            bl = im.filter(ImageFilter.GaussianBlur(BLUR_PX)); y2 = h + cap
            sheet.paste(bl, (k * w + (w - bl.width) // 2, y2 + cap + (h - bl.height) // 2))
            if name == 'neutral': txt = f'blur {BLUR_PX} px - reference'
            else:
                sm = report['poses'][name]['silhouette']; txt = f"silhouette {sm['silhouette_delta_blur_pct']:.1f} % {'PASS' if sm['pass_gate'] else 'FAIL'} (gate {SIL_GATE_PCT:.0f})"
            d.text((k * w + 12, y2 + 10), txt, fill=(120, 230, 160) if (name == 'neutral' or report['poses'][name]['silhouette']['pass_gate']) else (255, 110, 110), font=font)
            if k: d.line([(k * w, 0), (k * w, 2 * (h + cap))], fill=(60, 64, 80), width=2)
        d.line([(0, h + cap), (w * len(ims), h + cap)], fill=(60, 64, 80), width=2)
        sheet.save(os.path.join(OUT, 'g11_pose_sheet.png'))
        report['sheet'] = 'g11_pose_sheet.png'
    with open(os.path.join(OUT, 'g11_pose_sheet.json'), 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(json.dumps({k: v['mouth'] for k, v in report['poses'].items()}), 'sheet ok' if Image else 'no PIL')
    if Image:
        print('| pose | silhouette delta % (sharp) | after blur 6 px % | gate >= %.0f |' % SIL_GATE_PCT); print('|---|---|---|---|')
        for n in POSES:
            sm = report['poses'][n]['silhouette']; print(f"| {n} | {sm['silhouette_delta_pct']} | {sm['silhouette_delta_blur_pct']} | {'PASS' if sm['pass_gate'] else 'FAIL'} |")
        print('silhouette pass_all', report['silhouette']['pass_all'], 'failing', report['silhouette']['failing'])

if __name__ == '__main__':
    asyncio.run(main())
