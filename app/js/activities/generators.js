import { ico3d } from '../ui/icons3d.js';
/**
 * Procedural question generators — infinite, adaptive content.
 *  kind: 'mult'        { tables:[3,4], range:[1,10], count, types:['numpad','quiz'] }
 *  kind: 'add' | 'sub' { max: 100, count }
 *  kind: 'distributive'{ tables:[4], count }    4×7 = (4×5)+(4×?)
 *  kind: 'commutative' { tables:[2..6], count }  3×4 = ?×3
 *  kind: 'missing'     { tables, count }         3×? = 12
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
      return t === 'quiz' ? { ...asQuiz(q, ans), key: `${a}x${b}`, explain: `${AR(a)} × ${AR(b)} = ${AR(ans)}` } : { type: 'numpad', q, answer: ans, big: true, key: `${a}x${b}`, explain: `${AR(a)} × ${AR(b)} = ${AR(ans)}` };
    });
  },
  missing(g) {
    const [lo, hi] = g.range || [1, 10];
    return uniqSet(g.count || 8, () => { const a = pick(g.tables || [3]), b = rnd(lo, hi); return { type: 'numpad', q: `${AR(a)} × ؟ = ${AR(a * b)}`, answer: b, big: true, key: `m${a}x${b}`, explain: `${AR(a)} × ${AR(b)} = ${AR(a * b)}` }; });
  },
  commutative(g) {
    return uniqSet(g.count || 8, () => {
      const a = pick(g.tables || [2, 3, 4, 5, 6]), b = rnd(2, 9); if (a === b) return { q: 'skip', key: 'skip' + Math.random() };
      const mode = rnd(0, 2);
      if (mode === 0) return { type: 'numpad', q: `${AR(a)} × ${AR(b)} = ${AR(b)} × ؟`, answer: a, big: true, key: `c${a}${b}`, explain: `الخاصية التبديلية: ${AR(a)} × ${AR(b)} = ${AR(b)} × ${AR(a)} = ${AR(a * b)}` };
      if (mode === 1) return { type: 'truefalse', q: `${AR(a)} × ${AR(b)} = ${AR(b)} × ${AR(a)}`, answer: true, key: `t${a}${b}`, explain: 'تبديل ترتيب العددين لا يغيّر ناتج الضرب ' + ico3d('check') };
      const wrong = a * b + pick([-a, a, -b, b]);
      return { type: 'truefalse', q: `${AR(b)} × ${AR(a)} = ${AR(wrong)}`, answer: false, key: `f${a}${b}`, explain: `الصحيح: ${AR(b)} × ${AR(a)} = ${AR(a * b)}` };
    }).filter((q) => q.q !== 'skip');
  },
  distributive(g) {
    return uniqSet(g.count || 8, () => {
      const a = pick(g.tables || [4]), b = rnd(4, 10), s1 = rnd(1, b - 1), s2 = b - s1;
      const mode = rnd(0, 1);
      if (mode === 0) return { type: 'numpad', q: `${AR(a)} × ${AR(b)} = (${AR(a)} × ${AR(s1)}) + (${AR(a)} × ؟)`, answer: s2, big: true, key: `d${a}${b}${s1}`, explain: `نفكّك ${AR(b)} إلى ${AR(s1)} + ${AR(s2)}  (${AR(a)}×${AR(s1)}) + (${AR(a)}×${AR(s2)}) = ${AR(a * s1)} + ${AR(a * s2)} = ${AR(a * b)}` };
      return { ...asQuiz(`(${AR(a)} × ${AR(s1)}) + (${AR(a)} × ${AR(s2)}) = ؟`, a * b), key: `e${a}${b}${s1}`, explain: `= ${AR(a)} × (${AR(s1)} + ${AR(s2)}) = ${AR(a)} × ${AR(b)} = ${AR(a * b)}` };
    });
  },
  add(g) { const max = g.max || 50; return uniqSet(g.count || 10, () => { const a = rnd(1, max), b = rnd(1, max); return { type: 'numpad', q: `${AR(a)} + ${AR(b)} = ؟`, answer: a + b, big: true, key: `a${a}+${b}` }; }); },
  sub(g) { const max = g.max || 50; return uniqSet(g.count || 10, () => { const a = rnd(1, max), b = rnd(1, a); return { type: 'numpad', q: `${AR(a)} − ${AR(b)} = ؟`, answer: a - b, big: true, key: `s${a}-${b}` }; }); },
};

export function generate(g, profile) {
  const list = Array.isArray(g) ? g : [g];
  return list.flatMap((spec) => (KINDS[spec.kind] ? KINDS[spec.kind](adapt(profile, spec)) : []));
}
export default generate;
