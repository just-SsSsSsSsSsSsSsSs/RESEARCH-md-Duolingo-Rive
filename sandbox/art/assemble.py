#!/usr/bin/env python3
"""
sandbox/art/assemble.py - P2 step C3: build a rigged SVG from cut parts.

The output uses EXACTLY the same skeleton contract as the P1 rigs
(data-joint / data-pivot / data-mouth), so sandbox/rig.js animates it unchanged.
Parts are <image href="art/parts/<name>/<part>.webp"> placed in a 200x240 viewBox.
Placement is a small hand-tuned layout table per character (x, y, w; height keeps ratio).
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))

# layout: part -> (x, y, w)   in viewBox units; height derived from the part aspect
LAYOUT = {
  'owl': {
    'viewBox': '0 0 200 240', 'hover': '0',
    'shadow': (100, 228, 48, 7),
    'root_pivot': '100 220',
    'legs':   {'xyw': (63, 196, 74), 'pivot': '100 200'},
    'wingL':  {'xyw': (30, 116, 50), 'pivot': '64 122'},
    'wingR':  {'xyw': (120, 116, 50), 'pivot': '136 122'},
    'body':   {'xyw': (56, 118, 88), 'pivot': '100 210'},
    'head':   {'xyw': (44, 26, 112), 'pivot': '100 128'},
    'eyes':   {'xyw': (61, 66, 78), 'pivot': '100 85'},
    'lids':   {'xyw': (61, 66, 78), 'pivot': '100 68'},
    'mouth':  {'closed': 'beak_closed', 'open': 'beak_open', 'x': 100, 'y': 101, 'w_closed': 22, 'w_open': 24, 'pivot': '100 104'},
  },
}

def dims(name, part):
    m = json.load(open(os.path.join(HERE, 'parts', name, 'parts.json')))['parts'][part]
    return m['w'], m['h']

def img(name, part, x, y, w, extra=''):
    pw, ph = dims(name, part)
    h = w * ph / pw
    return f'<image href="art/parts/{name}/{part}.webp" x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" {extra}/>'

def build(name):
    L = LAYOUT[name]
    o = []
    o.append(f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="{L["viewBox"]}" class="rig rig-{name} rig-p2" data-companion="{name}" data-hover="{L["hover"]}" data-art="p2" aria-label="{name} companion rig (P2 layered art)">')
    o.append('  <defs><filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.4"/></filter></defs>')
    sx, sy, srx, sry = L['shadow']
    o.append(f'  <ellipse data-joint="shadow" data-pivot="{sx} {sy}" cx="{sx}" cy="{sy}" rx="{srx}" ry="{sry}" fill="#000" opacity="0.2" filter="url(#soft)"/>')
    o.append(f'  <g data-joint="root" data-pivot="{L["root_pivot"]}">')
    # draw order: legs, wings behind body, body, head, eyes, lids, mouth
    lg = L['legs']; x, y, w = lg['xyw']
    o.append(f'    <g data-joint="legL" data-pivot="{lg["pivot"]}">{img(name, "legs", x, y, w)}</g>')
    o.append(f'    <g data-joint="legR" data-pivot="{lg["pivot"]}"></g>')
    for side, part in (('armL', 'wingL'), ('armR', 'wingR')):
        p = L[part]; x, y, w = p['xyw']
        o.append(f'    <g data-joint="{side}" data-pivot="{p["pivot"]}">{img(name, part, x, y, w)}</g>')
    p = L['body']; x, y, w = p['xyw']
    o.append(f'    <g data-joint="body" data-pivot="{p["pivot"]}">{img(name, "body", x, y, w)}</g>')
    p = L['head']; x, y, w = p['xyw']
    o.append(f'    <g data-joint="head" data-pivot="{p["pivot"]}">')
    o.append(f'      {img(name, "head", x, y, w)}')
    e = L['eyes']; x, y, w = e['xyw']
    o.append(f'      <g data-joint="eyeL" data-pivot="{e["pivot"]}"><g data-joint="pupilL" data-pivot="{e["pivot"]}">{img(name, "eyes", x, y, w)}</g></g>')
    o.append(f'      <g data-joint="eyeR" data-pivot="{e["pivot"]}"><g data-joint="pupilR" data-pivot="{e["pivot"]}"></g></g>')
    l = L['lids']; x, y, w = l['xyw']
    o.append(f'      <g data-joint="lidL" data-pivot="{l["pivot"]}" style="transform: scaleY(0)">{img(name, "lids", x, y, w)}</g>')
    o.append(f'      <g data-joint="lidR" data-pivot="{l["pivot"]}" style="transform: scaleY(0)"></g>')
    m = L['mouth']
    def mouth(part, w, dy=0):
        pw, ph = dims(name, part); h = w * ph / pw
        return img(name, part, m['x'] - w / 2, m['y'] + dy, w)
    o.append(f'      <g data-joint="mouth" data-pivot="{m["pivot"]}">')
    o.append(f'        <g data-mouth="closed">{mouth(m["closed"], m["w_closed"])}</g>')
    o.append(f'        <g data-mouth="mid">{mouth(m["open"], m["w_open"] * 0.92)}</g>')
    o.append(f'        <g data-mouth="open">{mouth(m["open"], m["w_open"])}</g>')
    o.append(f'        <g data-mouth="smile">{mouth(m["closed"], m["w_closed"] * 1.08, -1)}</g>')
    o.append(f'        <g data-mouth="sad">{mouth(m["closed"], m["w_closed"] * 0.95, 2)}</g>')
    o.append('      </g>')
    o.append('    </g>')
    o.append('  </g>')
    o.append('</svg>')
    out = os.path.join(HERE, '..', 'companions', f'{name}_p2.svg')
    with open(out, 'w', encoding='utf-8') as f: f.write('\n'.join(o) + '\n')
    print('wrote', os.path.relpath(out, os.path.join(HERE, '..')), os.path.getsize(out), 'bytes')

if __name__ == '__main__':
    for n in (sys.argv[1:] or ['owl']): build(n)
