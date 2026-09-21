// اختبار آلي لتطبيق ازرع نبتة — محاكاة كاملة من زر البداية حتى شاشة النهاية
const fs = require('fs');
const path = process.argv[2] || '/home/user/selim_math/تطبيق_ازرع_نبتة_سليم.html';
const html = fs.readFileSync(path, 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function El(tag){ this.tag = tag; this._children = []; this._cls = new Set(); this.style = {}; this._attrs = {}; this._html = ''; this.textContent = ''; this.onclick = null; this.id = ''; }
Object.defineProperty(El.prototype, 'className', {
  get(){ return Array.from(this._cls).join(' '); },
  set(v){ this._cls = new Set(String(v).split(/\s+/).filter(Boolean)); }
});
Object.defineProperty(El.prototype, 'innerHTML', {
  get(){ return this._html; },
  set(v){ this._html = v; if (v === '') this._children = []; }
});
Object.defineProperty(El.prototype, 'children', { get(){ return this._children; } });
Object.defineProperty(El.prototype, 'classList', {
  get(){ const s = this._cls; return {
    add: c => s.add(c), remove: c => s.delete(c),
    contains: c => s.has(c),
    toggle: c => { s.has(c) ? s.delete(c) : s.add(c); }
  }; }
});
El.prototype.appendChild = function(c){ this._children.push(c); return c; };
El.prototype.remove = function(){};
El.prototype.hasCls = function(c){ return this._cls.has(c); };

// عناصر ثابتة بكل الـ IDs مع حفظ الكلاسات الأصلية
const byId = {};
const tagRe = /<([a-zA-Z0-9]+)((?:\s+[a-zA-Z0-9_:-]+="[^"]*")*)\s*\/?>/g;
let m;
while ((m = tagRe.exec(html))){
  const attrs = m[2] || '';
  const idM = attrs.match(/id="([^"]+)"/);
  if (!idM) continue;
  const e = new El(m[1]);
  e.className = (attrs.match(/class="([^"]*)"/) || [, ''])[1];
  e.id = idM[1];
  byId[idM[1]] = e;
}

function walk(e, fn){
  if (!e) return null;
  if (fn(e)) return e;
  for (const c of e._children){ const r = walk(c, fn); if (r) return r; }
  return null;
}
const roots = () => Object.values(byId);
function findByIdDyn(id){
  if (byId[id]) return byId[id];
  for (const r of roots()){ const f = walk(r, e => e.id === id); if (f) return f; }
  return null;
}
function findAllByCls(root, cls){
  const out = [];
  (function rec(e){ if (e.hasCls(cls)) out.push(e); e._children.forEach(rec); })(root);
  return out;
}

const documentStub = {
  getElementById: findByIdDyn,
  createElement: t => new El(t),
  querySelectorAll: () => [],
  querySelector: () => null,
  addEventListener: () => {},
  body: new El('body')
};
const windowStub = { innerHeight: 800 };

new Function('document', 'window', 'requestAnimationFrame',
  script)(documentStub, windowStub, fn => fn());

let failed = 0;
function assert(cond, msg){
  if (cond) console.log('  ✓ ' + msg);
  else { console.log('  ✗ فشل: ' + msg); failed++; process.exitCode = 1; }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const stars = () => byId['starCount'].textContent;
const visibleNext = () => findAllByCls(byId['qa'], 'nextbtn').filter(b => !b.hasCls('hidden'));

(async function run(){
  console.log('١) البداية → شاشة القصة:');
  assert(byId['scrQuiz'].hasCls('hidden'), 'الأسئلة مخفية في البداية');
  byId['btnStart'].onclick();
  assert(byId['scrHome'].classList.contains('hidden'), 'الرئيسية اتخفت');
  assert(!byId['scrStory'].classList.contains('hidden'), 'شاشة القصة ظهرت');

  console.log('٢) عرض/إخفاء نص القصة:');
  byId['btnText'].onclick();
  assert(!byId['storyText'].classList.contains('hidden'), 'النص ظهر');
  byId['btnText'].onclick();
  assert(byId['storyText'].classList.contains('hidden'), 'النص اتخفى');

  console.log('٣) يلا نحل → أول سؤال صواب/خطأ:');
  byId['btnGo'].onclick();
  assert(!byId['scrQuiz'].classList.contains('hidden'), 'شاشة الأسئلة ظهرت');
  let tfs = findAllByCls(byId['qa'], 'tfbtn');
  assert(tfs.length === 2, 'زرّا صواب/خطأ موجودان');
  assert(visibleNext().length === 0, 'زر «اللي بعده» مخفي قبل الإجابة');

  tfs[0].onclick(); // صواب على عبارة خطأ = إجابة غلط
  let fb = documentStub.getElementById('fb');
  assert(fb.className === 'feedback try', 'إجابة غلط → تشجيع بلا لوم');
  assert(visibleNext().length === 0, 'ممنوع التخطي قبل الإصابة');
  tfs[1].onclick(); // خطأ = الإجابة الصح
  fb = documentStub.getElementById('fb');
  assert(fb.className === 'feedback good', '«خطأ» صح → نجاح ✓');
  assert(stars() === '١', 'نجمة واحدة بعد محاولة');
  assert(visibleNext().length === 1, 'زر «اللي بعده» ظهر');
  visibleNext()[0].onclick();

  console.log('٤) tf2 + tf3:');
  tfs = findAllByCls(byId['qa'], 'tfbtn');
  tfs[0].onclick(); // tf2 صواب ✓
  assert(documentStub.getElementById('fb').className === 'feedback good', 'tf2 صح');
  visibleNext()[0].onclick();
  tfs = findAllByCls(byId['qa'], 'tfbtn');
  tfs[1].onclick(); // tf3 خطأ ✓
  assert(documentStub.getElementById('fb').className === 'feedback good', 'tf3 صح');
  assert(stars() === '٥', 'النجوم: ١+٢+٢ = ٥');
  visibleNext()[0].onclick();

  console.log('٥) استمع وأكمل (البذور):');
  let opts = findAllByCls(byId['qa'], 'opt');
  assert(opts.length === 3, '٣ اختيارات إكمال');
  opts[0].onclick();
  assert(documentStub.getElementById('fb').className === 'feedback good', 'إكمال صح ✓');
  const blank = documentStub.getElementById('blank');
  assert(blank && /البذور/.test(blank.textContent), 'الفراغ اتملى «البذور»');
  visibleNext()[0].onclick();

  console.log('٦) س١ وس٢:');
  opts = findAllByCls(byId['qa'], 'opt');
  opts[1].onclick(); // غلط أولًا
  assert(documentStub.getElementById('fb').className === 'feedback try', 'س١ غلط → تشجيع');
  opts[0].onclick();
  assert(documentStub.getElementById('fb').className === 'feedback good', 'س١ صح');
  visibleNext()[0].onclick();
  opts = findAllByCls(byId['qa'], 'opt');
  opts[0].onclick();
  assert(documentStub.getElementById('fb').className === 'feedback good', 'س٢ صح');
  visibleNext()[0].onclick();

  console.log('٧) الخريطة الذهنية (٦ حقول):');
  assert(byId['mapOpts'] || documentStub.getElementById('mapOpts'), 'منطقة اختيارات الخريطة موجودة');
  const correctIdx = [0, 1, 2, 0, 1, 2];
  for (let i = 0; i < 6; i++){
    const mop = documentStub.getElementById('mapOpts');
    assert(mop._children.length === 3, `حقل ${i+1}: ٣ اختيارات`);
    mop._children[correctIdx[i]].onclick();
    await sleep(500);
  }
  const mapNext = documentStub.getElementById('mapNext');
  assert(!mapNext.hasCls('hidden'), 'زر التالي بعد الخريطة ظهر');
  const bubbles = documentStub.getElementById('bubs');
  assert(bubbles._children.filter(b => b.hasCls('done')).length === 6, '٦ فقاعات اتملت ✓');
  mapNext.onclick();

  console.log('٨) س٣ (الشعور):');
  opts = findAllByCls(byId['qa'], 'opt');
  assert(opts.length === 3, '٣ اختيارات شعور');
  opts[0].onclick();
  assert(documentStub.getElementById('fb').className === 'feedback good', 'س٣ صح');
  visibleNext()[0].onclick();

  console.log('٩) السؤال الشخصي:');
  const said = findAllByCls(byId['qa'], 'bigbtn')[0];
  assert(!!said, 'زر «قلّتها» موجود');
  said.onclick();
  assert(visibleNext().length === 1, 'زر النتيجة ظهر');
  visibleNext()[0].onclick();

  console.log('١٠) شاشة النهاية:');
  assert(!byId['scrEnd'].classList.contains('hidden'), 'شاشة النهاية ظهرت');
  assert(byId['endStars'].textContent.length > 0, 'النجوم الذهبية ظهرت');
  assert(stars() === '٢٥', 'إجمالي النجوم = ٢٥ ✓');

  console.log(failed ? '\n==> فيه أخطاء!' : '\n==> التطبيق يشتغل منطقيًا بالكامل ✅');
})();
