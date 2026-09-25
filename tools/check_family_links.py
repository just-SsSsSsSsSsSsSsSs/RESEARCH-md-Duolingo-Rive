#!/usr/bin/env python3
"""Family-charter link guard (Phase 17.5).

Reads the single source of truth app/content/family.json and verifies that EVERY mirror listed in `mirrors`
exists and contains EVERY url in `links`. Also verifies that no GitHub token / API key pattern leaked into
any mirror. Exit 0 = all copies intact; exit 1 = a copy is missing or lost a link (CI / pre-PR gate).

Usage:  python3 tools/check_family_links.py [--quiet]
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'app' / 'content' / 'family.json'
SECRET = re.compile(r'(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9\-]{20,})')

def main(quiet=False):
    fam = json.loads(SRC.read_text(encoding='utf-8'))
    urls = [l['url'] for l in fam['links']]
    problems = []
    for rel in fam['mirrors']:
        p = ROOT / rel
        if not p.exists():
            problems.append(f'{rel}: MISSING FILE'); continue
        txt = p.read_text(encoding='utf-8')
        lost = [u for u in urls if u not in txt]
        if lost: problems.append(f'{rel}: lost {len(lost)} link(s): ' + ', '.join(lost))
        if SECRET.search(txt): problems.append(f'{rel}: contains a secret-looking token')
        if not quiet and not lost: print(f'ok   {rel} ({len(urls)}/{len(urls)} links)')
    if problems:
        for x in problems: print('FAIL ' + x)
        print(f'\nFAMILY LINKS: FAIL ({len(problems)})'); return 1
    print(f'\nFAMILY LINKS: PASS - {len(fam["mirrors"])} mirrors x {len(urls)} links intact, no secrets'); return 0

if __name__ == '__main__':
    sys.exit(main('--quiet' in sys.argv))
