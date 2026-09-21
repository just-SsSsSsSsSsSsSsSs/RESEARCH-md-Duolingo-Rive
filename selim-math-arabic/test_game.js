// اختبار آلي للعبة سر التقسيم السحري: DOM وهمي + تنفيذ السكريبت + محاكاة ضغطات
const fs = require('fs');
const path = process.argv[2] || '/home/user/selim_math/تطبيق_سر_التقسيم_السحري_سليم.html';
const html = fs.readFileSync(path, 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function El(tag){
  this.tag = tag; this._children = []; this._cls = new Set();
  this.style = {}; this._attrs = {}; this._html = ''; this.textContent = '';
  this.onclick = null;
}
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
El.prototype.getAttribute = function(k){ return this._attrs[k]; };
El.prototype.setAttribute = function(k, v){ this._attrs[k] = v; };
El.prototype.remove = function(){};

// عناصر بكل الـ IDs في الصفحة
const byId = {};
const idRe = /id="([^"]+)"/g; let m;
while ((m = idRe.exec(html))) { byId[m[1]] = new El('#' + m[1]); }

// أزرار النمباد ١٢ + ٣ خانات إجابة
const pads = [];
[...'123456789', 'back', '0', 'check'].forEach(d => {
  const b = new El('button'); b.setAttribute('data-d', d); pads.push(b);
});
const ansboxes = [0, 1, 2].map(k => { const b = new El('div'); b.setAttribute('data-k', String(k)); return b; });

const documentStub = {
  getElementById: id => byId[id] || null,
  createElement: t => new El(t),
  querySelectorAll: sel => {
    if (sel === '.padbtn[data-d]') return pads;
    if (sel === '.ansbox') return ansboxes;
    return [];
  },
  querySelector: sel => {
    const mm = sel.match(/ansbox\[data-k="(\d)"\]/);
    return mm ? ansboxes[+mm[1]] : null;
  },
  addEventListener: () => {},
  body: new El('body')
};
const windowStub = { innerHeight: 800 };

// تنفيذ سكريبت اللعبة
new Function('document', 'window', 'requestAnimationFrame',
  script)(documentStub, windowStub, fn => fn());

function assert(cond, msg){
  if (cond) console.log('  ✓ ' + msg);
  else { console.log('  ✗ فشل: ' + msg); process.exitCode = 1; }
}
const press = d => pads.find(b => b.getAttribute('data-d') === d).onclick();

console.log('١) الضغط على الزر الأخضر (يلا نلعب):');
byId['btnStart'].onclick();
assert(byId['scrHome'].classList.contains('hidden'), 'شاشة البداية اتخفت');
assert(!byId['scrQuiz'].classList.contains('hidden'), 'شاشة اللعب ظهرت');
assert(byId['chips'].children.length === 3, 'ظهرت ٣ اختيارات تقسيم للمسألة الأولى');

console.log('٢) اختيار الفِكّة ٥+٤:');
byId['chips'].children[0].onclick();
assert(!byId['partials'].classList.contains('hidden'), 'خانات الحل ظهرت');
assert(!byId['numpad'].classList.contains('hidden'), 'النمباد ظهر');

console.log('٣) اتأكد قبل ما نكمل → لازم يطلب إكمال الخانات:');
byId['btnCheck'].onclick();
assert(/كمّل/.test(byId['feedback'].textContent), 'رسالة: كمّل الخانات');

console.log('٤) حل ٧×٩ كامل: ٣٥ ، ٢٨ ، ٦٣:');
press('3'); press('5');
ansboxes[1].onclick(); press('2'); press('8');
ansboxes[2].onclick(); press('6'); press('3');
byId['btnCheck'].onclick();
assert(byId['feedback'].className === 'feedback good', 'إجابة صحيحة اتقبلت ✓');
assert(byId['starCount'].textContent === '٢', 'خد نجمتين من أول مرة ⭐⭐');
assert(!byId['btnNext'].classList.contains('hidden'), 'زر السؤال التالي ظهر');

console.log('٥) تجربة إجابة غلط في المسألة ٢ (٥×٨):');
byId['btnNext'].onclick(); // المسألة الثانية
byId['chips'].children[0].onclick(); // فِكّة ٥+٣
press('2'); press('0'); // ٢٠ غلط (الصح ٢٥)
ansboxes[1].onclick(); press('1'); press('5');
ansboxes[2].onclick(); press('4'); press('0');
byId['btnCheck'].onclick();
assert(byId['feedback'].className === 'feedback try', 'رسالة تشجيع من غير لوم');
assert(byId['starCount'].textContent === '٢', 'النجوم ما نقصتش');

console.log('٦) تصليح الإجابة ٢٥ والتحقق:');
ansboxes[0].onclick(); press('back'); press('back'); press('2'); press('5');
byId['btnCheck'].onclick();
assert(byId['feedback'].className === 'feedback good', 'اتقبلت بعد المحاولة ✓');
assert(byId['starCount'].textContent === '٣', 'خد نجمة واحدة بعد المحاولة ⭐');

console.log('\n==> النهاية: اللعبة تشتغل منطقيًا بالكامل');
