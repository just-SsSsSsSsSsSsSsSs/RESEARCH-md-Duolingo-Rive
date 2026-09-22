#!/usr/bin/env python3
"""Zero-Emoji policy audit (Phase 6). Scans app/ source (js/html/json/css) for any Unicode emoji / pictograph.
Exit 0 when count == 0. Usage: python3 app/tests/emoji_audit.py [--verbose]
"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
EMOJI = re.compile(
    '[\U0001F000-\U0001FAFF'   # pictographs, emoticons, transport, symbols, supplemental
    '\U00002600-\U000027BF'    # misc symbols + dingbats
    '\U00002B00-\U00002BFF'    # arrows/stars (⭐ ⬆)
    '\U00002300-\U000023FF'    # misc technical (⌚ ⏰)
    '\U00002190-\U000021FF'    # arrows (↗ etc.)
    '\U0000FE0F\U0000200D'     # VS16, ZWJ
    '\U0001F1E6-\U0001F1FF'    # regional indicators
    '\U00002194-\U00002199\U000021A9\U000021AA\U0000231A\U0000231B\U000024C2\U000025AA-\U000025FE\U00002934\U00002935\U00003030\U0000303D\U00003297\U00003299\U000000A9\U000000AE\U0000203C\U00002049\U00002122\U00002139]'
)
SKIP = {'tests'}
files = [p for p in ROOT.rglob('*') if p.suffix in ('.js', '.html', '.json', '.css') and not any(s in p.parts for s in SKIP)]
total = 0; per = {}
for f in files:
    txt = f.read_text(encoding='utf-8', errors='ignore')
    for i, line in enumerate(txt.splitlines(), 1):
        hits = EMOJI.findall(line)
        if hits:
            total += len(hits); per.setdefault(str(f.relative_to(ROOT.parent)), []).append((i, ''.join(hits), line.strip()[:90]))
verbose = '--verbose' in sys.argv
for f, rows in sorted(per.items(), key=lambda kv: -len(kv[1])):
    print(f'{len(rows):4}  {f}')
    if verbose:
        for i, h, l in rows: print(f'        L{i}: {h}  | {l}')
print(f'\nTOTAL EMOJI OCCURRENCES: {total}')
print('✅ ZERO-EMOJI POLICY PASSED' if total == 0 else '❌ ZERO-EMOJI POLICY FAILED')
sys.exit(0 if total == 0 else 1)
