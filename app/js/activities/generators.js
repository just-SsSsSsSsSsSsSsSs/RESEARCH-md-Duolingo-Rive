import { ico3d } from '../ui/icons3d.js';
/**
 * Procedural question generators — infinite, adaptive content.
 *  kind: 'mult'        { tables:[3,4], range:[1,10], count, types:['numpad','quiz'] }
 *  kind: 'add' | 'sub' { max: 100, count }
 *  kind: 'distributive'{ tables:[4], count }    4×7 = (4×5)+(4×?)
 *  kind: 'commutative' { tables:[2..6], count }  3×4 = ?×3
 *  kind: 'missing'     { tables, count }         3×? = 12
 *  Every generated Q carries meta {kind, a, b, ans...} (feeds the explainer) and a fine-grained `skill` label (feeds insights).
 */
const AR = (n) => new Intl.NumberFormat('ar-EG').format(n);
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const uniqSet = (n, gen, tries = 200) => { const seen = new Set(), out = []; while (out.length < n && tries-- > 0) { const q = gen(); const k = q.key || q.q; if (seen.has(k)) continue; seen.add(k); out.push(q); } return out; };
const distractors = (ans, k = 3, spread = 6) => { const s = new Set(); let guard = 0; while (s.size < k && guard++ < 100) { const d = ans + rnd(-spread, spread) * (Math.random() < .5 ? 1 : 2); if (d !== ans && d >= 0) s.add(d); } return [...s]; };
const asQuiz = (q, ans, opts = 3) => { const ch = [ans, ...distractors(ans, opts)]; for (let i = ch.length - 1; i > 0; i--) { const j = rnd(0, i); [ch[i], ch[j]] = [ch[j], ch[i]]; } return { type: 'quiz', q, choices: ch.map(AR), answer: ch.indexOf(ans), big: true }; };

/** adapt difficulty from profile mastery of the activity: more range when strong */
function adapt(profile, g) {
  const lvl = profile?.settings?.difficulty;
  if (lvl === 'easy') return { ...g, range: [1, 6] };
  if (lvl === 'hard') return { ...g, range: [2, 12] };
  return g;
}

