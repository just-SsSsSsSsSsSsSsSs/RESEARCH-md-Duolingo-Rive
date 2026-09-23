/**
 * ExplainSheet - the "يعني إيه يا بابا؟" bottom sheet (audio-first, big buttons, karaoke text).
 *
 * mount(card, { q, session }) -> adds the big button under the question card; returns cleanup
 * open({ q, session, onTry })  -> opens the sheet directly (button + tests); onTry runs on "هجرّب أحلّ" 
 *
 * Rules (spec):
 *  - audio plays automatically with the first explanation; replay button always visible
 *  - 4 different strategies; "لسه مش فاهم" gives a genuinely different one (rotation, no repeats)
 *  - the final answer is only revealed at the end of the interactive step-by-step flow
 *  - every request is logged (session.explained_with) for the insights engine
 *  - short texts, big font, Egyptian Arabic; the child never needs to read to progress
 */
import store from '../core/store.js';
import sound from '../engines/sound.js';
import speech from '../engines/speech.js';
import { plan } from '../engines/explain.js';
import { el, esc } from './components.js';
import { ico } from './icons.js';
import { ico3d } from './icons3d.js';

const AR = (n) => new Intl.NumberFormat('ar-EG').format(n);
let openSheet = null;

export function settings() { return { enabled: true, tts: true, rate: 0.9, autoplay: true, ...(store.profile?.settings?.explain || {}) }; }

/** which strategy has worked best for this child so far (from telemetry) */
export function bestStrategy() {
  const ev = store.profile?.events || []; const score = {};
  for (const e of ev) if (e.type === 'explanation_result') { score[e.strategy] = score[e.strategy] || { ok: 0, n: 0 }; score[e.strategy].n++; if (e.solved) score[e.strategy].ok++; }
  const ranked = Object.entries(score).filter(([, s]) => s.n >= 2).sort((a, b) => (b[1].ok / b[1].n) - (a[1].ok / a[1].n));
  return ranked[0]?.[0] || null;
}

export function mount(card, { q, session, onTry }) {
  if (!settings().enabled) return () => {};
  const btn = el(`<button type="button" class="btn explain-btn" data-act="explain" aria-label="يعني إيه يا بابا؟">${ico3d('speechBubble', 30)}<span>يعني إيه يا بابا؟</span>${ico3d('question', 24)}</button>`);
  btn.onclick = () => { sound.play('tap'); btn.classList.remove('pulse'); open({ q, session, onTry }); };
  card.appendChild(btn);
  return () => close();
}

export function close() { if (openSheet) { speech.stop(); openSheet.remove(); openSheet = null; document.body.classList.remove('has-sheet'); } }

