#!/usr/bin/env python3
"""Phase 14 C2 - record the encouragement bank (app/content/cheers/bank.json) as whole-sentence clips.

Why whole sentences (not concatenated like the explain sheet): cheers are short, emotional and fixed; a joined
"عاش يا" + "سليم" loses the natural intonation. There are few of them, so size stays small (~10-20KB each).

Voice packs (multi-voice ready): every pack lives in its own folder with its own manifest:
    app/content/audio/cheers/<voiceKey>/<id>.mp3 + manifest.json { voice, lines: { id: { file, ms, text, hash } } }
A future voice = same bank, another --voice. `hash` (sha1 of the text) makes an edited line re-record itself.

Also extends the explain number clips to 73..100 (tools/explain_clips.json 'extraNumbers'), so the concatenative
explain pack keeps working if future activities go past the current 1..72.

Usage: python3 tools/build_cheers_audio.py [--voice shab_masri] [--workers 4]
"""
import hashlib, json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_explain_audio as B  # reuses tts(), encode(), duration_ms(), key()

ROOT = B.ROOT
VOICES = {
    # key -> Fish reference_id (tools/send_voice.py presets). Only packs actually generated are listed in the app.
    'shab_masri': {'name': 'شاب مصري حماسي', 'reference_id': '73b2c0703c6c4443949ae97092976ce9', 'model': 's2.1-pro-free'},
    'bent_masreya': {'name': 'بنت مصرية شاطرة', 'reference_id': '67d92ff016dc4a7ba755967c6fbaf1b7', 'model': 's2.1-pro-free'},
}


def sha(t): return hashlib.sha1(t.encode('utf-8')).hexdigest()[:12]


# what the voice says: `say` (fully diacritised sacred text) when present, else the displayed text
def spoken(l): return l.get('say') or l['text']


def main():
    a = sys.argv[1:]
    vkey = a[a.index('--voice') + 1] if '--voice' in a else 'shab_masri'
    workers = int(a[a.index('--workers') + 1]) if '--workers' in a else 4
    voice = VOICES[vkey]; B.VOICE = voice  # tts() reads B.VOICE
    bank = json.load(open(os.path.join(ROOT, 'app/content/cheers/bank.json'), encoding='utf-8'))
    out = os.path.join(ROOT, 'app/content/audio/cheers', vkey); os.makedirs(out, exist_ok=True)
    mpath = os.path.join(out, 'manifest.json')
    man = json.load(open(mpath, encoding='utf-8')) if os.path.exists(mpath) else {'lines': {}}
    api = B.key()
    todo = [l for l in bank['lines'] if man['lines'].get(l['id'], {}).get('hash') != sha(spoken(l)) or not os.path.exists(os.path.join(out, l['id'] + '.mp3'))]
    print(f'voice {vkey}: {len(bank["lines"])} lines, recording {len(todo)}', flush=True)

    def one(l):
        # speak the Prophet's name in full (the displayed text keeps it as written in the bank)
        B.encode(B.tts(spoken(l), api), os.path.join(out, l['id'] + '.mp3')); return l['id']
    with ThreadPoolExecutor(max_workers=workers) as ex:
        for i, _ in enumerate(ex.map(one, todo), 1):
            if i % 10 == 0: print(f'  {i}/{len(todo)}', flush=True)
    lines = {}
    for l in bank['lines']:
        f = os.path.join(out, l['id'] + '.mp3')
        if os.path.exists(f): lines[l['id']] = {'file': l['id'] + '.mp3', 'ms': B.duration_ms(f), 'hash': sha(spoken(l))}
    json.dump({'version': 1, 'voiceKey': vkey, 'voice': voice, 'lines': lines}, open(mpath, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    size = sum(os.path.getsize(os.path.join(out, v['file'])) for v in lines.values())
    print(json.dumps({'voice': vkey, 'lines': len(lines), 'of': len(bank['lines']), 'bytes': size, 'seconds': round(sum(v['ms'] for v in lines.values()) / 1000, 1)}))


if __name__ == '__main__':
    main()
