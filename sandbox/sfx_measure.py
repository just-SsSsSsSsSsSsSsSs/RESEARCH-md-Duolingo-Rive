#!/usr/bin/env python3
"""
K8.5 - Foley gate measurements (owl only). Produces, in sandbox/samples/sfx/:

  sfx_autoplay.json   the autoplay policy is honoured, not bypassed: Chromium launched with DEFAULT flags;
                      bus.status == 'locked' and 0 cues played before any gesture; after ONE real
                      pointer click (unlock called inside the capture-phase pointerdown handler)
                      the context is 'running'. navigator.userActivation.hasBeenActive is recorded too.
  sfx_sync.json       per cue: offset = t_audio(scheduled, mapped through getOutputTimestamp) - t_visual
                      (performance.now() at the visual onset). Target <= 16.7 ms, cap 40 ms.
  sfx_slowmo.json     at slow_rate 0.25 every cue must be muted (bus.stats.muted grows, played does not).
  sfx_mix.json        OfflineAudioContext render of every cue alone and of the busiest overlap
                      (land + boing + chime + flap): peak dBFS <= -3, clipped samples == 0; duck depth.
  sfx_polyphony.json  5 owls fired together: max concurrent voices <= polyphony, same cue never < gap ms.
  perf: measure.py is re-run separately (jank / heap / idle loops) with the Foley layer on.

A real-device (iPhone) check of the mute-switch kick is owner-side and recorded as such.
Usage: python3 sandbox/sfx_measure.py   (needs tools/serve.py on 8080 + playwright chromium)
"""
import asyncio, json, os, time
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'samples', 'sfx')
BASE = 'http://localhost:8080/sandbox/index.html?engine=v2&auto=0&sw=0&hud=0'


def dump(name, obj):
    with open(os.path.join(OUT, name), 'w', encoding='utf-8') as f: json.dump(obj, f, ensure_ascii=False, indent=2)


