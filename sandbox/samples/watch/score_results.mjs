// node sandbox/samples/watch/score_results.mjs [--note "text"]
// Scores every rater block in results/*.json against the CURRENT manifest.json with score_core.js and writes
// results/SCORE.generated.json. The verdict is never typed by hand: this file is the only writer (K9.5-4 makes the
// previously ad-hoc regeneration a committed, repeatable tool). Files whose name contains DUPLICATE are excluded and
// listed under `excluded`; blocks from earlier kits are REJECTED by validateBlock (kit / seed / order mismatch) and
// listed under blocks_rejected with the reason - they are never pooled with the current kit.
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const G12 = require(path.join(here, 'score_core.js'));
const M = JSON.parse(readFileSync(path.join(here, 'manifest.json'), 'utf8'));
const dir = path.join(here, 'results');
const noteIdx = process.argv.indexOf('--note');
const note = noteIdx >= 0 ? process.argv[noteIdx + 1] : undefined;

const all = readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'SCORE.generated.json').sort();
const files = all.filter(f => !/DUPLICATE/.test(f));
const excluded = all.filter(f => /DUPLICATE/.test(f)).map(f => f + ' (duplicate session, not independent; owner confirmed)');
const blocks = files.map(f => { const b = JSON.parse(readFileSync(path.join(dir, f), 'utf8')); return { ...b, _file: f }; });
const r = G12.score(blocks, M);
r.blocks_rejected = r.blocks_rejected.map(x => ({ file: blocks[x.index]._file, why: x.why }));
const out = { ...r, kit_version: M.kit_version, scored_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'), files, excluded };
if (note) out.note = note;
writeFileSync(path.join(dir, 'SCORE.generated.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`G12 kit v${M.kit_version} (${M.generated_at}): ${out.verdict} - ${out.reason}; accepted ${out.blocks_accepted}, rejected ${out.blocks_rejected.length}, excluded ${excluded.length}`);
