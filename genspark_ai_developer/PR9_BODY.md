# Phase 11 — Golden Rule, full audit, RTL fix, mistake-learning loop, zero-KB Egyptian voice

Source directive: gist `pijsal1-tech/87412e328265fbf4cd028888225e43bf` (file `edge-tts..tt.md`). Per the user: **no blind acceptance** of the gist's canned solutions; every claim verified in code/DOM, every voice option researched by actually following links.

## K0 — RULES.md (constitution)
Zero blind acceptance, zero guesswork, warm pedagogy for a 3rd grader, hard engineering constraints (no per-question audio files, protected originals untouched, append-only README, push-per-chunk).

## K1 — Evidence-based audit (`genspark_ai_developer/AUDIT_REPORT.md`)
Static sweep (href/src/import/url()/catalog JSON) + live Chromium sweep with HTTP>=400 capture on portal, 4 classic pages, `app/` routes and classic<->modern compare iframes. Result: **0 fixable 404s**. Only real 404: a podcast MP3 referenced by the protected `math.html` that was never committed (documented, out of scope).

## K2 — RTL karaoke scramble (verified, then fixed)
- Gist claim ("inline-block + digits") did **not** reproduce under `<html dir=rtl>` (18 samples MATCH).
- Forcing an LTR ancestor reproduced the exact field symptom (`٣ فيه واحد كل كراتين عندك`) -> root cause is inherited direction of the body-appended sheet.
- Fix: `dir="rtl"` on sheet + `.k-text`, `direction:rtl; unicode-bidi:isolate` on `.k-text/.k-sent/.kw`, one sentence per line. No `!important`.
- Test `phase11_rtl.py`: visual order (getBoundingClientRect) == logical order under rtl **and** forced ltr hosts.

## K3 — Mistake learning loop (`session.js`, `play.js`, `renderers.js`, `explainSheet.js`)
- First miss: **no answer reveal** (renderers gated by `ctx.reveal()` incl. numpad's old "الصحيح N"), soft shake, "قريب يا بطل! فكّر تاني", pulsing explain button, heart taken once.
- "جرّب تاني" / explain sheet "هجرّب أحلّ" re-ask the **same** question empty.
- Second-try success -> "اتعلمت من الغلط وحليتها صح بنفسك" + confetti; second miss -> normal feedback with explanation.
- Score counts recovered answers; `perfect` requires first-try everywhere; telemetry `question_retry`, `retried` flag, `review_completed`.
- Results offer **"تحدي أبطال الماث (N)"**: review round of first-try misses (practice: no hearts, +2 XP/fixed).
- Test `phase11_mistake.py`: 24 DOM checks. Existing e2e/math_random unaffected (they answer correctly).

## K4 — Voice: research then zero-KB implementation (`workspace--RESEARCH/RESEARCH.md`)
- **edge-tts**: rejected with protocol evidence (`constants.py`/`drm.py`: forged `Origin: chrome-extension://…` + `Sec-MS-GEC` SHA-256 token) -> impossible from a static GitHub Pages site without a relay server. Endpoint does list `ar-EG-SalmaNeural`/`ShakirNeural`.
- **Piper in-browser**: only Arabic model `ar_JO/kareem/medium` = **63,201,294 bytes**, Jordanian MSA -> rejected.
- **Pre-generated MP3s**: forbidden by directive.
- **Implemented (0 new bytes of assets)** in `speech.js`: quality-ranked voice selection (Natural/Online/Google/Android/Apple > Hoda; ar-EG first; parent gender/voice preference), Egyptian phonetic layer for the *spoken* text only (digits -> "تلاتة/اتناشر/أربعة وعشرين", MSA -> Egyptian, `× = +` -> words; Arabic-aware word boundaries since JS `\b` fails on Arabic — verified), one utterance per sentence, rate 0.95 for natural voices. Parent panel: voice picker + "اسمع تجربة" + availability hint.
- Test `phase11_voice.py`: 19 checks (phonetic table, ranking with realistic voice names, karaoke fallback, utterance spy, parent picker).

## K5 — README (append-only) + version
New section "سجل المراحل 9-11", v7.8 (importmap cache-bust).

## Verification
16 suites PASS: emoji_audit, svg_leak, cachebust, e2e, layering, math_random, viewports, navoverlap, quran_reader, plant_story, phase10, phase10_celebration, phase10_insights, phase11_rtl, phase11_mistake, phase11_voice.
Protected originals sha256 unchanged: plant.html fb197ed2…, albayyinah.html aac6bafb…, math.html 694859aa…, quran-alqadr/index.html 52758e3f….
