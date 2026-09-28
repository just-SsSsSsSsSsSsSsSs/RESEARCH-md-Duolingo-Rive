#!/usr/bin/env python3
"""
K9.5-2 proof (owner decision 2026-09-27, item a): the think state runs its OWN calm performance on v2; puzzled untouched.

What is measured (live Playwright, headless Chromium, the real page, no mocks):
  state route    firing states.fire('answer:pending') enters `think` and the cue log shows [perf think] and NO [spiral] cue,
                 then the state chains back to idle (state.next) - i.e. the G12 "think" beat no longer runs the puzzled spiral
  budgets        per tier (escalation counter set so small / medium / large each run once):
                 total ms (perf -> settle) <= 3000; head |rot| <= 9 deg (+0.5 sampling slack); pupil offset <= 6 px (+0.5);
                 one blink cue inside the hold; recentre cue precedes settle
  reduced        prefers-reduced-motion emulated: the think performance adds ZERO layers to root/body/head/arm joints
  fallback       ?perf=0 -> the legacy think() runs (no 'perf' cue, rig busy, then idle) - PERF_OFF path still alive
  untouched      P.puzzled function text sha256 prefix == c9b154b0ecc7e837; `git diff origin/main -- sandbox/engine/flight.js`
                 is empty (celebrate/flight must not be touched)
  errors         zero page errors / console errors across every context
Also a frames strip (3 tiers x 3 moments: lift, hold, settle) -> samples/proofs/k95_think_strip.png.

Outputs samples/proofs/k95_think.json (pass_all + per-check flags + raw samples summary). Exit 1 on any failure.
Run:  python3 tools/serve.py 8080 (detached)  ->  python3 sandbox/think_proof.py

Run log: run 1 (3177360) FAILED on head_reaches_tier / pupil_lifts for every tier with head 0 deg / pupil 0 px - a TOOL bug,
not the engine: the matrix regex was written `\\\\(` inside a non-raw Python string, so JS received `\\(` (a literal backslash)
and the sampler never matched getComputedStyle().transform. Fixed to `\\(`; the engine debug at that point already showed
medium head -6.7 deg and pupil (3,-4) px. Kept here so the record is honest.
Run 2 (ef2a6f7): every engine budget PASS; one check FAIL - medium.one_blink_in_hold counted 2 blinks because the seeded IDLE
blink scheduler fired inside the hold (legitimate, independent of the performance). Check redesigned to perf_blink_at_blinkAtMs
(the performance's own blink at perf + blinkAtMs +- 120 ms == exactly 1); idle blinks are reported, not failed.
Run 3 (same tool + blink fix): PASS 49/49, but large sampled head 9.47 deg - inside the declared 0.5 deg sampling slack yet above
the 9 deg nominal, because the sample is absolute and the idle head spring composites on top of the authored tilt. Added the
engine-truth check head_authored_le_9deg (authored rotate read from the head layer keyframes, strict <= 9 and == tier headDeg)
and the idle overlay is reported separately (head_idle_overlay_deg). The run recorded in k95_think.json is the one after this.
"""
import asyncio
import hashlib
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone

from playwright.async_api import async_playwright

try:
    from PIL import Image, ImageDraw, ImageFont
except Exception:  # pragma: no cover
    Image = None

ROOT = os.path.abspath(os.path.dirname(__file__))
REPO = os.path.dirname(ROOT)
OUT = os.path.join(ROOT, 'samples', 'proofs')
BASE = os.environ.get('SANDBOX_BASE', 'http://127.0.0.1:8080/sandbox/')
QS = 'index.html?engine=v2&art=p2&n=1&auto=0&sw=0&hud=0&sfx=0&seed=20260928'
URL = BASE + QS
URL_PERF_OFF = URL + '&perf=0'
READY = 'window.__rigs && window.__rigs.length && typeof window.__rigs[0].ponder === "function" && window.__rigs[0].states'
PUZZLED_SHA16 = 'c9b154b0ecc7e837'
SLACK_DEG, SLACK_PX = 0.5, 0.5

