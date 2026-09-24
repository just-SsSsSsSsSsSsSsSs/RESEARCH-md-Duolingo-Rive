#!/usr/bin/env python3
"""Phase 16: turn a generated render on a white background into a cropped transparent PNG (flood fill from the
edges, so white highlights INSIDE the object survive). Usage: cut_3d_asset.py in.jpg out.png"""
import sys
from collections import deque
import numpy as np
from PIL import Image, ImageFilter

def cut(src, dst, thr=28):
    im = Image.open(src).convert('RGB'); a = np.asarray(im).astype(int); h, w, _ = a.shape
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
    out = im.convert('RGBA'); out.putalpha(al); out = out.crop(out.getbbox()); out.save(dst); return out.size

if __name__ == '__main__':
    print(cut(sys.argv[1], sys.argv[2]))
