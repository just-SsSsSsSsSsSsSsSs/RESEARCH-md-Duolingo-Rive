/**
 * Parent Dashboard - Phase 10 settings section (per child):
 *   - Celebration siren: enabled, sound, duration (sec), volume, condition, parent alert, quiet hours, "try it" preview
 *   - "يعني إيه يا بابا؟": enabled, TTS on/off, speech rate, autoplay
 *   - Privacy: telemetry size + clear
 * Everything is stored in profile.settings and applies instantly (no redeploy). Nothing is hard-coded in the child app.
 *
 * renderSettings(body, { hero, p, save }) -> appends the section cards
 */
import celebration, { SOUNDS, LIMITS } from '../../engines/celebration.js';
import sound from '../../engines/sound.js';
import { speech } from '../../engines/speech.js';
import voice from '../../engines/voice/provider.js';
import cheers from '../../engines/voice/cheers.js';
import vlog from '../../engines/voice/log.js';
import { el, fmt, esc, toast, confirm } from '../components.js';
import { ico } from '../icons.js';
import { ico3d } from '../icons3d.js';

const sw = (on) => `<button type="button" class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${on ? 'true' : 'false'}"></button>`;
const hours = () => Array.from({ length: 24 }, (_, h) => `<option value="${h}">${fmt(h)}:٠٠</option>`).join('');