HELPERS = """
  const r = window.__rigs[0]; const sleep = ms => new Promise(res => setTimeout(res, ms));
  const M = n => { const el = r.j(n); if (!el) return [1,0,0,1,0,0]; const t = getComputedStyle(el).transform; const m = t.match(/matrix\\(([^)]+)\\)/); return m ? m[1].split(',').map(Number) : [1,0,0,1,0,0]; };
  const ROT = n => { const v = M(n); return Math.atan2(v[1], v[0]) * 180 / Math.PI; };
  const PUP = n => { const v = M(n); return Math.hypot(v[4], v[5]); };
  const LAYERS = re => [...r.live].filter(a => a.effect && a.effect.target && re.test(a.effect.target.getAttribute('data-joint') || '')).length;
  const HEADKF = () => { let best = 0; for (const a of r.j('head').getAnimations()) { for (const k of a.effect.getKeyframes()) { const m = /rotate\\((-?[\\d.]+)deg\\) translate\\(/.exec(k.transform || ''); if (m) best = Math.max(best, Math.abs(+m[1])); } } return best; };
"""

# one think beat through the STATE MACHINE (not a direct method call): that is the path the watch kit records
JS_THINK = "async (tier) => {" + HELPERS + """
  const E = (r.spec.acting && r.spec.acting.escalation) || { small: 1, medium: 3, largeEveryN: 7 };
  r._esc = r._esc || {}; r._esc.think = tier === 'small' ? 0 : tier === 'medium' ? E.medium - 1 : E.largeEveryN - 1;
  const cues = []; const prev = r.onCue; r.onCue = (p, c) => { cues.push({ p, t: performance.now(), c }); if (prev) prev(p, c); };
  const states = []; const off = r.states.on(ev => { if (ev.type === 'enter') states.push({ to: ev.to, from: ev.from, t: performance.now() }); });
  const s = []; const t0 = performance.now(); const pr = r.states.fire('answer:pending');
  let settled = null;
  while (performance.now() - t0 < 6000) {
    if (!settled && cues.some(c => c.p === 'settle')) settled = performance.now();
    if (settled && performance.now() - settled > 400) break;
    s.push({ t: performance.now() - t0, head: ROT('head'), headKf: HEADKF(), pupL: PUP('pupilL'), pupR: PUP('pupilR'), root: ROT('root'), busy: r.busy });
    await new Promise(requestAnimationFrame);
  }
  await pr; r.onCue = prev; off();
  const settle = cues.find(c => c.p === 'settle'), perf = cues.find(c => c.p === 'perf');
  return { tier, totalMs: settle && perf ? settle.t - perf.t : null, windowMs: performance.now() - t0, finalState: r.states.state,
           cues: cues.map(c => ({ p: c.p, t: +(c.t - t0).toFixed(1), name: c.c && c.c.name, tier: c.c && c.c.tier, vfx: c.c && c.c.vfx, impulse: c.c && c.c.impulse, state: c.c && c.c.state })),
           states: states.map(x => ({ to: x.to, from: x.from, t: +(x.t - t0).toFixed(1) })), samples: s, plan: r._lastPerf && r._lastPerf.plan || null, lastPerf: r._lastPerf && r._lastPerf.name }; }"""

JS_REDUCED = "async () => {" + HELPERS + """
  const base = { root: LAYERS(/^root$/), body: LAYERS(/^body$/), head: LAYERS(/^head$/), arm: LAYERS(/^arm/) };
  const cues = []; const prev = r.onCue; r.onCue = (p, c) => { cues.push(p); if (prev) prev(p, c); };
  const t0 = performance.now(); const pr = r.ponder('large'); const peak = { root: 0, body: 0, head: 0, arm: 0 };
  while (r.busy && performance.now() - t0 < 3000) { for (const k of Object.keys(peak)) peak[k] = Math.max(peak[k], LAYERS(k === 'arm' ? /^arm/ : new RegExp('^' + k + '$')) - base[k]); await sleep(16); }
  await pr; r.onCue = prev;
  return { addedLayers: peak, ms: Math.round(performance.now() - t0), cues, matches: matchMedia('(prefers-reduced-motion: reduce)').matches }; }"""

