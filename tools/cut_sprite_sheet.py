#!/usr/bin/env python3
"""Phase 17 R2: split a generated character sprite sheet (N poses in one row on a white background) into
transparent WebP sprites, one per pose.

  python3 tools/cut_sprite_sheet.py sheet.png app/assets/companions/owl idle,think,happy,encourage,celebrate [--h 240]

Columns are found from the white gaps between figures (column-wise "non-white" projection). When two figures touch
(a wing tip reaching its neighbour) the widest run is split at its thinnest column until N figures are found.
Each figure is cut with the same edge flood fill as cut_3d_asset.py (white highlights inside the character
survive), trimmed, scaled to a common height and written as lossy WebP (q=82).
"""
import os, sys
from collections import deque
import numpy as np
from PIL import Image, ImageFilter

def columns(a, thr=30, min_gap=18, min_w=40):
    """[start, end) x-ranges of figures, split on runs of >= min_gap white columns."""
    nonwhite = ((255 - a).sum(2) > thr * 3).sum(0)
    xs = nonwhite > 0
    runs, x = [], 0
    while x < len(xs):
        if not xs[x]: x += 1; continue
        s = x
        while x < len(xs):
            if xs[x]: x += 1; continue
            g = x
            while g < len(xs) and not xs[g]: g += 1
            if g - x >= min_gap: break
            x = g
        runs.append((s, x))
    return [(s, e) for s, e in runs if e - s >= min_w], nonwhite

def cut(im, thr=28):
    a = np.asarray(im.convert('RGB')).astype(int); h, w, _ = a.shape
    white = (255 - a).sum(2); mask = np.zeros((h, w), bool); seen = np.zeros((h, w), bool); q = deque()
    for x in range(w): q.append((0, x)); q.append((h - 1, x))
    for y in range(h): q.append((y, 0)); q.append((y, w - 1))
    while q:
        y, x = q.popleft()
        if seen[y, x] or white[y, x] > thr * 3: continue
        seen[y, x] = True; mask[y, x] = True
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx]: q.append((ny, nx))
    al = Image.fromarray(np.where(mask, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    out = im.convert('RGBA'); out.putalpha(al); return out.crop(out.getbbox())

def main():
    src, outdir, names = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
    H = int(sys.argv[sys.argv.index('--h') + 1]) if '--h' in sys.argv else 240
    im = Image.open(src).convert('RGB'); a = np.asarray(im).astype(int)
    cols, nonwhite = columns(a)
    while len(cols) < len(names):  # touching figures -> split the widest run at its thinnest inner column
        i = max(range(len(cols)), key=lambda k: cols[k][1] - cols[k][0]); s0, e0 = cols[i]
        x = min(range(s0 + 60, e0 - 60), key=lambda x: nonwhite[x])
        cols[i:i + 1] = [(s0, x), (x, e0)]
    if len(cols) != len(names):
        raise SystemExit(f'found {len(cols)} figures {cols} but {len(names)} names given')
    os.makedirs(outdir, exist_ok=True)
    for (s, e), name in zip(cols, names):
        pad = 6; fig = im.crop((max(0, s - pad), 0, min(im.width, e + pad), im.height))
        framed = Image.new('RGB', (fig.width + 2, fig.height + 2), 'white'); framed.paste(fig, (1, 1))
        sp = cut(framed)
        sp = sp.resize((max(1, round(sp.width * H / sp.height)), H), Image.LANCZOS)
        dst = os.path.join(outdir, f'{name}.webp'); sp.save(dst, 'WEBP', quality=82, method=6)
        print(name, sp.size, os.path.getsize(dst))

if __name__ == '__main__':
    main()
