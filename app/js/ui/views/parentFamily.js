/**
 * Parent dashboard section: family card + guests (Phase 19 M3). Rendered only inside the PIN-gated area.
 *  - Share card: Web Share API (file) -> download fallback -> copy-to-clipboard fallback.
 *  - Import card: file picker or pasted JSON; validated + whitelist-checked before merging (monotonic).
 *  - Guests: rename locally (label never travels), remove one, clear all.
 * No network. The payload holds hero ids + day-level buckets only.
 */
import family from '../../engines/family.js';
import { el, fmt, esc, modal, confirm, toast } from '../components.js';
import { ico } from '../icons.js';
import { ico3d } from '../icons3d.js';

const fileName = () => `abtal_family_card_${new Date().toISOString().slice(0, 10)}.json`;

async function shareCard() {
  const json = family.cardJSON();
  if (!family.core.cardIsClean(json)) { toast('الكارت فيه بيانات زيادة، تم الايقاف', { type: 'error' }); return 'blocked'; }
  const blob = new Blob([json], { type: 'application/json' });
  try {
    const file = new File([blob], fileName(), { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'كارت العيلة' }); return 'shared'; }
  } catch (e) { if (e?.name === 'AbortError') return 'cancelled'; }
  try {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fileName(); a.click(); URL.revokeObjectURL(a.href); return 'downloaded';
  } catch { /* fall through */ }
  try { await navigator.clipboard.writeText(json); return 'copied'; } catch { return 'failed'; }
}

export function renderFamilySection(root) {
  root.appendChild(el(`<div class="section"><h2>${ico3d('family')} كارت العيلة والضيوف</h2></div>`));
  const card = el(`<div class="card stack" data-sec="family">
    <p class="small muted">كارت العيلة ملف صغير فيه ارقام الاسبوع بس (اجابات، صح، دقائق) بدون اسماء ولا اي بيانات شخصية. ابعتوه لجهاز قريب يستورده، فيظهر اولاده على لوحة الشرف عندكم كضيوف، وبالعكس.</p>
    <div class="row wrap">
      <button class="btn btn-cyan grow" data-act="fam-share">${ico('upload')} مشاركة كارت العيلة</button>
      <label class="btn grow" style="cursor:pointer">${ico('download')} استيراد كارت<input type="file" accept="application/json,.json" hidden data-act="fam-import"></label>
      <button class="btn btn-ghost" data-act="fam-paste">لصق نص الكارت</button>
    </div>
    <details class="small muted"><summary>ايه اللي جوه الكارت بالظبط؟</summary><pre data-preview style="direction:ltr;text-align:left;white-space:pre-wrap;word-break:break-all;font-size:11px;max-height:140px;overflow:auto;margin-top:6px"></pre></details>
    <div class="row between"><b>الضيوف على اللوحة</b><span class="tag tag-purple" data-count>0</span></div>
    <div class="fam-guests" data-guests></div>
    <div class="row between"><span style="color:var(--neon-rose)">مسح كل الضيوف من هذا الجهاز</span><button class="btn btn-sm btn-rose" data-act="fam-clear">مسح الضيوف</button></div>
  </div>`);
  root.appendChild(card);

  const preview = card.querySelector('[data-preview]');
  const list = card.querySelector('[data-guests]');
  const count = card.querySelector('[data-count]');
  const draw = () => {
    const guests = family.members().filter((m) => m.guest);
    count.textContent = fmt(guests.length);
    list.innerHTML = '';
    if (!guests.length) { list.appendChild(el('<div class="small muted">مفيش ضيوف لسه. استورد كارت من جهاز قريب.</div>')); }
    guests.forEach((g) => {
      const days = Object.keys(g.daily || {}).length;
      const row = el(`<div class="fam-guest" data-guest="${esc(g.id)}"><span class="fam-dot" style="width:14px;height:14px;border-radius:50%;background:${esc(g.hex)};flex:none"></span><input class="input" maxlength="24" value="${esc(g.name)}" aria-label="اسم الضيف (محلي فقط)"><span class="small muted">${fmt(days)} يوم</span><button class="btn btn-sm btn-ghost" data-act="fam-remove" aria-label="حذف الضيف">${ico('x')}</button></div>`);
      row.querySelector('input').addEventListener('change', (e) => { family.renameGuest(g.id, e.target.value); toast('الاسم محفوظ على هذا الجهاز فقط', { type: 'info' }); });
      row.querySelector('[data-act="fam-remove"]').onclick = async () => { if (await confirm('حذف الضيف؟', `<p class="muted">هيتشال من اللوحة على هذا الجهاز بس.</p>`, 'نعم، احذف', 'الغاء')) { family.removeGuest(g.id); draw(); } };
      list.appendChild(row);
    });
    try { preview.textContent = JSON.stringify(JSON.parse(family.cardJSON()), null, 1); } catch { preview.textContent = ''; }
  };
  draw();

  const applyText = (txt) => {
    try {
      const res = family.importCard(txt);
      if (res.own) { toast('ده كارت جهازكم انتم، مش محتاج استيراد', { type: 'info' }); return; }
      toast(`${ico3d('check')} تم: ${fmt(res.added)} ضيف جديد، ${fmt(res.updated)} تحديث`, { type: 'success' }); draw();
    } catch (err) { toast('كارت غير صالح ' + ico3d('cross'), { type: 'error' }); }
  };
  card.querySelector('[data-act="fam-share"]').onclick = async () => {
    const r = await shareCard();
    const msg = { shared: 'تمت المشاركة', downloaded: 'تم تنزيل الكارت', copied: 'تم نسخ الكارت، ابعتوه كنص', cancelled: '', blocked: '', failed: 'المتصفح منع المشاركة' }[r];
    if (msg) toast(ico3d('box') + ' ' + msg, { type: r === 'failed' ? 'error' : 'success' });
  };
  card.querySelector('[data-act="fam-import"]').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; applyText(await f.text()); e.target.value = ''; };
  card.querySelector('[data-act="fam-paste"]').onclick = async () => {
    await modal({ title: 'لصق نص الكارت', body: '<textarea class="input" rows="6" data-txt style="direction:ltr;font-size:12px;width:100%"></textarea>', actions: [{ label: 'الغاء', cls: 'btn-ghost', value: null }, { label: 'استيراد', cls: 'btn-primary', value: 'ok', onClick: (bd) => { applyText(bd.querySelector('[data-txt]').value.trim()); } }] });
  };
  card.querySelector('[data-act="fam-clear"]').onclick = async () => { if (await confirm('مسح كل الضيوف؟', '<p class="muted">اولاد الاقارب هيتشالوا من اللوحة على هذا الجهاز. ممكن تستوردهم تاني من الكارت.</p>', 'نعم، امسح', 'الغاء')) { family.clearGuests(); draw(); } };
  window.__familyParent = { applyText, draw, shareCard };
}