JS_PERF_OFF = "async () => {" + HELPERS + """
  const cues = []; const prev = r.onCue; r.onCue = (p, c) => { cues.push(p); if (prev) prev(p, c); };
  const t0 = performance.now(); const pr = r.states.fire('answer:pending'); await sleep(200); const busyDuring = r.busy;
  await pr; r.onCue = prev;
  return { perfSpecNull: r.perfSpec('think') === null, busyDuring, cues, finalState: r.states.state, ms: Math.round(performance.now() - t0) }; }"""


def fn_sha16(src, name):
    i = src.index(f'P.{name} = function')
    j = src.index('\n};\n', i) + 4
    return hashlib.sha256(src[i:j].encode()).hexdigest()[:16]


def analyse(res, K, tier):
    s = res['samples']
    cues = [c['p'] for c in res['cues']]
    perf = next((c for c in res['cues'] if c['p'] == 'perf'), None)
    t_perf = perf['t'] if perf else 0
    t_settle = next((c['t'] for c in res['cues'] if c['p'] == 'settle'), None)
    t_recentre = next((c['t'] for c in res['cues'] if c['p'] == 'recentre'), None)
    blinks = [c['t'] for c in res['cues'] if c['p'] == 'blink' and t_settle is not None and t_perf <= c['t'] <= t_settle]
    # the performance's own blink is the one at perf + blinkAtMs (+- 120 ms); the idle scheduler may add more (seeded, legitimate)
    perf_blinks = [t for t in blinks if abs(t - (t_perf + K['blinkAtMs'])) <= 120]
    idle_blinks = len(blinks) - len(perf_blinks)
    head_max = max((abs(x['head']) for x in s), default=0)
    head_authored = max((x['headKf'] for x in s), default=0)   # engine truth: the rotate the ponder head layer was AUTHORED to reach
    pup_max = max((max(x['pupL'], x['pupR']) for x in s), default=0)
    root_max = max((abs(x['root']) for x in s), default=0)
    want_deg = K['tiers'][tier]['headDeg']
    out = {'tier': tier, 'total_ms': None if res['totalMs'] is None else round(res['totalMs'], 1), 'head_max_deg': round(head_max, 2), 'head_authored_deg': round(head_authored, 2), 'head_idle_overlay_deg': round(head_max - head_authored, 2),
           'pupil_max_px': round(pup_max, 2), 'root_max_deg': round(root_max, 2), 'blink_cues_in_hold': len(blinks), 'perf_blink_at_ms': [round(t - t_perf, 1) for t in perf_blinks], 'idle_blinks_in_hold': idle_blinks, 'cue_order': cues,
           'states': res['states'], 'final_state': res['finalState'], 'plan': res['plan'], 'fx': [c['vfx'] for c in res['cues'] if c['p'] == 'fx'],
           'samples': len(s)}
    out['checks'] = {
        'perf_cue_is_think': bool(perf) and perf.get('name') == 'think' and perf.get('tier') == tier and res['lastPerf'] == 'think',
        'no_spiral_cue': 'spiral' not in cues,
        'state_think_then_idle': [x['to'] for x in res['states']][:2] == ['think', 'idle'] and res['finalState'] == 'idle',
        'total_ms_le_3000': res['totalMs'] is not None and res['totalMs'] <= 3000,
        'head_le_9deg': head_max <= 9 + SLACK_DEG,                # sampled absolute (idle head spring composites on top)
        'head_authored_le_9deg': 0 < head_authored <= 9 and abs(head_authored - want_deg) < 0.01,   # strict, engine truth == tier headDeg
        'head_reaches_tier': head_max >= want_deg * 0.6,           # the tilt is visible, not a no-op
        'pupil_le_6px': pup_max <= 6 + SLACK_PX,
        'pupil_lifts': pup_max >= 3.0,                             # the gaze actually leaves centre
        'root_untouched': root_max <= 0.5,                         # no body roll: it is a calm think
        'perf_blink_at_blinkAtMs': len(perf_blinks) == 1,
        'recentre_before_settle': t_recentre is not None and t_settle is not None and t_recentre < t_settle,
        'fx_matches_tier': out['fx'] == list(K['tiers'][tier].get('vfx', [])),
    }
    return out


