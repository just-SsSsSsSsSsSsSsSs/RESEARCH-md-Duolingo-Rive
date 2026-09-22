# 🚀 Genspark AI Developer — Live Progress & Context Anchor

> **الغرض من هذا الملف:** نقطة الاستئناف المركزية الحية للوكيل `Genspark AI Developer`.
> يُحدَّث بعد كل chunk (خطوة صغيرة) مع Commit + Push لحظي على فرع `genspark_ai_developer` لمقاومة انقطاع الجلسات (Sandbox resets).

---

## 🔁 برومت الاستئناف (انسخه لما الجلسة تقطع)
```
كمل من آخر نقطة استئناف في ملفك (genspark_ai_developer/PROGRESS.md) على فرعك genspark_ai_developer
في مستودع html-mobile-audio/html-mobile-audio، مستخدماً GITHUB_TOKEN: [التوكن_هنا]،
مع تحديث الفرع والملف لحظياً بكل chunk (push-per-chunk).
```

---

## 📌 الحالة الراهنة (Current State)
- **الفرع:** `genspark_ai_developer` (منشأ من `main` @ 217379a)
- **الحالة العامة:** المرحلة 1 مكتملة (استكشاف) → بدء المرحلة 2 (البناء) بـ chunks صغيرة
- **مجلد المنتج الجديد:** `app/` (منصة معيارية مستقلة — لا تلمس ملفات الجذر المحمية بقانون البيت في `push.sh`)

---

## 🧭 الخطة المجمَّدة (Frozen Plan) — معمارية `app/`
```
app/
  index.html                 shell واحد + hash-router (SPA خفيف بدون frameworks)
  manifest.webmanifest, sw.js (PWA offline)
  css/  tokens.css, base.css, components.css
  js/core/   bus.js (events) · store.js (profiles + schema versioning + export/import) · registry.js (كتالوج ديناميكي) · router.js
  js/engines/ sound.js (Web Audio synth: pop/success/fail/levelup/fanfare)
             bubbles.js (Canvas physics: طفو، تصادم، فرقعة بالمس، DPR-aware، 60fps، pause عند إخفاء التبويب)
             xp.js (منحنى مستويات لا نهائي بصيغة رياضية — لا قائمة ثابتة)
             streak.js (أيام متتالية + Streak Freeze) · hearts.js (5 قلوب + تجدد زمني)
             badges.js (شارات مُعرَّفة كبيانات/شروط — قابلة للتوسع) · quests.js (مهام يومية مولَّدة)
             certificates.js (شهادات فخمة قابلة للطباعة/PDF عبر print)
  js/activities/ quiz.js · truefalse.js · match.js · fillblank.js · order.js  (محركات نوعية تُغذَّى بـ JSON)
  js/ui/  components.js (toast/modal/confetti/SVG icons) · views/ (home, play, badges, parent, profile)
  content/ catalog.json (روابط التطبيقات الحالية + الأنشطة الأصلية) · activities/*.json
```
**مبادئ:** Data-driven 100% (إضافة نشاط = ملف JSON) · Mobile-first RTL · بدون تبعيات ثقيلة · يعمل على GitHub Pages والسيرفر المحلي · 3 ملفات أبطال (سليم/كارما/كندة) مستقلة.

---

## 📋 قائمة المهام (Chunks) — ✅ منجز / 🔄 جارٍ / ⬜ قادم
### المرحلة 1: الاستكشاف ✅
- [x] مراجعة المستودع: index.html (بوابة ثابتة)، math.html، plant.html، albayyinah.html، quran-alqadr، selim-math-arabic، episodes-selim
- [x] مراجعة `workspace--RESEARCH/` (RESEARCH/PLAN/COMPLETE + app.js/phase2-5.js + styles)
- [x] تحليل: نقاط القوة = محتوى صوتي غني + هوية نيون. نقاط الضعف = لا ملفات متعددة (localStorage مسطّح لمستخدم واحد)، مستويات ثابتة (10)، لا فيزياء فقاعات حقيقية، لا Web Audio، محتوى hardcoded في JS، لا محركات أنشطة عامة، لا شهادات فعلية للطباعة.
- [x] تجميد الخطة أعلاه

### المرحلة 2: النواة والواجهة 🔄
- [x] C1: app/css tokens+base+components
- [x] C2: js/core (bus, store, registry, router)
- [x] C3: engines/sound.js + engines/bubbles.js
- [x] C4: engines xp/streak/hearts/badges/quests
- [x] C5: ui/components.js (toast, modal, confetti, icons)
- [x] C6: views home + profile picker + subject + shell + bootstrap
- [x] C7: activities engines (session, generators, renderers) + view play
- [ ] C8: content/catalog.json + أنشطة JSON (جدول 3/4، خواص الضرب، البينة، القدر، ازرع نبتة)
- [ ] C9: parent dashboard (PIN, تقارير أسبوعية SVG, تصدير/استيراد, إعدادات)
- [ ] C10: certificates.js + طباعة
- [ ] C11: PWA (manifest + sw) + index.html الجذر: زر دخول للمنصة الجديدة
- [ ] C12: RESEARCH.md إضافة مراجع 2026 (بدون حذف)

### المرحلة 3: الاختبار والدمج ⬜
- [ ] اختبار محلي (server + Playwright console) صفر أخطاء، صفر 404
- [ ] PR نظيف من `genspark_ai_developer` → `main`

---

## 📝 سجل الإنجازات اللحظي (Live Action Log)
- 2026-09-22 02:1x — استعادة السياق بعد reset، إنشاء الفرع، مراجعة كاملة للمستودع والبحث، تجميد الخطة.

---

## 🎯 الخطوة التالية فوراً (Next Immediate Action)
👉 **C8:** content/activities/*.json (mult_3, mult_4, mult_mix, distributive, commutative, bayyinah_order, bayyinah_fill, qadr_fill, tajweed_quiz, plant_tf, plant_quiz, plant_match, iman_quiz) ثم commit+push.
- 2026-09-22T02:30 — reset #2 استعادة من remote (C1–C5 محفوظة)، أعيد بناء C6 ودُفع.
