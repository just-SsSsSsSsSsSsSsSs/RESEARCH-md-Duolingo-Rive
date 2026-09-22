/**
 * Parent Dashboard — PIN protected (4 digits, stored hashed).
 * Per-child: level, streak, accuracy, 7-day XP/minutes chart, per-activity mastery table,
 * subject breakdown. Global: export/import JSON backup, reset child, set PIN, difficulty.
 */
import store, { HEROES } from '../../core/store.js';
import registry from '../../core/registry.js';
import router from '../../core/router.js';
import sound from '../../engines/sound.js';
import { levelInfo } from '../../engines/xp.js';
import { BADGES } from '../../engines/badges.js';
import { el, fmt, esc, hud, nav, modal, confirm, toast } from '../components.js';
import { ico } from '../icons.js';
import { ico3d } from '../icons3d.js';

async function hash(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('abtal:' + s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
let unlockedAt = 0;

export async function render(root) {
  const authed = Date.now() - unlockedAt < 10 * 60 * 1000;
  if (!authed) return renderPin(root);
  return renderDash(root);
}

/* ---------- PIN ---------- */
function renderPin(root) {
  const hasPin = !!store.meta.parentPin;
  root.innerHTML = `
    <div class="center" style="padding:6vh 0 16px"><div class="float" style="display:grid;place-items:center">${ico3d('lock', 72)}</div><h1>لوحة الأهل</h1><p class="muted">${hasPin ? 'أدخل الرقم السري (٤ أرقام)' : 'أول مرة؟ اختر رقماً سرياً من ٤ أرقام'}</p></div>
    <div class="card" style="max-width:380px;margin:0 auto">
      <div class="pin">${[0, 1, 2, 3].map((i) => `<input inputmode="numeric" pattern="[0-9]*" maxlength="1" aria-label="رقم ${i + 1}">`).join('')}</div>
      <p class="small muted center mt-3 msg"></p>
      <div class="center mt-3"><a href="#/profile" class="btn btn-ghost btn-sm">${ico('back')} رجوع للأبطال</a></div>
      ${hasPin ? '<p class="small muted center mt-3">نسيت الرقم؟ امسح بيانات المتصفح لهذه الصفحة أو استخدم نسخة احتياطية.</p>' : ''}
    </div>`;
  const inputs = [...root.querySelectorAll('.pin input')];
  const msg = root.querySelector('.msg');
  inputs[0].focus();
  inputs.forEach((inp, i) => {
    inp.addEventListener('input', async () => {
      inp.value = inp.value.replace(/\D/g, '').slice(-1);
      if (inp.value && i < 3) inputs[i + 1].focus();
      const code = inputs.map((x) => x.value).join('');
      if (code.length === 4) {
        const hsh = await hash(code);
        if (!hasPin) { store.setMeta({ parentPin: hsh }); toast(ico3d('lock') + ' تم حفظ الرقم السري', { type: 'success' }); unlockedAt = Date.now(); sound.play('correct'); renderDashInto(root); }
        else if (hsh === store.meta.parentPin) { unlockedAt = Date.now(); sound.play('correct'); renderDashInto(root); }
        else { sound.play('wrong'); msg.innerHTML = 'رقم غير صحيح ' + ico3d('cross', 18); inputs.forEach((x) => (x.value = '')); inputs[0].focus(); }
      }
    });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !inp.value && i > 0) inputs[i - 1].focus(); });
  });
}
function renderDashInto(root) { root.innerHTML = ''; renderDash(root); }

