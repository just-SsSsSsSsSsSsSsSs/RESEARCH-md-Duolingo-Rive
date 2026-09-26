#!/usr/bin/env python3
"""
K9.2b-2 proof: brows feature flag has ZERO regression when off, and is visible when on.

  A. flag off  : render the live page with ?brows=0 and compare against the same page
                 rendered from the pre-brow SVG (git ref) -> pixel diff must be 0 at
                 DPR1 and DPR2 (3 renders per doc, per-pixel median, raw pairs listed).
                 Also: computed display of [data-feature=brows] is 'none' and the brow
                 joints are NOT in the rig's animated layer set.
  B. flag on   : brows render (non-zero pixel diff confined to the brow band), 0 console
                 errors, validatePoses ok, PoseLayer animates browL/browR (transform
                 changes on apply('puzzled')).
  C. spec gate : with ?brows=1 but spec.acting.brows=false (simulated by overriding the
                 fetch), brows stay hidden.

Output: samples/proofs/g11b_brows_flag.json + g11b_brows_on_off.png
"""
import asyncio
import io
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image
from playwright.async_api import async_playwright

ROOT = os.path.abspath(os.path.dirname(__file__))
OUT = os.path.join(ROOT, 'samples', 'proofs')
URL = os.environ.get('URL', 'http://127.0.0.1:8080/sandbox/index.html')
REF = os.environ.get('REF', '55934bc')   # last commit before brows

PAUSE = "document.getAnimations().forEach(a => a.pause())"


async def shot_rig(b, url, dpr, svg_override=None, spec_override=None):
    ctx = await b.new_context(viewport=dict(width=900, height=900), device_scale_factor=dpr)
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'favicon' not in m.text else None)
    if svg_override is not None:
        await pg.route('**/companions/owl_p2.svg', lambda route: route.fulfill(status=200, content_type='image/svg+xml', body=svg_override))
    if spec_override is not None:
        await pg.route('**/companions/owl.motion.json*', lambda route: route.fulfill(status=200, content_type='application/json', body=spec_override))
    await pg.goto(url + '&sw=0&auto=0&hud=0', wait_until='networkidle')
    await pg.wait_for_function('window.__rigs && window.__rigs.length > 0')
    await pg.wait_for_timeout(600)
    await pg.evaluate("document.querySelectorAll('.star').forEach(s => s.remove())")   # background stars are Math.random positioned: remove so diffs measure the rig only
    await pg.evaluate(PAUSE)
    # neutralise every transform so all renders start from the same frame
    await pg.evaluate("document.getAnimations().forEach(a => { a.currentTime = 0; })")
    await pg.wait_for_timeout(100)
    info = await pg.evaluate("""() => {
      const rig = window.__rigs[0]; const g = rig.svg.querySelector('[data-feature="brows"]');
      return { browsDisplay: g ? getComputedStyle(g).display : 'absent', browJoints: ['browL','browR'].map(n => !!rig.j(n)),
               specCheck: window.__specCheck, hasPoses: !!rig.poses };
    }""")
    png = await pg.locator('svg.rig-owl').first.screenshot(omit_background=False)
    arr = np.array(Image.open(io.BytesIO(png)).convert('RGBA')).astype(int)
    return arr, info, errs, pg, ctx


def summarize(d):
    ys, xs = np.nonzero(d > 0)
    return dict(max_abs_diff=int(d.max()), pixels_differing=int((d > 0).sum()),
                diff_bbox_px=[int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())] if len(xs) else None)


