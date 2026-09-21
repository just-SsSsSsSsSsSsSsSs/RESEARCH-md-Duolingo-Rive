# -*- coding: utf-8 -*-
"""حقن مقاطع الصوت base64 في تطبيق ازرع نبتة (tokens @A_...)."""
import os, subprocess, base64, sys

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(HERE, 'تطبيق_ازرع_نبتة_سليم.html')
SND2 = os.path.join(HERE, 'snd2')
SND = os.path.join(HERE, 'snd')

SOURCES = {
 '@A_WELCOME@':  (SND2, 'welcome'),
 '@A_STORY@':    (SND2, 'story'),
 '@A_TF1@':      (SND2, 'tf1'),
 '@A_TF2@':      (SND2, 'tf2'),
 '@A_TF3@':      (SND2, 'tf3'),
 '@A_COMPLETE@': (SND2, 'complete'),
 '@A_Q1@':       (SND2, 'q1'),
 '@A_Q2@':       (SND2, 'q2'),
 '@A_Q3@':       (SND2, 'q3'),
 '@A_PERSONAL@': (SND2, 'personal'),
 '@A_PRAISE@':   (SND, 'praise1'),   # إعادة استخدام مقطع عام من لعبة الرياضيات
 '@A_GENTLE@':   (SND, 'gentle1'),
}


def ff():
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def enc(folder, name):
    raw = os.path.join(folder, name + '.mp3')
    if not os.path.isfile(raw):
        sys.exit(f'missing: {raw}')
    out = os.path.join(folder, '~' + name + '.mp3')
    subprocess.run([ff(), '-y', '-i', raw, '-ar', '22050', '-ac', '1', '-b:a', '24k', out],
                   check=True, capture_output=True)
    with open(out, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode()
    os.remove(out)
    return 'data:audio/mp3;base64,' + b64


h = open(APP, encoding='utf-8').read()
for tok, (folder, name) in SOURCES.items():
    if h.count(tok) < 1:
        sys.exit(f'token missing in app: {tok}')
    h = h.replace(tok, enc(folder, name))
    print(f'  injected {tok} ← {name}.mp3')
assert '@A_' not in h, 'leftover tokens!'
open(APP, 'w', encoding='utf-8').write(h)
print(f'FINAL APP: {APP} ({os.path.getsize(APP)/1024:.0f} KB)')