async def strip(b, K):
    ctx = await b.new_context(viewport=dict(width=1000, height=900), device_scale_factor=2); pg = await ctx.new_page()
    await pg.goto(URL, wait_until='networkidle'); await pg.wait_for_function(READY); await pg.wait_for_timeout(500)
    await pg.evaluate("() => { document.querySelectorAll('.star').forEach(e => e.remove()); const h = document.getElementById('hud'); if (h) h.style.display = 'none'; }")
    box = await pg.evaluate("() => { const r = window.__rigs[0].svg.getBoundingClientRect(); return { x: Math.max(0, r.left - 60), y: Math.max(0, r.top + window.scrollY - 80), width: r.width + 120, height: r.height + 100 }; }")
    rows = []
    marks = [('lift', 400), ('hold', 1000), ('settle', 1800)]
    for tier in ('small', 'medium', 'large'):
        await pg.evaluate("(tier) => { const r = window.__rigs[0]; r.ponder(tier); return 0; }", tier)
        t0 = time.time() * 1000; shots = []
        for name, at in marks:
            wait = at - (time.time() * 1000 - t0)
            if wait > 0: await pg.wait_for_timeout(wait)
            pth = os.path.join(OUT, f'k95_think_{tier}_{len(shots)}.png'); t_shot = time.time() * 1000 - t0
            await pg.screenshot(path=pth, clip=box, full_page=True); shots.append((name, t_shot, pth))
        await pg.wait_for_function('!window.__rigs[0].busy', timeout=8000); await pg.wait_for_timeout(400)
        rows.append((tier, shots))
    await ctx.close()
    if not Image:
        return None
    ims = {p_: Image.open(p_).convert('RGB') for _, shots in rows for _, _, p_ in shots}
    w = max(i.width for i in ims.values()); h = max(i.height for i in ims.values()); cap = 36
    sheet = Image.new('RGB', (w * 3, (h + cap) * 3), (24, 26, 34)); d = ImageDraw.Draw(sheet)
    try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16)
    except Exception: font = None
    for ri, (tier, shots) in enumerate(rows):
        for k, (name, at, p_) in enumerate(shots):
            y = ri * (h + cap); sheet.paste(ims[p_], (k * w, y + cap))
            d.text((k * w + 8, y + 8), f'think {tier}: {name}  t+{int(at)} ms', fill=(255, 209, 102), font=font)
            if k: d.line([(k * w, y), (k * w, y + h + cap)], fill=(60, 64, 80), width=2)
        if ri: d.line([(0, ri * (h + cap)), (w * 3, ri * (h + cap))], fill=(60, 64, 80), width=2)
    sheet.save(os.path.join(OUT, 'k95_think_strip.png'))
    for _, shots in rows:
        for _, _, p_ in shots: os.remove(p_)
    return {'file': 'k95_think_strip.png', 'rows': [{'tier': t, 'frames': [{'label': n, 'captured_ms': round(a, 1)} for n, a, _ in sh]} for t, sh in rows]}


