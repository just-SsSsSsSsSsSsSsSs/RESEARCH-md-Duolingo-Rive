#!/usr/bin/env python3
"""
sandbox/art/cut_parts.py - P2 art pipeline step C2 (Gate 5, isolated).

Input : an AI-generated 3x3 parts sheet on a chroma-green background
        (sandbox/art/src/<name>_sheet.png).
Output: sandbox/art/parts/<name>/<part>.webp (transparent, trimmed, lossless-ish)
        + sandbox/art/parts/<name>/parts.json (size + anchor of every part).

Pure local processing (Pillow + numpy already present); no external service.
Chroma key: green dominance with soft edge (alpha from distance to key colour)
plus spill suppression so edges do not glow green.
"""
import json, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))

# cell order (row-major) for the sheets generated in C1
LAYOUT = {
    'owl': ['head', 'body', 'wingL', 'wingR', 'eyes', 'lids', 'beak_closed', 'beak_open', 'legs'],
    'bee': ['head', 'body', 'wingL', 'wingR', 'eyes', 'lids', 'mouth_closed', 'mouth_open', 'legs'],
}


def key_colour(rgb):
    """median colour of the clearly-background pixels (robust key estimate)"""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mask = (g - np.maximum(r, b)) > 90
    if mask.sum() < 50: return np.array([0.0, 255.0, 0.0], dtype=np.float32)
    return np.median(rgb[mask], axis=0).astype(np.float32)


def chroma_alpha(rgb):
    """alpha 0..1 from green dominance with a soft ramp (anti-aliased edges)"""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    dom = g - np.maximum(r, b)
    a = 1.0 - np.clip((dom - 8.0) / 45.0, 0.0, 1.0)
    return a


def unmix(rgb, alpha, key):
    """Recover the true foreground colour on semi-transparent edge pixels.
    Each edge pixel is a blend  px = a*fg + (1-a)*key  ->  fg = (px - (1-a)*key) / a.
    This removes the dark/green rim that a plain despill leaves on feather tips."""
    a = np.clip(alpha, 0.06, 1.0)[..., None]
    fg = (rgb - (1.0 - a) * key) / a
    fg = np.where(alpha[..., None] < 1.0, fg, rgb)
    # residual spill guard: green never above the max of red/blue on edge pixels
    lim = np.maximum(fg[..., 0], fg[..., 2])
    fg[..., 1] = np.where(alpha < 1.0, np.minimum(fg[..., 1], lim + 6), fg[..., 1])
    return np.clip(fg, 0, 255)


def smooth_alpha(alpha):
    """tiny blur + slight erosion of the ramp so the silhouette reads as a soft painted edge"""
    from PIL import ImageFilter
    im = Image.fromarray((alpha * 255).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(0.7))
    a = np.asarray(im).astype(np.float32) / 255.0
    return np.clip((a - 0.10) / 0.90, 0.0, 1.0)


def despill(rgb, alpha):  # kept for backward compatibility of the module API
    return rgb


def trim(rgba, pad=4):
    a = rgba[..., 3]
    ys, xs = np.where(a > 8)
    if len(xs) == 0: return rgba, (0, 0)
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad + 1, rgba.shape[1])
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad + 1, rgba.shape[0])
    return rgba[y0:y1, x0:x1], (int(x0), int(y0))


def split_grid(img, rows=3, cols=3, gutter_frac=0.006):
    w, h = img.size
    cw, ch = w / cols, h / rows
    g = int(min(cw, ch) * gutter_frac) + 6   # skip the thin grey grid lines
    cells = []
    for r in range(rows):
        for c in range(cols):
            box = (int(c * cw) + g, int(r * ch) + g, int((c + 1) * cw) - g, int((r + 1) * ch) - g)
            cells.append(img.crop(box))
    return cells


def process(name, target_h=None):
    src = os.path.join(HERE, 'src', f'{name}_sheet.png')
    out_dir = os.path.join(HERE, 'parts', name)
    os.makedirs(out_dir, exist_ok=True)
    img = Image.open(src).convert('RGB')
    cells = split_grid(img)
    manifest = {'source': os.path.relpath(src, HERE), 'cell': [cells[0].size[0], cells[0].size[1]], 'parts': {}}
    total = 0
    for part, cell in zip(LAYOUT[name], cells):
        rgb = np.asarray(cell).astype(np.float32)
        key = key_colour(rgb)
        a = chroma_alpha(rgb)
        rgb = unmix(rgb, a, key)
        a = smooth_alpha(a)
        rgba = np.dstack([np.clip(rgb, 0, 255), a * 255.0]).astype(np.uint8)
        rgba, (ox, oy) = trim(rgba)
        im = Image.fromarray(rgba, 'RGBA')
        # downscale for the web budget: parts are authored at ~680 px per cell
        scale = 0.6
        im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.LANCZOS)
        path = os.path.join(out_dir, f'{part}.webp')
        im.save(path, 'WEBP', quality=88, method=6)
        size = os.path.getsize(path); total += size
        manifest['parts'][part] = {'file': f'{part}.webp', 'w': im.width, 'h': im.height,
                                   'cell_offset': [ox, oy], 'scale': scale, 'bytes': size}
        print(f'{name}/{part:12s} {im.width:4d}x{im.height:<4d} {size/1024:6.1f} KB')
    manifest['total_bytes'] = total
    with open(os.path.join(out_dir, 'parts.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)
    print(f'{name}: total {total/1024:.1f} KB in {len(manifest["parts"])} parts')


if __name__ == '__main__':
    names = sys.argv[1:] or [n for n in LAYOUT if os.path.exists(os.path.join(HERE, 'src', f'{n}_sheet.png'))]
    for n in names: process(n)