export function open({ q, session, onTry }) {
  close();
  const P = plan(q); const order = P.order(bestStrategy()); let idx = 0, stepIdx = 0, lastText = '';
  // dir="rtl" is set explicitly: the sheet is appended to <body> and must not inherit an LTR context
  // (Phase 11 K2 - empirically the karaoke words scramble only when an ancestor is LTR).
  const sheet = el(`<div class="sheet explain-sheet" role="dialog" dir="rtl" aria-label="يعني إيه يا بابا؟">
    <div class="sheet-grab"></div>
    <div class="row between">
      <b class="row" style="gap:8px">${ico3d('speechBubble', 26)} يعني إيه يا بابا؟</b>
      <span class="small muted" data-strategy-label></span>
      <button type="button" class="btn btn-icon btn-ghost" data-act="close" aria-label="إغلاق">${ico('x')}</button>
    </div>
    <div class="explain-body" data-body></div>
    <div class="explain-actions">
      <button type="button" class="btn btn-lg btn-cyan" data-act="replay">${ico3d('replay', 22)} اسمع تاني</button>
      <button type="button" class="btn btn-lg btn-gold" data-act="another">${ico3d('refresh', 22)} لسه مش فاهم</button>
      <button type="button" class="btn btn-lg btn-primary" data-act="try">${ico3d('muscle', 22)} هجرّب أحلّ</button>
    </div>
    <div class="explain-dots" data-dots></div>
  </div>`);
  document.body.appendChild(sheet); document.body.classList.add('has-sheet'); openSheet = sheet;
  window.__explain = { strategy: () => order[idx], step: () => stepIdx, order, text: () => lastText }; // E2E hook (read-only)
  const body = sheet.querySelector('[data-body]'), label = sheet.querySelector('[data-strategy-label]'), dots = sheet.querySelector('[data-dots]');
  sheet.querySelector('[data-act="close"]').onclick = () => { sound.play('whoosh'); close(); };
  // Phase 11 K3: "هجرّب أحلّ" - after a miss the caller re-asks the same question empty via onTry
  sheet.querySelector('[data-act="try"]').onclick = () => { sound.play('whoosh'); close(); onTry?.(); };
  sheet.querySelector('[data-act="replay"]').onclick = () => { sound.play('tap'); if (lastText) speak(lastText, body.querySelector('[data-karaoke]')); };
  sheet.querySelector('[data-act="another"]').onclick = () => { sound.play('tap'); idx = (idx + 1) % order.length; stepIdx = 0; show(); };

  function speak(text, target) {
    lastText = text; const words = target ? [...target.querySelectorAll('.kw')] : [];
    speech.speak(text, { rate: settings().rate, onWord: (i) => { words.forEach((w, k) => { w.classList.toggle('now', k === i); w.classList.toggle('said', k < i); }); words[i]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); }, onEnd: () => words.forEach((w) => { w.classList.remove('now'); w.classList.add('said'); }) });
  }
  // Each sentence on its own line (easier for a 3rd grader to follow), each word an isolated bidi run.
  const karaoke = (text) => `<p class="k-text" data-karaoke dir="rtl">${text.split(/(?<=[.!?؟…])\s+/).filter(Boolean).map((sent) => `<span class="k-sent">${sent.split(/\s+/).filter(Boolean).map((w) => `<span class="kw">${esc(w)}</span>`).join(' ')}</span>`).join('')}</p>`;
  const say = (text) => { if (settings().autoplay) setTimeout(() => speak(text, body.querySelector('[data-karaoke]')), 120); else lastText = text; };

  function show() {
    speech.stop();
    const sid = order[idx]; const S = P.get(sid); session?.explained_with?.(sid);
    label.textContent = S.title;
    dots.innerHTML = order.map((id, k) => `<i class="${k === idx ? 'on' : ''}" title="${esc(P.get(id).title)}"></i>`).join('');
    if (sid === 'steps') return renderStep();
    const text = S.lines.join(' ');
    body.innerHTML = `<div class="explain-head">${ico3d(S.icon, 40)}<b>${esc(S.title)}</b></div>${karaoke(text)}`;
    say(text);
  }

  function renderStep() {
    const S = P.get('steps'); const st = S.steps[stepIdx]; if (!st) return;
    const isFinal = st.final !== undefined;
    body.innerHTML = `<div class="explain-head">${ico3d(S.icon, 40)}<b>${esc(S.title)} ${AR(stepIdx + 1)}/${AR(S.steps.length)}</b></div>${karaoke(st.say)}
      ${st.ask ? `<div class="step-ask">${esc(st.ask)}</div><div class="choices step-choices">${st.choices.map((c) => `<button type="button" class="choice" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
      ${isFinal ? `<div class="step-final">${ico3d('party', 28)} ${st.final !== '' ? `الإجابة: <b>${esc(String(st.final))}</b>` : 'يلا جرّب!'}</div>` : ''}`;
    say(st.say);
    body.querySelectorAll('.step-choices .choice').forEach((b) => {
      b.onclick = () => {
        const ok = b.dataset.c === st.answer; b.classList.add(ok ? 'correct' : 'wrong');
        if (ok) { sound.play('correct'); body.querySelectorAll('.step-choices .choice').forEach((x) => (x.disabled = true)); setTimeout(() => { stepIdx++; renderStep(); }, 650); }
        else { sound.play('wrong'); b.disabled = true; speak('قريب! جرّب تاني.', null); }
      };
    });
    if (isFinal) sheet.querySelector('[data-act="try"]').classList.add('pulse');
  }
  show();
  return sheet;
}

export default { mount, open, close, settings, bestStrategy };
