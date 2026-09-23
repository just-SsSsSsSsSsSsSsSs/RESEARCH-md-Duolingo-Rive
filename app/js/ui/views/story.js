/**
 * Story view (Phase 7) — modern "ازرع نبتة" experience at #/play/plant_story
 *   Cover -> Listen (dual-audio 3D player, sentence highlight, text on/off, slow mode)
 *   -> 4 curriculum phases: TF cards · MCQ/complete · order events · mind-map bubbles
 *   -> personal expression -> results with foreground party FX + XP/gems/mastery/badges/quests.
 * Reuses Session for scoring so every engine (xp, hearts, streak, badges, quests) sees a normal activity.
 * Classic <-> Modern compare toggle lives in the story bar (loads the untouched plant.html in an iframe).
 */
import store from '../../core/store.js';
import registry from '../../core/registry.js';
import sound from '../../engines/sound.js';
import hearts from '../../engines/hearts.js';
import xp from '../../engines/xp.js';
import fx from '../../engines/fx.js';
import Session from '../../activities/session.js';
import explainSheet from '../explainSheet.js';
import { mistakeLoop } from '../mistakeLoop.js'; // Phase 12 L4: shared learn-from-mistake flow
import StoryAudio from '../../engines/storyAudio.js';
import { Q } from './storyQuestions.js';
import { badgeSVG } from '../badgeArt.js';
import { el, esc, fmt, hud, modal, confetti, toast } from '../components.js';
import { ico } from '../icons.js';
import { ico3d } from '../icons3d.js';
import { crown } from './subject.js';

const PHASE_ICON = { tf: 'check', mcq: 'brain', order: 'sort', map: 'map' };
const CHEERS = ['ممتاز! ' + ico3d('star'), 'برافو! ' + ico3d('clap'), 'عبقري! ' + ico3d('brain'), 'أنت بطل! ' + ico3d('hero'), 'رهيب! ' + ico3d('rocket')];
const OOPS = ['مش مشكلة، نتعلم من الخطأ ' + ico3d('muscle'), 'قريب جداً! ' + ico3d('pinch'), 'ركّز في القصة مرة ثانية ' + ico3d('bookPages')];
const withCls = (svg, cls) => svg.replace('class="i3d', `class="${cls} i3d`);