const KINDS = {
  mult(g) {
    const [lo, hi] = g.range || [1, 10]; const types = g.types || ['numpad', 'numpad', 'quiz'];
    return uniqSet(g.count || 10, () => {
      const a = pick(g.tables || [3]), b = rnd(lo, hi), ans = a * b, t = pick(types);
      const q = `${AR(a)} × ${AR(b)} = ؟`;
      const meta = { kind: 'mult', a, b, ans }, skill = `جدول ${AR(a)}`;
      return t === 'quiz' ? { ...asQuiz(q, ans), key: `${a}x${b}`, explain: `${AR(a)} × ${AR(b)} = ${AR(ans)}`, meta, skill } : { type: 'numpad', q, answer: ans, big: true, key: `${a}x${b}`, explain: `${AR(a)} × ${AR(b)} = ${AR(ans)}`, meta, skill };
    });
  },
  missing(g) {
    const [lo, hi] = g.range || [1, 10];
    return uniqSet(g.count || 8, () => { const a = pick(g.tables || [3]), b = rnd(lo, hi); return { type: 'numpad', q: `${AR(a)} × ؟ = ${AR(a * b)}`, answer: b, big: true, key: `m${a}x${b}`, explain: `${AR(a)} × ${AR(b)} = ${AR(a * b)}`, meta: { kind: 'missing', a, b, ans: b, product: a * b }, skill: `العدد المفقود × ${AR(a)}` }; });
  },
  commutative(g) {
    return uniqSet(g.count || 8, () => {
      const a = pick(g.tables || [2, 3, 4, 5, 6]), b = rnd(2, 9); if (a === b) return { q: 'skip', key: 'skip' + Math.random() };
      const mode = rnd(0, 2);
      if (mode === 0) return { type: 'numpad', q: `${AR(a)} × ${AR(b)} = ${AR(b)} × ؟`, answer: a, big: true, key: `c${a}${b}`, explain: `الخاصية التبديلية: ${AR(a)} × ${AR(b)} = ${AR(b)} × ${AR(a)} = ${AR(a * b)}`, meta: { kind: 'commutative', a, b, ans: a }, skill: 'الخاصية التبديلية' };
      if (mode === 1) return { type: 'truefalse', q: `${AR(a)} × ${AR(b)} = ${AR(b)} × ${AR(a)}`, answer: true, key: `t${a}${b}`, explain: 'تبديل ترتيب العددين لا يغيّر ناتج الضرب ' + ico3d('check'), meta: { kind: 'commutative_tf', a, b, ans: true }, skill: 'الخاصية التبديلية' };
      const wrong = a * b + pick([-a, a, -b, b]);
      return { type: 'truefalse', q: `${AR(b)} × ${AR(a)} = ${AR(wrong)}`, answer: false, key: `f${a}${b}`, explain: `الصحيح: ${AR(b)} × ${AR(a)} = ${AR(a * b)}`, meta: { kind: 'commutative_tf', a, b, wrong, ans: false }, skill: 'الخاصية التبديلية' };
    }).filter((q) => q.q !== 'skip');
  },
  distributive(g) {
    return uniqSet(g.count || 8, () => {
      const a = pick(g.tables || [4]), b = rnd(4, 10), s1 = rnd(1, b - 1), s2 = b - s1;
      const mode = rnd(0, 1);
      if (mode === 0) return { type: 'numpad', q: `${AR(a)} × ${AR(b)} = (${AR(a)} × ${AR(s1)}) + (${AR(a)} × ؟)`, answer: s2, big: true, key: `d${a}${b}${s1}`, meta: { kind: 'distributive', a, b, s1, s2, ans: s2 }, skill: 'خاصية التوزيع', explain: `نفكّك ${AR(b)} إلى ${AR(s1)} + ${AR(s2)}  (${AR(a)}×${AR(s1)}) + (${AR(a)}×${AR(s2)}) = ${AR(a * s1)} + ${AR(a * s2)} = ${AR(a * b)}` };
      return { ...asQuiz(`(${AR(a)} × ${AR(s1)}) + (${AR(a)} × ${AR(s2)}) = ؟`, a * b), key: `e${a}${b}${s1}`, explain: `= ${AR(a)} × (${AR(s1)} + ${AR(s2)}) = ${AR(a)} × ${AR(b)} = ${AR(a * b)}`, meta: { kind: 'distributive_sum', a, b, s1, s2, ans: a * b }, skill: 'خاصية التوزيع' };
    });
  },
  /** grid: a visual array (rows × cols of dots) — child counts / multiplies; answered via numpad or quiz */
  grid(g) {
    const [lo, hi] = g.range || [2, 9]; const types = g.types || ['numpad', 'quiz'];
    return uniqSet(g.count || 6, () => {
      const rows = pick(g.tables || [2, 3, 4, 5]), cols = rnd(lo, hi), ans = rows * cols, t = pick(types);
      const q = `كم نقطة في الشبكة؟  ${AR(rows)} صفوف × ${AR(cols)} أعمدة`;
      const base = { type: 'grid', q, rows, cols, answer: ans, mode: t, key: `g${rows}x${cols}`, explain: `${AR(rows)} × ${AR(cols)} = ${AR(ans)}`, meta: { kind: 'grid', a: rows, b: cols, ans }, skill: `الشبكة (جدول ${AR(rows)})` };
      return t === 'quiz' ? { ...base, ...asQuiz(q, ans), type: 'grid' } : base;
    });
  },
  /** pick: choose ALL products of table a among a set of numbers (multi-select) */
  pickProducts(g) {
    return uniqSet(g.count || 4, () => {
      const a = pick(g.tables || [3, 4]); const good = new Set(); while (good.size < 3) good.add(a * rnd(1, 10));
      const bad = new Set(); let guard = 0; while (bad.size < 3 && guard++ < 200) { const n = rnd(2, a * 10); if (n % a) bad.add(n); }
      const items = [...good, ...bad]; for (let i = items.length - 1; i > 0; i--) { const j = rnd(0, i); [items[i], items[j]] = [items[j], items[i]]; }
      return { type: 'pick', q: `اختر كل الأعداد التي هي من مضاعفات ${AR(a)} (${AR(good.size)} أعداد)`, items: items.map(AR), correct: items.map((n, i) => n % a === 0 ? i : -1).filter((i) => i >= 0), key: `p${a}${[...good].join(',')}`, explain: `مضاعفات ${AR(a)}: ${[...good].sort((x, y) => x - y).map(AR).join('، ')}`, meta: { kind: 'pick', a, good: [...good].sort((x, y) => x - y), bad: [...bad] }, skill: `مضاعفات ${AR(a)}` };
    });
  },
  add(g) { const max = g.max || 50; return uniqSet(g.count || 10, () => { const a = rnd(1, max), b = rnd(1, max); return { type: 'numpad', q: `${AR(a)} + ${AR(b)} = ؟`, answer: a + b, big: true, key: `a${a}+${b}`, meta: { kind: 'add', a, b, ans: a + b }, skill: 'الجمع' }; }); },
  sub(g) { const max = g.max || 50; return uniqSet(g.count || 10, () => { const a = rnd(1, max), b = rnd(1, a); return { type: 'numpad', q: `${AR(a)} − ${AR(b)} = ؟`, answer: a - b, big: true, key: `s${a}-${b}`, meta: { kind: 'sub', a, b, ans: a - b }, skill: 'الطرح' }; }); },
};

export function generate(g, profile) {
  const list = Array.isArray(g) ? g : [g];
  return list.flatMap((spec) => (KINDS[spec.kind] ? KINDS[spec.kind](adapt(profile, spec)) : []));
}
export default generate;
