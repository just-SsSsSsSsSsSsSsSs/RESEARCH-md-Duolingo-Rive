/**
 * Phase 17.5 - «ميثاق العيلة» (#/charter).
 * Renders app/content/family.json: the permanent family links, the principles and the phases roadmap, and runs a
 * LIVE self-check: it fetches every mirror listed in family.json (the markdown copies shipped with the site) and
 * shows, per mirror, whether every link is still present. The page is therefore both the in-site copy of the
 * charter and a visible proof that the other copies are intact - no link can vanish silently.
 * Zero-Emoji, no ids in SVG, no external dependencies. Read-only.
 */
import { vurl } from '../../core/registry.js';
import sound from '../../engines/sound.js';
import { el, esc, hud, nav, toast } from '../components.js';
import { ico } from '../icons.js';
import { ico3d } from '../icons3d.js';

const KIND_ICON = { gist: 'scroll', repo: 'book', site: 'external' };
const STATUS = { done: ['tag-cyan', 'تم'], current: ['tag-gold', 'الحالية'], next: ['tag-purple', 'القادمة'], planned: ['tag-purple', 'مخططة'] };

async function load() {
  const r = await fetch(vurl('content/family.json'), { cache: 'no-cache' });
  if (!r.ok) throw new Error('family.json ' + r.status);
  return r.json();
}

/** fetch a mirror relative to the site root (app/ is one level below the repo root) and count the links it holds */
async function probe(rel, urls) {
  try {
    // mirrors live at the REPO root (one level above app/): vurl() resolves against app/, so climb once more
    const u = new URL('../' + rel, vurl('content/family.json').href.replace(/\/content\/family\.json.*$/, '/')); u.searchParams.set('v', vurl('x').searchParams.get('v'));
    const r = await fetch(u, { cache: 'no-cache' });
    if (!r.ok) return { rel, ok: false, found: 0, reason: String(r.status) };
    const txt = await r.text();
    const found = urls.filter((x) => txt.includes(x)).length;
    return { rel, ok: found === urls.length, found };
  } catch (e) { return { rel, ok: false, found: 0, reason: 'offline' }; }
}

export async function render(root) {
  const h = hud({ back: true, icon: 'scroll', title: 'ميثاق العيلة' });
  root.appendChild(h);
  let fam;
  try { fam = await load(); } catch (e) { root.appendChild(el('<div class="card center muted">تعذر تحميل الميثاق</div>')); root.appendChild(nav('profile')); return; }
  const heroes = (fam.family?.heroes || []).map((x) => esc(x.name)).join(' و ');

  root.appendChild(el(`<div class="card center glow-gold charter-hero">
    <div class="float" style="display:grid;place-items:center">${ico3d('gradCap', 64)}</div>
    <h1>${esc(fam.family?.name || '')}</h1>
    <p class="muted">${heroes}${fam.family?.open_to_relatives ? ' - والباب مفتوح لكل الأقارب' : ''}</p>
  </div>`));

  // 1. permanent links (tap = open in a new tab; long-press/second button = copy)
  root.appendChild(el(`<div class="section"><h2>${ico3d('bookmark', 22)} روابط العيلة الدائمة</h2><span class="tag tag-gold">${fam.links.length}</span></div>`));
  const list = el('<div class="stack" data-charter-links></div>');
  for (const l of fam.links) {
    const row = el(`<div class="card tile charter-link" data-link-id="${esc(l.id)}">
      <div class="icon-box">${ico(KIND_ICON[l.kind] || 'external')}</div>
      <div class="grow" style="min-width:0"><h3>${esc(l.title)}</h3><a class="charter-url" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.url)}</a></div>
      <button class="btn btn-icon btn-ghost" data-act="copy" aria-label="نسخ الرابط">${ico('download')}</button>
    </div>`);
    row.querySelector('[data-act="copy"]').onclick = async () => {
      sound.play('tap');
      try { await navigator.clipboard.writeText(l.url); toast('تم نسخ الرابط', { type: 'info' }); } catch { toast(l.url, { type: 'info' }); }
    };
    list.appendChild(row);
  }
  root.appendChild(list);

  // 2. live integrity check of every mirror
  root.appendChild(el(`<div class="section"><h2>${ico3d('shield', 22)} النسخ المحفوظة (فحص مباشر)</h2><span class="tag tag-cyan" data-mirror-summary>...</span></div>`));
  const mirrors = el('<div class="card stack charter-mirrors" data-charter-mirrors></div>');
  for (const m of fam.mirrors) mirrors.appendChild(el(`<div class="row between charter-mirror" data-mirror="${esc(m)}"><code dir="ltr">${esc(m)}</code><span class="tag" data-state="pending">يفحص...</span></div>`));
  root.appendChild(mirrors);
  const urls = fam.links.map((x) => x.url);
  Promise.all(fam.mirrors.map((m) => probe(m, urls))).then((res) => {
    let ok = 0;
    for (const r of res) {
      const tag = mirrors.querySelector(`[data-mirror="${r.rel}"] .tag`); if (!tag) continue;
      tag.dataset.state = r.ok ? 'ok' : 'bad'; tag.className = 'tag ' + (r.ok ? 'tag-cyan' : 'tag-rose');
      tag.textContent = r.ok ? `سليم ${r.found}/${urls.length}` : (r.reason ? `غير متاح (${r.reason})` : `ناقص ${r.found}/${urls.length}`);
      if (r.ok) ok++;
    }
    const sum = root.querySelector('[data-mirror-summary]'); if (sum) sum.textContent = `${ok}/${res.length}`;
    window.__charter = { mirrors: res, ok, total: res.length, links: urls.length };
  });

  // 3. principles
  root.appendChild(el(`<div class="section"><h2>${ico3d('star', 22)} مبادئنا</h2></div>`));
  const pr = el('<div class="stack" data-charter-principles></div>');
  fam.principles.forEach((p, i) => pr.appendChild(el(`<div class="card charter-principle"><div class="row" style="gap:10px;align-items:flex-start"><span class="charter-num">${i + 1}</span><div class="grow"><h3>${esc(p.title)}</h3><p class="muted small">${esc(p.text)}</p></div></div></div>`)));
  root.appendChild(pr);

  // 4. roadmap
  root.appendChild(el(`<div class="section"><h2>${ico3d('target', 22)} خارطة المراحل</h2></div>`));
  const rm = el('<div class="stack" data-charter-roadmap></div>');
  for (const r of fam.roadmap) {
    const [cls, label] = STATUS[r.status] || ['tag-purple', r.status];
    rm.appendChild(el(`<div class="card tile charter-phase" data-phase="${esc(r.phase)}"><div class="icon-box"><b>${esc(r.phase)}</b></div><div class="grow"><h3>${esc(r.title)}</h3><p class="small muted">${r.version ? 'v' + esc(r.version) : ''}</p></div><span class="tag ${cls}">${label}</span></div>`));
  }
  root.appendChild(rm);
  root.appendChild(el('<p class="center small muted mt-3">هذه الصفحة تُبنى من <code>app/content/family.json</code> ولا تتغير إلا بتغييره.</p>'));
  root.appendChild(nav('profile'));
  return () => h.__cleanup?.();
}