export async function render(root, { id }) {
  const it = registry.item(id);
  const a = await registry.loadActivity(id);
  const h = hud({ back: true, icon: it.icon || 'sprout', title: it.title });
  root.appendChild(h);
  const stage = el('<div class="stage story"></div>');
  root.appendChild(stage);

  const meta = store.meta;
  const audio = new StoryAudio({ base: a.audioBase, tracks: a.tracks, clips: a.clips, lang: meta.storyLang || 'fusha' });
  audio.rate = meta.storyRate || 1;
  let showText = meta.storyText !== false;
  let cleanups = [];
  let mode = 'modern';
  window.__bubbles?.setFocus?.(true);

  // Session-compatible question list built from the 4 phases (curriculum order, no shuffle)
  const questions = [];
  for (const ph of a.phases) {
    if (ph.id === 'tf') ph.items.forEach((q) => questions.push({ type: 'truefalse', phase: ph, q: q.q, answer: q.a, explain: q.why, clip: q.id, baladi: q.baladi }));
    else if (ph.id === 'mcq') ph.items.forEach((q) => questions.push(q.kind === 'complete'
      ? { type: 'fillblank', phase: ph, q: q.pre + '___' + q.post, choices: q.opts, answer: q.correct, clip: q.id, baladi: q.baladi }
      : { type: 'quiz', phase: ph, q: q.q, choices: q.opts, answer: q.correct, clip: q.id, baladi: q.baladi }));
    else if (ph.id === 'order') questions.push({ type: 'order', phase: ph, items: ph.events, baladi: ph.baladi, prompt: 'رتّب أحداث القصة كما حدثت' });
    else if (ph.id === 'map') questions.push({ type: 'mindmap', phase: ph, bubbles: ph.bubbles, clip: 'map', baladi: ph.baladi });
  }
  const activity = { ...a, questions, shuffle: false, count: questions.length };

  const cleanup = () => { audio.destroy(); window.__bubbles?.setFocus?.(false); cleanups.forEach((f) => f()); cleanups = []; h.__cleanup?.(); document.querySelector('.feedback')?.remove(); document.body.classList.remove('has-feedback'); };

  hearts.regen();
  cover();
  return cleanup;

  /* ============================================================ story bar (lang / text / speed / compare) */
  function bar() {
    const b = el(`<div class="story-bar">
      <div class="seg lang" role="group" aria-label="اللغة">${Object.entries(a.tracks).map(([k, t]) => `<button data-lang="${k}" class="${audio.lang === k ? 'on' : ''}">${ico3d(k === 'fusha' ? 'speakerFusha' : 'speakerBaladi')} ${esc(t.label)}</button>`).join('')}</div>
      <div class="seg" role="group" aria-label="النص"><button data-act="text" class="${showText ? 'on' : ''}" aria-pressed="${showText}">${ico3d(showText ? 'eye' : 'eyeOff')} النص</button></div>
      <div class="seg" role="group" aria-label="السرعة"><button data-rate="0.8" class="${audio.rate < 1 ? 'on' : ''}" aria-label="بطيء">${ico3d('turtle')}</button><button data-rate="1" class="${audio.rate === 1 ? 'on' : ''}" aria-label="عادي">${ico3d('rabbit')}</button></div>
      <div class="seg" role="group" aria-label="المقارنة" style="margin-inline-start:auto"><button data-act="compare" class="${mode !== 'modern' ? 'on' : ''}" title="قارن بالنسخة الكلاسيكية">${ico3d('compare')} <span class="hide-sm">${mode === 'modern' ? 'كلاسيك' : 'حديث'}</span></button></div>
    </div>`);
    b.querySelectorAll('[data-lang]').forEach((x) => (x.onclick = () => {
      sound.play('tap'); audio.lang = x.dataset.lang; store.setMeta({ storyLang: audio.lang });
      b.querySelectorAll('[data-lang]').forEach((y) => y.classList.toggle('on', y.dataset.lang === audio.lang));
      stage.querySelector('.player')?.classList.toggle('baladi', audio.lang === 'baladi');
      stage.querySelector('.reader')?.classList.toggle('baladi', audio.lang === 'baladi');
      stage.querySelectorAll('.hint-baladi').forEach((hb) => hb.classList.toggle('hidden', audio.lang !== 'baladi'));
      toast(ico3d(audio.lang === 'fusha' ? 'speakerFusha' : 'speakerBaladi') + ' ' + esc(a.tracks[audio.lang].label), { ms: 1200 });
    }));
    b.querySelector('[data-act="text"]').onclick = (e) => { sound.play('tap'); showText = !showText; store.setMeta({ storyText: showText }); e.currentTarget.classList.toggle('on', showText); e.currentTarget.innerHTML = `${ico3d(showText ? 'eye' : 'eyeOff')} النص`; stage.querySelectorAll('.reader, .q-text').forEach((r) => r.classList.toggle('hidden', !showText)); };
    b.querySelectorAll('[data-rate]').forEach((x) => (x.onclick = () => { sound.play('tick'); audio.rate = Number(x.dataset.rate); store.setMeta({ storyRate: audio.rate }); b.querySelectorAll('[data-rate]').forEach((y) => y.classList.toggle('on', Number(y.dataset.rate) === audio.rate)); }));
    b.querySelector('[data-act="compare"]').onclick = () => { sound.play('whoosh'); audio.stop(); mode = mode === 'modern' ? 'classic' : 'modern'; mode === 'classic' ? classic() : cover(); };
    return b;
  }

  /* ============================================================ classic compare */
  function classic() {
    stage.innerHTML = ''; stage.appendChild(bar());
    const src = registry.href({ href: 'plant.html' });
    stage.appendChild(el(`<div class="card" style="padding:12px">
      <div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:10px">
        <div class="row" style="gap:8px">${ico3d('compare', 28)}<div><b>النسخة الكلاسيكية (plant.html)</b><div class="small muted">الملف الأصلي كما هو — بلا أي تعديل</div></div></div>
        <div class="row" style="gap:6px"><a class="btn btn-sm" href="${src}" target="_blank" rel="noopener">${ico('external')} تبويب جديد</a><button class="btn btn-sm btn-primary" data-act="modern">${ico3d('sprout', 18)} النسخة الحديثة</button></div>
      </div>
      <iframe class="classic-frame" src="${src}" title="النسخة الكلاسيكية" loading="lazy"></iframe>
    </div>`));
    stage.querySelector('[data-act="modern"]').onclick = () => { sound.play('whoosh'); mode = 'modern'; cover(); };
  }

  /* ============================================================ cover */
  function cover() {
    const st = store.profile.activities[id];
    stage.innerHTML = ''; stage.appendChild(bar());
    stage.appendChild(el(`<div class="card story-cover">
      <div class="cover-art">${withCls(ico3d('flower'), 'a1')}${withCls(ico3d('seed'), 'a2')}${withCls(ico3d('wateringCan'), 'a3')}</div>
      <h1>${esc(a.story.title)}</h1>
      <p class="muted">قصة ${esc(a.story.hero)} — استمع بالفصحى أو البلدي، ثم العب ٤ مراحل</p>
      <div class="story-steps">
        <div class="st now">${ico3d('headphones')}استمع</div>
        ${a.phases.map((p) => `<div class="st">${ico3d(p.icon || PHASE_ICON[p.id])}${esc(p.title.split(' ')[0])}</div>`).join('')}
      </div>
      <div class="row" style="justify-content:center;gap:12px;flex-wrap:wrap">
        <span class="tag tag-gold">+${fmt(it.xp || 100)} XP</span>
        <span class="tag tag-cyan">${ico3d('gem', 14)} +${fmt(a.rewards?.gemsOnComplete || 10)}</span>
        <span class="tag tag-rose">${ico3d('heart', 14)} الخطأ يكلّف قلباً</span>
        ${st ? `<span class="row" style="gap:6px">${crown(st.mastery)}<span class="small muted">أفضل ${fmt(st.best)}٪</span></span>` : ''}
      </div>
      <button class="btn btn-primary btn-lg btn-block mt-5" data-act="listen">${ico3d('play', 24)} ابدأ الاستماع</button>
      <button class="btn btn-ghost btn-block mt-2" data-act="skip">${ico3d('bolt', 18)} أعرف القصة — ابدأ الأسئلة</button>
    </div>`));
    stage.querySelector('[data-act="listen"]').onclick = () => { sound.play('whoosh'); listen(); };
    stage.querySelector('[data-act="skip"]').onclick = () => { sound.play('whoosh'); startPhases(); };
    audio.preload('welcome'); audio.preload('story');
  }

  /* ============================================================ listen (3D player + reader) */
  function listen() {
    stage.innerHTML = ''; stage.appendChild(bar());
    const sents = a.story.sentences;
    const player = el(`<div class="player ${audio.lang}">
      <div class="player-top"><div class="player-title">${ico3d('bookPages')} <span>${esc(a.story.title)}</span></div><span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span></div>
      <div class="player-controls">
        <button class="pbtn" data-act="welcome" aria-label="الترحيب" title="الترحيب">${ico3d('wave')}</button>
        <button class="pbtn main" data-act="toggle" aria-label="تشغيل">${ico3d('play')}</button>
        <button class="pbtn" data-act="replay" aria-label="إعادة">${ico3d('replay')}</button>
      </div>
      <div class="player-seek"><span data-t>0:00</span><input type="range" min="0" max="1000" value="0" aria-label="التقدّم"><span data-d>0:00</span></div>
      <div class="player-tools"><span class="small muted" data-status>${ico3d('headphones', 16)} اضغط تشغيل لبدء القصة</span><button class="btn btn-sm btn-primary" data-act="go">${ico3d('rocket', 16)} إلى الأسئلة</button></div>
    </div>`);
    const reader = el(`<div class="card reader ${audio.lang} ${showText ? '' : 'hidden'}">
      <div class="baladi-note" data-note></div>
      ${sents.map((s, i) => `<div class="sent" data-i="${i}">${ico3d(s.icon || 'dot')}<span>${esc(s.t)}</span></div>`).join('')}
    </div>`);
    stage.appendChild(player); stage.appendChild(reader);
    const main = player.querySelector('[data-act="toggle"]'), range = player.querySelector('input'), tEl = player.querySelector('[data-t]'), dEl = player.querySelector('[data-d]'), status = player.querySelector('[data-status]'), note = reader.querySelector('[data-note]');
    const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    // sentence sync — H1: exact [start,end] timings per track when available (ASR-aligned), else proportional estimate
    const weights = sents.map((s) => s.t.length + 12), total = weights.reduce((x, y) => x + y, 0);
    const estBounds = []; let acc = 0; for (const w of weights) { acc += w; estBounds.push(acc / total); }
    const T = a.story.timings || {};
    const exact = () => Array.isArray(T[audio.lang]) && T[audio.lang].length === sents.length ? T[audio.lang] : null;
    /** index of the sentence playing at time t (sec) / progress p */
    const idxAt = (t, p) => { const ex = exact(); if (ex) { if (t < ex[0][0]) return -1; const i = ex.findIndex(([s0, e0], k) => t < (ex[k + 1]?.[0] ?? e0 + 0.01)); return i; } return estBounds.findIndex((b) => p < b); };
    /** seek target (sec or progress fraction) for sentence i */
    const startOf = (i) => { const ex = exact(); return ex ? ex[i][0] : null; };
    let seeking = false, lastIdx = -2, pinUntil = 0; // pinUntil: manual sentence tap wins over timeupdate for a moment
    const setIdx = (i) => { if (i === lastIdx) return; lastIdx = i; reader.querySelectorAll('.sent').forEach((s, k) => { s.classList.toggle('now', k === i); s.classList.toggle('done', i >= 0 && k < i); }); if (i >= 0 && showText) reader.querySelector(`.sent[data-i="${i}"]`)?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }); };
    const setNote = (lang) => { note.textContent = lang === 'baladi' ? (T.baladiIntro ? `«${T.baladiIntro}» — الصوت بالبلدي والنص بالفصحى` : 'الصوت بالبلدي — والنص بالفصحى للقراءة') : 'اضغط أي جملة لتضيئها وتسمعها'; };
    setNote(audio.lang);
    cleanups.push(
      audio.on('time', ({ t, d, p }) => { if (!seeking) range.value = Math.round(p * 1000); tEl.textContent = mmss(t); dEl.textContent = mmss(d); if (audio.clip === 'story' && Date.now() > pinUntil) setIdx(idxAt(t, p)); }),
      audio.on('state', ({ playing, clip, lang }) => {
        main.innerHTML = ico3d(playing ? 'pause' : 'play'); main.setAttribute('aria-label', playing ? 'إيقاف' : 'تشغيل'); main.classList.toggle('playing', playing);
        player.classList.toggle('playing', playing); player.classList.toggle('baladi', lang === 'baladi'); reader.classList.toggle('baladi', lang === 'baladi'); setNote(lang);
        status.innerHTML = playing ? `${ico3d(lang === 'fusha' ? 'speakerFusha' : 'speakerBaladi', 16)} ${clip === 'welcome' ? 'الترحيب' : 'القصة'} — ${esc(a.tracks[lang].label)}` : `${ico3d('headphones', 16)} ${clip ? 'متوقّف' : 'اضغط تشغيل لبدء القصة'}`;
      }),
      audio.on('end', ({ clip }) => {
        if (clip === 'welcome') audio.play('story');
        else if (clip === 'story') { setIdx(sents.length); fx.floater('أحسنت الاستماع! ' + ico3d('headphones'), innerWidth / 2, innerHeight * 0.4, 'cheer'); sound.play('sparkle'); status.innerHTML = `${ico3d('check', 16)} انتهت القصة — جاهز للأسئلة؟`; player.querySelector('[data-act="go"]').classList.add('glow'); }
      }),
      audio.on('error', () => toast('تعذّر تشغيل الصوت — اضغط تشغيل مرة أخرى', { type: 'error' })),
    );
    main.onclick = () => { sound.play('tap'); audio.toggle(audio.clip || 'story'); };
    player.querySelector('[data-act="welcome"]').onclick = () => { sound.play('tap'); audio.play('welcome'); };
    player.querySelector('[data-act="replay"]').onclick = () => { sound.play('tap'); setIdx(-1); audio.clip ? audio.replay() : audio.play('story'); };
    range.oninput = () => { seeking = true; }; range.onchange = () => { audio.seek(range.value / 1000); seeking = false; };
    reader.querySelectorAll('.sent').forEach((s) => (s.onclick = () => { sound.play('tick'); const i = Number(s.dataset.i); pinUntil = Date.now() + 1200; setIdx(i); const at = startOf(i); if (at != null) audio.play('story', { at }); else { audio.play('story').then(() => audio.seek(i ? estBounds[i - 1] : 0)); } }));
    player.querySelector('[data-act="go"]').onclick = () => { sound.play('whoosh'); audio.stop(); startPhases(); };
    audio.preload('story');
    audio.play('welcome'); // user just tapped "start" -> gesture unlock is satisfied on mobile
  }

  /* ============================================================ phases (Session-driven) */
  function startPhases() {
    if (hearts.count <= 0) { toast(ico3d('heartBroken') + ' القلوب خلصت — استرح قليلاً', { type: 'error' }); return; }
    const s = new Session(activity); sound.resetCombo(); ask(s);
  }

  function ask(s) {
    const q = s.current, ph = q.phase, phIdx = a.phases.indexOf(ph); s.shown();
    const inPhase = s.questions.filter((x) => x.phase === ph), k = inPhase.indexOf(q) + 1;
    stage.innerHTML = ''; stage.appendChild(bar());
    stage.appendChild(el(`<div class="story-steps"><div class="st done">${ico3d('headphones')}استمع</div>${a.phases.map((p, i) => `<div class="st ${i < phIdx ? 'done' : i === phIdx ? 'now' : ''}">${ico3d(p.icon || PHASE_ICON[p.id])}${esc(p.title.split(' ')[0])}</div>`).join('')}</div>`));
    const head = el(`<div class="play-head"><span class="small muted">${fmt(s.i + 1)}/${fmt(s.total)}</span><div class="level-bar green"><span style="width:${s.progress}%"></span></div><button class="btn btn-icon btn-ghost" data-act="quit" aria-label="خروج">${ico('x')}</button></div>`);
    head.querySelector('[data-act="quit"]').onclick = async () => { if (await modal({ title: 'تخرج الآن؟', body: '<p class="muted">هتاخد نص النقاط بس على اللي جاوبته.</p>', actions: [{ label: 'أكمل اللعب', cls: 'btn-primary', value: false }, { label: 'خروج', cls: 'btn-ghost', value: true }] })) finish(s, true); };
    stage.appendChild(head);
    const card = el(`<div class="card q-card"><div class="phase-head">${ico3d(ph.icon || PHASE_ICON[ph.id])}<h2>${esc(ph.title)}</h2><span class="small muted">${fmt(k)}/${fmt(inPhase.length)}</span></div></div>`);
    stage.appendChild(card);
    requestAnimationFrame(() => card.animate([{ opacity: 0, transform: 'translateX(-30px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.4,0,.2,1)' }));
    // per-question audio: fusha read-aloud / baladi explanation, plus baladi hint chip
    const hasClip = q.clip && audio.url(q.clip);
    if (hasClip || q.baladi) {
      const qa = el(`<div class="q-audio">${hasClip ? `<button class="pbtn" data-act="qplay" aria-label="اسمع السؤال">${ico3d('speaker')}</button>` : ''}${q.baladi ? `<span class="hint-baladi ${audio.lang === 'baladi' ? '' : 'hidden'}">${esc(q.baladi)}</span>` : ''}</div>`);
      card.appendChild(qa);
      qa.querySelector('[data-act="qplay"]')?.addEventListener('click', () => { sound.play('tap'); audio.play(q.clip); });
      if (hasClip) setTimeout(() => audio.play(q.clip), 250);
    }
    let answered = false, last = null;
    card.addEventListener('pointerdown', (e) => { last = { x: e.clientX, y: e.clientY }; }, { passive: true, capture: true });
    const point = () => { const r = card.getBoundingClientRect(); return last || { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
    const gentle = () => { if (audio.lang === 'fusha' && audio.has('gentle', 'fusha')) setTimeout(() => audio.play('gentle'), 350); };
    // Phase 12 L4 (owner decision): first miss -> highlight the mistake position only, no reveal, one more try
    const loop = mistakeLoop({ session: s, card, q, ask: () => ask(s), point });
    const ctx = {
      onCleanup: (f) => cleanups.push(f),
      reveal: loop.reveal,
      done(ok, meta = {}) {
        if (answered) return; answered = true;
        audio.stop(); explainSheet.close();
        if (!ok && loop.onWrong(meta)) { gentle(); return; }
        s.answer(ok, meta);
        const pt = point();
        if (ok) { sound.play('correct'); fx.celebrate({ x: pt.x, y: pt.y, xp: Math.max(1, Math.round((it.xp || 100) / s.total)), combo: sound.combo, el: card }); if (loop.wasRetry) confetti({ count: 90 }); if (audio.lang === 'fusha' && audio.has('praise', 'fusha') && Math.random() < 0.5) setTimeout(() => audio.play('praise'), 350); }
        else { sound.play('wrong'); fx.encourage({ x: pt.x, y: pt.y, el: card }); gentle(); }
        feedback(s, ok, q, loop);
      },
    };
    if (s.isRetry) card.classList.add('retry');
    (Q[q.type] || Q.quiz)(card, q, ctx);
    cleanups.push(explainSheet.mount(card, { q, session: s, onTry: loop.onTry })); // Phase 10: "يعني إيه يا بابا؟" / Phase 12: "هجرّب أحلّ" re-asks
    if (!showText) card.querySelectorAll('.q-text').forEach((x) => x.classList.add('hidden'));
  }

  function feedback(s, ok, q, loop) {
    document.querySelector('.feedback')?.remove();
    const outHearts = s.outOfHearts;
    const f = el(`<div class="feedback ${ok ? 'good' : 'bad'}${ok && loop?.wasRetry ? ' recovered' : ''}"><div class="container row"><div class="grow">
      <div class="f-title">${loop ? loop.title(ok, CHEERS, OOPS) : ok ? CHEERS[Math.floor(Math.random() * CHEERS.length)] : OOPS[Math.floor(Math.random() * OOPS.length)]}</div>
      ${q.explain && !ok ? `<div class="f-exp">${esc(q.explain)}</div>` : ''}
      ${outHearts ? '<div class="f-exp" style="color:var(--neon-rose)">' + ico3d('heartBroken') + ' خلصت القلوب!</div>' : ''}
    </div><button class="btn ${ok ? 'btn-primary' : 'btn-rose'} btn-lg" data-act="next">${s.i + 1 < s.total && !outHearts ? 'التالي' : 'التعبير'} ${ico('fwd')}</button></div></div>`);
    document.body.appendChild(f); document.body.classList.add('has-feedback');
    const go = () => { f.remove(); document.body.classList.remove('has-feedback'); if (outHearts) return finish(s, true); if (s.next()) ask(s); else personal(s); };
    f.querySelector('[data-act="next"]').onclick = go;
    const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { window.removeEventListener('keydown', onKey); go(); } };
    setTimeout(() => window.addEventListener('keydown', onKey), 300);
    cleanups.push(() => window.removeEventListener('keydown', onKey));
  }

  /* ============================================================ personal expression (ungraded, saved to journal) */
  function personal(s) {
    const P = a.personal; if (!P) return finish(s);
    stage.innerHTML = ''; stage.appendChild(bar());
    const hasClip = audio.has('personal', 'fusha');
    const card = el(`<div class="card q-card personal">
      <div class="phase-head">${ico3d('pen')}<h2>عبّر عن نفسك</h2><span class="small muted">بدون درجات</span></div>
      <div class="q-audio">${hasClip ? `<button class="pbtn" data-act="qplay" aria-label="اسمع السؤال">${ico3d('speaker')}</button>` : ''}</div>
      <div class="q-text ${showText ? '' : 'hidden'}">${esc(P.q)}</div>
      <p class="small muted">${esc(P.hint || '')}</p>
      <textarea placeholder="اكتب هنا…" aria-label="إجابتك"></textarea>
      <div class="words" data-w>٠ كلمة</div>
      <div class="row mt-3" style="gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary grow" data-act="save" disabled>${ico3d('check', 18)} احفظ وتابع</button>
        <button class="btn btn-ghost" data-act="model">${ico3d('bulb', 18)} مثال</button>
        <button class="btn btn-ghost" data-act="skip">تخطَّ</button>
      </div>
    </div>`);
    stage.appendChild(card);
    const ta = card.querySelector('textarea'), save = card.querySelector('[data-act="save"]'), w = card.querySelector('[data-w]');
    const words = () => ta.value.trim().split(/\s+/).filter(Boolean).length;
    ta.oninput = () => { const n = words(); w.textContent = `${fmt(n)} كلمة`; save.disabled = n < (P.minWords || 3); };
    card.querySelector('[data-act="qplay"]')?.addEventListener('click', () => { sound.play('tap'); audio.play('personal'); });
    if (hasClip) setTimeout(() => audio.play('personal'), 250);
    card.querySelector('[data-act="model"]').onclick = (e) => { sound.play('tap'); if (card.querySelector('.model-answer')) return; e.currentTarget.closest('.row').after(el(`<div class="model-answer">${ico3d('bulb', 18)} <b>مثال:</b> ${esc(P.model)}</div>`)); };
    card.querySelector('[data-act="skip"]').onclick = () => { sound.play('tap'); audio.stop(); finish(s); };
    save.onclick = () => {
      audio.stop();
      const p = store.profile; p.journal = p.journal || []; p.journal.push({ id, q: P.q, a: ta.value.trim(), at: Date.now() }); if (p.journal.length > 50) p.journal.shift(); store.save();
      xp.addGems(2, 'تعبير شخصي'); fx.floater('+٢ ' + ico3d('gem', 18), innerWidth / 2, innerHeight * 0.4, 'xp');
      toast(ico3d('pen') + ' حُفظت إجابتك في دفترك', { type: 'success' });
      finish(s);
    };
  }

  /* ============================================================ results + foreground party */
  function finish(s, aborted = false) {
    document.querySelector('.feedback')?.remove(); document.body.classList.remove('has-feedback');
    audio.stop();
    const r = s.finish(aborted);
    if (!aborted && r.score >= 50 && a.rewards?.gemsOnComplete) xp.addGems(a.rewards.gemsOnComplete, 'إكمال القصة');
    const big = r.perfect ? ico3d('trophy') : r.score >= 80 ? ico3d('flower') : r.score >= 50 ? ico3d('sprout') : ico3d('seed');
    const B = window.__bubbles;
    if (r.perfect) { confetti({ count: 240 }); sound.play('fanfare'); fx.celebrate({ big: true, xp: r.xp, combo: 1 }); [0.2, 0.5, 0.8].forEach((px, i) => setTimeout(() => B?.party?.(innerWidth * px, innerHeight * 0.35, 3), 300 + i * 350)); }
    else if (r.score >= 80) { confetti({ count: 120 }); sound.play('cheer'); fx.celebrate({ xp: r.xp, combo: 2 }); setTimeout(() => B?.party?.(innerWidth / 2, innerHeight * 0.4, 2), 400); }
    else if (r.score >= 50) { sound.play('streak'); fx.celebrate({ xp: r.xp, combo: 1 }); }
    else sound.play('encourage');
    stage.innerHTML = ''; stage.appendChild(bar());
    stage.appendChild(el(`<div class="card q-card">
      <div class="result-big float">${big}</div>
      <h1>${r.perfect ? 'نبتت الوردة وأزهرت!' : r.score >= 80 ? 'أداء رائع!' : r.score >= 50 ? 'النبتة تكبر!' : aborted ? 'نكمّل المرة الجاية' : 'نحاول مرة أخرى — مثل مريم'}</h1>
      <p class="muted">${esc(a.story.title)} — ${esc(a.tracks[audio.lang].label)}</p>
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
      <div class="row mt-6" style="gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary btn-lg grow" data-act="again">${ico('refresh')} مرة أخرى</button>
        <button class="btn btn-lg" data-act="listen">${ico3d('headphones', 20)} أعد الاستماع</button>
        <a href="#/subject/${it.subject}" class="btn btn-lg" aria-label="المادة">${ico('home')}</a>
      </div>
    </div>`));
    stage.querySelector('[data-act="again"]').onclick = () => { sound.play('whoosh'); hearts.regen(); startPhases(); };
    stage.querySelector('[data-act="listen"]').onclick = () => { sound.play('whoosh'); listen(); };
  }
}
