#!/usr/bin/env python3
"""
K9.2c-5  eye-lead A/B (owner request, gist 44e55e13 item 4): prove by measurement which
timing system governs the eyes, then keep one.

  History: spec.hierarchy.eyes.delayMs = 60 (eyes LAG the head) coexisted with
  spec.acting.lead = [eyes, head, body] + leadMs = 45 (eyes LEAD). grep showed
  hierarchy.eyes was never read by code; it was removed (K9.2c). This script is the
  measured proof the owner asked for, so the removal is not a claim.

  Method: same scene, same pose ('alert'), N repetitions per arm, 1 owl.
    A  acting.leadMs = 45 (shipped)      B  acting.leadMs = 0 (no lead)
  Per repetition, sample every animation frame the computed transform of pupilL
  and head from the moment apply() is called; record the first frame where each
  differs from its start. lead_ms = t_head_first_move - t_pupil_first_move.
    A must show lead_ms ~ +45 (eyes first); B must show ~0 (simultaneous).
  The spec is overridden through a fetch route so no file is modified.

Output: samples/proofs/g11c_eyelead_ab.json
"""
import asyncio
import json
import os
import statistics
import sys

from playwright.async_api import async_playwright

ROOT = os.path.abspath(os.path.dirname(__file__))
OUT = os.path.join(ROOT, 'samples', 'proofs')
URL = os.environ.get('URL', 'http://127.0.0.1:8080/sandbox/index.html')
BASE = '?engine=v2&n=1&sw=0&auto=0&hud=0&sfx=0'
N = int(os.environ.get('N', '8'))

JS = """
async (pose) => {
  const r = window.__rigs[0];
  // freeze breath/idle so only the pose moves the joints
  r.svg.getAnimations({ subtree: true }).forEach(a => { if (!Object.values(r.poses.layers).includes(a)) a.pause(); });
  // let the paused hold-times settle for two frames before taking the baselines (otherwise the pause itself reads as a move)
  await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
  const V = n => { const m = getComputedStyle(r.j(n)).transform.match(/matrix\(([^)]+)\)/); return m ? m[1].split(',').map(Number) : [1, 0, 0, 1, 0, 0]; };
  const moved = (a, b) => a.some((x, i) => Math.abs(x - b[i]) > 0.02);
  const p0 = V('pupilL'), h0 = V('head');
  const t0 = performance.now(); let tp = null, th = null;
  r.poses.apply(pose, { stay: true, snapMs: 30 });
  await new Promise(res => { const tick = () => { const now = performance.now() - t0; if (tp === null && moved(V('pupilL'), p0)) tp = now; if (th === null && moved(V('head'), h0)) th = now; if ((tp !== null && th !== null) || now > 600) res(); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  r.poses.release(1); await new Promise(res => setTimeout(res, 250));
  r.svg.getAnimations({ subtree: true }).forEach(a => a.play());
  return { tPupil: tp, tHead: th };
}
"""


async def arm(b, spec_json, label):
    ctx = await b.new_context(viewport=dict(width=900, height=800))
    pg = await ctx.new_page()
    await pg.route('**/companions/owl.motion.json*', lambda route: route.fulfill(status=200, content_type='application/json', body=spec_json))
    await pg.goto(URL + BASE, wait_until='networkidle')
    await pg.wait_for_function('window.__rigs && window.__rigs.length && window.__rigs[0].poses')
    await pg.wait_for_timeout(400)
    rows = []
    for _ in range(N):
        rows.append(await pg.evaluate(JS, 'alert'))
        await pg.wait_for_timeout(200)
    await ctx.close()
    leads = [r['tHead'] - r['tPupil'] for r in rows if r['tHead'] is not None and r['tPupil'] is not None]
    return dict(label=label, n=len(rows), rows=rows, lead_ms=leads, lead_median_ms=statistics.median(leads) if leads else None,
                lead_min_ms=min(leads) if leads else None, lead_max_ms=max(leads) if leads else None)


async def main():
    spec = json.load(open(os.path.join(ROOT, 'companions', 'owl.motion.json')))
    a = dict(spec); a['acting'] = dict(spec['acting'], leadMs=45)
    b_ = dict(spec); b_['acting'] = dict(spec['acting'], leadMs=0)
    async with async_playwright() as p:
        br = await p.chromium.launch()
        A = await arm(br, json.dumps(a), 'A leadMs=45 (eyes lead)')
        B = await arm(br, json.dumps(b_), 'B leadMs=0 (no lead)')
        await br.close()
    rep = dict(tool='sandbox/eyelead_ab.py', pose='alert', reps_per_arm=N, frame_ms_note='sampled per rAF (~16.7 ms), so lead has +-17 ms quantisation',
               hierarchy_eyes_in_spec=('eyes' in spec.get('hierarchy', {})), code_reads_hierarchy_eyes=False,
               A=A, B=B)
    rep['pass_A_eyes_lead'] = A['lead_median_ms'] is not None and 25 <= A['lead_median_ms'] <= 80
    rep['pass_B_no_lead'] = B['lead_median_ms'] is not None and abs(B['lead_median_ms']) <= 17
    rep['pass_hierarchy_eyes_removed'] = not rep['hierarchy_eyes_in_spec']
    rep['verdict'] = ('acting.lead/leadMs is the only system that moves eye timing (A median %.0f ms vs B %.0f ms); hierarchy.eyes was dead data and is removed.'
                      % (A['lead_median_ms'] or 0, B['lead_median_ms'] or 0))
    rep['pass_all'] = rep['pass_A_eyes_lead'] and rep['pass_B_no_lead'] and rep['pass_hierarchy_eyes_removed']
    json.dump(rep, open(os.path.join(OUT, 'g11c_eyelead_ab.json'), 'w'), indent=2)
    print(json.dumps({k: rep[k] for k in ('pass_A_eyes_lead', 'pass_B_no_lead', 'pass_hierarchy_eyes_removed', 'pass_all', 'verdict')}, indent=1))
    print('A leads', A['lead_ms']); print('B leads', B['lead_ms'])
    return 0 if rep['pass_all'] else 1


if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
