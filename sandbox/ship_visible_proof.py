#!/usr/bin/env python3
"""
K9.2c proof: the owner's 60-second closure checklist (gist 44e55e13), automated.

  1 default page   -> owl renders, 0 console errors, specCheck ok, brows VISIBLE by default, acting bar present
  2 wink           -> one lid closes (scaleY >= 0.9) while the other stays open (<= 0.3); 'wink' cue fired; lids reopen
  3 brows flag     -> ?brows=0 hides (display none) (pixel regression proof lives in brows_proof.py)
  4 roll           -> forced medium flight: accumulated root rotation >= 300 deg mid-flight; lands level (|rot| < 2 deg)
    escalation     -> rig.escalate('flight') x7 == small small medium small small medium large
  5 poses          -> ?poses=1 shows buttons; each of 6 freezes >= 3 joints away from neutral; release returns
  6 reel           -> ?reel=1 runs all 9 beats, total <= 30000 ms, 0 errors
  7 sfx=0          -> no SoundBus created, a wink still animates
  + dart           -> both pupils move >= 2 px mid-dart with L/R asymmetry, and return
  + saccades       -> stats.saccades increments while idle
Output: samples/proofs/g11c_ship_visible.json + g11c_wink.png
"""
import asyncio
import io
import json
import os
import sys

from PIL import Image
from playwright.async_api import async_playwright

ROOT = os.path.abspath(os.path.dirname(__file__))
OUT = os.path.join(ROOT, 'samples', 'proofs')
URL = os.environ.get('URL', 'http://127.0.0.1:8080/sandbox/index.html')
BASE = '?engine=v2&n=1&sw=0&auto=0&hud=0'

JS_HELPERS = """
  const r = window.__rigs[0];
  const M = n => { const t = getComputedStyle(r.j(n)).transform; const m = t.match(/matrix\\(([^)]+)\\)/); return m ? m[1].split(',').map(Number) : (t === 'none' ? [1,0,0,1,0,0] : null); };
  const SY = n => { const v = M(n); return v ? v[3] : null; };
  const TX = n => { const v = M(n); return v ? [v[4], v[5]] : [0, 0]; };
  const ROT = n => { const v = M(n); return v ? Math.atan2(v[1], v[0]) * 180 / Math.PI : 0; };
  const sleep = ms => new Promise(res => setTimeout(res, ms));
"""


async def page(b, extra=''):
    ctx = await b.new_context(viewport=dict(width=1000, height=900))
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'favicon' not in m.text else None)
    await pg.goto(URL + BASE + extra, wait_until='networkidle')
    await pg.wait_for_function('window.__rigs && window.__rigs.length > 0')
    await pg.wait_for_timeout(500)
    return pg, ctx, errs


def hyp(v):
    return (v[0] ** 2 + v[1] ** 2) ** 0.5


