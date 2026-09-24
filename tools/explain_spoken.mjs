#!/usr/bin/env node
/**
 * Phase 13 P2 helper - spoken text for every clip, using the app's OWN Egyptian phonetic layer
 * (speech.js phonetic() / numWords()) so recordings say exactly what the TTS path would have said.
 * speech.js imports the browser store -> a minimal in-memory localStorage stub is installed first (build-time only).
 *
 * Output (stdout, JSON): [{ key, file, text, spoken }]
 *   key  'f:<fragment>' | 'n:<int>'     file 'f/<sha1-10>.mp3' | 'n/<int>.mp3'
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import crypto from 'node:crypto';

const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear() };
const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const { phonetic, numWords } = await import(url.pathToFileURL(path.join(ROOT, 'app/js/engines/speech.js')));

export const fileFor = (key) => (key.startsWith('n:') ? `n/${key.slice(2)}.mp3` : `f/${crypto.createHash('sha1').update(key.slice(2)).digest('hex').slice(0, 10)}.mp3`);

const clips = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/explain_clips.json'), 'utf8'));
const out = [];
for (const f of Object.keys(clips.fragments)) out.push({ key: 'f:' + f, file: fileFor('f:' + f), text: f, spoken: phonetic(f).replace(/\s+/g, ' ').trim() });
// Phase 14: numbers used by today's explanations (clips.numbers) + a reserved range up to 100 (extraNumbers) so
// future tables/addition up to 100 are already voiced. Deduplicated.
const allNums = [...new Set([...clips.numbers, ...(clips.extraNumbers || [])])].sort((x, y) => x - y);
for (const n of allNums) out.push({ key: 'n:' + n, file: fileFor('n:' + n), text: String(n), spoken: numWords(n) });
process.stdout.write(JSON.stringify(out));