/* ---------- Dashboard ---------- */
function renderDash(root) {
  const items = registry.items();
  root.appendChild(el(`<div class="topbar"><a href="#/profile" class="btn btn-icon btn-ghost" aria-label="رجوع">${ico('back')}</a><b class="grow">${ico3d('family')} لوحة الأهل</b><span class="tag tag-green">${ico('lock')} مفتوحة ١٠ دقائق</span></div>`));

  const profiles = store.listProfiles();
  const tabs = el('<div class="row wrap mb-4"></div>');
  const body = el('<div class="stack"></div>');
  let active = profiles.find((p) => p.state)?.hero.id || HEROES[0].id;
  const drawTabs = () => { tabs.innerHTML = ''; profiles.forEach(({ hero, state }) => { const b = el(`<button class="btn ${hero.id === active ? 'btn-primary' : ''}" style="${hero.id === active ? `background:${hero.hex};color:#04311f;box-shadow:0 6px 18px ${hero.hex}55` : ''}">${ico3d(hero.emoji, 20)} ${esc(hero.name)} ${state ? '' : '<span class="small muted">(لم يبدأ)</span>'}</button>`); b.onclick = () => { active = hero.id; sound.play('tap'); drawTabs(); drawChild(); }; tabs.appendChild(b); }); };
  root.appendChild(tabs); root.appendChild(body);

  const drawChild = () => {
    body.innerHTML = '';
    const { hero, state: p } = profiles.find((x) => x.hero.id === active);
    if (!p) { body.appendChild(el(`<div class="card center muted">${ico3d(hero.emoji, 22)} ${esc(hero.name)} لم يبدأ بعد — اختر البطل من الصفحة الرئيسية لبدء رحلته.</div>`)); return; }
    const li = levelInfo(p.xp);
    const acc = p.counters.answers ? Math.round((p.counters.correct / p.counters.answers) * 100) : 0;
    const days = lastDays(p, 7);
    const maxXp = Math.max(1, ...days.map((d) => d.xp));
    const weekXp = days.reduce((s, d) => s + d.xp, 0), weekMin = days.reduce((s, d) => s + d.minutes, 0), weekAns = days.reduce((s, d) => s + d.answers, 0), weekCor = days.reduce((s, d) => s + d.correct, 0);
    const activeDays = days.filter((d) => d.activities.length).length;

    body.appendChild(el(`<div class="card" style="border-color:${hero.hex}55">
      <div class="row"><div style="display:grid;place-items:center">${ico3d(hero.emoji, 56)}</div><div class="grow"><h2 style="color:${hero.hex}">${esc(hero.name)}</h2><p class="muted small">مستوى ${fmt(li.level)} • ${esc(li.title)} • انضم ${new Date(p.createdAt).toLocaleDateString('ar-EG')}</p></div></div>
      <div class="stats" style="grid-template-columns:repeat(4,1fr)">
        <div class="stat"><b>${fmt(p.xp)}</b><span>XP إجمالي</span></div>
        <div class="stat"><b>${fmt(p.streak.count)}</b><span>شعلة (أفضل ${fmt(p.streak.best)})</span></div>
        <div class="stat"><b>${fmt(acc)}٪</b><span>الدقة الكلية</span></div>
        <div class="stat"><b>${fmt(p.counters.minutes)}</b><span>دقيقة تعلّم</span></div>
      </div>
    </div>`));

    body.appendChild(el(`<div class="section"><h2>${ico('chart')} آخر ٧ أيام</h2><span class="tag tag-cyan">${fmt(activeDays)}/٧ أيام نشطة</span></div>`));
    body.appendChild(el(`<div class="card">
      <div class="chart">${days.map((d) => `<div class="bar" title="${d.key}: ${fmt(d.xp)} XP"><span style="color:var(--text-2);font-weight:800">${d.xp ? fmt(d.xp) : ''}</span><i style="height:${Math.max(3, Math.round((d.xp / maxXp) * 85))}%"></i><span>${d.label}</span></div>`).join('')}</div>
      <div class="stats" style="grid-template-columns:repeat(4,1fr);margin-bottom:0">
        <div class="stat"><b>${fmt(weekXp)}</b><span>XP</span></div>
        <div class="stat"><b>${fmt(weekMin)}</b><span>دقيقة</span></div>
        <div class="stat"><b>${fmt(weekAns)}</b><span>سؤال</span></div>
        <div class="stat"><b>${weekAns ? fmt(Math.round((weekCor / weekAns) * 100)) : '٠'}٪</b><span>دقة الأسبوع</span></div>
      </div>
    </div>`));

    // subjects breakdown
    body.appendChild(el(`<div class="section"><h2>${ico3d('book')} المواد</h2></div>`));
    const subj = el('<div class="card stack"></div>');
    for (const s of registry.subjects()) {
      const its = items.filter((i) => i.subject === s.id && !i.external);
      if (!its.length) continue;
      const done = its.filter((i) => p.activities[i.id]?.plays).length;
      const mastered = its.filter((i) => p.activities[i.id]?.mastery >= 5).length;
      const stats = its.reduce((a, i) => { const st = p.activities[i.id]; if (st) { a.c += st.correct; a.t += st.total; } return a; }, { c: 0, t: 0 });
      subj.appendChild(el(`<div class="row"><span class="i3d-lg">${ico3d(s.icon, 28)}</span><div class="grow"><div class="row between"><b class="small">${esc(s.title)}</b><span class="small muted">${fmt(done)}/${fmt(its.length)} مجرَّب • ${fmt(mastered)} متقن • دقة ${stats.t ? fmt(Math.round((stats.c / stats.t) * 100)) : '—'}٪</span></div><div class="level-bar" style="height:8px;margin-top:4px"><span style="width:${Math.round((done / its.length) * 100)}%;background:${s.color}"></span></div></div></div>`));
    }
    body.appendChild(subj);

    // activities table
    const played = Object.entries(p.activities).map(([id, st]) => ({ it: registry.item(id), st })).filter((x) => x.it).sort((a, b) => b.st.lastPlayed - a.st.lastPlayed);
    body.appendChild(el(`<div class="section"><h2>${ico3d('note')} تفاصيل الأنشطة</h2><span class="tag tag-purple">${fmt(played.length)}</span></div>`));
    body.appendChild(el(`<div class="card" style="overflow:auto">${played.length ? `<table class="table"><thead><tr><th>النشاط</th><th>مرات</th><th>أفضل</th><th>دقة</th><th>إتقان</th><th>آخر لعب</th></tr></thead><tbody>
      ${played.map(({ it, st }) => `<tr><td>${ico3d(it.icon, 18)} ${esc(it.title)}</td><td>${fmt(st.plays)}</td><td>${fmt(st.best)}٪</td><td>${st.total ? fmt(Math.round((st.correct / st.total) * 100)) : '—'}٪</td><td>${ico3d('crown').repeat(st.mastery)}${'·'.repeat(5 - st.mastery)}</td><td class="small muted">${new Date(st.lastPlayed).toLocaleDateString('ar-EG')}</td></tr>`).join('')}</tbody></table>` : '<p class="muted center">لم يلعب أي نشاط بعد</p>'}</div>`));

    // badges & certificates
    const earned = BADGES.filter((b) => p.badges[b.id]);
    body.appendChild(el(`<div class="section"><h2>${ico3d('medal')} شارات وشهادات</h2><span class="tag tag-gold">${fmt(earned.length)} شارة • ${fmt(p.certificates.length)} شهادة</span></div>`));
    body.appendChild(el(`<div class="card"><div class="row wrap" style="gap:6px">${earned.length ? earned.map((b) => `<span class="tag tag-gold" style="font-size:13px;padding:5px 10px">${b.icon} ${esc(b.name)}</span>`).join('') : '<span class="muted small">لا شارات بعد</span>'}</div>
      ${p.certificates.length ? `<div class="stack mt-3">${p.certificates.slice().reverse().map((c) => `<a href="#/certificate/${c.id}?parent=1" class="row small" style="padding:8px;border-radius:10px;background:rgba(255,255,255,.04)"><span></span><b class="grow">${esc(c.title)}</b><span class="muted">${new Date(c.date).toLocaleDateString('ar-EG')}</span>${ico('printer')}</a>`).join('')}</div>` : ''}</div>`));

    // controls for this child
    body.appendChild(el(`<div class="section"><h2>${ico('settings')} إعدادات ${esc(hero.name)}</h2></div>`));
    const ctl = el(`<div class="card stack">
      <div class="row between"><span>مستوى الصعوبة للأسئلة المولَّدة</span><select class="input" style="width:auto" data-act="diff"><option value="easy">سهل</option><option value="auto">تلقائي</option><option value="hard">صعب</option></select></div>
      <div class="row between"><span>إعادة القلوب الآن </span><button class="btn btn-sm" data-act="hearts">املأ القلوب</button></div>
      <div class="row between"><span>منح جواهر مكافأة </span><button class="btn btn-sm btn-gold" data-act="gems">+٢٠ جوهرة</button></div>
      <div class="row between"><span style="color:var(--neon-rose)">تصفير كل تقدم ${esc(hero.name)}</span><button class="btn btn-sm btn-rose" data-act="reset">${ico('eraser')} تصفير</button></div>
    </div>`);
    ctl.querySelector('[data-act="diff"]').value = p.settings?.difficulty || 'auto';
    ctl.querySelector('[data-act="diff"]').onchange = (e) => { p.settings.difficulty = e.target.value; saveProfile(hero.id, p); toast('تم الحفظ ' + ico3d('check'), { type: 'success' }); };
    ctl.querySelector('[data-act="hearts"]').onclick = () => { p.hearts = 5; p.heartsLostAt = null; saveProfile(hero.id, p); toast(ico3d('heart') + ' القلوب مليانة', { type: 'success' }); };
    ctl.querySelector('[data-act="gems"]').onclick = () => { p.gems += 20; saveProfile(hero.id, p); toast(ico3d('gem') + ' +٢٠ جوهرة', { type: 'gold' }); drawChild(); };
    ctl.querySelector('[data-act="reset"]').onclick = async () => { if (await confirm('تصفير التقدم؟', `<p class="muted">سيتم حذف كل نقاط وشارات وشهادات <b>${esc(hero.name)}</b>. لا يمكن التراجع.</p>`, 'نعم، صفّر', 'إلغاء')) { store.resetProfile(hero.id); toast('تم التصفير', { type: 'info' }); location.reload(); } };
    body.appendChild(ctl);
  };
  drawTabs(); drawChild();

  // global controls
  root.appendChild(el(`<div class="section"><h2>${ico3d('archive')} النسخ الاحتياطي والأمان</h2></div>`));
  const g = el(`<div class="card stack">
    <p class="small muted">البيانات محفوظة على هذا الجهاز فقط. صدّر نسخة احتياطية لنقلها لجهاز آخر أو للحفظ.</p>
    <div class="row wrap"><button class="btn btn-cyan grow" data-act="export">${ico('download')} تصدير نسخة (JSON)</button><label class="btn grow" style="cursor:pointer">${ico('upload')} استيراد نسخة<input type="file" accept="application/json" hidden data-act="import"></label></div>
    <div class="row between"><span>تغيير الرقم السري</span><button class="btn btn-sm" data-act="pin">${ico('lock')} تغيير</button></div>
    <div class="row between"><span> الأصوات (عام)</span><button class="switch ${sound.enabled ? 'on' : ''}" data-act="sound"></button></div>
    <div class="row between"><span style="color:var(--neon-rose)">مسح كل بيانات المنصة</span><button class="btn btn-sm btn-rose" data-act="wipe">مسح الكل</button></div>
  </div>`);
  g.querySelector('[data-act="export"]').onclick = () => { const blob = new Blob([store.exportAll()], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `abtal_backup_${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href); toast(ico3d('box') + ' تم التصدير', { type: 'success' }); };
  g.querySelector('[data-act="import"]').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; try { store.importAll(await f.text()); toast(ico3d('check') + ' تم الاستيراد', { type: 'success' }); setTimeout(() => location.reload(), 600); } catch (err) { toast('ملف غير صالح ' + ico3d('cross'), { type: 'error' }); } };
  g.querySelector('[data-act="pin"]').onclick = async () => {
    const bdPromise = modal({ title: 'رقم سري جديد', body: '<input class="input" inputmode="numeric" maxlength="4" placeholder="٤ أرقام" data-np style="text-align:center;font-size:24px;letter-spacing:6px">', actions: [{ label: 'إلغاء', cls: 'btn-ghost', value: null }, { label: 'حفظ', cls: 'btn-primary', value: 'ok', onClick: async (bd) => { const val = bd.querySelector('[data-np]').value.replace(/\D/g, ''); if (val.length !== 4) { toast('٤ أرقام بالضبط', { type: 'error' }); return false; } store.setMeta({ parentPin: await hash(val) }); toast(ico3d('lock') + ' تم تغيير الرقم', { type: 'success' }); } }] });
    await bdPromise;
  };
  g.querySelector('[data-act="sound"]').onclick = (e) => { const on = sound.toggle(); e.currentTarget.classList.toggle('on', on); };
  g.querySelector('[data-act="wipe"]').onclick = async () => { if (await confirm('مسح كل البيانات؟', '<p class="muted">سيتم حذف كل الأبطال والتقدم والرقم السري. صدّر نسخة أولاً!</p>', 'نعم، امسح الكل', 'إلغاء')) store.wipeAll(); };
  root.appendChild(g);
  root.appendChild(nav('parent'));
}

function saveProfile(id, p) { if (store.profile?.id === id) { Object.assign(store.profile, p); store.save(true); } else localStorage.setItem(`abtal:v1:profile:${id}`, JSON.stringify(p)); }
function lastDays(p, n) { const out = []; for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; out.push({ key: k, label: d.toLocaleDateString('ar-EG', { weekday: 'short' }), ...(p.daily[k] || { xp: 0, minutes: 0, answers: 0, correct: 0, activities: [] }) }); } return out; }
