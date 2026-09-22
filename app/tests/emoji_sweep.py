#!/usr/bin/env python3
"""One-shot codemod (Phase 6 P4): replace every emoji literal in app/js with icons3d calls.
- inside template literals  →  ${ico3d('name')}
- inside '...' / "..." strings →  ' + ico3d('name') + '   (string concatenation)
- bare / comments             →  removed
Adds `import { ico3d } from '.../icons3d.js'` where needed. Idempotent. Reports unmapped emoji.
"""
import re, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
src = (ROOT / 'js/ui/icons3d.js').read_text(encoding='utf-8')
blk = src[src.index('export const EMOJI_MAP'):src.index('const EMOJI_RE')]
MP = dict(re.findall(r"'([^'A-Za-z]+)': '([A-Za-z]+)'", blk))
GEN = re.compile('[\U0001F000-\U0001FAFF\U00002600-\U000027BF\U00002B00-\U00002BFF\U00002300-\U000023FF\u2190-\u21FF]\uFE0F?(?:\u200D[\U0001F000-\U0001FAFF\u2640\u2642]\uFE0F?)*|[\u2605\u2665\u2666\u2726\u2714\u2713\u2717\u2716]')
def name(e): return MP.get(e) or MP.get(e.replace('\ufe0f', '')) or MP.get(e + '\ufe0f')

def quote_ctx(line, i):
    q = None; j = 0
    while j < i:
        ch = line[j]
        if q is None and ch in "'\"`": q = ch
        elif q and ch == q and line[j - 1] != '\\': q = None
        j += 1
    return q

unmapped = set()
def convert(line):
    if not GEN.search(line): return line
    res = ''; pos = 0
    for m in GEN.finditer(line):
        e = m.group(0); n = name(e); q = quote_ctx(line, m.start())
        if not n and q: unmapped.add(e)
        if q == '`': rep = f"${{ico3d('{n}')}}" if n else ''
        elif q == "'": rep = f"' + ico3d('{n}') + '" if n else ''
        elif q == '"': rep = f'" + ico3d(\'{n}\') + "' if n else ''
        else: rep = ''
        res += line[pos:m.start()] + rep; pos = m.end()
    res += line[pos:]
    res = res.replace(" + ''", "").replace("'' + ", "").replace(' + ""', '').replace('"" + ', '')
    res = re.sub(r"'\s+\+ ico3d", "' + ico3d", res)
    return res

files = [p for p in (ROOT / 'js').rglob('*.js') if p.name not in ('icons3d.js', 'badgeArt.js')]
for p in files:
    s = p.read_text(encoding='utf-8'); lines = s.split('\n'); changed = False
    for i, l in enumerate(lines):
        nl = convert(l)
        if nl != l: lines[i] = nl; changed = True
    if not changed: continue
    s = '\n'.join(lines)
    if 'ico3d(' in s and 'icons3d.js' not in s:
        rel = '../icons3d.js' if '/ui/views/' in p.as_posix() else ('./icons3d.js' if '/ui/' in p.as_posix() else '../ui/icons3d.js')
        imps = [m.end() for m in re.finditer(r"^import .*?;[ \t]*$", s, re.M)]
        s = (s[:imps[-1]] + f"\nimport {{ ico3d }} from '{rel}';" + s[imps[-1]:]) if imps else f"import {{ ico3d }} from '{rel}';\n" + s
    p.write_text(s, encoding='utf-8'); print('swept', p.relative_to(ROOT.parent))
if unmapped: print('UNMAPPED:', ' '.join(sorted(unmapped))); sys.exit(1)
