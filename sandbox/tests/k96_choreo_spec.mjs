/**
 * K9.6-2 unit test (owner decision a3e73842 + cf3d3a8a + 0b1f96bc, "carry the winner"): the routed
 * acting.performances.think is the v1 rig think() choreography as DATA.
 *
 *  1) the shipped spec validates; each choreo schema rule rejects a targeted mutation;
 *  2) data == v1 source: every animate() call inside rig.js think() is parsed from the SOURCE TEXT (keyframes,
 *     duration, delay, iterations, easing, composite, fill, keep) with its absolute start (0 at top level, 2600 inside
 *     the aha callback `this.later(() => { ... }, 2600)`), and must match one data channel exactly; every
 *     setMouth / blink / release in think() must match one data event at the same absolute time.
 *     This is V1_CHOREOGRAPHY.md section 4 checked at the data level; K9.6-4 checks it on live animations;
 *  3) the K9.5-2 record think_calm_k95 equals the block that shipped at 3a1fb25 (comment aside);
 *  4) triumph / puzzled / movingHold unchanged vs origin/main; oops_take_k94 == origin/main performances.oops (comment aside);
 *  6) K9.6-5: acting.performances.sad.choreo == rig.js sad() source (same parser, 10 channel rows incl. the per-side
 *     wing pairs S4L/S4R S7L/S7R, 6 events, reduced events form), recoil route text, oops route text.
 *  5) tiers carry no vfx (the whole story, no additions).
 *
 * validateActing is lifted as text from acting.js (browser-only imports), same method as k95_think_spec.mjs.
 * Run: node sandbox/tests/k96_choreo_spec.mjs
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); console.log((cond ? 'PASS ' : 'FAIL ') + msg); };
const sha16 = (s) => createHash('sha256').update(typeof s === 'string' ? s : JSON.stringify(s)).digest('hex').slice(0, 16);

const actingSrc = readFileSync(join(here, '../engine/acting.js'), 'utf8');
const rigSrc = readFileSync(join(here, '../rig.js'), 'utf8');
const owl = JSON.parse(readFileSync(join(here, '../companions/owl.motion.json'), 'utf8'));
const start = actingSrc.indexOf('export function validateActing(spec)');
const validateActing = new Function(`${actingSrc.slice(start + 'export '.length, actingSrc.indexOf('\n}\n', start) + 2)}; return validateActing;`)();

// ---- 1) shipped spec validates; schema rules reject mutations ------------------------------------------------------
const T = owl.acting.performances.think;
check(!!(T && T.choreo), 'routed acting.performances.think carries choreo');
const p0 = validateActing(owl);
check(p0.length === 0, `shipped spec validates (${p0.length}${p0.length ? ': ' + p0.join(' | ') : ''})`);
const mut = (fn) => { const s = JSON.parse(JSON.stringify(owl)); fn(s.acting.performances.think.choreo); return validateActing(s).filter((m) => m.includes('think.choreo')); };
check(mut((c) => { c.channels[0].joints = ['nose']; }).length === 1, 'rejects a joint that is not in the rig');
check(mut((c) => { c.channels[0].easing = 'bouncy'; }).length === 1, 'rejects an unknown easing name');
check(mut((c) => { c.channels[0].keyframes = [{ transform: 'rotate(0)' }]; }).length === 1, 'rejects a single-frame channel');
check(mut((c) => { c.channels[0].keyframes[1].offset = 1.5; }).length === 1, 'rejects a keyframe offset outside [0,1]');
check(mut((c) => { c.channels[0].ms = 0; }).length === 1, 'rejects ms 0');
check(mut((c) => { c.channels[3].iterations = 2.5; }).length === 1, 'rejects a non-integer iteration count');
check(mut((c) => { c.channels[0].composite = 'accumulate'; }).length === 1, 'rejects composite outside add|replace');
check(mut((c) => { c.channels[0].keep = false; }).length === 1, 'rejects fill forwards without keep (must be releasable)');
check(mut((c) => { c.channels[2].delayMs = -1; }).length === 1, 'rejects a negative delay');
check(mut((c) => { c.channels[7].ms = 2000; }).length === 1, 'rejects a channel that ends after totalMs');
check(mut((c) => { c.totalMs = 4500; c.events[c.events.length - 1].atMs = 4500; }).length === 1, 'rejects totalMs > 4000');
check(mut((c) => { [c.events[1], c.events[2]] = [c.events[2], c.events[1]]; }).length === 1, 'rejects unsorted events');
check(mut((c) => { c.events[0].blink = true; }).length === 1, 'rejects an event with two actions');
check(mut((c) => { c.events[0].mouth = 'grin'; }).length === 1, 'rejects an unknown mouth shape');
check(mut((c) => { c.events[3].release = ['tail']; }).length === 1, 'rejects a release of a joint not in the rig');
check(mut((c) => { c.events.pop(); }).length === 1, 'rejects a choreography that does not end with mouth closed at totalMs');
check(mut((c) => { c.reduced.closeAtMs = 9000; }).length === 1, 'rejects a reduced close time after totalMs');
check(mut((c) => { c.channels = []; }).length === 1, 'rejects an empty channel list');
// the choreo rules apply to any performance (K9.6-5 sad will use them)
const other = JSON.parse(JSON.stringify(owl)); other.acting.performances.oops = { choreo: { totalMs: 100, channels: [{ joints: ['nose'], keyframes: [{ transform: 'a' }, { transform: 'b' }], ms: 50, easing: 'soft' }], events: [{ atMs: 100, mouth: 'closed' }] } };
check(validateActing(other).some((m) => m.includes('performances.oops.choreo.channels[0].joints')), 'choreo rules apply to any performance carrying choreo (not only think)');

// ---- 2) data == v1 source (parsed from rig.js method text) ---------------------------------------------------------
// parseV1(method, callbackAt): the REDUCED line is excluded; statements inside the one `this.later(() => { ... }, callbackAt)`
// block get absolute time callbackAt (think: aha at 2600; sad: recovery at 1700); everything else is top level (0).
function parseV1(method, callbackAt) {
  const ti = rigSrc.indexOf(`\n  ${method}() {`), tj = rigSrc.indexOf('\n  }\n', ti);
  const src = rigSrc.slice(ti, tj);
  check(src.length > 500, `rig.js ${method}() located`);
  const reducedEnd = src.indexOf('return; }') + 'return; }'.length;
  const cbClose = src.indexOf(`}, ${callbackAt});`), cbOpen = src.lastIndexOf('this.later(() => {\n', cbClose);
  check(cbOpen > 0 && cbClose > cbOpen, `${method}(): callback block \`this.later(() => { ... }, ${callbackAt})\` located`);
  return { src, reducedEnd, baseTime: (idx) => (idx > cbOpen && idx < cbClose ? callbackAt : 0) };
}
const { src, reducedEnd, baseTime } = parseV1('think', 2600);
const norm = (t) => t.replace(/\s+/g, '');
const kfOf = (s) => [...s.matchAll(/\{\s*transform:\s*(?:'([^']+)'|`([^`]+)`)(?:,\s*offset:\s*([\d.]+))?\s*\}/g)].map((m) => ({ transform: norm(m[1] || m[2]), offset: m[3] !== undefined ? +m[3] : undefined }));   // '...' or `...` (sad wing rows use template literals)
const optsOf = (s) => ({
  ms: +(/duration:\s*(\d+)/.exec(s) || [])[1],
  delayMs: +((/delay:\s*(\d+)/.exec(s) || [, 0])[1]),
  iterations: +((/iterations:\s*(\d+)/.exec(s) || [, 1])[1]),
  easing: (/easing:\s*(?:EASE\.(\w+)|'(\w+)')/.exec(s) || []).slice(1).find(Boolean),
  composite: (/composite:\s*'(\w+)'/.exec(s) || [, 'replace'])[1],
  fill: (/fill:\s*'(\w+)'/.exec(s) || [, 'none'])[1],
});
// animate() call forms: this.anim(this.j('x'), ...) | this.anim(this.j(p), ...) inside ['pupilL','pupilR'].forEach(p => ...) |
// this.anim(root, ...) (sad: const root = this.j('root')) | this.anim(this.j(n), ...) inside [['armL', 1], ['armR', -1]].forEach(([n, s]) => ...)
// where `${95 * s}deg` expands per side (template literals resolved for s = +1 / -1).
const animRe = /this\.anim\((?:this\.j\((?:p|n|'(\w+)')\)|(root)),\s*(\[[\s\S]*?\]),\s*(\{[^{}]*\})(,\s*true)?\)/g;
const expand = (s, side) => s.replace(/\$\{(\d+) \* s\}/g, (_, n) => String(+n * side));
function callsOf(P) {
  const out = [];
  for (const m of P.src.matchAll(animRe)) {
    if (m.index < P.reducedEnd) continue;
    const base = { ...optsOf(m[4]), keep: !!m[5], at: P.baseTime(m.index) };
    if (m[1]) out.push({ joints: [m[1]], kf: kfOf(m[3]), ...base });
    else if (m[2]) out.push({ joints: ['root'], kf: kfOf(m[3]), ...base });
    else if (/\$\{\d+ \* s\}/.test(m[3])) for (const [n, side] of [['armL', 1], ['armR', -1]]) out.push({ joints: [n], kf: kfOf(expand(m[3], side)), ...base });
    else out.push({ joints: ['pupilL', 'pupilR'], kf: kfOf(m[3]), ...base });
  }
  return out;
}
const calls = callsOf({ src, reducedEnd, baseTime });
check(calls.length === 8, `rig.js think() has 8 animate() calls after the REDUCED line (parsed ${calls.length})`);
const chans = T.choreo.channels;
check(chans.length === 8, `data has 8 channels (${chans.length})`);
function matchChannels(calls, chans, label) {
  let matched = 0;
  for (const c of calls) {
    const hit = chans.find((ch) => ch.joints.join('|') === c.joints.join('|') && ch.ms === c.ms && (ch.delayMs || 0) === c.delayMs &&
      (ch.iterations || 1) === c.iterations && ch.easing === c.easing && (ch.composite || 'replace') === c.composite && (ch.fill || 'none') === c.fill &&
      !!ch.keep === c.keep && (ch.atMs || 0) === c.at && ch.keyframes.length === c.kf.length &&
      ch.keyframes.every((k, i) => norm(k.transform) === c.kf[i].transform && k.offset === c.kf[i].offset));
    check(!!hit, `${label} channel ${hit ? hit.id : '?'}: ${c.joints.join('+')} ${c.ms} ms x${c.iterations} ${c.easing} ${c.fill}${c.keep ? ' keep' : ''} starting at ${c.at + c.delayMs} ms == v1 source`);
    if (hit) matched++;
  }
  return matched;
}
check(matchChannels(calls, chans, 'think') === 8, 'all 8 v1 think channels matched by data');
// events: each setMouth / blink / release with its absolute time.
// forms in think(): `this.later(() => this.setMouth('x'), N);` (top level, time N); statements inside the aha callback
// (time 2600, or 2600 + N for `this.later(() => this.setMouth('smile'), 300)`); `this.later(() => { ...closed... }, 3500)`.
const evRe = /this\.(?:setMouth\('(\w+)'\)|blink\((true|false)\)|release\(\/\^\(([^)]+)\)\$\/\))/g;
function eventsOf(P) {
  const events = [];
  for (const m of P.src.matchAll(evRe)) {
    if (m.index < P.reducedEnd) continue;
    let at = P.baseTime(m.index);
    const lineStart = P.src.lastIndexOf('\n', m.index) + 1, lineEnd = P.src.indexOf('\n', m.index);
    const line = P.src.slice(lineStart, lineEnd);
    // a wrapping `this.later(() => <stmt>, N)` on the same line whose span contains the match
    for (const w of line.matchAll(/this\.later\(\(\) => (?:\{[^}]*\}|[^,]*?), (\d+)\)/g)) {
      const a = lineStart + w.index, b = a + w[0].length;
      if (m.index >= a && m.index < b) at += +w[1];
    }
    if (m[1]) events.push({ at, mouth: m[1] });
    else if (m[2]) events.push({ at, blink: m[2] === 'true' });
    else events.push({ at, release: m[3].split('|') });
  }
  return events;
}
const events = eventsOf({ src, reducedEnd, baseTime });
const E = T.choreo.events;
const same = (e, d) => d.atMs === e.at && (e.mouth ? d.mouth === e.mouth : e.blink !== undefined ? d.blink === e.blink : Array.isArray(d.release) && d.release.join('|') === e.release.join('|'));
for (const e of events) check(E.some((d) => same(e, d)), `event ${JSON.stringify(e)} present in data`);
check(events.length === E.length, `event count equal (source ${events.length}, data ${E.length})`);
check(T.choreo.totalMs === 3500, 'totalMs 3500 (rig.js: busy = false at 3500)');
const mouthSeq = E.filter((e) => e.mouth).map((e) => `${e.mouth}@${e.atMs}`).join(' ');
check(mouthSeq === 'mid@0 closed@900 mid@1500 open@2600 smile@2900 closed@3500', `mouth plate sequence == v1 (${mouthSeq})`);
check(T.choreo.reduced && T.choreo.reduced.mouth === 'mid' && T.choreo.reduced.blinkDouble === true && T.choreo.reduced.closeAtMs === 1400, 'reduced variant == rig.js REDUCED line (mid, blink(true), close at 1400)');

// ---- 3) the K9.5 record is preserved -------------------------------------------------------------------------------
const rec = owl.acting.performances.think_calm_k95;
check(!!rec && !rec.choreo, 'think_calm_k95 record present, un-routed (no choreo)');
const git = (cmd) => { try { return execSync(cmd, { cwd: here, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { return null; } };
const at3a = git('git show 3a1fb25:sandbox/companions/owl.motion.json');
if (at3a) { const strip = (o) => { const c = JSON.parse(JSON.stringify(o)); delete c.comment; return c; }; check(sha16(strip(rec)) === sha16(strip(JSON.parse(at3a).acting.performances.think)), 'think_calm_k95 == the K9.5-2 block at 3a1fb25 (comment aside)'); }
else console.log('SKIP think_calm_k95 vs 3a1fb25 (git history unavailable)');

// ---- 4) other performances unchanged vs origin/main ------------------------------------------------------------------
const mainTxt = git('git show origin/main:sandbox/companions/owl.motion.json');
const stripC = (o) => { const c = JSON.parse(JSON.stringify(o)); delete c.comment; return c; };
if (mainTxt) { const M = JSON.parse(mainTxt).acting.performances; for (const k of ['triumph', 'puzzled', 'movingHold']) check(sha16(owl.acting.performances[k]) === sha16(M[k]), `performances.${k} unchanged vs origin/main`);
  check(!owl.acting.performances.oops, 'performances.oops no longer routed (renamed to the oops_take_k94 record)');
  check(sha16(stripC(owl.acting.performances.oops_take_k94)) === sha16(stripC(M.oops)), 'oops_take_k94 == origin/main performances.oops (comment aside)'); }
else console.log('SKIP unchanged-vs-main (origin/main unavailable)');

// ---- 5) tiers add nothing ------------------------------------------------------------------------------------------
check(['small', 'medium', 'large'].every((t) => Array.isArray(T.tiers[t].vfx) && T.tiers[t].vfx.length === 0), 'tiers carry no vfx (the whole story, no additions)');

// ---- 6) K9.6-5: sad choreo == rig.js sad() ------------------------------------------------------------------------------
const Sd = owl.acting.performances.sad;
check(!!(Sd && Sd.choreo), 'acting.performances.sad carries choreo');
const PS = parseV1('sad', 1700);
const sadCalls = callsOf(PS);
check(sadCalls.length === 10, `rig.js sad() expands to 10 channel rows (8 animate() calls, wing pairs per side; parsed ${sadCalls.length})`);
check(Sd.choreo.channels.length === 10, `sad data has 10 channels (${Sd.choreo.channels.length})`);
check(matchChannels(sadCalls, Sd.choreo.channels, 'sad') === 10, 'all 10 v1 sad channel rows matched by data');
const sadEvents = eventsOf(PS);
for (const e of sadEvents) check(Sd.choreo.events.some((d) => same(e, d)), `sad event ${JSON.stringify(e)} present in data`);
check(sadEvents.length === Sd.choreo.events.length, `sad event count equal (source ${sadEvents.length}, data ${Sd.choreo.events.length})`);
check(Sd.choreo.totalMs === 2500, 'sad totalMs 2500 (rig.js: busy = false at 2500)');
const sadMouth = Sd.choreo.events.filter((e) => e.mouth).map((e) => `${e.mouth}@${e.atMs}`).join(' ');
check(sadMouth === 'open@0 sad@700 smile@1700 closed@2500', `sad mouth plate sequence == v1 (${sadMouth})`);
const SR = Sd.choreo.reduced;
check(SR && SR.mouth === 'sad' && SR.blinkDouble === undefined && SR.closeAtMs === 1600 && JSON.stringify(SR.events) === JSON.stringify([{ atMs: 900, mouth: 'smile' }, { atMs: 900, blink: true }]), 'sad reduced == rig.js REDUCED line (sad at 0; smile + blink(true) at 900; close at 1600)');
check(Sd.choreo.channels.filter((c) => c.easing === 'linear').map((c) => c.id).join() === 'S6', 'the one linear in sad is S6 (v1 pupil orbit), disclosed');
check(['small', 'medium', 'large'].every((t) => Array.isArray(Sd.tiers[t].vfx) && Sd.tiers[t].vfx.length === 0), 'sad tiers carry no vfx');
// reduced.events rules
const mutS = (fn) => { const s = JSON.parse(JSON.stringify(owl)); fn(s.acting.performances.sad.choreo); return validateActing(s).filter((m) => m.includes('sad.choreo')); };
check(mutS((c) => { c.reduced.events[0].atMs = 5000; }).length === 1, 'rejects a reduced event after closeAtMs');
check(mutS((c) => { c.reduced.events[0].blink = true; }).length === 1, 'rejects a reduced event with two actions');
check(mutS((c) => { c.reduced.events[0].mouth = 'grin'; }).length === 1, 'rejects a reduced event with an unknown mouth');
check(mutS((c) => { c.reduced.events = [{ atMs: 100, release: ['head'] }]; }).length === 1, 'rejects a reduced event that is not face-only (release)');
// routes (source text): CLIPS.body.recoil -> perform('sad') when choreo present; P.oops -> perform('sad') first; P.ponder -> perform('think')
const statesSrc = readFileSync(join(here, '../engine/states.js'), 'utf8');
check(/recoil:[\s\S]*?rig\.perfSpec\('sad'\)\.choreo\)\s*\?\s*rig\.perform\('sad'/.test(statesSrc), "CLIPS.body.recoil routes to rig.perform('sad') when performances.sad.choreo exists");
check(/recoil:[\s\S]*?:\s*rig\.sad\(\)/.test(statesSrc), 'recoil still falls back to the legacy sad()');
check(/P\.oops = function[\s\S]*?if \(S && S\.choreo\) return this\.perform\('sad', tier\)/.test(actingSrc), "P.oops defers to perform('sad') when the choreo exists (kit/reel callers)");
check(/P\.ponder = function[\s\S]*?if \(K\.choreo\) return this\.perform\('think', tier\)/.test(actingSrc), "P.ponder defers to perform('think') when the choreo exists");
check(!!owl.acting.performances.oops_take_k94 && !owl.acting.performances.oops_take_k94.choreo, 'oops_take_k94 record present, un-routed (no choreo)');

console.log(fails.length ? `K96 CHOREO SPEC FAIL (${fails.length})` : 'K96 CHOREO SPEC PASS');
process.exit(fails.length ? 1 : 0);