async def main():
    os.makedirs(OUT, exist_ok=True)
    stamp = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    async with async_playwright() as p:
        b = await p.chromium.launch()            # default flags: no --autoplay-policy override
        pg = await b.new_page(viewport={'width': 1000, 'height': 800})
        errors = []
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        await pg.goto(BASE + '&n=1', wait_until='networkidle')
        await pg.wait_for_function('window.__rigs && window.__rigs.length===1 && window.__foley')

        # ---------------- autoplay gate ----------------
        before = await pg.evaluate("({status: window.__bus.status, hasCtx: !!window.__bus.ctx, userActive: navigator.userActivation ? navigator.userActivation.hasBeenActive : null})")
        await pg.evaluate("void window.__rigs[0].states.fire('answer:correct')")
        await pg.wait_for_function("!window.__rigs[0].busy && window.__rigs[0].states.state==='idle'", timeout=15000)
        no_gesture = await pg.evaluate("({...window.__bus.stats, status: window.__bus.status, cuesRequested: window.__foley.trace.filter(t => t.sfx).length, vfxSpawned: window.__foley.vfx.stats.spawned})")
        await pg.mouse.click(500, 620)           # the one real gesture
        await pg.wait_for_timeout(250)
        after = await pg.evaluate("({status: window.__bus.status, ctxState: window.__bus.ctx && window.__bus.ctx.state, baseLatencyMs: window.__bus.ctx ? +(window.__bus.ctx.baseLatency*1000).toFixed(1) : null, outputLatencyMs: window.__bus.ctx && window.__bus.ctx.outputLatency !== undefined ? +(window.__bus.ctx.outputLatency*1000).toFixed(1) : null, sampleRate: window.__bus.ctx && window.__bus.ctx.sampleRate, userActive: navigator.userActivation ? navigator.userActivation.hasBeenActive : null})")
        autoplay = {
            'measured_at': stamp, 'launch_flags': 'playwright default (policy not bypassed)',
            'before_gesture': before, 'cues_without_gesture': no_gesture, 'after_one_click': after,
            'unlock_call_site': 'document pointerdown/keydown listener, capture phase, synchronous (index.html unlockAudio -> SoundBus.unlock)',
            'pass': before['status'] == 'locked' and no_gesture['played'] == 0 and no_gesture['vfxSpawned'] > 0 and after['ctxState'] == 'running',
            'note': 'headless Chromium honours the gesture requirement here (status stayed locked until the click); a real-device iPhone mute-switch check remains owner-side.'
        }
        dump('sfx_autoplay.json', autoplay)
        print('autoplay', autoplay['pass'], before['status'], '->', after['ctxState'])

        # ---------------- sync ----------------
        await pg.wait_for_function("!window.__rigs[0].busy", timeout=15000)
        await pg.evaluate("window.__bus.log.length = 0; window.__foley.trace.length = 0")
        seq = [("move:to", "{by:{dx:260,dy:-150}}"), ("answer:pending", "{}"), ("answer:wrong", "{}"), ("answer:correct", "{}"), ("move:to", "{home:true}"), ("lesson:start", "{}")]
        for ev, ctx in seq:
            await pg.evaluate(f"void window.__rigs[0].states.fire('{ev}', {ctx})")
            await pg.wait_for_timeout(300)
            await pg.wait_for_function("!window.__rigs[0].busy && window.__rigs[0].states.state==='idle'", timeout=20000)
            await pg.wait_for_timeout(400)
        log = await pg.evaluate("window.__bus.log")
        offs = [l['offsetMs'] for l in log]
        by_cue = {}
        for l in log: by_cue.setdefault(l['cue'], []).append(l['offsetMs'])
        sync = {
            'measured_at': stamp, 'method': 'offset = performanceTime(getOutputTimestamp) + (t_scheduled - contextTime)*1000 - performance.now() at visual onset; single clock',
            'n': len(offs), 'min_ms': min(offs), 'max_ms': max(offs), 'mean_ms': round(sum(offs) / len(offs), 2),
            'p95_ms': sorted(offs)[int(len(offs) * 0.95) - 1] if len(offs) > 1 else offs[0],
            'target_ms': 16.7, 'cap_ms': 40,
            'pass_target': max(offs) <= 16.7, 'pass_cap': max(offs) <= 40,
            'per_cue': {k: {'n': len(v), 'min': min(v), 'max': max(v)} for k, v in by_cue.items()},
            'base_latency_ms': log[0]['baseLatencyMs'] if log else None,
            'note': 'offset excludes the device output latency (ctx.outputLatency) which is hardware and identical for every cue; the scheduling error is what we control.',
            'raw': log,
        }
        dump('sfx_sync.json', sync)
        print('sync n=%d min %.1f max %.1f p95 %.1f' % (sync['n'], sync['min_ms'], sync['max_ms'], sync['p95_ms']))

        # ---------------- slow motion ----------------
        s0 = await pg.evaluate("({...window.__bus.stats})")
        await pg.evaluate("window.__setSlow(true)")
        await pg.evaluate("void window.__rigs[0].states.fire('answer:correct')")
        await pg.wait_for_timeout(2500)
        s1 = await pg.evaluate("({...window.__bus.stats, rate: window.__slowRate})")
        await pg.evaluate("window.__setSlow(false)")
        await pg.wait_for_function("!window.__rigs[0].busy", timeout=30000)
        slow = {'measured_at': stamp, 'rate': s1['rate'], 'played_delta': s1['played'] - s0['played'], 'muted_delta': s1['muted'] - s0['muted'],
                'rule': 'rate < 0.5 -> cues muted (Foley at natural speed over slowed motion reads as detached); 0.5..1 -> envelopes stretch by 1/rate',
                'pass': s1['played'] - s0['played'] == 0 and s1['muted'] - s0['muted'] > 0}
        dump('sfx_slowmo.json', slow)
        print('slowmo', slow)

        # ---------------- mix (offline) ----------------
        mix = await pg.evaluate("""async () => {
          const { renderOffline } = await import('./engine/sound.js');
          const spec = await (await fetch('companions/owl.motion.json?v=k5')).json();
          const out = { cues: {}, overlap: null, duckDb: spec.sound.duckDb };
          for (const name of Object.keys(spec.sound.cues)) out.cues[name] = await renderOffline(spec.sound, [name]);
          out.overlap = await renderOffline(spec.sound, ['land', 'boing', 'chime', 'flap', 'takeoff'], { overlap: true });
          return out;
        }""")
        peaks = {k: v['peakDbfs'] for k, v in mix['cues'].items()}
        mixr = {'measured_at': stamp, 'method': 'OfflineAudioContext 48 kHz render through the same duck -> master -> compressor chain', 'ceiling_dbfs': -3,
                'per_cue_peak_dbfs': {k: round(v, 2) for k, v in peaks.items()},
                'per_cue_clipped': {k: v['clippedSamples'] for k, v in mix['cues'].items()},
                'overlap_5_cues': {'peak_dbfs': round(mix['overlap']['peakDbfs'], 2), 'clipped': mix['overlap']['clippedSamples'], 'rms_dbfs': round(mix['overlap']['rmsDbfs'], 2)},
                'duck_db': mix['duckDb'], 'duck_pass': abs(mix['duckDb']) >= 8,
                'pass': max(peaks.values()) <= -3 and mix['overlap']['peakDbfs'] <= -3 and all(v['clippedSamples'] == 0 for v in mix['cues'].values()) and mix['overlap']['clippedSamples'] == 0}
        dump('sfx_mix.json', mixr)
        print('mix loudest cue %.1f dBFS, overlap %.1f dBFS, clipped %d, pass %s' % (max(peaks.values()), mix['overlap']['peakDbfs'], mix['overlap']['clippedSamples'], mixr['pass']))

        # ---------------- polyphony with 5 owls ----------------
        await pg.goto(BASE + '&n=5', wait_until='networkidle')
        await pg.wait_for_function('window.__rigs && window.__rigs.length===5 && window.__foley')
        await pg.mouse.click(500, 620); await pg.wait_for_timeout(250)
        await pg.wait_for_function("window.__rigs.every(r => !r.busy)", timeout=15000)
        await pg.evaluate("""() => { window.__poly = { maxActive: 0, samples: 0 }; const tick = () => { const n = window.__bus.active.filter(v => v.end > window.__bus.ctx.currentTime).length; window.__poly.maxActive = Math.max(window.__poly.maxActive, n); window.__poly.samples++; if (window.__poly.samples < 900) requestAnimationFrame(tick); }; requestAnimationFrame(tick); }""")
        await pg.evaluate("window.__act('celebrate')")
        await pg.wait_for_timeout(1200)
        await pg.evaluate("window.__act('fly')")
        await pg.wait_for_timeout(300)
        await pg.wait_for_function("window.__rigs.every(r => !r.busy)", timeout=30000)
        await pg.wait_for_timeout(800)
        poly = await pg.evaluate("({...window.__poly, stats: window.__bus.stats, polyphony: window.__bus.spec.polyphony, gapMs: window.__bus.spec.sameCueGapMs, log: window.__bus.log.map(l => ({cue: l.cue, t: l.tAudio}))})")
        # same-cue gap check from the scheduled times
        gaps_ok, min_gap = True, None
        by = {}
        for l in poly['log']: by.setdefault(l['cue'], []).append(l['t'])
        for cue, ts in by.items():
            ts.sort()
            for a, c in zip(ts, ts[1:]):
                g = c - a; min_gap = g if min_gap is None else min(min_gap, g)
                if g < poly['gapMs'] - 1: gaps_ok = False
        polyr = {'measured_at': stamp, 'owls': 5, 'scene': 'celebrate x5 staggered 90 ms, then fly x5', 'max_concurrent_voices': poly['maxActive'], 'polyphony_cap': poly['polyphony'],
                 'stats': poly['stats'], 'same_cue_min_gap_ms': round(min_gap, 1) if min_gap is not None else None, 'same_cue_gap_rule_ms': poly['gapMs'],
                 'pass': poly['maxActive'] <= poly['polyphony'] and gaps_ok}
        dump('sfx_polyphony.json', polyr)
        print('polyphony max', poly['maxActive'], 'cap', poly['polyphony'], 'stats', poly['stats'], 'min gap', polyr['same_cue_min_gap_ms'], 'pass', polyr['pass'])
        print('console errors:', errors)
        await b.close()
    summary = {'measured_at': stamp, 'autoplay': autoplay['pass'], 'sync_target': sync['pass_target'], 'sync_cap': sync['pass_cap'], 'slowmo': slow['pass'], 'mix': mixr['pass'], 'polyphony': polyr['pass'], 'console_errors': errors}
    dump('sfx_summary.json', summary)
    print(json.dumps(summary))
    return 0 if all(v for k, v in summary.items() if k not in ('measured_at', 'console_errors', 'sync_target')) and not errors else 1

if __name__ == '__main__':
    raise SystemExit(asyncio.run(main()))
