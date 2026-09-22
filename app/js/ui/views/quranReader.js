/**
 * Quran interactive reader (Phase 9) — #/play/quran_<surah>
 *   Mushaf page: one audio file per ayah (exact highlight by construction), tap ayah to jump, sequential play,
 *   repeat-ayah, Dual Engine (Husary Muallim <-> Minshawi), baladi tafsir + word meanings,
 *   classic <-> modern compare (untouched albayyinah.html / quran-alqadr/index.html in an iframe).
 *   Phases (order ayat / fill word / meaning) run through phaseRunner with foreground party FX.
 */
import store from '../../core/store.js';
import registry from '../../core/registry.js';
import sound from '../../engines/sound.js';
import hearts from '../../engines/hearts.js';
import fx from '../../engines/fx.js';
import StoryAudio from '../../engines/storyAudio.js';
import { runPhases } from './phaseRunner.js';
import { el, esc, fmt, hud, toast } from '../components.js';
import { ico } from '../icons.js';
import { ico3d } from '../icons3d.js';
import { crown } from './subject.js';

const AR = (n) => new Intl.NumberFormat('ar-EG').format(n);
const CHEERS = ['أحسنت! ' + ico3d('star'), 'بارك الله فيك! ' + ico3d('sparkle'), 'حافظ صغير! ' + ico3d('quran'), 'ما شاء الله! ' + ico3d('crown')];
const OOPS = ['لا بأس، نعيد الاستماع ' + ico3d('headphones'), 'قريب — ركّز في الآية ' + ico3d('bulb'), 'كل حافظ يخطئ ويكمل ' + ico3d('muscle')];