async def main():
    os.makedirs(OUT, exist_ok=True)
    spec = json.load(open(os.path.join(ROOT, 'companions', 'owl.motion.json'), encoding='utf8'))
    K = spec['acting']['performances']['think']
    acting_src = open(os.path.join(ROOT, 'engine', 'acting.js'), encoding='utf8').read()
    flight_diff = subprocess.run(['git', 'diff', 'origin/main', '--', 'sandbox/engine/flight.js'], cwd=REPO, capture_output=True, text=True).stdout
    static = {'puzzled_sha16': fn_sha16(acting_src, 'puzzled'), 'flight_js_diff_lines': len(flight_diff.splitlines()),
              'ponder_before_puzzled': acting_src.index('P.ponder = function') < acting_src.index('P.puzzled = function')}
    R = {'captured': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'url': QS, 'spec_think': K, 'static': static, 'tiers': {}, 'errors': []}
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport=dict(width=1000, height=900)); pg = await ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'favicon' not in m.text else None)
        await pg.goto(URL, wait_until='networkidle'); await pg.wait_for_function(READY); await pg.wait_for_timeout(500)
        R['spec_check'] = await pg.evaluate("() => window.__specCheck ? { ok: window.__specCheck.ok, problems: window.__specCheck.problems } : null")
        R['resolved_clip'] = await pg.evaluate("() => window.__rigs[0].spec.states.list.think.body")
        for tier in ('small', 'medium', 'large'):
            R['tiers'][tier] = analyse(await pg.evaluate(JS_THINK, tier), K, tier); await pg.wait_for_timeout(400)
        await ctx.close()
        ctx = await b.new_context(viewport=dict(width=1000, height=900), reduced_motion='reduce'); pg = await ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL, wait_until='networkidle'); await pg.wait_for_function(READY); await pg.wait_for_timeout(400)
        R['reduced'] = await pg.evaluate(JS_REDUCED); await ctx.close()
        ctx = await b.new_context(viewport=dict(width=1000, height=900)); pg = await ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL_PERF_OFF, wait_until='networkidle'); await pg.wait_for_function(READY); await pg.wait_for_timeout(400)
        R['perf_off'] = await pg.evaluate(JS_PERF_OFF); await ctx.close()
        R['strip'] = await strip(b, K)
        await b.close()
    R['errors'] = errs
    red = R['reduced']
    checks = {
        'spec_validates_in_page': bool(R['spec_check'] and R['spec_check']['ok']),
        'think_state_body_is_ponder': R['resolved_clip'] == 'ponder',
        'reduced_media_matches': red['matches'] is True,
        'reduced_adds_zero_body_layers': all(red['addedLayers'][k] == 0 for k in ('root', 'body', 'head', 'arm')),
        'reduced_no_spiral': 'spiral' not in red['cues'],
        'perf_off_falls_back_to_legacy_think': R['perf_off']['perfSpecNull'] and R['perf_off']['busyDuring'] and 'perf' not in R['perf_off']['cues'] and R['perf_off']['finalState'] == 'idle',
        'puzzled_function_unchanged': static['puzzled_sha16'] == PUZZLED_SHA16,
        'ponder_inserted_before_puzzled': static['ponder_before_puzzled'],
        'flight_js_unchanged_vs_main': static['flight_js_diff_lines'] == 0,
        'no_page_errors': len(errs) == 0,
    }
    for tier, t in R['tiers'].items():
        for k, ok in t['checks'].items(): checks[f'{tier}.{k}'] = ok
    R['checks'] = checks
    R['pass_all'] = all(checks.values())
    R['budgets'] = {'total_ms_max': 3000, 'head_deg_max': 9, 'pupil_px_max': 6, 'sampling_slack': {'deg': SLACK_DEG, 'px': SLACK_PX}}
    json.dump(R, open(os.path.join(OUT, 'k95_think.json'), 'w', encoding='utf8'), indent=2, ensure_ascii=False)
    for k, ok in checks.items(): print(('PASS ' if ok else 'FAIL ') + k)
    for tier, t in R['tiers'].items():
        print(f"  {tier}: total {t['total_ms']} ms, head {t['head_max_deg']} deg, pupil {t['pupil_max_px']} px, cues {t['cue_order']}")
    print('K95 THINK PROOF ' + ('PASS' if R['pass_all'] else 'FAIL') + f" -> {os.path.relpath(os.path.join(OUT, 'k95_think.json'), REPO)}")
    return 0 if R['pass_all'] else 1


if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