export function renderSettings(body, { hero, p, save }) {
  const c = celebration.settings(p);
  const ex = { enabled: true, tts: true, rate: 0.9, autoplay: true, ...(p.settings?.explain || {}) };
  const saveC = (patch) => { const next = celebration.saveSettings(patch, p); save(); return next; };
  const saveE = (patch) => { p.settings.explain = { ...ex, ...patch }; Object.assign(ex, patch); save(); };

  /* ---------- celebration ---------- */
  body.appendChild(el(`<div class="section"><h2>${ico3d('party')} سارينة الإنجاز — ${esc(hero.name)}</h2><span class="tag tag-gold">${ico('settings')} تسري فورًا</span></div>`));
  const card = el(`<div class="card stack" data-celebration-settings>
    <p class="small muted">بتشتغل مرة واحدة لما ${esc(hero.name)} يخلّص المرحلة كلها من أولها لآخرها (مش مع كل سؤال). الصوت مُولَّد داخل التطبيق بلا ملفات، ومستواه محدود لحماية السمع.</p>
    <div class="row between"><span>تشغيل السارينة</span>${sw(c.enabled)}<input hidden data-k="enabled"></div>
    <div class="row between"><span>نوع الصوت</span><select class="input" style="width:auto" data-k="sound">${SOUNDS.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>
    <div class="row between"><span>مدة الصوت <b data-out="durationSec">${fmt(c.durationSec)}</b> ثانية</span><input type="range" min="${LIMITS.minSec}" max="${LIMITS.maxSec}" step="5" data-k="durationSec" style="width:46%;accent-color:var(--neon-gold, #ffb84d)"></div>
    <div class="row between"><span>مستوى الصوت <b data-out="volume">${fmt(c.volume)}</b>٪</span><input type="range" min="0" max="100" step="5" data-k="volume" style="width:46%;accent-color:var(--neon-cyan)"></div>
    <div class="row between"><span>شرط التشغيل</span><select class="input" style="width:auto" data-k="condition"><option value="perfect">إكمال المرحلة ١٠٠٪ (كل الإجابات صح)</option><option value="complete">مجرد إكمال المرحلة</option><option value="score">إكمال بنسبة نجاح ≥</option></select></div>
    <div class="row between" data-row="minScore"><span>الحد الأدنى للنسبة <b data-out="minScore">${fmt(c.minScore)}</b>٪</span><input type="range" min="50" max="100" step="5" data-k="minScore" style="width:46%"></div>
    <div class="row between"><span>تنبيه الأب</span><select class="input" style="width:auto" data-k="parentAlert"><option value="none">بدون</option><option value="sound">صوت تنبيه قصير</option><option value="notification">إشعار على الجهاز</option><option value="both">صوت + إشعار</option></select></div>
    <div class="row between"><span>أوقات هادئة (بدون صوت)</span><span class="row" style="gap:6px"><select class="input" style="width:auto" data-k="quietFrom"><option value="">—</option>${hours()}</select><span class="muted">إلى</span><select class="input" style="width:auto" data-k="quietTo"><option value="">—</option>${hours()}</select></span></div>
    <div class="row wrap" style="gap:8px"><button type="button" class="btn btn-gold grow" data-act="preview">${ico3d('play', 20)} جرّب الصوت (٥ ثواني)</button><button type="button" class="btn btn-ghost" data-act="stop">${ico3d('pause', 20)} إيقاف</button><button type="button" class="btn btn-ghost" data-act="notif">${ico('bell') || ico3d('speaker', 20)} السماح بالإشعارات</button></div>
  </div>`);
  // initial values
  card.querySelector('[data-k="sound"]').value = c.sound; card.querySelector('[data-k="condition"]').value = c.condition; card.querySelector('[data-k="parentAlert"]').value = c.parentAlert;
  card.querySelector('[data-k="durationSec"]').value = c.durationSec; card.querySelector('[data-k="volume"]').value = c.volume; card.querySelector('[data-k="minScore"]').value = c.minScore;
  card.querySelector('[data-k="quietFrom"]').value = c.quietFrom ?? ''; card.querySelector('[data-k="quietTo"]').value = c.quietTo ?? '';
  const syncRows = () => { card.querySelector('[data-row="minScore"]').classList.toggle('hidden', card.querySelector('[data-k="condition"]').value !== 'score'); };
  syncRows();
  card.querySelector('.switch').onclick = (e) => { const on = !e.currentTarget.classList.contains('on'); e.currentTarget.classList.toggle('on', on); e.currentTarget.setAttribute('aria-checked', String(on)); saveC({ enabled: on }); sound.play('tap'); toast(on ? 'السارينة شغالة' : 'السارينة متوقفة', { type: 'info' }); };
  card.querySelectorAll('select[data-k]').forEach((s) => { s.onchange = () => { const k = s.dataset.k; const v = (k === 'quietFrom' || k === 'quietTo') ? (s.value === '' ? null : Number(s.value)) : s.value; saveC({ [k]: v }); syncRows(); toast('تم الحفظ ' + ico3d('check'), { type: 'success' }); }; });
  card.querySelectorAll('input[type=range][data-k]').forEach((r) => { r.oninput = () => { card.querySelector(`[data-out="${r.dataset.k}"]`).textContent = fmt(r.value); }; r.onchange = () => { saveC({ [r.dataset.k]: Number(r.value) }); toast('تم الحفظ ' + ico3d('check'), { type: 'success' }); }; });
  card.querySelector('[data-act="preview"]').onclick = () => { const s = celebration.settings(p); celebration.play({ sound: s.sound, durationSec: 5, volume: s.volume }); };
  card.querySelector('[data-act="stop"]').onclick = () => celebration.stop();
  card.querySelector('[data-act="notif"]').onclick = async () => { if (typeof Notification === 'undefined') { toast('الإشعارات غير مدعومة هنا', { type: 'error' }); return; } const r = await Notification.requestPermission(); toast(r === 'granted' ? 'تم السماح بالإشعارات ' + ico3d('check') : 'لم يُسمح بالإشعارات', { type: r === 'granted' ? 'success' : 'info' }); };
  body.appendChild(card);

  /* ---------- explain ---------- */
  body.appendChild(el(`<div class="section"><h2>${ico3d('speechBubble')} «يعني إيه يا بابا؟»</h2></div>`));
  const ex_card = el(`<div class="card stack" data-explain-settings>
    <p class="small muted">زرار كبير تحت كل سؤال يشرحه بالصوت وبأكتر من طريقة (اقرأهالك، حدوتة، من حياتك، خطوة خطوة) من غير ما يقول الإجابة على طول.</p>
    <div class="row between"><span>إظهار الزرار</span>${sw(ex.enabled)}</div>
    <div class="row between"><span>القراءة بالصوت (TTS)</span>${sw(ex.tts)}</div>
    <div class="row between"><span>تشغيل الصوت تلقائيًا مع الشرح</span>${sw(ex.autoplay)}</div>
    <div class="row between"><span>سرعة الكلام <b data-out="rate">${ex.rate}</b></span><input type="range" min="0.6" max="1.2" step="0.05" value="${ex.rate}" data-k="rate" style="width:46%"></div>
    <div class="row between" style="gap:8px"><span>الصوت</span><select data-k="voice" class="btn btn-sm" style="max-width:58%"><option value="">تلقائي (أفضل صوت متاح)</option></select></div>
    <div class="row between" style="gap:8px"><span class="small muted" data-voice-hint></span><button type="button" class="btn btn-sm btn-cyan" data-act="test-voice">${ico3d('speaker', 18)} اسمع تجربة</button></div>
    <div class="row between" style="gap:8px;margin-top:6px"><span class="small muted">فحص الصوت على الجهاز ده</span><button type="button" class="btn btn-sm btn-ghost" data-act="diag-voice">${ico3d('question', 18)} افحص الصوت</button></div>
    <div class="small voice-diag" data-voice-diag hidden></div>
    <div class="row between" style="gap:8px;margin-top:10px"><span>قراءة سؤال الماث بالصوت أول ما يظهر</span><button type="button" class="switch${ex.readQuestion !== false ? ' on' : ''}" role="switch" aria-checked="${ex.readQuestion !== false}" data-readq-switch aria-label="قراءة السؤال بالصوت"></button></div>
    <div class="row between" style="gap:8px;margin-top:10px"><span>تشجيع صوتي (بر الوالدين، الإخوة، الأذكار)</span><button type="button" class="switch${ex.cheers !== false ? ' on' : ''}" role="switch" aria-checked="${ex.cheers !== false}" data-cheers-switch aria-label="تشجيع صوتي"></button></div>
    <div class="row between" style="gap:8px;margin-top:6px"><span>صوت الحكّاي</span><select data-k="voicePack">${Object.entries(cheers.PACKS).map(([k, n]) => `<option value="${k}"${(ex.voicePack || cheers.DEFAULT_PACK) === k ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
    <details class="voice-log-box" style="margin-top:10px" data-voice-log-box><summary>سجل الكلمات المنطوقة (للمراجعة والنسخ)</summary>
      <div class="row" style="gap:8px;margin:8px 0"><button type="button" class="btn btn-sm btn-cyan" data-act="vlog-copy">نسخ النص</button><button type="button" class="btn btn-sm btn-ghost" data-act="vlog-clear">مسح السجل</button><span class="small muted" data-vlog-count></span></div>
      <ol class="voice-log small" data-voice-log></ol>
    </details>
  </div>`);
  const exSw = ex_card.querySelectorAll('.switch'); const keys = ['enabled', 'tts', 'autoplay'];
  exSw.forEach((b, i) => { if (!keys[i]) return; b.onclick = () => { const on = !b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); saveE({ [keys[i]]: on }); sound.play('tap'); }; });
  const rate = ex_card.querySelector('[data-k="rate"]'); rate.oninput = () => { ex_card.querySelector('[data-out="rate"]').textContent = rate.value; }; rate.onchange = () => { saveE({ rate: Number(rate.value) }); toast('تم الحفظ ' + ico3d('check'), { type: 'success' }); };
  // Phase 11 K4: voice picker (ranked list; auto = best available). Edge -> Salma/Shakir Natural; Android -> Google voices.
  const sel = ex_card.querySelector('[data-k="voice"]'), hint = ex_card.querySelector('[data-voice-hint]');
  const fillVoices = () => {
    const vs = speech.voices(); sel.querySelectorAll('option:not([value=""])').forEach((o) => o.remove());
    vs.forEach((v) => { const o = document.createElement('option'); o.value = v.name; o.textContent = `${v.name}${speech.isNatural(v) ? ' (طبيعي)' : ''}`; if (ex.voice === v.name) o.selected = true; sel.appendChild(o); });
    const best = vs[0];
    hint.textContent = !speech.available ? 'المتصفح ده مفيهوش قراءة صوتية' : !vs.length ? 'مفيش صوت عربي مثبّت — على أندرويد: إعدادات > تحويل النص لكلام > تحميل صوت عربي؛ على ويندوز: استعمل Edge لصوت سلمى/شاكر الطبيعي' : `المتاح: ${fmt(vs.length)} صوت عربي — الأفضل تلقائيًا: ${best.name}${speech.isNatural(best) ? ' (طبيعي)' : ' (عادي)'}`;
  };
  fillVoices(); if (speech.available) speechSynthesis.addEventListener?.('voiceschanged', fillVoices);
  sel.onchange = () => { saveE({ voice: sel.value || undefined }); toast('تم الحفظ ' + ico3d('check'), { type: 'success' }); };
  ex_card.querySelector('[data-act="test-voice"]').onclick = () => { sound.play('tap'); speech.speak('أهلًا يا بطل! عندك ٣ كراتين، كل كرتونة فيها ٤ بيضات. يعني ٣ في ٤ يساوي ١٢ بيضة.'); };
  // Phase 13 P3c: device voice diagnostics - measured, not assumed (owner request, gist 5e7813f5 #5).
  // A real 1-sentence TTS utterance is timed: onstart + a plausible duration = the OS really spoke; an instant
  // onend / no onstart = silent engine (the Android case). The recorded-clips path is what the child hears.
  ex_card.querySelector('[data-act="diag-voice"]').onclick = async () => {
    sound.play('tap'); voice.unlock();
    const box = ex_card.querySelector('[data-voice-diag]'); box.hidden = false; box.textContent = 'بفحص...';
    const d = await voice.diagnose();
    const probe = await new Promise((res) => {
      if (!speech.available) return res({ started: false, ms: 0, err: 'no-api' });
      try {
        const u = new SpeechSynthesisUtterance('تلاتة في أربعة'); u.lang = 'ar-EG'; const v = speech.voice(); if (v) u.voice = v;
        let t0 = 0; const t = setTimeout(() => res({ started: !!t0, ms: t0 ? Math.round(performance.now() - t0) : 0, err: 'timeout' }), 4000);
        u.onstart = () => { t0 = performance.now(); };
        u.onend = () => { clearTimeout(t); res({ started: !!t0, ms: t0 ? Math.round(performance.now() - t0) : 0 }); };
        u.onerror = (e) => { clearTimeout(t); res({ started: !!t0, ms: 0, err: e?.error || 'error' }); };
        speechSynthesis.cancel(); speechSynthesis.speak(u);
      } catch (e) { res({ started: false, ms: 0, err: String(e) }); }
    });
    const ttsOk = probe.started && probe.ms >= 400;
    const lines = [
      `الصوت المسجّل (صوت الشرح): ${d.clips ? `شغال — ${d.clipCount} مقطع` : 'مش متاح (مشكلة تحميل)'}`,
      `صوت الجهاز (قراءة المتصفح): ${!d.tts ? 'المتصفح مفيهوش قراءة صوتية' : ttsOk ? `شغال (${probe.ms}ms)` : `صامت — ${probe.started ? `خلص في ${probe.ms}ms` : 'ما بدأش'}${probe.err ? ` (${probe.err})` : ''}`}`,
      `أصوات عربي على الجهاز: ${d.arabicVoices.length ? d.arabicVoices.slice(0, 3).join('، ') : 'مفيش'}`,
      `اللي سليم هيسمعه: ${d.clips ? 'الصوت المصري المسجّل' : ttsOk ? 'صوت الجهاز' : 'تظليل الكلمات بس (بدون صوت)'}`,
    ];
    box.innerHTML = lines.map((l) => `<div>${esc(l)}</div>`).join('');
    window.__voiceDiag = { ...d, probe, ttsOk }; // E2E hook (read-only)
  };
  // Phase 14: encouragement switch, voice pack, spoken-words log (parent reviews / copies / asks for edits)
  // Phase 15.1: read the math question aloud (recorded clips; the speaker button beside the question always works)
  const qsw = ex_card.querySelector('[data-readq-switch]');
  qsw.onclick = () => { const on = !qsw.classList.contains('on'); qsw.classList.toggle('on', on); qsw.setAttribute('aria-checked', String(on)); saveE({ readQuestion: on }); sound.play('tap'); };
  const csw = ex_card.querySelector('[data-cheers-switch]');
  csw.onclick = () => { const on = !csw.classList.contains('on'); csw.classList.toggle('on', on); csw.setAttribute('aria-checked', String(on)); saveE({ cheers: on }); sound.play('tap'); };
  ex_card.querySelector('[data-k="voicePack"]').onchange = (e) => { saveE({ voicePack: e.target.value }); toast('تم الحفظ ' + ico3d('check'), { type: 'success' }); };
  const HN = { selim: 'سليم', karma: 'كارما', kenda: 'كندة' };
  const renderLog = () => {
    const items = vlog.list(); ex_card.querySelector('[data-vlog-count]').textContent = `${items.length} جملة`;
    ex_card.querySelector('[data-voice-log]').innerHTML = items.length ? items.map((e) => `<li><div>${esc(e.text)}${e.n > 1 ? ` <span class="vl-meta">(×${e.n})</span>` : ''}</div><div class="vl-meta">${e.kind === 'cheer' ? 'تشجيع' : e.kind === 'question' ? 'سؤال' : 'شرح'}${e.hero ? ' — ' + (HN[e.hero] || e.hero) : ''} — ${new Date(e.t).toLocaleString('ar-EG')}${e.src ? ` — <span class="vl-review">المصدر: ${esc(e.src)} (يحتاج مراجعتك)</span>` : ''}</div></li>`).join('') : '<li class="muted">لسه مفيش كلام اتقال.</li>';
  };
  ex_card.querySelector('[data-voice-log-box]').addEventListener('toggle', renderLog); renderLog();
  ex_card.querySelector('[data-act="vlog-copy"]').onclick = async () => {
    const txt = vlog.asText(); window.__vlogCopied = txt;
    try { await navigator.clipboard.writeText(txt); toast('اتنسخ ' + ico3d('check'), { type: 'success' }); }
    catch { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch { /* noop */ } ta.remove(); toast('اتنسخ ' + ico3d('check'), { type: 'success' }); }
  };
  ex_card.querySelector('[data-act="vlog-clear"]').onclick = () => { vlog.clear(); renderLog(); sound.play('tap'); };
  body.appendChild(ex_card);

  /* ---------- privacy ---------- */
  const n = (p.events || []).length, kb = Math.round(JSON.stringify(p.events || []).length / 1024);
  const pv = el(`<div class="card row between"><div><b class="small">${ico('lock')} بيانات التعلّم (على هذا الجهاز فقط)</b><div class="small muted">${fmt(n)} حدث • ${fmt(kb)} ك.ب — تُستخدم لتقرير نقاط الضعف فقط، ولا تُرسل لأي طرف.</div></div><button type="button" class="btn btn-sm btn-ghost" data-act="clear-events">${ico('eraser')} مسح الأحداث</button></div>`);
  pv.querySelector('[data-act="clear-events"]').onclick = async () => { if (await confirm('مسح بيانات التعلّم؟', '<p class="muted">سيُمسح سجل الأحداث فقط (النقاط والشارات تبقى). تقرير نقاط الضعف سيبدأ من جديد.</p>', 'نعم، امسح', 'إلغاء')) { p.events = []; save(); toast('تم المسح', { type: 'info' }); pv.querySelector('.small.muted').textContent = '٠ حدث'; } };
  body.appendChild(pv);
}

export default renderSettings;
