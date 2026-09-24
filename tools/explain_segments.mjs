#!/usr/bin/env node
/**
 * Phase 13 P1 - enumerate every clip the explain sheet can ever need, straight from the REAL engines:
 *   app/content/activities/*.json (generator specs)  ->  generators.generate()  ->  explain.plan()  ->  segments.segment()
 * No ranges are copied here: each activity spec is run under the 3 difficulty levels (easy / normal / hard, as
 * generators.adapt()) with enough random draws to saturate its question space, and every seed-dependent
 * variant of plan() (THINGS x NAMES picks + step shuffles) is enumerated.
 *
 * Also covers the other fixed lines explainSheet.js speaks (wrong-step nudge) and the parent test sentence.
 *
 * Output: tools/explain_clips.json  { version, generatedAt, voice, fragments: {text: count}, numbers: [..],
 *                                     stats: {...} }
 * Usage:  node tools/explain_segments.mjs [--check]     (--check = exit 1 if the clip set changed vs the file)
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const { generate } = await import(url.pathToFileURL(path.join(ROOT, 'app/js/activities/generators.js')));
const { plan } = await import(url.pathToFileURL(path.join(ROOT, 'app/js/engines/explain.js')));
const { segment } = await import(url.pathToFileURL(path.join(ROOT, 'app/js/engines/voice/segments.js')));

// fixed lines spoken outside plan(): explainSheet wrong-step nudge (explainSheet.js "قريب! جرّب تاني.")
const src = fs.readFileSync(path.join(ROOT, 'app/js/ui/explainSheet.js'), 'utf8');
const FIXED = [...src.matchAll(/speak\('([^']+)'/g)].map((m) => m[1]);

const actDir = path.join(ROOT, 'app/content/activities');
const specs = [];
for (const f of fs.readdirSync(actDir).sort()) {
  const d = JSON.parse(fs.readFileSync(path.join(actDir, f), 'utf8'));
  if (Array.isArray(d.generator)) specs.push({ id: f.replace(/\.json$/, ''), gen: d.generator });
}

const LEVELS = [undefined, 'easy', 'hard'];
// 'pick' metas carry random good/bad lists (never repeat -> no saturation). explain.js pick() only SPEAKS `a` and
// `good[0] + 1`, and generators.js pick draws good = a * rnd(1, 10). Canonicalise to the spoken inputs and add
// every k = 1..10 explicitly, so the pick space is covered exactly instead of by luck.
const canon = (q) => (q.meta.kind === 'pick' ? { ...q, meta: { kind: 'pick', a: q.meta.a, good: [q.meta.good[0]] } } : q);
const pickAs = new Set();
// plan() text depends on seed only through pick(THINGS, seed) / pick(NAMES, seed + 1): both arrays have 6
// entries and are indexed by seed % 6, so seeds 0..5 produce every text variant (shuffleStable only reorders the
// step choice buttons, which are not spoken). Derived from explain.js, asserted below.
const SEEDS = 6;
const STABLE = 150;         // stop drawing an (activity, level) once 150 consecutive generate() calls add no new meta
const metas = new Map();    // key -> meta
for (const { gen } of specs) for (const lvl of LEVELS) {
  const profile = { settings: { difficulty: lvl } };
  for (let idle = 0; idle < STABLE;) { let added = false; for (const q of generate(gen, profile)) { if (!q.meta) continue; const cq = canon(q); const k = JSON.stringify(cq.meta); if (!metas.has(k)) { metas.set(k, cq); added = true; } } idle = added ? 0 : idle + 1; }
}

{ const src2 = fs.readFileSync(path.join(ROOT, 'app/js/engines/explain.js'), 'utf8');
  const body = (n) => (src2.match(new RegExp('const ' + n + ' = \\[([\\s\\S]*?)\\];')) || [, ''])[1];
  const nThings = (body('THINGS').match(/\{/g) || []).length, nNames = (body('NAMES').match(/'[^']+'/g) || []).length;
  if (nThings !== SEEDS || nNames !== SEEDS) { console.error('SEEDS assumption broken: THINGS', nThings, 'NAMES', nNames); process.exit(2); } }
for (const q of metas.values()) if (q.meta.kind === 'pick') pickAs.add(q.meta.a);
for (const a of pickAs) for (let k = 1; k <= 10; k++) { const meta = { kind: 'pick', a, good: [a * k] }; metas.set(JSON.stringify(meta), { meta }); }
const frags = new Map(); const nums = new Set(); let sentences = 0; const texts = new Set();
const take = (text) => { if (!text || texts.has(text)) return; texts.add(text); for (const s of segment(text)) { if (s.k.startsWith('n:')) nums.add(+s.k.slice(2)); else frags.set(s.k.slice(2), (frags.get(s.k.slice(2)) || 0) + 1); } };
for (const q of metas.values()) for (let seed = 0; seed < SEEDS; seed++) {
  const P = plan(q, seed);
  for (const id of P.strategies) { const S = P.get(id); take((S.lines || []).join(' ')); for (const st of S.steps || []) take(st.say); }
}
FIXED.forEach(take);
for (const t of texts) sentences += t.split(/(?<=[.!?؟…])\s+/).filter((x) => x.trim()).length;

const out = {
  version: 1,
  voice: { name: 'شاب مصري حماسي', reference_id: '73b2c0703c6c4443949ae97092976ce9', model: 's2.1-pro-free' },
  activities: specs.map((s) => s.id),
  fragments: Object.fromEntries([...frags.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
  numbers: [...nums].sort((a, b) => a - b),
  stats: { questionMetas: metas.size, distinctTexts: texts.size, sentences, fragments: frags.size, numbers: nums.size, fragmentWords: [...frags.keys()].reduce((n, f) => n + f.split(' ').length, 0) },
};
const file = path.join(ROOT, 'tools/explain_clips.json');
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { fragments: {}, numbers: [] };
  const missF = Object.keys(out.fragments).filter((f) => !(f in cur.fragments));
  const missN = out.numbers.filter((n) => !cur.numbers.includes(n));
  console.log(JSON.stringify({ ...out.stats, missingFragments: missF.length, missingNumbers: missN.length }));
  if (missF.length || missN.length) { console.log('NEW:', missF.slice(0, 10), missN.slice(0, 10)); process.exit(1); }
} else {
  fs.writeFileSync(file, JSON.stringify(out, null, 1) + '\n');
  console.log(JSON.stringify(out.stats));
}
