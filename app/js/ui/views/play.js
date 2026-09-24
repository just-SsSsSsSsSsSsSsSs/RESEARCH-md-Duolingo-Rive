/**
 * Play view — runs a Session for an activity id.
 */
import store from '../../core/store.js';
import registry from '../../core/registry.js';
import router from '../../core/router.js';
import sound from '../../engines/sound.js';
import explainSheet from '../explainSheet.js';
import cheers from '../../engines/voice/cheers.js'; // Phase 14: spoken sibling / birr / dhikr encouragement
import questionVoice from '../../engines/voice/questionVoice.js'; // Phase 15.1: the math question is read aloud
import voice from '../../engines/voice/provider.js';
import groupsBar from '../groupsBar.js'; // Phase 15.2: a x b as a trays of b identical cubes
import mascot from '../../engines/companion.js'; // Phase 17: companion cast (monkey/owl/cat...) - same mount/mood API as mascot.js
import { targetedPractice, adaptive } from '../../engines/insights.js';
import hearts from '../../engines/hearts.js';
import Session from '../../activities/session.js';
import renderers from '../../activities/renderers.js';
import { badgeSVG } from '../badgeArt.js';
import { el, esc, fmt, hud, modal, confetti, toast } from '../components.js';
import { ico } from '../icons.js';
import { crown } from './subject.js';
import fx from '../../engines/fx.js';
import { ico3d } from '../icons3d.js';

const CHEERS = ['ممتاز! ' + ico3d('star'), 'برافو! ' + ico3d('clap'), 'عبقري! ' + ico3d('brain'), 'رهيب! ' + ico3d('rocket'), 'صح ١٠٠٪ ' + ico3d('hundred'), 'أنت بطل! ' + ico3d('hero'), 'استمر هكذا! ' + ico3d('flame')];
// Phase 11 K3 - mistake learning loop copy (warm Egyptian; the answer is never revealed on the first miss)
const RETRY = ['قريب يا بطل! فكّر تاني ' + ico3d('muscle'), 'لسه فيه فرصة! بصّ كويس وجرّب تاني ' + ico3d('eye'), 'مش مشكلة، الأبطال بيجرّبوا تاني ' + ico3d('hero')];
const RECOVERED = ['اتعلمت من الغلط وحليتها صح بنفسك! ' + ico3d('trophy'), 'شاطر! المرة التانية طلعت صح ' + ico3d('star'), 'ده اللي الأبطال بيعملوه: غلطت، فهمت، وحليت ' + ico3d('hero')];
const OOPS = ['مش مشكلة، نتعلم من الخطأ ' + ico3d('muscle'), 'قريب جداً! ' + ico3d('pinch'), 'حاول تركّز في المرة الجاية ' + ico3d('target'), 'كل بطل يغلط ويكمّل ' + ico3d('seedling')];

