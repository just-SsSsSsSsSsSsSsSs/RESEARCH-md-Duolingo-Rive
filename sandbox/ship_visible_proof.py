#!/usr/bin/env python3
"""
K9.2c proof: the owner's 60-second closure checklist (gist 44e55e13), automated.

  1 default page   -> owl renders, 0 console errors, specCheck ok, brows VISIBLE by default, acting bar present
  2 wink           -> one lid closes (scaleY >= 0.9) while the other stays open (<= 0.3); 'wink' cue fired; lids reopen
  3 brows flag     -> ?brows=0 hides (display none) (pixel regression proof lives in brows_proof.py)
  4 roll           -> forced medium flight: accumulated root rotation >= 300 deg mid-flight; lands level (|rot| < 2 deg)
    escalation     -> rig.escalate('flight') x7 == small small medium small small medium large
  5 poses          -> ?poses=1 shows buttons; each of 6 freezes >= 3 joints away from neutral; release sets every pose layer back to identity (breath keeps running, so DOM transforms are not compared)
  6 reel           -> ?reel=1 runs all 9 beats, total <= 30000 ms, 0 errors
  7 sfx=0          -> no SoundBus created, a wink still animates
  8 intent (K9.3)  -> acting bar has the 'intent' button; pressing it fires the 'intent' cue BEFORE 'takeoff' with eyes -> head -> body
                      lags inside the declared budgets (spec acting.intent), the owl reaches the answer card, and ?intent=0 fires 0 intent cues
                      (full timing proof with engine-truth onsets lives in intent_proof.py -> g12_intent.json)
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
        b = await p.chromium.launch()   # default flags: no autoplay override (same as sfx_measure.py); sound is unlocked by a real pointer gesture

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
          btns.find(b => b.dataset.pose === '').click(); await sleep(900);
          // release check must not be fooled by the live breath/idle layers: read the pose layer's own end keyframe per joint (identity = released)
          const layers = Object.entries(r.poses.layers).map(([j, a]) => [j, a.effect.getKeyframes()[1].transform]);
          const releasedJoints = layers.filter(([, t]) => /^translate\\(0px, 0px\\)$/.test(t)).length;
          return { visible, changedJointsPerPose: out, poseLayers: layers.length, releasedJoints, current: r.poses.current }; }""")
        R['5_poses'] = dict(**poses, pass_=poses['visible'] and len(poses['changedJointsPerPose']) == 6 and all(v >= 3 for v in poses['changedJointsPerPose'].values()) and poses['releasedJoints'] == poses['poseLayers'] and poses['current'] is None)
        await ctx.close()

        # ---- 6 reel ----
        pg, ctx, errs = await page(b, '&reel=1')
        await pg.wait_for_function('window.__reel && window.__reel.done', timeout=50000)
        reel = await pg.evaluate("window.__reel")
        R['6_reel'] = dict(total_ms=reel['total'], beats=reel['beats'], errors=errs[:], pass_=reel['total'] <= 30000 and len(reel['beats']) == 9 and len(errs) == 0)
        await ctx.close()

        # ---- 7 sfx=0 (DIRECTIVES #07: a NUMBER, not only "no bus"): same flight on a normal page vs ?sfx=0; count sounds played and audio nodes ----
        SFX_JS = "async () => {" + JS_HELPERS + """
          const ac0 = performance.getEntriesByType('resource').filter(e => /\\.(mp3|ogg|wav|webm)(\\?|$)/.test(e.name)).length;
          const ok = r.wink('R'); await sleep(60); const lid = SY('lidR');
          const cues = []; const prev = r.onCue; r.onCue = (p, c) => { cues.push(p); if (prev) prev(p, c); };
          r.flyBy(160, -40); const t0 = performance.now();
          while (!r.busy && performance.now() - t0 < 1500) await sleep(16);
          while (r.busy && performance.now() - t0 < 8000) await sleep(16);
          r.onCue = prev;
          const bus = window.__bus, st = bus ? bus.stats : null;
          return { winkRan: ok, lidR_sy: lid, bus: !!bus, foley: !!window.__foley, cues_fired: cues.length,
                   sounds_played: st ? st.played : 0, sounds_muted: st ? st.muted : 0, active_voices: bus ? bus.active.length : 0,
                   audio_elements: document.querySelectorAll('audio').length, audio_context_state: bus && bus.ctx ? bus.ctx.state : null,
                   audio_files_fetched: performance.getEntriesByType('resource').filter(e => /\\.(mp3|ogg|wav|webm)(\\?|$)/.test(e.name)).length - ac0 }; }"""
        pg, ctx, errs = await page(b, '&sfx=0')
        sfx = await pg.evaluate(SFX_JS)
        await ctx.close()
        pg, ctx, errs_on = await page(b, '')
        # real pointer gesture on the stage -> SoundBus.unlock() (autoplay policy respected, as in the K8 gates)
        await pg.mouse.click(500, 120); await pg.wait_for_timeout(150)
        on = await pg.evaluate(SFX_JS)
        await ctx.close()
        R['7_sfx0'] = dict(**sfx, with_sound_page={k: on[k] for k in ('bus', 'foley', 'cues_fired', 'sounds_played', 'sounds_muted', 'audio_context_state')}, errors=errs[:] + errs_on[:],
                           pass_=bool(sfx['winkRan']) and (sfx['lidR_sy'] or 0) > 0.3 and not sfx['bus'] and sfx['sounds_played'] == 0 and sfx['active_voices'] == 0
                           and sfx['cues_fired'] >= 3 and on['bus'] and (on['sounds_played'] + on['sounds_muted']) > 0 and len(errs) + len(errs_on) == 0)

        # ---- 8 intent (K9.3): button present, cue order intent -> anticipate -> takeoff, lags inside spec budget, arrives at the answer card ----
        pg, ctx, errs = await page(b, '&sfx=0')
        intent = await pg.evaluate("async () => {" + JS_HELPERS + """
          const btn = document.querySelector('#acting button[data-actx="intent"]');
          const I = r.spec.acting && r.spec.acting.intent;
          const cues = []; const prev = r.onCue; r.onCue = (phase, ctx) => { cues.push({ phase, t: performance.now(), ctx: phase === 'intent' ? ctx : undefined }); if (prev) prev(phase, ctx); };
          const before = r.svg.parentElement.getBoundingClientRect();
          if (btn) btn.click();
          const t0 = performance.now();
          while (!r.busy && performance.now() - t0 < 1500) await sleep(16);
          while (r.busy && performance.now() - t0 < 8000) await sleep(16);
          r.onCue = prev;
          const ans = document.getElementById('perch-answer').getBoundingClientRect();
          const perch = r._perch || { x: 0, y: 0 };
          const owlCx = before.left + before.width / 2 + perch.x;
          const names = cues.map(c => c.phase);
          const at = n => { const c = cues.find(x => x.phase === n); return c ? c.t : null; };
          const ic = cues.find(c => c.phase === 'intent');
          return { buttonPresent: !!btn, cues: names, intentCtx: ic ? ic.ctx : null, budget: I ? { headLagMs: I.headLagMs, bodyLagMs: I.bodyLagMs, preTakeoffMs: I.budget && I.budget.preTakeoffMs } : null,
                   intent_to_takeoff_ms: at('intent') != null && at('takeoff') != null ? Math.round(at('takeoff') - at('intent')) : null,
                   owl_cx_vs_answer_cx_px: Math.round(owlCx - (ans.left + ans.width / 2)), intents: r.stats.intents || 0 }; }""")
        # 'enter' (state-machine cue on move:to) legitimately precedes; the motion order that matters is intent < anticipate < takeoff
        c = intent['cues']
        ok_order = all(n in c for n in ('intent', 'anticipate', 'takeoff', 'land')) and c.index('intent') < c.index('anticipate') < c.index('takeoff') and c.count('intent') == 1
        ic = intent['intentCtx'] or {}; B = intent['budget'] or {}
        ok_lags = bool(ic) and B and B['headLagMs'][0] <= ic['headLagMs'] <= B['headLagMs'][1] and B['bodyLagMs'][0] <= ic['bodyLagMs'] <= B['bodyLagMs'][1]
        ok_pre = intent['intent_to_takeoff_ms'] is not None and B.get('preTakeoffMs') and B['preTakeoffMs'][0] <= intent['intent_to_takeoff_ms'] <= B['preTakeoffMs'][1] + 100
        R['8_intent'] = dict(**intent, errors=errs[:], pass_=intent['buttonPresent'] and ok_order and bool(ok_lags) and bool(ok_pre) and abs(intent['owl_cx_vs_answer_cx_px']) <= 12 and intent['intents'] == 1 and len(errs) == 0)
        await ctx.close()

        # ---- 8b intent=0: the same press fires no intent cue and still flies ----
        pg, ctx, errs = await page(b, '&sfx=0&intent=0')
        off = await pg.evaluate("async () => {" + JS_HELPERS + """
          const cues = []; const prev = r.onCue; r.onCue = (phase, ctx) => { cues.push(phase); if (prev) prev(phase, ctx); };
          document.querySelector('#acting button[data-actx="intent"]').click();
          const t0 = performance.now();
          while (!r.busy && performance.now() - t0 < 1500) await sleep(16);
          while (r.busy && performance.now() - t0 < 8000) await sleep(16);
          r.onCue = prev; return { cues, intents: r.stats.intents || 0 }; }""")
        R['8b_intent_off'] = dict(**off, errors=errs[:], pass_='intent' not in off['cues'] and 'takeoff' in off['cues'] and 'land' in off['cues'] and off['intents'] == 0 and len(errs) == 0)
        await ctx.close()

        # ---- 9 performances (K9.4): the three bar buttons exist; pressing each fires cue 'perf' with the escalated tier, the caption names the tier,
        #      7 presses of one button escalate small small medium small small medium large (full timing proof lives in perf_proof.py -> g13_performances.json) ----
        pg, ctx, errs = await page(b, '&sfx=0')
        perf = await pg.evaluate("async () => {" + JS_HELPERS + """
          const btn = n => document.querySelector('#acting button[data-actx="' + n + '"]');
          const present = ['triumph', 'oops', 'puzzled'].every(n => !!btn(n));
          const perfs = []; const prev = r.onCue; r.onCue = (p, c) => { if (p === 'perf') perfs.push({ name: c.name, tier: c.tier }); if (prev) prev(p, c); };
          const captions = [];
          for (const n of ['triumph', 'oops', 'puzzled']) { btn(n).click(); await sleep(60); captions.push(document.getElementById('caption').textContent); const t0 = performance.now(); while (r.busy && performance.now() - t0 < 6000) await sleep(16); await sleep(250); }
          const tiers = []; for (let i = 0; i < 6; i++) { btn('puzzled').click(); const t0 = performance.now(); await sleep(60); while (r.busy && performance.now() - t0 < 6000) await sleep(16); await sleep(150); }
          r.onCue = prev;
          return { present, perfs, captions, puzzledTiers: perfs.filter(p => p.name === 'puzzled').map(p => p.tier), performances: r.stats.performances || 0 }; }""")
        want = ['small', 'small', 'medium', 'small', 'small', 'medium', 'large']
        R['9_performances'] = dict(**perf, errors=errs[:], pass_=perf['present'] and [p['name'] for p in perf['perfs'][:3]] == ['triumph', 'oops', 'puzzled'] and perf['puzzledTiers'] == want
                                   and all(any(t in c for t in ('صغيرة', 'متوسطة', 'كبيرة')) for c in perf['captions']) and perf['performances'] == 9 and len(errs) == 0)
        await ctx.close()

        # ---- 9b reduced motion: same buttons under prefers-reduced-motion add no root/body layers (face only), vfx skipped ----
        ctx = await b.new_context(viewport=dict(width=1000, height=900), reduced_motion='reduce'); pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + BASE + '&sfx=0', wait_until='networkidle'); await pg.wait_for_function('window.__rigs && window.__rigs.length > 0'); await pg.wait_for_timeout(500)
        red = await pg.evaluate("async () => {" + JS_HELPERS + """
          const L = re => [...r.live].filter(a => a.effect && a.effect.target && re.test(a.effect.target.getAttribute('data-joint') || '')).length;
          const base = L(/^(root|body)$/); let peak = 0;
          for (const n of ['triumph', 'oops', 'puzzled']) { document.querySelector('#acting button[data-actx="' + n + '"]').click(); const t0 = performance.now(); await sleep(40); while (r.busy && performance.now() - t0 < 4000) { peak = Math.max(peak, L(/^(root|body)$/) - base); await sleep(16); } await sleep(150); }
          return { matches: matchMedia('(prefers-reduced-motion: reduce)').matches, addedRootBodyLayers: peak, performances: r.stats.performances || 0, vfxSkipped: window.__foley ? window.__foley.vfx.stats.skippedReduced : null }; }""")
        R['9b_reduced'] = dict(**red, errors=errs[:], pass_=red['matches'] and red['addedRootBodyLayers'] == 0 and red['performances'] == 3 and len(errs) == 0)
        await ctx.close()

        # ---- 10 flex (K9.5): the bar button exists and is ON; the 480 ms flap puts follower layers on armL_mid/armL_tip (engine truth via getAnimations);
        #      pressing the button turns flex off -> the next flap adds 0 followers and no child layer; pressing again restores it.
        #      Full timing proof (ratio, lag, tail, perf) lives in flex_proof.py -> g14_flex.json. ----
        pg, ctx, errs = await page(b, '&sfx=0')
        flex = await pg.evaluate("async () => {" + JS_HELPERS + """
          const btn = document.querySelector('#acting button[data-actx="flex"]');
          const lay = n => r.j(n) ? r.j(n).getAnimations().filter(a => a.effect.getTiming().duration === 480).length : -1;
          const waitFlap = async () => { const t0 = performance.now(); while (performance.now() - t0 < 700 && !lay('armL')) await sleep(16); };
          const idle = async () => { const t0 = performance.now(); while (r.busy && performance.now() - t0 < 6000) await sleep(16); await sleep(150); };
          const f = () => (r.stats && r.stats.flexFollowers) || 0;
          const o = { present: !!btn, pressed0: btn && btn.getAttribute('aria-pressed'), label0: btn && btn.textContent };
          let f0 = f(); r.celebrate(); await waitFlap(); o.childOn = lay('armL_mid') + lay('armL_tip'); await idle(); o.followersOn = f() - f0;
          btn.click(); o.pressed1 = btn.getAttribute('aria-pressed'); o.label1 = btn.textContent; o.specEnabled1 = r.spec.acting.flex.enabled;
          f0 = f(); r.celebrate(); await waitFlap(); o.childOff = lay('armL_mid') + lay('armL_tip'); await idle(); o.followersOff = f() - f0;
          btn.click(); o.pressed2 = btn.getAttribute('aria-pressed'); o.specEnabled2 = r.spec.acting.flex.enabled;
          f0 = f(); r.celebrate(); await waitFlap(); o.childBack = lay('armL_mid') + lay('armL_tip'); await idle(); o.followersBack = f() - f0;
          return o; }""")
        R['10_flex'] = dict(**flex, errors=errs[:], pass_=flex['present'] and flex['pressed0'] == 'true' and flex['childOn'] == 2 and flex['followersOn'] == 4
                            and flex['pressed1'] == 'false' and flex['specEnabled1'] is False and flex['childOff'] == 0 and flex['followersOff'] == 0
                            and flex['pressed2'] == 'true' and flex['childBack'] == 2 and flex['followersBack'] == 4 and len(errs) == 0)
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
