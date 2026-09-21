#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Assemble the ~20-min memorization track + build the interactive tajweed page."""
import base64, json, os, re, subprocess, sys

ROOT = '/home/user/quran'
AUD = os.path.join(ROOT, 'audio')
PARTS = os.path.join(ROOT, 'parts')
os.makedirs(PARTS, exist_ok=True)

FF = subprocess.check_output(
    [sys.executable, '-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'],
    text=True).strip()
print('ffmpeg:', FF)

def dur(path):
    p = subprocess.run([FF, '-hide_banner', '-i', path], capture_output=True, text=True)
    m = re.search(r'Duration: (\d+):(\d+):([\d.]+)', p.stderr)
    h, mm, ss = int(m.group(1)), int(m.group(2)), float(m.group(3))
    return h * 3600 + mm * 60 + ss

# ---------------- durations ----------------
SEGS = ['s00', 'basml', 's01', 's02', 'a1', 'a2', 'a3', 'a4', 'a5a', 'a5b', 'a5', 'a6', 'a7', 'a8a', 'a8b', 'a8']
D = {s: dur(os.path.join(AUD, s + '.mp3')) for s in SEGS}
for s in SEGS:
    print(f'  {s}: {D[s]:.2f}s')

# ---------------- playlist ----------------
# ayah codes: 0=basmala/intro | 1..8 ayahs | -1 = talk (no highlight)
items = []  # dict(kind='sp'|'sil', name, d, a)

def sp(name, a):
    items.append(dict(kind='sp', name=name, d=D[name], a=a))

def sil(d, a):
    items.append(dict(kind='sil', name=f'sil_{d:.2f}', d=d, a=a))

aynums = [1, 2, 3, 4, 5, 6, 7, 8]

# 1) intro (s00 includes isti'adha + basmala + instructions)
sp('s00', 0)

# 2) listening round: a1..a8 with 0.8s gaps
for n in aynums:
    sp(f'a{n}', n)
    if n != 8:
        sil(0.8, n)

# 3) telqin signpost
sp('s01', -1)

# 4) telqin round
for n in aynums:
    if n == 5:
        for part in ('a5a', 'a5b'):
            sp(part, 5); sil(1.0, 5); sp(part, 5)
            sil(max(7.0, round(D[part] * 1.25, 1)), 5)
        sp('a5', 5)
        sil(max(8.0, round(D['a5'] * 1.0, 1)), 5)
    elif n == 8:
        for part in ('a8a', 'a8b'):
            sp(part, 8); sil(1.0, 8); sp(part, 8)
            sil(max(7.0, round(D[part] * 1.25, 1)), 8)
        sp('a8', 8)
        sil(max(8.0, round(D['a8'] * 0.9, 1)), 8)
    else:
        sp(f'a{n}', n); sil(1.0, n); sp(f'a{n}', n)
        sil(max(7.0, round(D[f'a{n}'] * 1.35, 1)), n)

# 5) review round (read along): a1..a8 with 3s gaps
for n in aynums:
    sp(f'a{n}', n)
    if n != 8:
        sil(3.0, n)

# 6) final signpost
sp('s02', -1)

# 7) final continuous runs -> fill to ~1200s
run_dur = D['basml'] + 1.0 + sum(D[f'a{n}'] for n in aynums) + 0.8 * 7
core_dur = sum(it['d'] for it in items)
best = None
for k in range(0, 13):
    total = core_dur + k * run_dur
    score = abs(1200 - total)
    if best is None or score < best[0]:
        best = (score, k, total)
k = best[1]
print(f'core={core_dur:.1f}s run={run_dur:.1f}s k={k} total={best[2]:.1f}s')

for r in range(k):
    sp('basml', 0); sil(1.0, 0)
    for n in aynums:
        sp(f'a{n}', n)
        if n != 8:
            sil(0.8, n)
    if r != k - 1:
        sil(2.0, 8)
sil(1.5, 8)

TOTAL = sum(it['d'] for it in items)
print(f'TOTAL ~ {TOTAL:.1f}s = {TOTAL/60:.2f} min | playlist items: {len(items)}')

# ---------------- silence files ----------------
sil_durs = sorted({round(it['d'], 2) for it in items if it['kind'] == 'sil'})
for sd in sil_durs:
    p = os.path.join(PARTS, f'sil_{sd:.2f}.mp3')
    if not os.path.exists(p):
        subprocess.run([FF, '-y', '-hide_banner', '-loglevel', 'error',
                        '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono',
                        '-t', f'{sd:.3f}', '-c:a', 'libmp3lame', '-b:a', '32k', p], check=True)