export async function render(root, { id }) {
  const virtual = id === 'targeted_practice' ? targetedPractice(store.profile) : null; // Phase 10: adaptive practice built from the child's weakest skills
  const it = virtual || registry.item(id);
  if (!it) throw Object.assign(new Error(virtual === null && id === 'targeted_practice' ? 'لسه مفيش بيانات كافية للتدريب المخصص — العب شوية أنشطة الأول' : 'نشاط غير موجود'), { friendly: true });
  if (it.type === 'story') { const Story = await import('./story.js'); return Story.render(root, { id }); } // Phase 7: story mode
  if (it.type === 'quran') { const R = await import('./quranReader.js'); return R.render(root, { id }); } // Phase 9: mushaf reader
  const activity = virtual || await registry.loadActivity(id);
  const adapt = adaptive(store.profile); // { delayMs, breakAfterMin, preferStrategy }
  window.__adaptive = adapt; // E2E hook (read-only)
  const h = hud({ back: true, title: it.title });
  root.appendChild(h);
  const stage = el('<div class="stage"></div>');
  root.appendChild(stage);
  let cleanups = [];
  window.__bubbles?.setFocus?.(true); // K2: calm background while reading questions
  const cleanup = () => { window.__bubbles?.setFocus?.(false); cleanups.forEach((f) => f()); cleanups = []; h.__cleanup?.(); document.querySelector('.feedback')?.remove(); document.body.classList.remove('has-feedback'); };

  hearts.regen();
  if (!activity.practice && hearts.count <= 0) { await noHearts(); if (hearts.count <= 0) { router.go(`/subject/${it.subject}`, true); return cleanup; } }

  intro();
  return cleanup;

  /* ---------- intro ---------- */
  function intro() {
    const st = store.profile.activities[id];
    stage.innerHTML = '';
    stage.appendChild(el(`<div class="card q-card">
      <div class="float" style="display:grid;place-items:center">${ico3d(it.icon, 84)}</div>
      <h1 class="mt-3">${esc(it.title)}</h1>
      <p class="muted">${esc(it.desc || '')}</p>
      ${activity.intro ? `<p class="mt-3" style="line-height:1.8">${esc(activity.intro)}</p>` : ''}
      <div class="row mt-4" style="justify-content:center;gap:14px;flex-wrap:wrap">
        <span class="tag tag-gold">+${fmt(it.xp || 20)} XP</span>
        ${activity.practice ? '<span class="tag tag-green">تدريب بدون قلوب</span>' : '<span class="tag tag-rose">' + ico3d('heart') + ' الخطأ يكلّف قلباً</span>'}
        ${st ? `<span class="row" style="gap:6px">${crown(st.mastery)}<span class="small muted">أفضل ${fmt(st.best)}٪</span></span>` : ''}
      </div>
      <button class="btn btn-primary btn-lg btn-block mt-6" data-act="start">${ico('play')} ابدأ!</button>
    </div>`));
    stage.querySelector('[data-act="start"]').onclick = () => { voice.unlock(); sound.play('whoosh'); start(); }; // Phase 15.1: unlock <audio> in the gesture
  }

  /* ---------- run ---------- */
  function start() {
    const s = new Session(activity);
    sound.resetCombo();
    if (!s.total) { toast('لا توجد أسئلة في هذا النشاط', { type: 'error' }); return; }
    ask(s);
  }

  /** Phase 11 K3: review round "تحدي أبطال الماث" - the questions missed on the first try, once more, in a light session */
  function startReview(prev) {
    const qs = prev.missedQuestions.map((q) => ({ ...q }));
    if (!qs.length) return start();
    const s = new Session({ ...activity, questions: qs, generator: null, count: qs.length, shuffle: false, practice: true, review: true });
    sound.resetCombo();
    ask(s);
  }

  function ask(s) {
    const q = s.current; s.shown();
    window.__play = { id, i: s.i, total: s.total, q, keys: s.questions?.map((x) => x.key || x.q), review: s.review, retry: s.isRetry }; // E2E hook (read-only)
    stage.innerHTML = '';
    const head = el(`<div class="play-head">${s.review ? `<span class="tag tag-gold" data-review-tag>${ico3d('trophy', 16)} تحدي أبطال الماث</span>` : ''}<span class="small muted">${fmt(s.i + 1)}/${fmt(s.total)}</span><div class="level-bar green"><span style="width:${s.progress}%"></span></div><button class="btn btn-icon btn-ghost" data-act="quit" aria-label="خروج">${ico('x')}</button></div>`);
    head.querySelector('[data-act="quit"]').onclick = async () => { if (await modal({ title: 'تخرج الآن؟', body: '<p class="muted">هتاخد نص النقاط بس على اللي جاوبته.</p>', actions: [{ label: 'أكمل اللعب', cls: 'btn-primary', value: false }, { label: 'خروج', cls: 'btn-ghost', value: true }] })) { finish(s, true); } };
    stage.appendChild(head);
    const card = el('<div class="card q-card"></div>');
    stage.appendChild(card);
    requestAnimationFrame(() => { card.animate([{ opacity: 0, transform: 'translateX(-30px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.4,0,.2,1)' }); });
    const r = renderers[q.type] || renderers.quiz;
    let answered = false; const askedAt = Date.now();
    const ctx = {
      font: activity.font,
      onCleanup: (f) => cleanups.push(f),
      // Phase 11 K3: renderers may reveal the right answer only when no retry is left (second try / review round / out of hearts)
      reveal: () => s.isRetry || s.review || (!activity.practice && hearts.count <= 1),
      // Phase 12: branch renderer - a wrong slot is a mistake inside the question (no reveal). First slot miss costs the
      // heart via s.retry() (so the question counts as "missed" for the review round); later misses only nudge.
      slotMiss(slot) {
        if (answered) return;
        const pt = { x: innerWidth / 2, y: innerHeight * 0.4 };
        if (!s.isRetry && !s.review) { const stop = s.retry({ picked: slot }); if (stop) { answered = true; explainSheet.close(); s.answer(false, { picked: slot, forced: true }); feedback(s, false, q); return; } }
        sound.play('wrong'); fx.encourage({ x: pt.x, y: pt.y, el: card }); mascot.mood(card, 'encourage');
        nudgePill(card, RETRY[Math.floor(Math.random() * RETRY.length)]); // top pill, 3.5s, never over the numbers
        card.querySelector('.explain-btn')?.classList.add('pulse');
      },
      done(ok, meta) {
        if (answered) return;
        // adaptive: impulsive child -> ignore taps that land before a short settle delay (choices only), ask to look again
        if (adapt.delayMs && (q.type === 'quiz' || q.type === 'truefalse' || q.type === 'grid') && Date.now() - askedAt < adapt.delayMs) { sound.play('tap'); fx.floater?.('بصّ كويس الأول ' + ico3d('eye')); return; }
        answered = true;
        explainSheet.close();
        const pt = meta.point || { x: innerWidth / 2, y: innerHeight * 0.45 };
        // Phase 11 K3: first miss -> no answer reveal, warm nudge + one more try (the heart is taken once, in retry())
        if (!ok && !s.isRetry && !s.review) {
          const stop = s.retry(meta);
          sound.play('wrong'); fx.encourage({ x: pt.x, y: pt.y, el: meta.card });
          cheers.say('wrong');
          mascot.mood(card, 'encourage');
          if (stop) { s.answer(false, { ...meta, forced: true }); feedback(s, false, q); return; }
          retryPrompt(s, q, card);
          return;
        }
        const wasRetry = s.isRetry;
        s.answer(ok, meta);
        if (ok) {
          sound.play('correct');
          const perQ = Math.max(1, Math.round((it.xp || 20) / s.total));
          fx.celebrate({ x: pt.x, y: pt.y, xp: perQ, combo: sound.combo, el: meta.card, recovered: wasRetry }); // Phase 17: learned from the mistake -> level-3 burst
          if (wasRetry) confetti({ count: 90 }); // learned from the mistake -> bigger cheer
          cheers.say(wasRetry ? 'recovered' : 'correct');
          mascot.mood(card, wasRetry ? 'celebrate' : 'happy');
        } else {
          sound.play('wrong');
          fx.encourage({ x: pt.x, y: pt.y, el: meta.card });
          cheers.say('wrong');
          mascot.mood(card, 'encourage');
        }
        groupsBar.countUp(card.querySelector('.groups-bar')); // Phase 15.4: answer is out -> cubes count 1..a*b
        feedback(s, ok, q, wasRetry);
      },
    };
    if (q.speak && sound.enabled) setTimeout(() => sound.speak(q.speak), 200);
    r(card, q, ctx);
    // Phase 15.2: equal-groups bar above the question text (only plain a x b questions: it shows the operands, never the
    // answer; missing-factor questions would reveal the unknown, grid questions already have their own picture)
    const cs = getComputedStyle(card); const inner = card.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); // the bar's real width
    const bar = groupsBar.render(q, { width: Math.max(200, Math.floor(inner)) });
    if (bar) { const qt = card.querySelector('.q-text'); qt ? qt.before(bar) : card.prepend(bar); }
    mascot.mount(card, { subject: it.subject }); // Phase 17: companion per subject (cast rotation); decorative, never covers controls
    setTimeout(() => { if (card.isConnected && !answered) mascot.mood(card, 'think'); }, 900); // looks at the question
    // Phase 15.1: read the math question aloud (recorded Egyptian clips only) + a replay button for non-readers.
    // The button is outside the answer controls' lock (class explain-btn is NOT used): K3 locks only answer buttons.
    const spoken = questionVoice.sentence(q);
    if (spoken) {
      const qt = card.querySelector('.q-text, .branch-root');
      const hear = el(`<button type="button" class="btn btn-icon btn-ghost q-hear" data-act="hear" aria-label="اسمع السؤال">${ico3d('speaker', 26)}</button>`);
      hear.onclick = (e) => { e.stopPropagation(); voice.unlock(); cheers.stop(); questionVoice.say(q, { force: true }); };
      (qt || card).insertAdjacentElement(qt ? 'beforebegin' : 'afterbegin', hear);
      if (!s.isRetry) questionVoice.say(q); // a retry re-renders the same question: do not repeat it unasked
      cleanups.push(() => questionVoice.stop());
    }
    // Phase 10: "يعني إيه يا بابا؟" / Phase 11: after a miss, "هجرّب أحلّ" re-asks the same question empty
    cleanups.push(explainSheet.mount(card, { q, session: s, onTry: () => { if (s.isRetry && answered && !s.ended && s.current === q && !document.querySelector('.feedback.good, .feedback.bad')) ask(s); } }));
    card.addEventListener('pointerdown', () => s.touch(), { once: true, passive: true });
    if (s.isRetry) card.classList.add('retry');
  }

  /** UX polish (gist 1187b2e8): encouragement as a calm pill pinned above the card (not a floater over the tree), 3.5s */
  function nudgePill(card, text) {
    stage.querySelector('.nudge-pill')?.remove();
    const pill = el(`<div class="nudge-pill" role="status" aria-live="polite">${text}</div>`);
    stage.insertBefore(pill, card);
    clearTimeout(nudgePill._t); nudgePill._t = setTimeout(() => { pill.classList.add('out'); setTimeout(() => pill.remove(), 350); }, 3500);
  }

  /**
   * Phase 11 K3: after the first miss - soft shake, warm nudge (no answer), pulsing explain button.
   * "جرّب تاني" re-renders the same question empty; opening the explain sheet hides this bar (its "هجرّب أحلّ" re-asks too).
   */
  function retryPrompt(s, q, card) {
    document.querySelector('.feedback')?.remove();
    card.classList.add('shake-soft');
    card.querySelector('.explain-btn')?.classList.add('pulse');
    const f = el(`<div class="feedback retry" data-retry>
      <div class="container row">
        <div class="grow"><div class="f-title">${RETRY[Math.floor(Math.random() * RETRY.length)]}</div>
          <div class="f-exp">مش هقولك الجواب دلوقتي… لو محتاج مساعدة اضغط «يعني إيه يا بابا؟»</div></div>
        <button class="btn btn-gold btn-lg" data-act="retry">${ico3d('muscle', 20)} جرّب تاني</button>
      </div></div>`);
    document.body.appendChild(f); document.body.classList.add('has-feedback');
    const hide = () => { f.remove(); document.body.classList.remove('has-feedback'); };
    f.querySelector('[data-act="retry"]').onclick = () => { sound.play('whoosh'); hide(); ask(s); };
    card.querySelector('.explain-btn')?.addEventListener('click', hide, { once: true });
  }

  function feedback(s, ok, q, wasRetry = false) {
    document.querySelector('.feedback')?.remove();
    const outHearts = s.outOfHearts;
    const title = ok ? (wasRetry ? RECOVERED[Math.floor(Math.random() * RECOVERED.length)] : CHEERS[Math.floor(Math.random() * CHEERS.length)]) : OOPS[Math.floor(Math.random() * OOPS.length)];
    const f = el(`<div class="feedback ${ok ? 'good' : 'bad'}${ok && wasRetry ? ' recovered' : ''}">
      <div class="container row">
        <div class="grow">
          <div class="f-title">${title}</div>
          ${q.explain && !ok ? `<div class="f-exp">${esc(q.explain)}</div>` : ''}
          ${outHearts ? '<div class="f-exp" style="color:var(--neon-rose)">' + ico3d('heartBroken') + ' خلصت القلوب!</div>' : ''}
        </div>
        <button class="btn ${ok ? 'btn-primary' : 'btn-rose'} btn-lg" data-act="next">${s.i + 1 < s.total && !outHearts ? 'التالي' : 'النتيجة'} ${ico('fwd')}</button>
      </div></div>`);
    document.body.appendChild(f); document.body.classList.add('has-feedback');
    const go = () => { f.remove(); document.body.classList.remove('has-feedback'); if (outHearts) return finish(s, true); if (!s.next()) return finish(s); if (adapt.breakAfterMin && !s._breakShown && Date.now() - s.startedAt > adapt.breakAfterMin * 60000) { s._breakShown = true; return breakCard(s); } ask(s); };
    f.querySelector('[data-act="next"]').onclick = go;
    // Enter/Space -> next, but only for a fresh key press that starts well after the bar appeared (a held or repeated
    // Enter from the answer step must never skip the question - field bug, gist 1187b2e8).
    const shownAt = Date.now();
    const onKey = (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat && Date.now() - shownAt > 900 && document.body.contains(f)) { window.removeEventListener('keydown', onKey); go(); } };
    setTimeout(() => window.addEventListener('keydown', onKey), 900);
    cleanups.push(() => window.removeEventListener('keydown', onKey));
  }

  /** adaptive: gentle rest suggestion when the insights engine detected fatigue after N minutes */
  function breakCard(s) {
    stage.innerHTML = '';
    const c = el(`<div class="card q-card center" data-break><div class="float" style="display:grid;place-items:center">${ico3d('turtle', 84)}</div><h2 class="mt-3">خد نفس يا بطل</h2><p class="muted" style="font-size:18px;line-height:1.8">لعبت حلو! اشرب مية واتحرّك دقيقة، وبعدين كمّل وانت مركّز.</p><div class="row mt-4" style="justify-content:center;gap:12px;flex-wrap:wrap"><button class="btn btn-lg btn-primary" data-act="continue">${ico3d('muscle', 22)} كمّل</button><button class="btn btn-lg btn-ghost" data-act="stop">${ico3d('flag', 22)} كفاية النهاردة</button></div></div>`);
    c.querySelector('[data-act="continue"]').onclick = () => { sound.play('whoosh'); ask(s); };
    c.querySelector('[data-act="stop"]').onclick = () => { sound.play('whoosh'); finish(s, true); };
    stage.appendChild(c);
    if (sound.enabled) setTimeout(() => sound.speak('خد نفس يا بطل. اشرب مية وارجع.'), 200);
  }

  /* ---------- results ---------- */
  function finish(s, aborted = false) {
    document.querySelector('.feedback')?.remove(); document.body.classList.remove('has-feedback');
    const r = s.finish(aborted);
    window.__lastResult = r; // E2E hook (read-only)
    if (r.review) return finishReview(s, r);
    if (!aborted) setTimeout(() => cheers.say('finish'), r.perfect ? 1600 : 700); // after the fanfare, not over it
    const emoji = r.perfect ? ico3d('trophy') : r.score >= 80 ? ico3d('star') : r.score >= 50 ? ico3d('thumb') : ico3d('muscle');
    if (r.perfect) { confetti({ count: 220 }); sound.play('fanfare'); fx.celebrate({ big: true, xp: r.xp, combo: 1 }); setTimeout(() => window.__bubbles?.celebrate(innerWidth * 0.25, innerHeight * 0.35, 2), 350); setTimeout(() => window.__bubbles?.celebrate(innerWidth * 0.75, innerHeight * 0.35, 2), 700); } else if (r.score >= 80) { confetti({ count: 100 }); sound.play('cheer'); fx.celebrate({ xp: r.xp, combo: 2 }); } else if (r.score >= 50) { sound.play('streak'); fx.floater('شغل حلو! ' + ico3d('thumb')); } else { sound.play('encourage'); }
    stage.innerHTML = '';
    stage.appendChild(el(`<div class="card q-card">
      <div class="result-big">${emoji}</div>
      <h1>${r.perfect ? 'إجابات كاملة!' : r.score >= 80 ? 'أداء رائع!' : r.score >= 50 ? 'شغل حلو!' : aborted ? 'نكمّل المرة الجاية' : 'محتاج تدريب أكثر'}</h1>
      <p class="muted">${esc(it.title)}</p>
      <div class="stats">
        <div class="stat"><b style="color:var(--neon-green)">${fmt(r.correct)}</b><span>صحيح</span></div>
        <div class="stat"><b style="color:var(--neon-rose)">${fmt(r.wrong)}</b><span>خطأ</span></div>
        <div class="stat"><b>${fmt(r.score)}٪</b><span>النتيجة</span></div>
        <div class="stat"><b style="color:var(--neon-gold)">+${fmt(r.xp)}</b><span>XP</span></div>
        <div class="stat"><b>${fmt(Math.floor(r.secs / 60))}:${String(r.secs % 60).padStart(2, '0')}</b><span>الوقت</span></div>
        <div class="stat"><b>${crown(r.mastery)}</b><span>الإتقان ${r.mastery > r.masteryBefore ? ico3d('arrowUp') : r.mastery < r.masteryBefore ? ico3d('arrowDown') : ''}</span></div>
      </div>
      ${r.streakUp ? '<p class="tag tag-gold" style="display:inline-block">' + ico3d('flame') + ' شعلة اليوم اشتعلت!</p>' : ''}
      ${r.certificate ? `<a href="#/certificate/${r.certificate.id}" class="card clickable tile glow-gold mt-3" style="text-align:start"><div class="icon-box">${ico3d('gradCap')}</div><div class="grow"><h3>شهادة إتقان جديدة!</h3><p>اضغط لعرضها وطباعتها</p></div><span class="chev">${ico('chevronL')}</span></a>` : ''}
      ${r.newBadges.length ? `<div class="row wrap mt-3" style="justify-content:center">${r.newBadges.map((b) => `<span class="tag tag-gold" style="font-size:13px;padding:6px 12px;gap:6px">${badgeSVG(b.id, b.tier, { size: 26 })} ${esc(b.name)}</span>`).join('')}</div>` : ''}
      <div class="row mt-6" style="gap:10px">
        ${!aborted && s.missedQuestions.length ? `<button class="btn btn-gold btn-lg grow" data-act="review">${ico3d('trophy', 22)} تحدي أبطال الماث (${fmt(s.missedQuestions.length)})</button>` : ''}
        <button class="btn btn-primary btn-lg grow" data-act="again">${ico('refresh')} مرة أخرى</button>
        <a href="#/subject/${it.subject}" class="btn btn-lg grow">${ico('home')} المادة</a>
      </div>
    </div>`));
    stage.querySelector('[data-act="review"]')?.addEventListener('click', () => { sound.play('whoosh'); startReview(s); });
    stage.querySelector('[data-act="again"]').onclick = () => { sound.play('whoosh'); hearts.regen(); if (!activity.practice && hearts.count <= 0) noHearts().then(() => hearts.count > 0 && start()); else start(); };
  }

  /** Phase 11 K3: result card of the review round - celebrates every mistake turned into a correct answer */
  function finishReview(s, r) {
    if (r.perfect) { confetti({ count: 200 }); sound.play('fanfare'); fx.celebrate({ big: true, xp: r.xp, combo: 1 }); } else if (r.correct) sound.play('correct');
    stage.innerHTML = '';
    stage.appendChild(el(`<div class="card q-card" data-review-result>
      <div class="result-big">${r.perfect ? ico3d('trophy') : r.correct ? ico3d('star') : ico3d('muscle')}</div>
      <h1>${r.perfect ? 'بطل الماث الحقيقي!' : r.correct ? 'اتعلمت من غلطك!' : 'نكمّل التدريب مع بعض'}</h1>
      <p class="muted" style="font-size:17px;line-height:1.8">${r.perfect ? `صلّحت ${fmt(r.total)} من ${fmt(r.total)} غلطات بنفسك. ده أحسن نوع تعلّم!` : `صلّحت ${fmt(r.correct)} من ${fmt(r.total)}. كل غلطة بتعلّمك حاجة جديدة.`}</p>
      <div class="stats">
        <div class="stat"><b style="color:var(--neon-green)">${fmt(r.correct)}</b><span>صلّحتها</span></div>
        <div class="stat"><b style="color:var(--neon-rose)">${fmt(r.wrong)}</b><span>لسه محتاجة تدريب</span></div>
        <div class="stat"><b style="color:var(--neon-gold)">+${fmt(r.xp)}</b><span>XP</span></div>
      </div>
      <div class="row mt-6" style="gap:10px">
        <button class="btn btn-primary btn-lg grow" data-act="again">${ico('refresh')} ألعب المرحلة تاني</button>
        <a href="#/subject/${it.subject}" class="btn btn-lg grow">${ico('home')} المادة</a>
      </div>
    </div>`));
    stage.querySelector('[data-act="again"]').onclick = () => { sound.play('whoosh'); hearts.regen(); if (!activity.practice && hearts.count <= 0) noHearts().then(() => hearts.count > 0 && start()); else start(); };
  }

  async function noHearts() {
    const p = store.profile; const ms = hearts.nextIn(); const mins = Math.ceil(ms / 60000);
    await modal({
      title: ico3d('heartBroken') + ' خلصت القلوب!',
      body: `<p class="muted">القلب الجاي يرجع بعد <b>${fmt(mins)}</b> دقيقة.<br>عندك <b>${fmt(p.gems)} ${ico3d('gem')}</b> — تقدر تملأ القلوب بـ 20 جوهرة، أو تفرقع فقاعات وتستنى ${ico3d('smile')}</p>`,
      actions: [
        { label: 'املأ القلوب (20 ' + ico3d('gem') + ')', cls: 'btn-primary', icon: 'heart', onClick: () => { if (!hearts.refill(20)) { toast('جواهر غير كافية ' + ico3d('gem'), { type: 'error' }); return false; } toast(ico3d('heart') + ' رجعت القلوب!', { type: 'success' }); } },
        { label: 'رجوع', cls: 'btn-ghost' },
      ],
    });
  }
}
