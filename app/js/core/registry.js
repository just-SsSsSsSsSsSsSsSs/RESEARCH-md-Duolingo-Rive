/**
 * Registry — dynamic content catalog.
 * Loads content/catalog.json (subjects, activities, external apps) and exposes
 * query helpers. Adding content = editing JSON; no code changes required.
 *
 * Activity descriptor (in catalog):
 *  { id, subject, title, desc, icon, type: 'quiz'|'truefalse'|'match'|'fillblank'|'order'|'numpad'|'mixed',
 *    src: 'activities/xyz.json', level: 1..∞, xp: 20, tags: [], heroes: ['selim',...]|undefined, generator?: {...} }
 * External app: { id, subject, title, desc, icon, href, tags, external: true }
 */
import { APP_VERSION } from './version.js';

const BASE = new URL('../../', import.meta.url.split('?')[0]); // app/
/** Versioned content URL (cache-busting for JSON payloads). */
export const vurl = (rel) => { const u = new URL(rel, BASE); u.searchParams.set('v', APP_VERSION); return u; };

let catalog = null;
const activityCache = new Map();

export const registry = {
  base: BASE,
  async load() {
    if (catalog) return catalog;
    const res = await fetch(vurl('content/catalog.json'), { cache: 'no-cache' });
    if (!res.ok) throw new Error('تعذر تحميل الكتالوج');
    catalog = await res.json();
    // normalise
    catalog.subjects ||= [];
    catalog.items ||= [];
    catalog.items.forEach((it, i) => { it.order ??= i; it.tags ||= []; });
    return catalog;
  },
  get catalog() { return catalog; },
  subjects() { return catalog?.subjects || []; },
  subject(id) { return this.subjects().find((s) => s.id === id); },
  items(filter = {}) {
    let list = catalog?.items || [];
    if (filter.subject) list = list.filter((i) => i.subject === filter.subject);
    if (filter.hero) list = list.filter((i) => !i.heroes || i.heroes.includes(filter.hero));
    if (filter.type) list = list.filter((i) => i.type === filter.type);
    if (filter.playable) list = list.filter((i) => !i.external);
    if (filter.q) { const q = filter.q.trim(); list = list.filter((i) => (i.title + ' ' + i.desc + ' ' + i.tags.join(' ')).includes(q)); }
    return list.sort((a, b) => a.order - b.order);
  },
  item(id) { return (catalog?.items || []).find((i) => i.id === id); },
  async loadActivity(id) {
    const it = this.item(id);
    if (!it || it.external) throw new Error('نشاط غير موجود');
    if (activityCache.has(id)) return activityCache.get(id);
    let data;
    if (it.src) {
      const res = await fetch(vurl('content/' + it.src), { cache: 'no-cache' });
      if (!res.ok) throw new Error('تعذر تحميل النشاط');
      data = await res.json();
    } else data = {};
    data = { ...it, ...data, id };
    activityCache.set(id, data);
    return data;
  },
  /** resolve href for external apps relative to repo root (app/../) */
  href(it) {
    if (!it.href) return '#';
    if (/^https?:/.test(it.href)) return it.href;
    return new URL('../' + it.href, BASE).href;
  },
};
export default registry;
