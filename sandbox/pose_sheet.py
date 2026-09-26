#!/usr/bin/env python3
"""
G11 pose sheet: six signature poses as STILLS (no motion) + neutral reference, DPR 2.
The gate question is whether the static pose alone reads as alive; if it does not, physics cannot save it.
Also writes samples/proofs/g11_pose_sheet.json with per-pose joint deltas actually applied (read back from the WAAPI layers).
Usage: python3 sandbox/pose_sheet.py   (server on :8080)
"""
import asyncio, json, os, time
from playwright.async_api import async_playwright
try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    Image = None

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'samples', 'proofs')
BASE = 'http://localhost:8080/sandbox/'
POSES = ['alert', 'charged', 'launch', 'puzzled', 'triumph', 'oops']
LABEL = {'neutral': 'neutral (idle)', 'alert': '1 alert / yaqza', 'charged': '2 charged / tahafuz', 'launch': '3 launch / intilaq', 'puzzled': '4 puzzled / hayra', 'triumph': '5 triumph / intisar', 'oops': '6 oops / khata'}


async def shot(pg, path, pad=40):
    box = await pg.evaluate("(() => { const r = window.__rigs[0].svg.getBoundingClientRect(); return {x: r.left, y: r.top + scrollY, w: r.width, h: r.height}; })()")
    await pg.screenshot(path=path, full_page=True, clip={'x': box['x'] - pad, 'y': box['y'] - pad, 'width': box['w'] + 2 * pad, 'height': box['h'] + 2 * pad})


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
        paths = []
        pth = os.path.join(OUT, 'g11_pose_neutral.png'); await shot(pg, pth); paths.append(('neutral', pth))
        for name in POSES:
            await pg.evaluate(f"void window.__rigs[0].poses.apply('{name}', {{stay: true, snapMs: 1}})")
            await pg.wait_for_timeout(250)
            await pg.evaluate("window.__rigs[0].poses.freeze(); document.getAnimations().forEach(a => { if (a.playState === 'running') a.pause(); })")
            await pg.wait_for_timeout(120)
            applied = await pg.evaluate("Object.fromEntries(Object.entries(window.__rigs[0].poses.layers).map(([j, a]) => [j, a.effect.getKeyframes()[1].transform]))")
            mouth = await pg.evaluate("(() => { const m = window.__rigs[0].j('mouth'); const on = [...m.querySelectorAll('[data-mouth]')].find(g => g.style.display !== 'none' && getComputedStyle(g).opacity !== '0'); return on ? on.dataset.mouth : null; })()")
            pth = os.path.join(OUT, f'g11_pose_{name}.png'); await shot(pg, pth); paths.append((name, pth))
            report['poses'][name] = {'joints_applied': applied, 'mouth': mouth}
            await pg.evaluate("window.__rigs[0].poses.release(1)"); await pg.wait_for_timeout(200)
            await pg.evaluate("window.__rigs[0].poses.freeze()")
        await b.close()
    if Image:
        ims = [Image.open(p_) for _, p_ in paths]
        w = max(i.width for i in ims); h = max(i.height for i in ims); cap = 44
        sheet = Image.new('RGB', (w * len(ims), h + cap), (24, 26, 34))
        d = ImageDraw.Draw(sheet)
        try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
        except Exception: font = None
        for k, ((name, _), im) in enumerate(zip(paths, ims)):
            sheet.paste(im, (k * w + (w - im.width) // 2, cap + (h - im.height) // 2))
            d.text((k * w + 12, 10), LABEL[name], fill=(255, 209, 102), font=font)
            if k: d.line([(k * w, 0), (k * w, h + cap)], fill=(60, 64, 80), width=2)
        sheet.save(os.path.join(OUT, 'g11_pose_sheet.png'))
        report['sheet'] = 'g11_pose_sheet.png'
    with open(os.path.join(OUT, 'g11_pose_sheet.json'), 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(json.dumps({k: v['mouth'] for k, v in report['poses'].items()}), 'sheet ok' if Image else 'no PIL')

if __name__ == '__main__':
    asyncio.run(main())
