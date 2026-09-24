#!/usr/bin/env python3
"""Phase 13 P2 - record the explain-sheet clips with Fish Audio (build time only, never in the browser).

Pipeline per clip  (list = `node tools/explain_spoken.mjs`, keys/texts from the app's own phonetic layer):
  Fish TTS (tools/send_voice.py request format: api.fish.audio/v1/tts, model s2.1-pro-free, mp3)
  -> ffmpeg: trim leading/trailing silence, mono 24kHz, 32kbps MP3
  -> app/content/audio/explain/<file>        (resume: existing files are skipped)
  -> app/content/audio/explain/manifest.json { voice, clips: { key: { file, ms } } }

Key: FISH_API_KEY from .env (git-ignored). Voice: "شاب مصري حماسي" 73b2c0703c6c4443949ae97092976ce9 (send_voice.py:61).
Usage: python3 tools/build_explain_audio.py [--limit N] [--only-missing-manifest] [--workers 4]
"""
import json, os, subprocess, sys, time, urllib.request, urllib.error, tempfile
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'app/content/audio/explain')
VOICE = {'name': 'شاب مصري حماسي', 'reference_id': '73b2c0703c6c4443949ae97092976ce9', 'model': 's2.1-pro-free'}
# ffmpeg: strip silence at both ends (reverse trick), keep 40ms of air, loudness-normalise, 24kHz mono 32kbps
TRIM = ('silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04,areverse,'
        'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.06,areverse,loudnorm=I=-16:TP=-1.5')


def key():
    for p in (os.path.join(ROOT, '.env'),):
        if os.path.exists(p):
            for line in open(p, encoding='utf-8'):
                if line.startswith('FISH_API_KEY='): return line.split('=', 1)[1].strip()
    return os.environ.get('FISH_API_KEY', '')


def tts(text, api_key, tries=4):
    body = json.dumps({'text': text, 'reference_id': VOICE['reference_id'], 'format': 'mp3'}).encode()
    hdr = {'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json', 'model': VOICE['model'], 'User-Agent': 'Mozilla/5.0'}
    for i in range(tries):
        try:
            return urllib.request.urlopen(urllib.request.Request('https://api.fish.audio/v1/tts', data=body, headers=hdr), timeout=90).read()
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors='ignore')[:200]
            if e.code in (401, 402, 403): raise SystemExit(f'Fish HTTP {e.code}: {msg}')  # key/quota -> stop, do not burn retries
            time.sleep(2 * (i + 1))
        except Exception:
            time.sleep(2 * (i + 1))
    raise RuntimeError('TTS failed after retries: ' + text[:40])


def duration_ms(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True)
    return int(round(float(r.stdout.strip() or 0) * 1000))


def encode(raw, dst):
    with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as t: t.write(raw); src = t.name
    try:
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        tmp = dst + '.part.mp3'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', TRIM, '-ac', '1', '-ar', '24000', '-b:a', '32k', tmp], check=True)
        os.replace(tmp, dst)
    finally:
        os.unlink(src)


def main():
    args = sys.argv[1:]
    limit = int(args[args.index('--limit') + 1]) if '--limit' in args else None
    workers = int(args[args.index('--workers') + 1]) if '--workers' in args else 4
    items = json.loads(subprocess.run(['node', os.path.join(ROOT, 'tools/explain_spoken.mjs')], capture_output=True, text=True, check=True).stdout)
    mpath = os.path.join(OUT, 'manifest.json')
    man = json.load(open(mpath, encoding='utf-8')) if os.path.exists(mpath) else {'version': 1, 'voice': VOICE, 'clips': {}}
    todo = [x for x in items if not os.path.exists(os.path.join(OUT, x['file']))]
    if limit is not None: todo = todo[:limit]
    api_key = key()
    if todo and not api_key: raise SystemExit('FISH_API_KEY missing (.env)')
    print(f'clips {len(items)}  already {len(items) - len([x for x in items if not os.path.exists(os.path.join(OUT, x["file"]))])}  generating {len(todo)}', flush=True)

    def one(x):
        encode(tts(x['spoken'], api_key), os.path.join(OUT, x['file'])); return x['key']
    done = 0
    with ThreadPoolExecutor(max_workers=workers) as ex:
        for k in ex.map(one, todo):
            done += 1
            if done % 20 == 0: print(f'  {done}/{len(todo)}', flush=True)
    # manifest = every clip that exists on disk (durations re-measured, text kept for review)
    clips = {}
    for x in items:
        p = os.path.join(OUT, x['file'])
        if os.path.exists(p): clips[x['key']] = {'file': x['file'], 'ms': duration_ms(p), 'spoken': x['spoken']}
    man.update({'version': 1, 'voice': VOICE, 'clips': clips})
    json.dump(man, open(mpath, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    size = sum(os.path.getsize(os.path.join(OUT, c['file'])) for c in clips.values())
    print(json.dumps({'inManifest': len(clips), 'of': len(items), 'bytes': size, 'seconds': round(sum(c['ms'] for c in clips.values()) / 1000, 1)}))


if __name__ == '__main__':
    main()
