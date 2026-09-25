## Phase 17.5 - Family Charter: permanent family links in multiple files + on the site, self-verifying - v7.21

**Owner ask:** keep the family gist link permanently, in more than one GitHub file, clearly, professionally, on the site too.

### Design: self-verifying redundancy
- **Single source:** `app/content/family.json` (links, heroes, 8 principles, phases roadmap).
- **Six mirrors:** `FAMILY_CHARTER.md` (owner's verbatim transcript + organized vision), `.agents/memory/CHANGELOG_DECISIONS.md` (decision log), `docs/PHASES_HISTORY.md` (the README phase log 9-17 removed by e50b5c9, restored verbatim), `README.md` (links table right under the title), `genspark_ai_developer/RESUME.md`, and the site itself.
- **Guard:** `tools/check_family_links.py` exits 1 if any mirror is missing, lost a link, or contains a token-looking string.
- **In-app page `#/charter`** (profile -> settings): link cards (new tab + copy), a LIVE fetch of every mirror with a per-file `4/4` status, principles, roadmap. `.nojekyll` added so Pages serves `.agents/`.
- **Security:** no secrets anywhere in the repo; the token that appeared in a public gist should be revoked.

### Tests
- New `app/tests/phase17_5_charter.py` - 30 checks PASS (incl. proving the guard fails on a tampered copy).
- cachebust / emoji_audit / svg_leak / phase17_companions PASS standalone; remaining suites: per-suite log in `genspark_ai_developer/PROGRESS.md`.
- Protected files equal HEAD; Zero-Emoji clean; K3 untouched.

### Screenshot
In-app charter page: https://www.genspark.ai/api/files/s/rlnHbR6O