print('silences:', len(sil_durs))

# ---------------- concat + re-encode ----------------
lst = os.path.join(PARTS, 'list.txt')
with open(lst, 'w', encoding='utf-8') as f:
    for it in items:
        p = os.path.join(AUD, it['name'] + '.mp3') if it['kind'] == 'sp' \
            else os.path.join(PARTS, it['name'] + '.mp3')
        f.write(f"file '{p}'\n")

OUT = os.path.join(ROOT, 'تلقين_سورة_البينة.mp3')
subprocess.run([FF, '-y', '-hide_banner', '-loglevel', 'error',
                '-f', 'concat', '-safe', '0', '-i', lst,
                '-vn', '-c:a', 'libmp3lame', '-b:a', '24k', '-ar', '24000', '-ac', '1', OUT], check=True)
fdur = dur(OUT)
print(f'final: {OUT} ({fdur:.1f}s, {os.path.getsize(OUT)/1e6:.2f} MB)')

# ---------------- timeline ----------------
t = 0.0
TL = []
for it in items:
    TL.append({'s': round(t, 2), 'e': round(t + it['d'], 2), 'a': it['a']})
    t += it['d']
# stretch last end to real file duration
TL[-1]['e'] = round(fdur, 2)
FIRSTS = {}
for seg in TL:
    if seg['a'] >= 1 and seg['a'] not in FIRSTS:
        FIRSTS[seg['a']] = seg['s']
json.dump(TL, open(os.path.join(ROOT, 'timeline.json'), 'w'), ensure_ascii=False)

# ---------------- tajweed coloring ----------------
AYAHS_MARKED = [
    "لَمۡ يَكُنِ {s:ٱ}لَّذِ{m:ي}نَ كَفَرُ{m:و}{s:اْ} مِنۡ أَهۡلِ {s:ٱ}لۡكِتَٰ{m:ٰ}بِ وَ{s:ٱ}لۡمُشۡرِكِ{m:ي}نَ مُنفَكِّ{m:ي}نَ حَتَّ{m:ىٰ} تَأۡتِيَهُمُ {s:ٱ}لۡبَ{m:يِّ}نَةُ",
    "رَسُ{m:و}ل{g:ٞ} {g:مِّ}نَ {L:{s:ٱ}للَّهِ} يَتۡلُ{m:و}{s:اْ} صُحُف{g:ٗ}{s:ا} {g:مُّ}طَهَّرَةٗ",
    "فِيهَ{m:ا} كُتُب{g:ٞ} قَ{m:يِّ}مَةٞ",
    "وَمَا تَفَرَّقَ {s:ٱ}لَّذِ{m:ي}نَ أُ{m:و}تُ{m:و}{s:اْ} {s:ٱ}لۡكِتَٰ{m:ٰ}بَ إِلَّا مِ{q:نۢ} بَعۡدِ مَ{m:ا} جَ{m:آ}ءَتۡهُمُ {s:ٱ}لۡبَ{m:يِّ}نَةُ",
    "وَمَ{m:آ} أُمِرُ{m:و}{s:اْ} إِلَّا لِيَعۡبُدُ{m:و}{s:اْ} {L:{s:ٱ}للَّهَ} مُخۡلِصِ{m:ي}نَ لَهُ {s:ٱ}لدِّ{m:ي}نَ حُنَفَ{m:آ}ءَ وَيُقِ{m:ي}مُ{m:و}{s:اْ} {s:ٱ}لصَّلَ{m:وٰ}ةَ وَيُؤۡتُ{m:و}{s:اْ} {s:ٱ}لزَّكَ{m:وٰ}ةَۚ وَذَ{m:ٰ}لِكَ دِ{m:ي}نُ {s:ٱ}لۡقَ{m:يِّ}مَةِ",
    "إِ{g:نَّ} {s:ٱ}لَّذِ{m:ي}نَ كَفَرُ{m:و}{s:اْ} مِنۡ أَهۡلِ {s:ٱ}لۡكِتَٰ{m:ٰ}بِ وَ{s:ٱ}لۡمُشۡرِكِ{m:ي}نَ فِ{m:ي} نَ{m:ا}رِ جَهَ{g:نَّ}مَ خَ{m:ٰ}لِدِ{m:ي}نَ فِ{m:ي}هَ{m:آ}ۚ أُوْلَ{m:ٰٓ}ئِكَ هُمۡ شَرُّ {s:ٱ}لۡبَرِ{m:يِّ}ةِ",
    "إِ{g:نَّ} {s:ٱ}لَّذِ{m:ي}نَ ءَ{m:ا}مَنُ{m:و}{s:اْ} وَعَمِلُ{m:و}{s:اْ} {s:ٱ}لصَّ{m:ٰ}لِحَ{m:ٰ}تِ أُوْلَ{m:ٰٓ}ئِكَ هُمۡ خَيۡرُ {s:ٱ}لۡبَرِ{m:يِّ}ةِ",
    "جَزَ{m:آ}ؤُهُمۡ عِندَ {L:رَبِّهِمۡ} جَ{g:نَّ}{m:ٰ}تُ عَدۡ{g:نٖ} تَجۡرِي مِ{g:ن} تَحۡتِهَ{m:ا} {s:ٱ}لۡأَنۡهَ{m:ٰ}رُ خَ{m:ٰ}لِدِ{m:ي}نَ فِ{m:ي}هَ{m:آ} أَبَدٗاۖ رَّضِيَ {L:{s:ٱ}للَّهُ} عَنۡهُمۡ وَرَضُ{m:و}{s:اْ} عَنۡهُۚ ذَ{m:ٰ}لِكَ لِمَنۡ خَشِيَ {L:رَبَّهُۥ}",
]
BASMALA_MARKED = "بِسۡمِ {L:{s:ٱ}للَّهِ} {s:ٱ}لرَّحۡمَ{m:ٰ}نِ {s:ٱ}لرَّحِ{m:ي}مِ"