async def main():
    R = dict(tool='sandbox/ship_visible_proof.py', url=URL)
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # ---- 1 default: brows visible, no errors, bar present ----
        pg, ctx, errs = await page(b)
        info = await pg.evaluate("""() => { const r = window.__rigs[0]; const g = r.svg.querySelector('[data-feature="brows"]');
          return { brows: getComputedStyle(g).display, spec: window.__specCheck, hasWink: typeof r.wink === 'function', hasDart: typeof r.dart === 'function',
                   bar: !!document.getElementById('acting'), browsBtn: document.getElementById('browsBtn').getAttribute('aria-pressed') }; }""")
        R['1_default'] = dict(errors=errs[:], info=info, pass_=len(errs) == 0 and bool(info['spec'] and info['spec']['ok']) and info['brows'] != 'none' and info['bar'])

        # ---- 2 wink ----
        wink = await pg.evaluate("async () => {" + JS_HELPERS + """
          const cues = []; const prev = r.onCue; r.onCue = (ph, ctx) => { cues.push(ph); if (prev) prev(ph, ctx); };
          r.wink('L'); const samples = []; for (let i = 0; i < 14; i++) { await sleep(16); samples.push({ L: SY('lidL'), R: SY('lidR') }); }
          await sleep(320); const after = { L: SY('lidL'), R: SY('lidR') }; r.onCue = prev;
          return { peakL: Math.max(...samples.map(s => s.L ?? 0)), peakR: Math.max(...samples.map(s => s.R ?? 0)), after, cues, winks: r.stats.winks }; }""")
        R['2_wink'] = dict(**wink, pass_=wink['peakL'] >= 0.9 and wink['peakR'] <= 0.3 and 'wink' in wink['cues'] and abs(wink['after']['L'] or 0) < 0.05)
        await pg.evaluate("window.__rigs[0].wink('L')")
        await pg.wait_for_timeout(75)
        await pg.evaluate("document.getAnimations().forEach(a => a.pause())")
        png = await pg.locator('svg.rig-owl').first.screenshot()
        Image.open(io.BytesIO(png)).save(os.path.join(OUT, 'g11c_wink.png'))
        await pg.evaluate("document.getAnimations().forEach(a => a.play())")

        # ---- + dart ----
        dart = await pg.evaluate("async () => {" + JS_HELPERS + """
          const pr = r.dart(); await sleep(170); const mid = { L: TX('pupilL'), R: TX('pupilR') }; await pr; await sleep(150); const end = { L: TX('pupilL'), R: TX('pupilR') };
          return { mid, end, darts: r.stats.darts }; }""")
        R['dart'] = dict(**dart, dispL=hyp(dart['mid']['L']), dispR=hyp(dart['mid']['R']),
                         asym=hyp([dart['mid']['L'][0] - dart['mid']['R'][0], dart['mid']['L'][1] - dart['mid']['R'][1]]))
        R['dart']['pass_'] = R['dart']['dispL'] >= 2 and R['dart']['dispR'] >= 2 and R['dart']['asym'] > 0.05 and hyp(dart['end']['L']) < 0.6

        # ---- + saccades ----
        sac0 = await pg.evaluate("window.__rigs[0].stats.saccades || 0")
        await pg.wait_for_timeout(7000)
        sac1 = await pg.evaluate("window.__rigs[0].stats.saccades || 0")
        R['saccades'] = dict(before=sac0, after_7s=sac1, pass_=sac1 > sac0)
        await ctx.close()

        # ---- 3 brows flag ----
        pg, ctx, errs = await page(b, '&brows=0')
        off = await pg.evaluate("""() => ({ brows: getComputedStyle(window.__rigs[0].svg.querySelector('[data-feature="brows"]')).display, btn: document.getElementById('browsBtn').textContent })""")
        R['3_brows_flag'] = dict(default_visible=info['brows'] != 'none', off=off, pass_=off['brows'] == 'none' and info['brows'] != 'none')
        await ctx.close()

        # ---- 4 roll ----
        pg, ctx, errs = await page(b)
        roll = await pg.evaluate("async () => {" + JS_HELPERS + """
          r._forcedRoll = 'medium'; const pr = r.states.fire('move:to', { by: { dx: 260, dy: -120 }, trace: false });
          const t0 = performance.now(); let prev = 0, acc = 0, maxAcc = 0, n = 0;
          while ((r.flying || performance.now() - t0 < 400) && performance.now() - t0 < 9000) { const a = ROT('root'); let d = a - prev; if (d > 180) d -= 360; if (d < -180) d += 360; acc += d; prev = a; maxAcc = Math.max(maxAcc, Math.abs(acc)); n++; await sleep(33); }
          await pr; await sleep(400);
          return { samples: n, maxAbsAccumulatedDeg: +maxAcc.toFixed(1), landingDeg: +ROT('root').toFixed(2), lastRoll: r._lastRoll, ms: Math.round(performance.now() - t0) }; }""")
        R['4_roll'] = dict(**roll, pass_=roll['maxAbsAccumulatedDeg'] >= 300 and abs(roll['landingDeg']) < 2 and bool(roll['lastRoll']) and roll['lastRoll']['mode'] in ('roll', 'rollFlip'))
        tiers = await pg.evaluate("() => { const r = window.__rigs[0]; r._esc = {}; return Array.from({ length: 7 }, () => r.escalate('flight')); }")
        R['4_escalation'] = dict(tiers=tiers, pass_=tiers == ['small', 'small', 'medium', 'small', 'small', 'medium', 'large'])
        await ctx.close()

        # ---- 5 poses ----
        pg, ctx, errs = await page(b, '&poses=1')
        poses = await pg.evaluate("async () => {" + JS_HELPERS + """
          const btns = [...document.querySelectorAll('#poseBtns button[data-pose]')];
          const J = ['head','body','armL','armR','browL','browR','legL'];
          const snap = () => Object.fromEntries(J.map(n => [n, getComputedStyle(r.j(n)).transform]));
          const visible = !document.getElementById('poseBtns').hidden; const neutral = snap(); const out = {};
          for (const b of btns) { const name = b.dataset.pose; if (!name) continue; b.click(); await sleep(450); const s = snap(); out[name] = J.filter(k => s[k] !== neutral[k]).length; }
          btns.find(b => b.dataset.pose === '').click(); await sleep(800); const rel = snap();
          const near = (a, b) => { const ma = a.match(/matrix\\(([^)]+)\\)/), mb = b.match(/matrix\\(([^)]+)\\)/); if (!ma || !mb) return a === b; const va = ma[1].split(',').map(Number), vb = mb[1].split(',').map(Number); return va.every((x, i) => Math.abs(x - vb[i]) < 0.05); };
          return { visible, changedJointsPerPose: out, jointsBackToNeutral: J.filter(k => near(rel[k], neutral[k])).length, total: J.length }; }""")
        R['5_poses'] = dict(**poses, pass_=poses['visible'] and len(poses['changedJointsPerPose']) == 6 and all(v >= 3 for v in poses['changedJointsPerPose'].values()) and poses['jointsBackToNeutral'] >= 5)
        await ctx.close()

        # ---- 6 reel ----
        pg, ctx, errs = await page(b, '&reel=1')
        await pg.wait_for_function('window.__reel && window.__reel.done', timeout=50000)
        reel = await pg.evaluate("window.__reel")
        R['6_reel'] = dict(total_ms=reel['total'], beats=reel['beats'], errors=errs[:], pass_=reel['total'] <= 30000 and len(reel['beats']) == 9 and len(errs) == 0)
        await ctx.close()

        # ---- 7 sfx=0 ----
        pg, ctx, errs = await page(b, '&sfx=0')
        sfx = await pg.evaluate("async () => {" + JS_HELPERS + """
          const ok = r.wink('R'); await sleep(60); return { winkRan: ok, lidR_sy: SY('lidR'), bus: !!window.__bus, foley: !!window.__foley }; }""")
        R['7_sfx0'] = dict(**sfx, errors=errs[:], pass_=bool(sfx['winkRan']) and (sfx['lidR_sy'] or 0) > 0.3 and not sfx['bus'] and len(errs) == 0)
        await ctx.close()
        await b.close()

    R['pass_all'] = all(v.get('pass_') for v in R.values() if isinstance(v, dict) and 'pass_' in v)
    json.dump(R, open(os.path.join(OUT, 'g11c_ship_visible.json'), 'w'), indent=2, ensure_ascii=False)
    for k, v in R.items():
        if isinstance(v, dict) and 'pass_' in v:
            print(k, 'PASS' if v['pass_'] else 'FAIL', json.dumps({kk: vv for kk, vv in v.items() if kk not in ('pass_', 'beats', 'info')}, ensure_ascii=False)[:300])
    print('pass_all', R['pass_all'])
    return 0 if R['pass_all'] else 1


if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