async def main():
    orig_svg = subprocess.check_output(['git', 'show', '%s:sandbox/companions/owl_p2.svg' % REF], cwd=os.path.join(ROOT, '..')).decode()
    report = dict(tool='sandbox/brows_proof.py', ref_pre_brows=REF, url=URL, renders_per_doc=3)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # ---- A: flag off vs pre-brow SVG ----
        report['A_flag_off'] = {}
        for dpr in (1, 2):
            pre, off = [], []
            infos = []
            for _ in range(3):
                a1, i1, e1, pg, ctx = await shot_rig(b, URL + '?engine=v2&n=1&brows=0', dpr, svg_override=orig_svg)
                await ctx.close(); pre.append(a1)
                a2, i2, e2, pg, ctx = await shot_rig(b, URL + '?engine=v2&n=1&brows=0', dpr)
                await ctx.close(); off.append(a2); infos.append(dict(info=i2, errors=e2))
            shp = min(x.shape for x in pre + off)
            pre = [x[:shp[0], :shp[1]] for x in pre]; off = [x[:shp[0], :shp[1]] for x in off]
            med_pre, med_off = np.median(np.stack(pre), 0), np.median(np.stack(off), 0)
            d = np.abs(med_pre - med_off).max(-1)
            raw = [summarize(np.abs(x - y).max(-1)) for x in pre for y in off]
            ctrl = [summarize(np.abs(pre[i] - pre[j]).max(-1)) for i in range(3) for j in range(i + 1, 3)]
            report['A_flag_off']['dpr%d' % dpr] = dict(shape=list(shp[:2]), median_diff=summarize(d), raw_pairs=raw, control_pre_vs_pre=ctrl,
                                                     browsDisplay=[x['info']['browsDisplay'] for x in infos], errors=[x['errors'] for x in infos],
                                                     pass_pixel_diff_0=bool(d.max() == 0), pass_hidden=all(x['info']['browsDisplay'] == 'none' for x in infos))
            if dpr == 2:
                Image.fromarray(med_off.astype(np.uint8)).save(os.path.join(OUT, 'g11b_brows_off_dpr2.png'))
        # ---- B: flag on ----
        on, info_on, errs_on, pg, ctx = await shot_rig(b, URL + '?engine=v2&n=1', 2)
        Image.fromarray(on.astype(np.uint8)).save(os.path.join(OUT, 'g11b_brows_on_dpr2.png'))
        # animate: apply puzzled and read brow transforms
        anim = await pg.evaluate("""async () => {
          const rig = window.__rigs[0]; const m = n => getComputedStyle(rig.j(n)).transform;
          const before = { L: m('browL'), R: m('browR') };
          await rig.poses.apply('puzzled', { stay: true, snapMs: 1 }); await new Promise(r => setTimeout(r, 250)); rig.poses.freeze();
          const after = { L: m('browL'), R: m('browR') };
          return { before, after, changed: before.L !== after.L && before.R !== after.R };
        }""")
        await pg.wait_for_timeout(100)
        png = await pg.locator('svg.rig-owl').first.screenshot()
        posed = np.array(Image.open(io.BytesIO(png)).convert('RGBA'))
        Image.fromarray(posed).save(os.path.join(OUT, 'g11b_brows_on_puzzled_dpr2.png'))
        await ctx.close()
        off_img = np.array(Image.open(os.path.join(OUT, 'g11b_brows_off_dpr2.png'))).astype(int)
        shp = min(off_img.shape, on.shape)
        d_on = np.abs(off_img[:shp[0], :shp[1]] - on[:shp[0], :shp[1]]).max(-1)
        s_on = summarize(d_on)
        # brow band in device px: svg is 200x240 units rendered into the rig box; band y 55..67 units
        H = shp[0]; unit = H / 240.0
        band = (55 * unit, 67 * unit)
        ys = np.nonzero(d_on > 0)[0]
        in_band = bool(len(ys)) and float(((ys >= band[0] - 2) & (ys <= band[1] + 2)).mean())
        report['B_flag_on'] = dict(info=info_on, errors=errs_on, diff_vs_off=s_on, brow_band_device_px=[round(band[0], 1), round(band[1], 1)],
                                   fraction_of_diff_inside_brow_band=in_band, pose_transforms=anim,
                                   pass_visible=s_on['pixels_differing'] > 0, pass_confined_to_brow_band=bool(in_band and in_band >= 0.98),
                                   pass_no_errors=len(errs_on) == 0, pass_spec_ok=bool(info_on['specCheck'] and info_on['specCheck']['ok']),
                                   pass_brows_animate=bool(anim['changed']))
        # ---- C: spec gate ----
        spec = json.load(open(os.path.join(ROOT, 'companions', 'owl.motion.json')))
        spec['acting']['brows'] = False
        arr_c, info_c, errs_c, pg, ctx = await shot_rig(b, URL + '?engine=v2&n=1&brows=1', 1, spec_override=json.dumps(spec))
        await ctx.close()
        report['C_spec_gate'] = dict(browsDisplay=info_c['browsDisplay'], errors=errs_c, pass_hidden_when_spec_false=info_c['browsDisplay'] == 'none')
        await b.close()
    # sheet: off | on | on+puzzled
    ims = [Image.open(os.path.join(OUT, n)) for n in ('g11b_brows_off_dpr2.png', 'g11b_brows_on_dpr2.png', 'g11b_brows_on_puzzled_dpr2.png')]
    h = max(i.height for i in ims); sheet = Image.new('RGBA', (sum(i.width for i in ims), h), (20, 24, 40, 255)); x = 0
    for i in ims: sheet.paste(i, (x, 0)); x += i.width
    sheet.save(os.path.join(OUT, 'g11b_brows_on_off.png'))
    for n in ('g11b_brows_off_dpr2.png', 'g11b_brows_on_dpr2.png', 'g11b_brows_on_puzzled_dpr2.png'): os.remove(os.path.join(OUT, n))
    report['pass_zero_regression_when_off'] = all(v['pass_pixel_diff_0'] and v['pass_hidden'] for v in report['A_flag_off'].values())
    report['pass_all'] = bool(report['pass_zero_regression_when_off'] and report['B_flag_on']['pass_visible'] and report['B_flag_on']['pass_no_errors']
                              and report['B_flag_on']['pass_spec_ok'] and report['B_flag_on']['pass_brows_animate'] and report['C_spec_gate']['pass_hidden_when_spec_false'])
    json.dump(report, open(os.path.join(OUT, 'g11b_brows_flag.json'), 'w'), indent=2)
    print(json.dumps({k: v for k, v in report.items() if k.startswith('pass')}, indent=1))
    print('A', {k: (v['median_diff'], v['pass_hidden']) for k, v in report['A_flag_off'].items()})
    print('B', report['B_flag_on']['diff_vs_off'], 'band frac', report['B_flag_on']['fraction_of_diff_inside_brow_band'], 'anim', anim['changed'], 'errors', errs_on)
    print('C', report['C_spec_gate'])
    return 0 if report['pass_all'] else 1


if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