CLS = {'m': 'madd', 'g': 'ghn', 'q': 'iql', 's': 'sil', 'L': 'llah'}

def colorize(src):
    # repeatedly replace innermost {x:...}
    while True:
        m2 = re.search(r'\{([mgqsL]):([^{}]+)\}', src)
        if not m2:
            break
        src = src[:m2.start()] + f'<span class="{CLS[m2.group(1)]}">{m2.group(2)}</span>' + src[m2.end():]
    assert '{' not in src and '}' not in src
    return src

ARNUM = '٠١٢٣٤٥٦٧٨٩'
def arnum(n):
    return ''.join(ARNUM[int(c)] for c in str(n))

ayahs_html = []
for i, mk in enumerate(AYAHS_MARKED, start=1):
    ayahs_html.append(
        f'<span class="ayah" id="a{i}" data-a="{i}" title="اضغط للانتقال إلى تلاوة الآية {arnum(i)}">'
        + colorize(mk) + f'<span class="anum">{arnum(i)}</span></span> ')
AYAHS = '\n'.join(ayahs_html)
BASMALA = f'<span id="a0" data-a="0">' + colorize(BASMALA_MARKED) + '</span>'

# ---------------- font subset ----------------
sub = subprocess.run([sys.executable, '-m', 'fontTools.subset',
                      os.path.join(ROOT, 'AmiriQuran.ttf'),
                      '--flavor=woff2',
                      f'--output-file={ROOT}/amiri_uthmani.woff2',
                      '--unicodes=U+0020-002F,U+0030-0039,U+0600-06FF,U+0750-077F,U+08A0-08FF,U+0660-066F,U+0640,U+200C-200E,U+25CC',
                      '--layout-features=*',
                      '--no-hinting', '--desubroutinize'], capture_output=True, text=True)
print('subset rc:', sub.returncode, sub.stderr[-300:] if sub.returncode else '')
FONT_B64 = base64.b64encode(open(f'{ROOT}/amiri_uthmani.woff2', 'rb').read()).decode()
print('font woff2:', len(FONT_B64)//1024, 'KB (b64)')

AUDIO_B64 = base64.b64encode(open(OUT, 'rb').read()).decode()
print('audio b64:', len(AUDIO_B64)//1024, 'KB')

# ---------------- HTML ----------------
TPL = open(os.path.join(ROOT, 'template.html'), encoding='utf-8').read()
html = (TPL
        .replace('@FONTB64@', FONT_B64)
        .replace('@AUDIOB64@', AUDIO_B64)
        .replace('@TIMELINE@', json.dumps(TL))
        .replace('@FIRSTS@', json.dumps(FIRSTS))
        .replace('@AYAHS@', AYAHS)
        .replace('@BASMALA@', BASMALA)
        .replace('@TOTAL@', f'{fdur:.1f}'))
page = os.path.join(ROOT, 'سورة_البينة_مصحف_تفاعلي.html')
open(page, 'w', encoding='utf-8').write(html)
print('page:', page, f'({os.path.getsize(page)/1e6:.2f} MB)')
