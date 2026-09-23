/**
 * MistakeLoop - the shared "learn from the mistake" flow (Phase 11 for math, Phase 12 L4 for every view).
 *
 * Owner decision (gist 3f69e14a): on the first miss the child gets a second try; the correct answer is NEVER
 * revealed, only the *position* of the mistake is highlighted (renderers already mark the tapped choice / the
 * misplaced chip with `.wrong`; `ctx.reveal()` keeps the correct one hidden while a retry is still available).
 *
 * Usage in a view:
 *   const loop = mistakeLoop({ session, card, q, ask: () => ask(session) });
 *   ctx.reveal = loop.reveal;                      // renderers ask before showing the right answer
 *   if (loop.onWrong(meta)) return;                // first miss -> retry prompt shown, nothing scored yet
 *   ...normal scoring path (session.answer)...
 *   explainSheet.mount(card, { q, session, onTry: loop.onTry });
 * Returns { reveal(), onWrong(meta) -> handled, onTry(), wasRetry }.
 */
import sound from '../engines/sound.js';
import fx from '../engines/fx.js';
import { el } from './components.js';
import { ico3d } from './icons3d.js';

export const RETRY = ['قريب يا بطل! فكّر تاني ' + ico3d('muscle'), 'لسه فيه فرصة! بصّ كويس وجرّب تاني ' + ico3d('eye'), 'مش مشكلة، الأبطال بيجرّبوا تاني ' + ico3d('hero')];
export const RECOVERED = ['اتعلمت من الغلط وحليتها صح بنفسك! ' + ico3d('trophy'), 'شاطر! المرة التانية طلعت صح ' + ico3d('star'), 'ده اللي الأبطال بيعملوه: غلطت، فهمت، وحليت ' + ico3d('hero')];
const pickOne = (a) => a[Math.floor(Math.random() * a.length)];

/** the retry bar: soft shake, warm nudge (no answer), pulsing explain button, "جرّب تاني" re-asks the same question */
export function retryPrompt({ card, onRetry, hint }) {
  document.querySelector('.feedback')?.remove();
  card.classList.add('shake-soft');
  card.querySelector('.explain-btn')?.classList.add('pulse');
  const f = el(`<div class="feedback retry" data-retry>
    <div class="container row">
      <div class="grow"><div class="f-title">${pickOne(RETRY)}</div>
        <div class="f-exp">${hint || 'مش هقولك الجواب دلوقتي… لو محتاج مساعدة اضغط «يعني إيه يا بابا؟»'}</div></div>
      <button type="button" class="btn btn-gold btn-lg" data-act="retry">${ico3d('muscle', 20)} جرّب تاني</button>
    </div></div>`);
  document.body.appendChild(f); document.body.classList.add('has-feedback');
  const hide = () => { f.remove(); document.body.classList.remove('has-feedback'); };
  f.querySelector('[data-act="retry"]').onclick = () => { sound.play('whoosh'); hide(); onRetry(); };
  card.querySelector('.explain-btn')?.addEventListener('click', hide, { once: true });
  return hide;
}

export function mistakeLoop({ session: s, card, q, ask, point, hint, practiceHearts = false }) {
  const wasRetry = s.isRetry;
  let answered = false;
  return {
    wasRetry,
    /** renderers may show the right answer only when no retry is left */
    reveal: () => s.isRetry || s.review || (!s.practice && !practiceHearts && s.outOfHearts),
    /** call on a wrong answer BEFORE scoring. Returns true when the miss was absorbed by a retry (caller must return). */
    onWrong(meta = {}) {
      answered = true;
      if (s.isRetry || s.review) return false;          // second miss / review round -> score normally
      const stop = s.retry(meta);                        // heart once, question marked missed, telemetry
      sound.play('wrong'); fx.encourage({ ...(point?.() || {}), el: card });
      if (stop) return false;                            // out of hearts -> caller records the answer and finishes
      retryPrompt({ card, hint, onRetry: ask });
      return true;
    },
    /** explain sheet "هجرّب أحلّ": after a miss, re-ask the same question empty */
    onTry() { if (s.isRetry && !s.ended && s.current === q && !document.querySelector('.feedback.good, .feedback.bad')) ask(); },
    /** title for the feedback bar */
    title(ok, cheers, oops) { return ok ? (wasRetry ? pickOne(RECOVERED) : pickOne(cheers)) : pickOne(oops); },
    /** should q.explain be shown in the feedback bar? never on a correct answer (no spoiler), yes after the final miss */
    showExplain(ok) { return !ok; },
    get answered() { return answered; },
  };
}
export default mistakeLoop;