export async function render(root, { id }) {
  const it = registry.item(id);
  const a = await registry.loadActivity(id);
  const h = hud({ back: true, icon: it.icon || 'quran', title: it.title });
  root.appendChild(h);
  const stage = el('<div class="stage quran"></div>');
  root.appendChild(stage);

  const meta = store.meta;
  const trackKeys = Object.keys(a.tracks);
  const clips = { basmala: Object.fromEntries(trackKeys.map((k) => [k, a.basmala])) };
  a.ayat.forEach((ay) => { clips['a' + ay.n] = Object.fromEntries(trackKeys.map((k) => [k, ay.file])); });
  const audio = new StoryAudio({ base: a.audioBase, tracks: a.tracks, clips, lang: a.tracks[meta.reciter] ? meta.reciter : trackKeys[0] });
  audio.rate = meta.quranRate || 1;
  let showTafsir = meta.quranTafsir !== false;
  let repeat = false, mode = 'modern';
  const cleanups = [];
  window.__bubbles?.setFocus?.(true);

  const byN = (n) => a.ayat.find((x) => x.n === n);
  const questions = [];
  for (const ph of a.phases) {
    if (ph.id === 'order') ph.groups.forEach((g) => questions.push({ type: 'order', phase: ph, font: 'quran', prompt: `رتّب الآيات ${AR(g[0])} – ${AR(g[g.length - 1])}`, items: g.map((n) => ({ t: byN(n).t, icon: 'quran' })), baladi: ph.baladi }));
    else if (ph.id === 'fill') ph.items.forEach((q) => { const ay = byN(q.ayah); questions.push({ type: 'fillblank', phase: ph, font: 'quran', q: ay.t.replace(q.blank, '___'), choices: q.opts, answer: q.opts.indexOf(q.blank), clip: 'a' + q.ayah, baladi: ph.baladi, explain: ay.t }); });
    else if (ph.id === 'meaning') ph.items.forEach((q) => questions.push({ type: 'quiz', phase: ph, q: q.q, choices: q.opts, answer: q.correct, clip: 'a' + q.ayah, baladi: ph.baladi, explain: byN(q.ayah)?.baladi }));
  }

  const cleanup = () => { audio.destroy(); window.__bubbles?.setFocus?.(false); cleanups.forEach((f) => f()); h.__cleanup?.(); document.querySelector('.feedback')?.remove(); document.body.classList.remove('has-feedback'); };
  hearts.regen();
  reader();
  return cleanup;

  /* ---------------- bar ---------------- */
  function bar() {
    const b = el(`<div class="story-bar">
      <div class="seg lang" role="group" aria-label="القارئ">${Object.entries(a.tracks).map(([k, t]) => `<button data-lang="${k}" class="${audio.lang === k ? 'on' : ''}" title="${esc(t.hint || '')}">${ico3d(t.icon || 'speaker')} ${esc(t.label)}</button>`).join('')}</div>
      <div class="seg" role="group" aria-label="التفسير"><button data-act="tafsir" class="${showTafsir ? 'on' : ''}" aria-pressed="${showTafsir}">${ico3d('bulb')} التفسير</button></div>
      <div class="seg" role="group" aria-label="السرعة"><button data-rate="0.8" class="${audio.rate < 1 ? 'on' : ''}" aria-label="بطيء">${ico3d('turtle')}</button><button data-rate="1" class="${audio.rate === 1 ? 'on' : ''}" aria-label="عادي">${ico3d('rabbit')}</button></div>
      <div class="seg" role="group" aria-label="المقارنة" style="margin-inline-start:auto"><button data-act="compare" class="${mode !== 'modern' ? 'on' : ''}" title="قارن بالنسخة الكلاسيكية">${ico3d('compare')} <span class="hide-sm">${mode === 'modern' ? 'كلاسيك' : 'حديث'}</span></button></div>
    </div>`);
    b.querySelectorAll('[data-lang]').forEach((x) => (x.onclick = () => { sound.play('tap'); audio.lang = x.dataset.lang; store.setMeta({ reciter: audio.lang }); b.querySelectorAll('[data-lang]').forEach((y) => y.classList.toggle('on', y.dataset.lang === audio.lang)); toast(ico3d(a.tracks[audio.lang].icon || 'speaker') + ' ' + esc(a.tracks[audio.lang].label), { ms: 1200 }); }));
    b.querySelector('[data-act="tafsir"]').onclick = (e) => { sound.play('tap'); showTafsir = !showTafsir; store.setMeta({ quranTafsir: showTafsir }); e.currentTarget.classList.toggle('on', showTafsir); stage.querySelector('.tafsir')?.classList.toggle('hidden', !showTafsir); stage.querySelectorAll('.hint-baladi').forEach((x) => x.classList.toggle('hidden', !showTafsir)); };
    b.querySelectorAll('[data-rate]').forEach((x) => (x.onclick = () => { sound.play('tick'); audio.rate = Number(x.dataset.rate); store.setMeta({ quranRate: audio.rate }); b.querySelectorAll('[data-rate]').forEach((y) => y.classList.toggle('on', Number(y.dataset.rate) === audio.rate)); }));
    b.querySelector('[data-act="compare"]').onclick = () => { sound.play('whoosh'); audio.stop(); mode = mode === 'modern' ? 'classic' : 'modern'; mode === 'classic' ? classic() : reader(); };
    return b;
  }

  function classic() {
    stage.innerHTML = ''; stage.appendChild(bar());
    const src = registry.href({ href: a.classic });
    stage.appendChild(el(`<div class="card" style="padding:12px">
      <div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:10px">
        <div class="row" style="gap:8px">${ico3d('compare', 28)}<div><b>النسخة الكلاسيكية (${esc(a.classic)})</b><div class="small muted">الملف الأصلي كما هو — بلا أي تعديل</div></div></div>
        <div class="row" style="gap:6px"><a class="btn btn-sm" href="${src}" target="_blank" rel="noopener">${ico('external')} تبويب جديد</a><button class="btn btn-sm btn-primary" data-act="modern">${ico3d('quran', 18)} النسخة الحديثة</button></div>
      </div>
      <iframe class="classic-frame" src="${src}" title="النسخة الكلاسيكية" loading="lazy"></iframe></div>`));
    stage.querySelector('[data-act="modern"]').onclick = () => { sound.play('whoosh'); mode = 'modern'; reader(); };
  }

  /* ---------------- mushaf ---------------- */
  function reader() {
    stage.innerHTML = ''; stage.appendChild(bar());
    const st = store.profile.activities[id];
    const page = el(`<div class="mushaf">
      <div class="mushaf-head"><div class="surah">${ico3d('quran')} سورة ${esc(a.surah.name)}</div><div class="theme">${esc(a.surah.theme)} · ${AR(a.surah.ayat)} آيات · ${a.surah.makki ? 'مكية' : 'مدنية'}</div></div>
      <div class="basmala" role="button" tabindex="0">بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ</div>
      <div class="ayat">${a.ayat.map((ay) => `<span class="ayah" data-n="${ay.n}" role="button" tabindex="0">${esc(ay.t)}<span class="num">${AR(ay.n)}</span></span>`).join(' ')}</div>
      <div class="tafsir ${showTafsir ? '' : 'hidden'}">${ico3d('bulb')}<div class="grow"><div class="k">التفسير الميسّر بالبلدي</div><div class="v">اضغط أي آية لتسمعها وتفهم معناها</div></div></div>
      <div class="q-controls">
        <button class="pbtn" data-act="prev" aria-label="الآية السابقة">${ico3d('arrowUp')}</button>
        <button class="pbtn main" data-act="toggle" aria-label="تشغيل">${ico3d('play')}</button>
        <button class="pbtn" data-act="next" aria-label="الآية التالية">${ico3d('arrowDown')}</button>
        <button class="pbtn" data-act="repeat" aria-label="تكرار الآية" title="تكرار الآية">${ico3d('replay')}</button>
      </div>
      <div class="q-status"><span data-status>${ico3d('headphones', 16)} اضغط تشغيل للتلاوة من البسملة</span><span class="ayah-pill" data-pill></span></div>
    </div>`);
    stage.appendChild(page);
    stage.appendChild(el(`<div class="card mt-3" style="padding:14px">
      <div class="row" style="justify-content:center;gap:12px;flex-wrap:wrap"><span class="tag tag-gold">+${fmt(it.xp || 100)} XP</span><span class="tag tag-cyan">${ico3d('gem', 14)} +${fmt(a.rewards?.gemsOnComplete || 10)}</span>${st ? `<span class="row" style="gap:6px">${crown(st.mastery)}<span class="small muted">أفضل ${fmt(st.best)}٪</span></span>` : ''}</div>
      <button class="btn btn-primary btn-lg btn-block mt-3" data-act="go">${ico3d('rocket', 22)} ابدأ الأنشطة: رتّب · أكمل · افهم</button></div>`));
    const main = page.querySelector('[data-act="toggle"]'), status = page.querySelector('[data-status]'), pill = page.querySelector('[data-pill]'), taf = page.querySelector('.tafsir');
    const ayEls = [...page.querySelectorAll('.ayah')], bas = page.querySelector('.basmala');
    let cur = 0; // 0 = basmala, n = ayah n
    const paint = (n) => {
      cur = n; bas.classList.toggle('now', n === 0);
      ayEls.forEach((e) => { const k = Number(e.dataset.n); e.classList.toggle('now', k === n); e.classList.toggle('done', k < n); });
      pill.textContent = n ? `الآية ${AR(n)} / ${AR(a.ayat.length)}` : 'البسملة';
      const ay = byN(n); taf.querySelector('.words')?.remove();
      taf.querySelector('.v').textContent = ay ? ay.baladi : 'بِسۡمِ ٱللَّهِ: نبدأ باسم الله الرحمن الرحيم';
      const w = Object.entries(ay?.words || {}); if (w.length) taf.querySelector('.grow').appendChild(el(`<div class="words">${w.map(([k, v]) => `<span class="w"><b>${esc(k)}</b>${esc(v)}</span>`).join('')}</div>`));
    };
    const playAyah = (n) => { paint(n); audio.play(n ? 'a' + n : 'basmala'); };
    cleanups.push(
      audio.on('state', ({ playing, lang }) => { main.innerHTML = ico3d(playing ? 'pause' : 'play'); main.classList.toggle('playing', playing); status.innerHTML = playing ? `${ico3d(a.tracks[lang].icon || 'speaker', 16)} ${esc(a.tracks[lang].label)} — ${cur ? 'الآية ' + AR(cur) : 'البسملة'}` : `${ico3d('headphones', 16)} متوقّف — اضغط أي آية`; }),
      audio.on('end', () => {
        if (repeat) return playAyah(cur);
        if (cur < a.ayat.length) return playAyah(cur + 1);
        ayEls.forEach((e) => { e.classList.add('done'); e.classList.remove('now'); }); bas.classList.remove('now');
        fx.floater('ختمت السورة! ' + ico3d('sparkle'), innerWidth / 2, innerHeight * 0.35, 'cheer'); sound.play('sparkle'); window.__bubbles?.party?.(innerWidth / 2, innerHeight * 0.35, 2);
        status.innerHTML = `${ico3d('check', 16)} تمّت التلاوة — جاهز للأنشطة؟`; stage.querySelector('[data-act="go"]')?.classList.add('glow');
      }),
      audio.on('error', () => toast('تعذّر تشغيل التلاوة — حاول مرة أخرى', { type: 'error' })),
    );
    main.onclick = () => { sound.play('tap'); if (audio.playing) audio.pause(); else if (audio.clip) audio.play(); else playAyah(0); };
    page.querySelector('[data-act="prev"]').onclick = () => { sound.play('tick'); playAyah(Math.max(0, cur - 1)); };
    page.querySelector('[data-act="next"]').onclick = () => { sound.play('tick'); playAyah(Math.min(a.ayat.length, cur + 1)); };
    page.querySelector('[data-act="repeat"]').onclick = (e) => { sound.play('tap'); repeat = !repeat; e.currentTarget.classList.toggle('repeat-on', repeat); toast(repeat ? ico3d('replay') + ' تكرار الآية مفعّل' : 'تكرار الآية متوقف', { ms: 1200 }); };
    bas.onclick = () => { sound.play('tick'); playAyah(0); };
    ayEls.forEach((e) => (e.onclick = () => { sound.play('tick'); playAyah(Number(e.dataset.n)); }));
    stage.querySelector('[data-act="go"]').onclick = () => { sound.play('whoosh'); audio.stop(); phases(); };
    paint(0);
    a.ayat.slice(0, 2).forEach((ay) => audio.preload('a' + ay.n));
  }

  function phases() {
    runPhases({
      stage, bar, activity: a, it, phases: a.phases, questions, audio, cleanups,
      cheers: CHEERS, oops: OOPS, stepIcon: 'quran', stepLabel: 'تلاوة',
      showHint: () => showTafsir,
      resultIcons: ['crown', 'quran', 'moon', 'bookPages'],
      resultTitles: ['حافظٌ متقن!', 'ما شاء الله!', 'استمر في الحفظ', 'نعيد الاستماع ونحاول'],
      subtitle: () => `سورة ${a.surah.name} — ${a.tracks[audio.lang].label}`,
      onListen: reader, listenIcon: 'quran', listenLabel: 'المصحف',
    });
  }
}
