> **دستور العمل:** اقرأ `AGENTS.md` أولاً في كل جلسة. قواعد الرفع: ممنوع AI Drive؛ ممنوع push بعد كل اختبار؛ فاصل 10-15 دقيقة بالتوازي؛ push فوري عند اكتمال ميزة باختباراتها؛ لا force-push؛ PR واحد عند اكتمال المرحلة؛ `tools/check_family_links.py` قبل كل push؛ لا توكنات في الملفات.

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
- **الحالة العامة:** ✅ المنتج مكتمل (C1–C13) + اختبارات E2E/Behaviour خضراء → PR مفتوح إلى main
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
- [x] C8: content/catalog.json + 13 أنشطة JSON (رياضيات، قرآن، عربي، دين)
- [x] C9: badges + quests + parent dashboard (PIN SHA-256، تقارير ٧ أيام، جدول أنشطة، تصدير/استيراد، تحكم)
- [x] C10: certificate.js شهادة فخمة A4 landscape قابلة للطباعة/PDF + مشاركة
- [x] C11: PWA (manifest+sw+icon) + زر دخول في index.html الجذر + E2E Playwright أخضر (0 أخطاء، 0 طلبات فاشلة)
- [x] C12: RESEARCH.md ملحق مراجع 2026 (append-only) + README قسم المنصة

### المرحلة 3: الاختبار والدمج ⬜
- [x] اختبار محلي (Playwright: e2e.py + behaviour.py) صفر أخطاء، صفر 404
- [x] PR #1: https://github.com/html-mobile-audio/html-mobile-audio/pull/1

---

## 📝 سجل الإنجازات اللحظي (Live Action Log)
- 2026-09-22 02:1x — استعادة السياق بعد reset، إنشاء الفرع، مراجعة كاملة للمستودع والبحث، تجميد الخطة.

---

## 🎯 الخطوة التالية فوراً (Next Immediate Action)
👉 **بعد الدمج:** Backlog في RESEARCH.md §5 (تسميع بالميكروفون، Boss Battles، FSRS، مولّد عربي، مزامنة سحابية، وضع معلّم).
- 2026-09-22T02:30 — reset #2 استعادة من remote (C1–C5 محفوظة)، أعيد بناء C6 ودُفع.
- 2026-09-22T02:40 — reset #3 استعادة من remote، أُكملت C8 (13 نشاط) + shuffle للاختيارات.
- 2026-09-22T02:49 — C9/C10/C11 مكتملة. E2E: 13 نشاط، 5 مواد، لعب كامل، PIN، فقاعات — كله أخضر. أُضيف كارت الدخول للمنصة في index.html الجذر.
- 2026-09-22T02:55 — reset #4 استعادة. C1–C12 كلها على remote. جارٍ C13 hardening.
- 2026-09-22T03:00 — C13 hardening مكتمل: behaviour.py أخضر (قلوب→modal→تعبئة بالجواهر، شهادة، ثيم، PIN، تصدير). فتح PR.

---

## 🎯 المرحلة 4 — "The Leap": استجابة لملاحظات اختبار الأطفال الحي (PR #2)

### 🔬 التشخيص الذاتي (Root Causes) — لماذا خرجت التجربة باهتة؟
| العرض | السبب الجذري في كودي | الملف |
|---|---|---|
| فقاعات "شبه ميتة" | الخلفية داكنة جداً + `globalCompositeOperation='lighter'` مع alpha ضعيفة (0.35 → 0.10 → 0) ورسم `lineWidth 1.4` — الفقاعة تظهر كخط رفيع باهت. سرعة طفو 0.25–0.7px/frame بلا حياة. الـ canvas خلف `#app` وكل الكروت زجاجية تغطيها. | `bubbles.js` |
| لا احتفال عند الإجابة الصحيحة | `ctx.done()` يستدعي `burst(…,4)` بنسبة 35% فقط + confetti فقط في النتيجة النهائية. لا انفجار على موضع الإصبع. | `play.js` |
| صوت الخطأ منفّر | `sawtooth 220→140Hz` + `square` = صوت "buzzer إنذار" صناعي. | `sound.js#wrong` |
| صوت الصح رتيب | نفس 3 نغمات C-E-G كل مرة. | `sound.js#correct` |
| أزرار مسطحة | `.btn/.choice`: border 1.5px + ظل ضعيف + `scale(.96)` — لا عمق ولا "ضغطة" حقيقية. `min-height 46` أقل من 48px (Material) و 44pt (Apple). | `components.css` |
| توافق الأجهزة | لا `clamp()` للخطوط، لا `@media (hover:none)` (hover يعلق على اللمس)، لا `dvh`، لا حجم أكبر للتابلت/ديسكتوب. | `tokens/base/components.css` |

### 📚 مراجع الابتكار 2026 (ألعاب أطفال عالمية)
- **Duolingo**: أزرار 3D بـ `border-bottom: 4px` تنضغط (`translateY(4px)`) — "tactile press". أصوات صح متنوعة من مكتبة، خطأ = "thud" ناعم منخفض بدون sawtooth.
- **Khan Academy Kids / Sago Mini / Toca Boca**: انفجار particles على موضع اللمس، أشكال متعددة (نجوم/قلوب/دوائر)، bounce بـ spring easing، نصوص تشجيعية عائمة (+XP floaters).
- **Endless Alphabet / PBS Kids**: أصوات مولَّدة بـ "musical scale" — كل إجابة نغمة أعلى (تصاعد) تبني إثارة؛ "wrong" = نغمتان هابطتان لطيفتان بـ sine + vibrato.
- **Apple HIG / Material 3**: hit target ≥44pt/48dp، `@media (hover: hover)` فقط للـ hover، `pointer: coarse` لتكبير المسافات، `100dvh` للموبايل.
- **Web Audio best practice**: تجنب sawtooth/square للأطفال؛ استخدم sine/triangle + lowpass + reverb بسيط (convolver noise tail) + humanize (±detune عشوائي).

### 🗺️ خطة التنفيذ (chunks — push بعد كل واحد)
- [x] L1: `sound.js` v2 — wrong لطيف، correct متنوع (5 أنماط + تصاعد سُلَّمي مع combo)، cheer متغير، pop متنوع، "sparkle", "whoosh" محسّنة
- [x] L2: `bubbles.js` v2 — فقاعات أوضح (أكبر، rim قوسي زجاجي، ألوان أزهى، حركة أحيا)، **celebrate(x,y,intensity)**: انفجار متعدد الأشكال (نجوم/قلوب/دوائر/حلقات) + موجة صدمة + فقاعات مكافأة تُفرقع تلقائياً
- [x] L3: `fx.js` — طبقة احتفال DOM: نص عائم (+XP / برافو!) + shake/pulse للكارت + combo counter
- [x] L4: `fx.css` — أزرار 3D tactile، hit ≥48px، hover فقط على (hover:hover)، pointer:coarse، clamp()، dvh، breakpoints 360/700/1024/landscape
- [x] L5: ربط play.js + renderers.js (celebrate على موضع الإصبع + combo + floaters) + إعداد "شدة الاحتفال" في البروفايل + كروت أشف لإظهار الفقاعات
- [x] L6: e2e.py + viewports.py أخضر على 4 أجهزة (0 أخطاء، أهداف ≥44px، لا overflow، FX يعمل) + لقطات مراجَعة
- [x] L7: PR #2 → https://github.com/html-mobile-audio/html-mobile-audio/pull/2

**آخر تحديث:** Phase 10 ✅ مكتملة — J0..J6: Audit + «يعني إيه يا بابا؟» (TTS karaoke + 4 أساليب + خطوات) + سارينة الإنجاز (4 أصوات مولّدة، إعدادات الأب كاملة) + telemetry/insights/تدريب مخصص/adaptive + تقرير الأب. 13 suite PASS + sha256 المحميات سليم → PR #8 مفتوح؛ التالي Phase 11 بعد الدمج.

---

## 🌿 المرحلة 5 — "Calm & Joy": راحة العين + بهجة مفاجئة (PR #3)
**المصدر:** Gist pijsal1-tech/55b6e6f0… (3 تكليفات) + توجيه المالك: (1) راحة عين بدون زغللة، (2) بهجة/حفلات مفاجئة عند الصح.

### 🔬 التشخيص
| المشكلة | السبب الجذري | الملف |
|---|---|---|
| البار السفلي يغطي آخر الكروت | `#app{padding-bottom: calc(var(--nav-h)+24px)}` لكن `@media(pointer:coarse){.nav{--nav-h:70px}}` يغيّر المتغير على `.nav` فقط، فـ `#app` يظل يحسب 64px، والهامش 24px غير كافٍ | `base.css`, `fx.css` |
| فقاعات فاقعة تُجهد العين | v2 بالغت: alpha 0.75–1، هالة `r*1.6`، rim `0.95*A` سميك، حتى 34 فقاعة، وكروت شفافة 0.58 | `bubbles.js`, `tokens.css` |
| الكاش القديم يعلق | SW cache-first بدون إشعار تحديث؛ `skipWaiting` موجود لكن لا يوجد reload/toast | `sw.js`, `app.js` |
| شارات إيموجي قديمة | `badges.js` يستخدم `icon: '🚀'` نصياً | `badges.js`, `badges.css` |
| الاحتفال متشابه | `celebrate()` نوع واحد (burst) | `bubbles.js`, `fx.js` |

### 🗺️ الخطة (chunks)
- [x] K1: إصلاح تراكب البار: `--nav-h` على `:root` داخل `pointer:coarse` + `padding-bottom: calc(var(--nav-h) + 36px + safe)` + `scroll-padding-bottom`
- [x] K2: فقاعات هادئة (Ambient Calm Mode): 8–12 فقاعة، alpha 0.18–0.32، بلا هالة، rim ناعم 1.5px، سرعة أبطأ، **تتلاشى تحت الكروت** (كروت معتمة 0.92) — و**تختفي تدريجياً أثناء القراءة (السؤال ظاهر)** وتعود عند الاحتفال
- [x] K3: SW v1.2 network-first للـ shell + toast "نسخة جديدة — تحديث" + auto-reload عند controllerchange
- [x] K4: شارات SVG مجسمة: مولّد `badgeSVG(id)` (درع/دائرة/نجمة متدرجة + ظل + لمعة + أيقونة SVG) بدل الإيموجي، حالة مقفولة رمادية
- [x] K5: Party FX متنوعة: 6 أنواع (poppers شرائط، بلالين تطير وتفرقع، ألعاب نارية، نجوم متلألئة، مطر قلوب، حلقات ضوء) تُختار عشوائياً بدون تكرار متتالٍ + أصوات مطابقة (popper/balloon-pop/firework)
- [x] K6: اختبار: e2e + viewports + اختبار جديد لتراكب البار (آخر عنصر مرئي كامل بعد scroll) + لقطات
- [x] K7: PR #3 → https://github.com/html-mobile-audio/html-mobile-audio/pull/3 (commit مضغوط 3102f49+)
**آخر تحديث:** Phase 10 ✅ مكتملة — J0..J6: Audit + «يعني إيه يا بابا؟» (TTS karaoke + 4 أساليب + خطوات) + سارينة الإنجاز (4 أصوات مولّدة، إعدادات الأب كاملة) + telemetry/insights/تدريب مخصص/adaptive + تقرير الأب. 13 suite PASS + sha256 المحميات سليم → PR #8 مفتوح؛ التالي Phase 11 بعد الدمج.

**آخر تحديث:** Phase 10 ✅ مكتملة — J0..J6: Audit + «يعني إيه يا بابا؟» (TTS karaoke + 4 أساليب + خطوات) + سارينة الإنجاز (4 أصوات مولّدة، إعدادات الأب كاملة) + telemetry/insights/تدريب مخصص/adaptive + تقرير الأب. 13 suite PASS + sha256 المحميات سليم → PR #8 مفتوح؛ التالي Phase 11 بعد الدمج.
**نقطة الاستئناف التالية:** معالجة ملاحظات المراجعة على PR #3، أو بعد الدمج: Backlog RESEARCH.md §5 (اقتراح: K8 شارات SVG لصفحة الـHome/Profile، K9 وضع Focus أيضاً في quests، K10 تحسين أداء الحفلات على أجهزة ≤2GB).

---

## المرحلة 6 — Pure-Web & Arcade (PR #4)

**المصدر:** Gist `2cbbacc528490ed49f2492cdac99b6c0` (4 توجيهات معمارية) + رسالة المستخدم.
**خط الأساس:** `origin/main @ 4f10d21` (PR #3 مدموج). `emoji_audit.py` = **269 إيموجي في 27 ملف**.

### التشخيص
| # | المشكلة | السبب | الحل |
|---|---|---|---|
| 1 | كاش معلّق / تحديثات لا تصل | SW + manifest (PWA) | حذف `sw.js` + `manifest.webmanifest`، إزالة `<link rel=manifest>`، كود إلغاء تسجيل + مسح كاش عند الإقلاع |
| 2 | الحفلات خلف الكارت | `#bubbles` z-index 0 والكروت معتمة 0.92 | كانفاس ثانٍ `#fx-canvas` (`fixed; inset:0; z-index:9999; pointer-events:none`) يرسم كل جسيمات الاحتفال؛ الفقاعات المحيطة تبقى خلفاً |
| 3 | 269 إيموجي كيبورد | نصوص/كتالوج/شارات/HUD | مكتبة `icons3d.js` (SVG مجسّمة بتدرجات+لمعة+ظل) + `ico3d(name)` + استبدال شامل + فحص آلي = 0 |

### الخطة (push-per-chunk)
- [x] P1: إزالة PWA (sw.js/manifest/link) + كود unregister/caches.delete في app.js
- [x] P2: طبقة FX أمامية: `#fx-canvas` z-index 9999، تقسيم محرك bubbles → ambient (خلف) / fx (أمام)، floaters/combo z-index 9999
- [x] P3: `icons3d.js` — أيقونات SVG مجسّمة: heart, gem, flame, bolt, trophy, crown, star, medal, book, quran, mosque, calc, pen, headphones, target, shield, gear, moon, sun, compass, owl, brain, rocket, check, x, lock, gift, chart, bubble, seedling…
- [x] P4: كنس الإيموجي: HUD/components/home/profile/parent/play/quests/badges/subject/certificate/store/generators/renderers/fx/catalog.json/activities/*.json/index.html
- [x] P5: `emoji_audit.py` = 0 + اختبار طبقات (fx canvas فوق الكارت) + e2e + viewports + navoverlap
- [x] P6: → https://github.com/html-mobile-audio/html-mobile-audio/pull/4 (squash 683cec6) RESEARCH.md (Append-Only) مراجع المنصات + PROGRESS + PR #4

**آخر تحديث:** Phase 10 ✅ مكتملة — J0..J6: Audit + «يعني إيه يا بابا؟» (TTS karaoke + 4 أساليب + خطوات) + سارينة الإنجاز (4 أصوات مولّدة، إعدادات الأب كاملة) + telemetry/insights/تدريب مخصص/adaptive + تقرير الأب. 13 suite PASS + sha256 المحميات سليم → PR #8 مفتوح؛ التالي Phase 11 بعد الدمج.

**آخر تحديث:** Phase 10 ✅ مكتملة — J0..J6: Audit + «يعني إيه يا بابا؟» (TTS karaoke + 4 أساليب + خطوات) + سارينة الإنجاز (4 أصوات مولّدة، إعدادات الأب كاملة) + telemetry/insights/تدريب مخصص/adaptive + تقرير الأب. 13 suite PASS + sha256 المحميات سليم → PR #8 مفتوح؛ التالي Phase 11 بعد الدمج.
**نقطة الاستئناف التالية:** معالجة ملاحظات المراجعة على PR #4، أو بعد الدمج: شخصية مرشدة ثابتة (Duo/Kodi-style) + تقارير أهل أسبوعية + Focus mode في quests (Backlog RESEARCH.md §5 + ملحق Pure-Web).

---

## Hotfix — PR #5: تسريب كود SVG كنص (innerHTML + hud title escaping)

**التشخيص:** (1) `renderers.js:66` استخدم `textContent` مع ناتج `ico3d('cross')`؛ (2) `parent.js:48` نفس الشيء في رسالة PIN؛ (3) `hud()` يمرّ `title` عبر `esc()` بينما badges/quests/subject تحقن SVG داخل العنوان.
**الإصلاح:** `innerHTML` في الموضعين؛ `hud({ icon, title })` — الأيقونة اسم موثوق يُصيَّر HTML، والعنوان نص دائماً مُهرَّب. اختبار انحدار جديد `svg_leak.py` (ثابت + وقت تشغيل: لا `<svg` في `innerText` على أي صفحة، وأيقونة العنوان عنصر حقيقي).
- [x] H1 إصلاح renderers/parent/hud/views + CSS
- [x] H2 svg_leak.py ✅ emoji_audit ✅ layering ✅ e2e ✅ viewports ✅ navoverlap ✅ (+ answer-box inline layout)
- [x] H3 PR #5 → https://github.com/html-mobile-audio/html-mobile-audio/pull/5 (squash 263822a)

**آخر تحديث:** Phase 10 ✅ مكتملة — J0..J6: Audit + «يعني إيه يا بابا؟» (TTS karaoke + 4 أساليب + خطوات) + سارينة الإنجاز (4 أصوات مولّدة، إعدادات الأب كاملة) + telemetry/insights/تدريب مخصص/adaptive + تقرير الأب. 13 suite PASS + sha256 المحميات سليم → PR #8 مفتوح؛ التالي Phase 11 بعد الدمج.

**آخر تحديث:** Phase 10 ✅ مكتملة — J0..J6: Audit + «يعني إيه يا بابا؟» (TTS karaoke + 4 أساليب + خطوات) + سارينة الإنجاز (4 أصوات مولّدة، إعدادات الأب كاملة) + telemetry/insights/تدريب مخصص/adaptive + تقرير الأب. 13 suite PASS + sha256 المحميات سليم → PR #8 مفتوح؛ التالي Phase 11 بعد الدمج.
**نقطة الاستئناف التالية:** معالجة ملاحظات المراجعة على PR #5، أو بعد الدمج: شخصية مرشدة ثابتة (Duo/Kodi-style) + تقارير أهل أسبوعية + Focus mode في quests (Backlog RESEARCH.md §5 + ملحق Pure-Web).

---

## المرحلة 7 — Grand Benchmark: «ازرع نبتة» الحديثة + Cache-Busting (PR #6)

**المصدر:** Gist `b967caafc88f3cc48eccc9c4b50ac6f6` (4 ركائز) + رسالة المستخدم. **خط الأساس:** `origin/main @ f097e18` (PR #5 مدموج).
**قاعدة ذهبية:** `plant.html` لا يُمَسّ (1,293,786 بايت — يُتحقق بـsha256 قبل/بعد).

### جرد `plant.html` الأصلي (للمقارنة)
- صوت: `SND` فصحى 12 مقطعاً (welcome/story/tf1-3/complete/q1-3/personal/praise/gentle) + `SNDX` بلدي 10 مقاطع (+map) = **22 مقطع MP3 base64** (~1.2MB)
- نص القصة المشكول (9 جمل) + شرح بلدي لكل سؤال (`BALTXT`)
- 9 خطوات تقويم: 3 صواب/خطأ، 1 أكمل، 2 فهم، خريطة ذهنية (6 فقاعات)، 1 فهم، سؤال تعبير شخصي
- ما ينقصه: لا XP/جواهر/شارات، إيموجي كيبورد، كونفيتي DOM، بلا مشغل صوتي (تشغيل فقط)، لا ترتيب أحداث، لا مقارنة

### الخطة (push-per-chunk)
- [x] G1: استخراج الصوتيات إلى `app/content/audio/plant/{fusha,baladi}/*.mp3` (ملفات حقيقية بدل base64 → تحميل كسول + كاش متصفح) + `app/content/activities/plant_story.json` (نص/جمل/أسئلة/خريطة/ترتيب)
- [x] G2: Cache-Busting — `?v=6.0` لكل CSS/JS في `index.html` + `import()` للراوتر بـ`APP_VERSION` + سكربت `tools/bump_version.py` + اختبار
- [x] G3: أيقونات جديدة في `icons3d.js`: seed, sprout, pot, wateringCan, flower, book pages, play/pause/replay, speakerFusha/Baladi
- [x] G4: `story` renderer/view جديد `app/js/ui/views/story.js` + مسار `#/play/plant_story`: مشغل صوتي مزدوج (فصحى/بلدي) بأزرار 3D، تقدم، تمييز الجملة الجارية، إظهار/إخفاء النص، تحكم سرعة
- [x] G5: المراحل الأربع: TF (كروت) → MCQ (فهم+أكمل) → ترتيب أحداث (لمس/سحب) → خريطة ذهنية (6 فقاعات) → تعبير شخصي؛ XP/جواهر/إتقان/شارات/مهام + party FX أمامي عند الختام
- [x] G6: زر مقارنة (كلاسيك ↔ حديث) في HUD الصفحة + catalog entry + شارة `plant_story_1`
- [x] G7: RESEARCH.md (Append-Only): مواصفات icons3d + مقارنة Duolingo 3D/SF Symbols/Nintendo + رادار قصص (Duolingo Stories, Epic!, Reading Eggs, Vooks, Khan Kids)
- [x] G8: اختبارات: `plant_story.py` جديد (صوت يشتغل، تبديل، 4 مراحل، XP) + كل الـsuites (emoji_audit 0، svg_leak، layering، e2e، viewports، navoverlap) + sha256 لـplant.html
- [x] G9: PROGRESS + PR #6 بجدول مقارنة هندسي/تربوي

**آخر تحديث:** Phase 10 ✅ مكتملة — J0..J6: Audit + «يعني إيه يا بابا؟» (TTS karaoke + 4 أساليب + خطوات) + سارينة الإنجاز (4 أصوات مولّدة، إعدادات الأب كاملة) + telemetry/insights/تدريب مخصص/adaptive + تقرير الأب. 13 suite PASS + sha256 المحميات سليم → PR #8 مفتوح؛ التالي Phase 11 بعد الدمج.

### نتائج المرحلة 7 (مُجمَّعة)
- **صوت:** 22 مقطع MP3 مستخرج من plant.html (12 فصحى + 10 بلدي) إلى `app/content/audio/plant/{fusha,baladi}/` — plant.html sha256 `fb197ed2…722c` سليم 100%.
- **محرك:** `engines/storyAudio.js` (تبديل لهجة أثناء التشغيل بنفس الموضع، سرعة، seek، fallback عند غياب مقطع).
- **واجهة:** `views/story.js` + `views/storyQuestions.js` + `css/story.css` — غلاف → مشغّل 3D مع إضاءة الجملة → 4 مراحل (صحيح/خطأ، فهم+أكمل، ترتيب أحداث، خريطة ذهنية 6 فقاعات) → تعبير شخصي (دفتر) → نتائج مع حفلة أمامية.
- **مقارنة:** زر «كلاسيك ↔ حديث» في شريط القصة يفتح plant.html الأصلي داخل iframe.
- **Cache-Busting:** importmap + `?v=6.0` على 100% من CSS/JS/JSON/MP3؛ `tools/bump_version.py`؛ `tests/cachebust.py`.
- **أيقونات:** 19 جديدة (102 إجمالاً). **شارات:** `plant_story_1`، `plant_story_master`.
- **اختبارات:** 8 suites خضراء بما فيها `plant_story.py` (mobile+desktop).
- **PR #6:** https://github.com/html-mobile-audio/html-mobile-audio/pull/6 (مفتوح — commit واحد مُجمَّع فوق main)

---

## المرحلة 8 — Story Polish (تُدمج داخل PR #6 قبل الدمج) — خطة مجمّدة

> PR #6 ما زال مفتوحًا → نُكمل على نفس الفرع ثم نعيد الـsquash إلى commit واحد ونحدّث وصف PR #6.

- [x] H1: توقيتات دقيقة للجُمل: تحليل `story.mp3` (فصحى + بلدي) لاستخراج أزمنة كل جملة → `story.timings.{fusha,baladi}` في `plant_story.json`؛ `story.js` يستخدمها إن وُجدت وإلا يعود للتقدير النسبي
- [x] H2: واجهة «دفتري» في صفحة البروفايل لعرض إجابات التعبير الشخصي المحفوظة (`profile.journal`)
- [x] H3: أيقونات backlog صغيرة: `soil`, `rainDrop`, `speechBubble`, `bookmark` (+ استخدامها في الدفتر/القصة)
- [x] H4: اختبارات (plant_story.py يتحقق من timings + journal view) + كل الـsuites + squash + تحديث وصف PR #6

**آخر تحديث:** Phase 10 ✅ مكتملة — J0..J6: Audit + «يعني إيه يا بابا؟» (TTS karaoke + 4 أساليب + خطوات) + سارينة الإنجاز (4 أصوات مولّدة، إعدادات الأب كاملة) + telemetry/insights/تدريب مخصص/adaptive + تقرير الأب. 13 suite PASS + sha256 المحميات سليم → PR #8 مفتوح؛ التالي Phase 11 بعد الدمج.

---

## المرحلة 9 — Dynamic Replayability · المصحف التفاعلي · Math Lab (→ PR #7) — خطة مجمّدة

> الأساس: `origin/main @ 095e8d1` (PR #6 مدموج). ملفات محمية (sha256 مسجّلة): `albayyinah.html` aac6bafb…، `math.html` 694859aa…، `quran-alqadr/index.html` 52758e3f…، `plant.html` fb197ed2…

- [x] I1: أصوات المصحف: تنزيل آيات البينة (98:1–8) والقدر (97:1–5) + بسملة بصوت **الحصري المعلم** و**المنشاوي** (everyayah.com) → `app/content/audio/quran/{husary,minshawi}/{098,097}_NNN.mp3` + توقيتات (كل آية ملف مستقل = تظليل دقيق 100%)
- [x] I2: بيانات `quran_bayyinah.json` و`quran_qadr.json` (نص عثماني، تفسير ميسر بالبلدي لكل آية، مراحل: ترتيب آيات + أكمل الكلمة + اختيار معنى) — النمط `type:"quran"`
- [x] I3: `views/quranReader.js` + `css/quran.css`: مصحف تفاعلي (Dual Engine حصري↔منشاوي، تظليل الآية الجارية، القفز باللمس، تشغيل متسلسل، تكرار آية، شريحة تفسير بالبلدي، تبديل كلاسيك↔حديث → albayyinah.html / quran-alqadr/index.html)
- [x] I4: مراحل قرآنية (ترتيب/أكمل/معنى) بنفس renderers القصة + احتفال foreground + XP/شارات `quran_reader_1`
- [x] I5: Math: مولّدات إضافية (`grid` شبكة مصفوفة، `pick` اختيار النواتج) + renderer `grid` + كل نشاط رياضيات يصبح generator-only (zero static)؛ اختبار عشوائية: جلستان متتاليتان ≠ ترتيب/أرقام
- [x] I6: زر كلاسيك↔حديث في شريط مادة الرياضيات (`math.html`) والقرآن
- [x] I7: اختبارات `quran_reader.py` + `math_random.py` + كل الـsuites + sha256 للمحميات + PROGRESS + squash + PR #7

**آخر تحديث:** Phase 10 ✅ مكتملة — J0..J6: Audit + «يعني إيه يا بابا؟» (TTS karaoke + 4 أساليب + خطوات) + سارينة الإنجاز (4 أصوات مولّدة، إعدادات الأب كاملة) + telemetry/insights/تدريب مخصص/adaptive + تقرير الأب. 13 suite PASS + sha256 المحميات سليم → PR #8 مفتوح؛ التالي Phase 11 بعد الدمج.

---

## Phase 10 — «يعني إيه يا بابا؟» + سارينة الإنجاز + تحليل السلوك (من gist RO4_.md) → PR #8

**المصدر:** https://gist.github.com/pijsal1-tech/7c51347c47d953b36618577cacb5baa2 — 4 مهام: Audit + 3 ميزات. قيود غير قابلة للتفاوض: صوت أولًا، عامية مصرية، لا hardcoded (كل إعداد من لوحة الأب)، لا كسر لأي وظيفة، الملفات المحمية لا تُلمس، Zero-Emoji.

**قرارات تقنية (مجمّدة):**
- TTS: Web Speech API (`speechSynthesis`, صوت عربي إن وُجد) + تظليل كلمة-كلمة (karaoke) عبر `onboundary` وfallback زمني. لا backend.
- الشرح: قوالب حتمية بالعامية مولّدة من meta السؤال (kind/skill/operands) — 4 أساليب: `readaloud` (اقرأهالك) / `story` (حدوتة) / `reallife` (من حياتك) / `steps` (خطوة-خطوة تفاعلي بأسئلة صغيرة، الإجابة النهائية في الآخر فقط). «لسه مش فاهم» = أسلوب مختلف فعلًا (دورة بلا تكرار).
- السارينة: Web Audio API مُولَّدة برمجيًا (police_siren_eg two-tone sweep / school_bell / applause / victory_tune) — بلا ملفات، بلا حقوق. Loop حتى المدة + fade-out + حد أقصى للصوت + تتوقف عند الخروج.
- الإعدادات لكل طفل في `profile.settings.celebration` و `profile.settings.explain` و `profile.settings.adaptive` — من لوحة الأب فقط، تسري فورًا.
- Telemetry: `profile.events[]` (سقف 3000) — `question_shown / question_attempted{skill, correct, attempts, time_ms, wrong_value} / explanation_requested{strategy, solved_after} / stage_completed`. كل مولّد يضيف `skill` دقيقة (مثل «جدول ٣»، «العدد المفقود»، «الشبكة»، «مضاعفات»، «التوزيع»، «التبديل»، «ترتيب الآيات»...).
- التحليل rule-based شفاف (`engines/insights.js`): خريطة إتقان لكل مهارة (نسبة/اتجاه/ثقة)، أنماط الخطأ (جدول مجاور، جمع بدل ضرب، عكس أرقام)، مؤشرات (اندفاعي، مثابرة، تعب، إحباط، أنفع أسلوب شرح، أفضل وقت). الفعل: نشاط «تدريب مخصص» ديناميكي لأضعف 2–3 مهارات، تأخير قبول الإجابة للاندفاعي، اقتراح راحة عند التعب، تقرير الأب + «إزاي أشرحها لابني؟» سكريبت.

**Chunks:**
- [x] J0: تجميد الخطة (هذا) + push
- [x] J1: `genspark_ai_developer/AUDIT_REPORT.md` — audit حقيقي للريبو (بنية، stack، data model، لوحة الأب، الموجود صوت/تتبع، tech debt، أمان/خصوصية) + push
- [x] J2: `engines/telemetry.js` + `skill` في المولّدات + ربط Session/play/phaseRunner + push
- [x] J3: `engines/speech.js` + `engines/explain.js` + زر «يعني إيه يا بابا؟» (bottom sheet، karaoke، لسه مش فاهم، steps) + CSS + push
- [x] J4: `engines/celebration.js` (4 أصوات مولّدة) + إعدادات لوحة الأب + إطلاق عند 100% فقط + parent alert + push
- [x] J5: `engines/insights.js` + تقرير الأب (أضعف 3 + نمط الخطأ + الأثر + سكريبت) + «تدريب مخصص» على الرئيسية + adaptive (delay/break) + push
- [x] J6: `app/tests/phase10.py` + كل الـsuites + bump + PROGRESS + squash + PR #8

**آخر تحديث:** Phase 10 ✅ مكتملة — J0..J6: Audit + «يعني إيه يا بابا؟» (TTS karaoke + 4 أساليب + خطوات) + سارينة الإنجاز (4 أصوات مولّدة، إعدادات الأب كاملة) + telemetry/insights/تدريب مخصص/adaptive + تقرير الأب. 13 suite PASS + sha256 المحميات سليم → PR #8 مفتوح؛ التالي Phase 11 بعد الدمج.

## Phase 11 — القاعدة الذهبية + تدقيق شامل + RTL + حلقة التعلم من الخطأ + الصوت (مصدر: gist pijsal1-tech/87412e…)
مبدأ: لا قبول أعمى لأي حل مقترح في الـgist؛ كل ادعاء يُثبت في DOM/الكود أولًا (راجع RULES.md).
- [x] K0: `RULES.md` (القاعدة الذهبية) + تجميد خطة Phase 11 هنا + push (PR #8 مُدمج في 0333c90؛ الفرع أُعيد فوق main)
- [x] K1: تدقيق شامل للمستودع/الموقع: index.html + الصفحات الكلاسيكية + app/ — روابط، أزرار classic<->modern، 404 sweep؛ تقرير `AUDIT_REPORT.md` (append) + إصلاحات + push
- [x] K2: RTL: إعادة إنتاج بعثرة نص الكاريوكي في Chromium (قياس x لكل .kw مقابل الترتيب المنطقي + computed direction/unicode-bidi) -> إصلاح أدنى مُثبت + test `phase11_rtl.py` + push
- [x] K3: حلقة التعلم من الخطأ في play.js (+ phaseRunner/story): لا كشف للإجابة عند أول خطأ، shake + «قريب يا بطل! فكّر تاني»، pulse لزر «يعني إيه يا بابا؟»، «هجرّب أحلّ» يرجع لنفس السؤال فاضي، احتفال «اتعلمت من الغلط»، جولة مراجعة «تحدي أبطال الماث» آخر الجلسة؛ تحديث e2e/math_random + test `phase11_mistake.py` + push
- [x] K4: الصوت: استكمال البحث الموثّق (Web Speech voices per platform، Piper حجم فعلي، edge-tts جدوى، بدائل) -> `workspace--RESEARCH/RESEARCH.md`؛ تنفيذ zero-KB: ترتيب أصوات (Natural/Google/Android > Hoda)، rate/pitch، إعادة صياغة نصوص explain.js صوتيًا بالمصري، utterance لكل جملة؛ test + push
- [x] K5: README.md الجذر (append-only): سجل إنجازات Phases 9-11 + المزايا + الروابط + رقم النسخة + push
- [x] K6: كل الـsuites (13 + الجديدة) + sha256 المحميات + bump + PROGRESS نهائي + squash + PR #9

**آخر تحديث:** Phase 11 — K0 ✅ K1 ✅ (تدقيق: 0 أخطاء قابلة للإصلاح؛ 404 وحيد = MP3 مفقود يشير إليه math.html المحمي). K2 ✅ (إثبات: البعثرة لا تحدث في Chromium إلا عند وجود سلف LTR؛ الإصلاح: dir=rtl على الـsheet و.k-text + direction/unicode-bidi:isolate على .k-text/.k-sent/.kw + جملة لكل سطر؛ test phase11_rtl 18/18 MATCH تحت rtl و ltr). K3 ✅ (session.retry()/isRetry/missed/recovered + review round؛ play.js: أول غلط = shake + «قريب يا بطل» + pulse لزر الشرح + لا كشف (ctx.reveal يمنع renderers بما فيها numpad «الصحيح N»)؛ «هجرّب أحلّ»/«جرّب تاني» يعيدان نفس السؤال فاضيًا؛ نجاح المحاولة الثانية = feedback.recovered + confetti؛ النتائج تعرض «تحدي أبطال الماث (N)» -> جولة practice خفيفة +2XP/سؤال؛ phase11_mistake.py 24/24 + e2e + math_random PASS). ملاحظة: phaseRunner/story (قرآن/قصة) أُبقيا على السلوك القديم عن قصد — المحتوى هناك حفظ/قصة لا حساب. K4 ✅ (RESEARCH.md: edge-tts مرفوض بدليل بروتوكولي (Origin مزوّر + Sec-MS-GEC)؛ Piper ar_JO = 60MB أردني مرفوض؛ الحل zero-KB: speech.rank() يفضّل Natural/Google/Android/Apple على Hoda، phonetic() يحوّل الأرقام لكلمات مصرية «تلاتة/اتناشر/أربعة وعشرين» + MSA->مصري + × = + -> كلام، utterance لكل جملة، rate 0.95 للأصوات الطبيعية؛ لوحة الأب: اختيار الصوت + «اسمع تجربة» + تلميح التوفر؛ phase11_voice.py 19 فحص PASS + phase10 SMOKE OK). K5 ✅ (README قسم «سجل المراحل 9-11» append-only + bump v7.8). K6 ✅ (16 suite PASS + sha256 المحميات سليم + v7.8 + PR9_BODY.md) -> squash 9ad5a0b فوق main -> **PR #9 مفتوح: https://github.com/html-mobile-audio/html-mobile-audio/pull/9**. Phase 11 ✅ مكتملة؛ التالي: انتظار الدمج ثم Phase 12 حسب توجيه المالك.

## Phase 12 — Schoolbook Visual Parity (خواص الضرب بالتفكيك) + تعميم حلقة الخطأ (مصدر: issue #10 + gist 6f2f6c95…)
**حالة: القرارات مُجمَّدة (gist 3f69e14a) — التنفيذ جارٍ L1..L5.**

### ما تحقق منه فعليًا (لا تخمين)
- issue #10 = صورتان فقط بلا نص (حُمّلتا بالتوكن وقُرئتا): صفحتا 8 و9 من كتاب الوزارة (الفصل 1 قواعد الضرب — درس ٢-١ خواص الضرب الجزء الثاني). ص8: «نلاحظ» ٩×٣=٢٧ يُفكَّك (٤×٣=١٢)+(٥×٣=١٥) وكذلك (١×٩)+(٢×٩)، ثم «استعدوا يا أصدقائي» + «طريقة الحل» بحلول برتقالية. ص9: «وقت المحاولة» (4 مسائل) و«هيا نتدرب» (6 مسائل) بنفس القالب: المسألة الأصل يمينًا -> قوس تفريع «>» -> فرعان (عامل ثابت × جزء) = مربع -> خط جمع أفقي -> «المجموع» مربع. شخصية كرتونية ببالون نصيحة («لديك اختيارات كثيرة لكتابة مكونات العدد»).
- ادعاء الـgist «`.tree-container`/`.branch-connector` موجودة في math.html لكن غير مفعلة بصريًا»: **صحيح** — CSS في السطور 310-336؛ `.branch-connector` لون/خط فقط ولا يُستخدم كموصّل مرسوم؛ الصفوف `.tree-branch-row` عمودية بـ`direction:ltr` («5 × 4 = [؟]» ثم «[؟] × 4 = 12») بلا أي قوس/سهم. (ملف محمي — لا يُعدَّل).
- ادعاء «نشاط distributive في app/ معادلة خطية»: **صحيح** — `generators.js:54` يولّد `٤ × ٧ = (٤ × ٥) + (٤ × ؟)` كـnumpad، و`:55` يولّد `(٤ × ٥) + (٤ × ٢) = ؟` كـquiz. لا يوجد renderer شجري (الموجود: quiz/truefalse/fillblank/numpad/match/order/grid/pick).

### الفجوة التربوية بعيون طفل 8 سنوات
1. الكتاب يفصل **ثلاث عمليات ذهنية في ثلاثة أماكن** (فكّ -> اضرب كل فرع -> اجمع)؛ المعادلة الخطية تدمجها في سطر واحد فيضيع «أين أنا الآن».
2. القوس «>» يجعل الفرعين **ابنَي** المسألة الأصل (جزء-كل) — نفس منطق Number Bond في Singapore Math؛ الطفل يعرفه من الكتاب فلا نُعلّمه لغة بصرية جديدة.
3. خط الجمع + كلمة «المجموع» إشارة صريحة لـ«اجمع الآن»؛ في المعادلة الخطية «+» وحيدة صغيرة.
4. الكتاب يترك 3-4 مربعات فارغة = خطوات صغيرة بدل خطوة واحدة كبيرة؛ يوافق حلقة الخطأ خطوة-خطوة.

### مقترح التصميم A — renderer جديد `branch` (للموافقة)
```
 [ ٦ × ٧ ]  ─┐                          <- رأس الشجرة (كبسولة كبيرة، ذهبي)
             ├─>  [ ٦ × ٥ ] = [ ؟ ]     <- فرع 1 (الجزء الأول معطى)
             └─>  [ ٦ × □ ] = [ ؟ ]     <- فرع 2 (الجزء الثاني فارغ — أول مربع يُملأ)
             ───────────────            <- خط الجمع (SVG)
                  المجموع  = [ ؟ ]      <- المجموع
```
- الموصّلات: **SVG واحد** خلف الشبكة (paths بمنحنى `Q` ناعم) يُحسب من `getBoundingClientRect` للمربعات عند التحميل/تغيير الحجم -> محاذاة دقيقة على أي شاشة، بلا صور.
- المربعات الفارغة: أزرار ≥ 56px؛ المربع النشط بحدّ ذهبي نابض؛ الإدخال عبر `.numpad` الموجودة أسفل الكارت (لا كيبورد نظام). ترتيب الملء: الجزء الثاني -> ناتج فرع 1 -> ناتج فرع 2 -> المجموع (انتقال تلقائي + يمكن النقر على أي مربع).
- التحقق لكل مربع عند «تأكيد»: صحيح -> أخضر ويُقفل؛ خطأ -> حلقة الخطأ الحالية (shake + «قريب يا بطل» + pulse زر الشرح، **لا كشف**) على مستوى المربع؛ `ctx.done(true)` مرة واحدة عند اكتمال الشجرة مع `meta.slots` (أي مربع أُخطئ فيه) للتقارير.
- RTL كامل (الأصل يمينًا كالكتاب)، أرقام هندية، ألوان نظام الـneon الحالي (لا لوحة جديدة)، شخصية = `ico3d` موجودة ببالون نصيحة من `explain.js`.
- التوليد: `generators.distributive` يضيف `mode 2 -> type:'branch'` مع `meta.kind:'distributive'` كي تعمل «يعني إيه يا بابا؟» بلا تغيير؛ الوضعان الحاليان يبقيان للتنويع.
- لن نلمس `math.html`؛ لا أصول جديدة؛ لا مكتبات.
- الاختبار `phase12_branch.py`: نهايات الـpaths عند حواف المربعات (≤ 3px) على 3 عروض، إتمام الشجرة يطلق `done(true)` مرة واحدة، مربع خاطئ يطلق حلقة الخطأ دون كشف، + 16 suite PASS.

**بديلان:** (B1) بطاقتان أفقيتان بـ«+» كبيرة — أبسط لكنه يفقد «الأصل يتفرّع». (B2) Number Bond دائري (سنغافورة) — يخالف شكل كتاب الوزارة الذي يعرفه سليم. **توصيتي: A** (مطابق للكتاب).

### تعميم حلقة الخطأ على القرآن/النبتة — فحص أولي
- `phaseRunner.js` و`story.js` يستخدمان نفس `renderers` + `feedback()` القديم (يعرض `q.explain` فورًا). الأنسب: استخراج منطق retry/review إلى وحدة مشتركة `ui/mistakeLoop.js` يستدعيها play/phaseRunner/story بدل تكرار الكود.
- **سؤال يحتاج قرار المالك (لن أخمّن):** في «ترتيب الآيات» و«إكمال الكلمة» — محاولة ثانية بلا أي تلميح، أم تظليل موضع الخطأ فقط دون إظهار الصحيح؟

### خطة التنفيذ بعد الموافقة (chunks مدفوعة)
- [x] L0: تجميد القرار — gist 3f69e14a: **التصميم A معتمد**؛ القرآن/النبتة: **تظليل موضع الخطأ فقط (برتقالي هادئ + اهتزاز خفيف) دون كشف الصحيح**؛ شرط إلزامي: **رابط معاينة حية من الساندبوكس** قبل الدمج
- [x] L1: renderer `branch` + SVG + CSS (480a60d) — مراجعة لقطة الشاشة كشفت أن المنحنى الجانبي يلتف فوق المربعات؛ أُعيد تصميم الموصّل كجذع ينزل من قاع الرأس مع كوع دائري لكل فرع (شكل «<» الكتاب مُدارًا للموبايل)
- [x] L2: generator mode 2 -> `branch` + `ctx.slotMiss` (قلب مرة واحدة عبر session.retry، تشجيع، pulse، لا كشف) + solver في math_random (4806e7e)
- [x] L3: `phase12_branch.py` أُعيد بعد تعديل الجذع: **43 فحص PASS** (3 عروض: الجذع يبدأ من قاع الرأس، كوع لكل فرع، لا التفاف فوق المربعات؛ تدفق المربعات؛ حلقة الخطأ لكل مربع بلا كشف؛ done مرة واحدة) + **16 suite PASS** + sha256 المحميات سليم. لقطات مراجعة بصرية (412px): فارغ https://www.genspark.ai/api/files/s/I7YgWZAa | بعد مربع خاطئ (قلب -1، برتقالي، pulse زر الشرح، لا كشف) https://www.genspark.ai/api/files/s/r1g1uQRD. معاينة حية (ساندبوكس مؤقت): https://8090-iz7xqd4m0mlz04fii4war-5c13a017.sandbox.novita.ai/app/index.html#/play/distributive
- [x] L4: `ui/mistakeLoop.js` مشترك -> phaseRunner/story — L4a ✅ (8b0805d: الوحدة المشتركة + gating «تظليل موضع الخطأ فقط» في storyQuestions/renderers) | L4b ✅ (f339874 phaseRunner، 447a03b story — مدفوعان قبل reset) | L4c ✅ (982b490): test `phase12_loop_all.py` (قرآن order/fill + نبتة tf): **31 فحص PASS** — لا كشف عند أول خطأ، .wrong فقط، قلب واحد، «جرّب تاني»/«هجرّب أحلّ» يعيدان السؤال فاضيًا، recovered عند النجاح الثاني، الكشف فقط بعد الخطأ الثاني
- [x] L5: README append ✅ + v7.9 ✅ + 18 suite PASS في sandbox جديد ✅ + sha256 سليم ✅ + معاينة حية مُتحقَّق منها من الخارج: https://8090-i3gsj0npx7otyfkt7gdp5-d0b9e1e2.sandbox.novita.ai/app/index.html#/play/distributive + squash 0105e91 -> PR #12

**آخر تحديث:** Phase 12 ✅ مكتملة L0-L5 — **PR مفتوح: https://github.com/html-mobile-audio/html-mobile-audio/pull/12** (المطلوب كان «PR #10» لكن GitHub خصّص الرقم 12 لأن #10 هو الـissue و#11 مستهلك؛ الرقم لا يُختار يدويًا). التالي: انتظار مراجعة المالك للمعاينة الحية ثم الدمج.

## Phase 12.1 — UX polish من الاختبار الميداني (gist 1187b2e8) — بعد دمج PR #12 (46838b8)
ثلاثة عيوب رصدها المالك بالماوس/الكيبورد، تحققت منها في الكود قبل الإصلاح:
1. Enter يتخطى السؤال: `play.js` مستمع keydown في feedback() ينفّذ go() (مُثبت: السطر 185)؛ وrenderer branch كان يستمع لـEnter دون منع الانتشار.
2. رسالة التشجيع floater في منتصف الشاشة تغطي «المجموع» وتختفي بعد ~1s (`play.js:109` fx.floater).
3. إجبار الضغط على ✓ بعد كل رقم.
- [x] M1: الإصلاح (d702c3d، مدفوع قبل reset): Enter يُلتقط في renderer (capture + stopImmediatePropagation) ويُتحقق من المربع فقط؛ feedback يسلّح مستمع Enter بعد 900ms ويتجاهل repeat؛ `nudgePill` كبسولة أعلى الكارت 3.5s بدل floater؛ auto-advance بعدد الأرقام المتوقع + النقر على مربع آخر يتحقق من الحالي أولًا + دعم أرقام هندية من الكيبورد.
- [x] M2: `finished` guard (c383908) + `phase12_ux.py` 16/16 PASS (b6aa6a7) + **تراجع حقيقي اكتشفه phase12_branch**: auto-check + ✓ كانا يتحققان من نفس القيمة مرتين -> miss وهمي؛ الإصلاح: مؤقّت auto-check واحد يُلغى بأي تحقق صريح/حذف (1351171) -> phase12_branch 43/43
- [x] M3: بعد 1351171: phase12_ux 16/16، phase12_loop_all 31/31، phase11_mistake، e2e PASS؛ math_random كان يفشل لأن solver ينقر ✓ بعد اكتمال الشجرة (اللوحة مقفلة) -> solver يعتمد auto-advance (dff9dba) -> PASS
- [x] M4a: README 12.1 + v7.10 (b294729) + 19 suite PASS في sandbox جديد + sha256 سليم + PR13_BODY.md
- [x] M4b: معاينة حية مُتحقَّقة من الخارج (200، v7.10، renderer/CSS المُصلَحان يُخدَمان): https://8090-i97dii80goc0mrecx4o1g-2e1b9533.sandbox.novita.ai/app/index.html#/play/distributive + squash فوق main (98d3d9c، commit واحد) + **PR #13 مفتوح: https://github.com/html-mobile-audio/html-mobile-audio/pull/13**

**آخر تحديث:** Phase 12.1 ✅ مكتملة M1-M4b — **PR #13 دُمج (2eb2f9f): https://github.com/html-mobile-audio/html-mobile-audio/pull/13** (PR #12 كان قد دُمج قبل طلب «التحديث في مكانه»، فالإصلاح يحتاج PR جديدًا؛ الرقم يخصّصه GitHub). ملاحظة: رابط المعاينة الحية مرتبط بالـsandbox الحالي؛ عند reset يجب إعادة تشغيل tools/serve.py 8090 وتوليد رابط جديد والتحقق منه من الخارج قبل الدمج. التالي: انتظار مراجعة المالك للمعاينة ثم الدمج.

---

## Phase 12.2 — Mobile TTS + Paced Karaoke (gist 250138e4) — خطة مجمّدة

**تحقق من ادعاءات الـgist في الكود قبل التنفيذ (RULES.md: صفر قبول أعمى):**
- ✅ صحيح: `explainSheet.js:80` — `say()` يستدعي `speak()` داخل `setTimeout(...,120)` بينما «اسمع تاني» (سطر 71) متزامن -> على iOS/Android أول `speechSynthesis.speak()` خارج الـgesture يُكتم.
- ✅ صحيح: `speech.js:136` — `u.onend = () => { if (fallbackStarted) return; next(); }` بلا فحص زمني -> عند onend فوري (صوت مكتوم/غائب) تتسلسل الجمل في ms، `finish()` (سطر 107) يمسح مؤقت الحارس 1200ms (سطر 140)، و`onEnd` في explainSheet يلوّن كل الكلمات `.said` دفعة = الوميض المرصود.
- ❌ مرفوض: «الكود يفترض ar-EG دائمًا» — `rank()` (78/83) يقبل أي `ar-*` مع تفضيل ar-EG؛ `onvoiceschanged` مربوط (153)؛ `onerror` + حارس 1200ms يشغّلان الكاريوكي البصري. لا إعادة بناء لسلسلة اللغات.
- ❌ مرفوض: pacing ثابت 300-350ms — `schedule()` (112) يحسب حسب طول الكلمة (min 260ms)؛ يُعاد استخدامه كما هو.
- ملاحظة: «PR #14» رقم يخصّصه GitHub.

**Chunks (push-per-chunk):**
- [x] N1 (a0cdd37): `speech.js` — (a) `warm()` يُربط بأول pointerdown/touchstart/keydown (كما sound.js:37): utterance فارغ + `cancel()` لفتح المحرك على iOS؛ (b) Pacing Guard في `onend`: لو الجملة انتهت في زمن < `minMs = max(250, spokenWords*120)` أو بلا `onstart` -> لا `next()`؛ `fallbackStarted=true` و`schedule()` من الكلمة الحالية؛ (c) `onEnd` لا يُنادى قبل انتهاء الجدول البصري.
- [x] N2 (a0cdd37): `explainSheet.js:80` — إزالة `setTimeout(120)`: `say()` متزامن داخل مسار النقر (open->show->say). التحقق: لا تغيير في ترتيب DOM (الـkaraoke يُبنى قبل `say`).
- [x] N3: `app/tests/phase12_mobile_tts.py` PASS 17/17 (A: محرك صامت onend بعد 5ms -> 8 كلمات في 4.8s، dwell>=313ms، utterance واحد فقط، speak متزامن داخل click؛ B: بلا onstart -> حارس 1200ms؛ C: headless انحدار). درس: add_init_script يحتاج IIFE لا arrow بلا استدعاء — Playwright بجهاز Pixel/iPhone: mock `speechSynthesis` يطلق onstart+onend بعد 5ms (كتم)؛ التحقق أن التظليل يستغرق >= 2.5s لجملة 6+ كلمات ولا يقفز؛ + أن `speak()` نُودي متزامنًا مع النقر (stack flag داخل الحدث).
- [x] N4: 20 suite PASS (quran_reader فشل مرة واحدة على woff2 من fonts.gstatic في دفعة ثقيلة = شبكة، PASS منفردًا) + sha256 المحميات سليم + README 12.2 + v7.11 + PR14_BODY.md + معاينة مُتحقَّقة: https://8090-irbfdwdys21fw69guwt6g-b32ec7bb.sandbox.novita.ai/app/index.html#/play/mult_3 ؛ ثم squash (e2c737e، commit واحد) + **PR #14: https://github.com/html-mobile-audio/html-mobile-audio/pull/14**. أصل الخطة: + sha256 المحميات + README append (12.2) + bump v7.11 + squash فوق main + PR جديد + معاينة حية.

**آخر تحديث:** Phase 12.2 ✅ مكتملة N1-N4 — **PR #14 دُمج (96e4c06): https://github.com/html-mobile-audio/html-mobile-audio/pull/14**. نتيجة الاختبار الميداني: الكاريوكي متّزن لكن بلا صوت على Android -> Phase 13. كان التالي: اختبار المالك الميداني على الهاتف الحقيقي (الصوت نفسه لا يُختبر في Playwright، الـpacing نعم) ثم الدمج.

---

## Phase 13 — دراسة معمارية: صوت موحّد لكل الأجهزة (gist 165f815b) — تقرير للمراجعة، لا كود قبل الاعتماد

### 0) نتيجة الاختبار الميداني بعد PR #14
Android: التظليل متّزن كلمة-كلمة (الـPacing Guard اشتغل كما صُمّم) **لكن بلا صوت**. هذا يطابق مسار `pace()`: المحرك أطلق onend أسرع من زمن النطق = لم ينطق.

### 1) التحقق من ادعاءات الـgist (RULES.md)
| الادعاء | الدليل | الحكم |
|---|---|---|
| `parentSettings.js:74` فيه تلميح «مفيش صوت عربي مثبّت — على أندرويد: إعدادات > تحويل النص لكلام» | موجود حرفيًا في السطر 74 | صحيح |
| المتصفح وسيط لمحرك نطق النظام، ولا ينطق عربي بدون حزمة عربية مثبّتة | صحيح كآلية (Web Speech API يستخدم أصوات النظام) | صحيح كآلية |
| «90% من هواتف أندرويد في مصر بدون الحزمة العربية» | لا مصدر ولا قياس | **غير مُثبت** — لن أبني عليه رقمًا؛ يكفي أن هاتف المالك نفسه صامت |
| `send_voice.py` يستخدم Fish Audio بأصوات مصرية | `tools/send_voice.py:188-197`: `api.fish.audio/v1/tts`، `model s2.1-pro-free`، `format mp3`، `reference_id` من presets | صحيح — لكن **لا يوجد `FISH_API_KEY` في هذا الـsandbox** (`.env` غير موجود، `.env.example` فقط) |
| «Web Audio يعمل 100% على كل الأجهزة، نفس محرك المؤثرات» | **خطأ جزئي مهم**: على iOS Safari، Web Audio **يُكتم بمفتاح الصامت**، بينما عنصر `<audio>` (HTMLAudioElement) يعمل حتى في الوضع الصامت (feross/unmute-ios-audio، adactio). iOS 17+ يتيح `navigator.audioSession.type = 'playback'` | **مرفوض كما صيغ** — البديل يجب أن يكون `<audio>` لا Web Audio |
| Duolingo / Khan Kids تستخدم ملفات صوت مسجّلة | ادعاء معقول لكن لم أتحقق منه بمصدر | لم يُستخدم كدليل |

### 2) قياسات حاسمة من الكود نفسه (لا تقديرات)
أحصيت كل جمل الشرح التي يولّدها `explain.js` فعليًا (`plan()` لكل meta بجداول ٢-١٠ × ٢-١٠، أنواع mult/missing/commutative/distributive، ١٢ seed لكل سؤال، ٤ استراتيجيات):
| القياس | القيمة |
|---|---|
| أسئلة (meta) | 648 |
| جمل **مختلفة** فعليًا | **4,813** |
| قوالب جمل (بعد استبدال الأرقام بـ #) | **152** |
| **مقاطع ثابتة** (نص بين الأرقام) | **190** مقطعًا = 604 كلمات ≈ 4.5 دقيقة صوت |
| أرقام مختلفة داخل الجمل | 42 (add/sub حتى ١٠٠ ترفعها لنحو ١٠١) |
| حجم تسجيل **كل الجمل كاملة** (32kbps) | **≈ 77 MB** -> غير عملي |
| حجم **المقاطع + الأرقام** (32kbps) | **≈ 1-1.5 MB** -> عملي (قصة النبات الحالية وحدها 480KB لكل لهجة، والمستودع فيه 8.3MB صوت) |

**الاستنتاج:** الخيار B كما ورد في الـgist («توليد جمل الشرح مسبقًا») مستحيل بصيغة الجمل الكاملة (٤٨١٣ جملة، ٧٧MB)، لكنه **ممكن بصيغة التجميع** (concatenative): ١٩٠ مقطعًا ثابتًا + ~١٠١ رقم بالعامية، تُركّب وقت التشغيل.

### 3) أصول قائمة يمكن إعادة استخدامها (لا بناء من الصفر)
- `app/js/engines/storyAudio.js`: عنصر `<audio>` واحد مشترك، يُفتح بأول لمسة، `playsinline`، preload، fallback بين مسارين — **مُثبت عمله على الهواتف** في قصة النبات (163 ملف mp3 موجودة).
- `speech.phonetic()` / `numWords()`: الطبقة المصرية للأرقام موجودة -> نفس المفاتيح تُستخدم لتسمية ملفات الأرقام.
- `speech.js` Pacing Guard (12.2): كاشف موثوق لـ«المحرك صامت».
- `tools/send_voice.py`: مولّد offline بأصوات مصرية؛ يحتاج مفتاح المالك.

### 4) جدول مقارنة الخيارات
| | A: Adapter فقط (TTS ثم بصري) | B': مقاطع مسجّلة مُجمّعة + Adapter | C: توليد سحابي + كاش | D: TTS داخل المتصفح (WASM) | E: الوضع الحالي |
|---|---|---|---|---|---|
| صوت على Android بلا حزمة عربية | لا (صامت) | **نعم** | نعم (أول مرة بنت) | نعم | لا |
| iOS بمفتاح الصامت | حسب المحرك | **نعم** (`<audio>`) | نعم (`<audio>`) | لا إن استُخدم Web Audio | حسب المحرك |
| بدون إنترنت | نعم | **نعم** (ملفات محلية) | لا في أول مرة لكل جملة | نعم بعد التحميل | نعم |
| لهجة مصرية طبيعية | حسب جهاز المستخدم (غالبًا فصحى) | **نعم، صوت واحد ثابت معتمد** | نعم | لا: الصوت العربي الوحيد في piper-voices هو `ar_JO/kareem` أردني 60MB (RESEARCH.md:604) | لا |
| الحجم | 0 | ~1-1.5MB (تحميل كسول لكل نوع سؤال) | ~0 أولي | 60MB | 0 |
| زمن الاستجابة | فوري | فوري بعد preload عند عرض السؤال | 0.5-2s شبكة | ثوانٍ (inference) | فوري |
| دقة الكاريوكي | onboundary غير مضمون | **دقيقة**: مدة كل مقطع معروفة مسبقًا | تحتاج محاذاة | تحتاج محاذاة | تقديرية |
| متطلبات جديدة | لا | مفتاح Fish مرة واحدة وقت البناء | **backend** يخفي المفتاح (لا يوضع في المتصفح) + تكلفة لكل طلب | مكتبة WASM | — |
| صيانة | منخفضة | متوسطة: أي تعديل في نص `explain.js` يتطلب توليد مقاطعه (يُحرس باختبار تغطية) | متوسطة-عالية | عالية | — |
| مخاطرة | لا يحل المشكلة | **وصلات بين المقاطع** (نبرة غير متصلة أحيانًا) + صيغ العدد (تلاتة/تلات) | اعتماد على شبكة وخدمة خارجية | الحجم واللهجة | — |

### 5) المشاكل الخفية وكيف يعالجها المقترح
1. **بدون إنترنت:** المقاطع ملفات static ضمن الموقع؛ تُحمّل كسولًا لنوع السؤال الحالي وتبقى في كاش HTTP. ملاحظة: الـService Worker أُزيل عمدًا في Phase 6 (683cec6)؛ لن أعيده دون قرار منك.
2. **صفر تأخير:** preload لمقاطع السؤال عند عرض الكارت (قبل ضغط الزر)؛ `play()` متزامن داخل اللمسة.
3. **تزامن الكاريوكي:** manifest يحمل مدة كل مقطع وتوقيت كلماته (محاذاة كلمات تُحسب وقت البناء مرة واحدة بـtranscription بتوقيتات word-level) -> التظليل يتبع `currentTime` الحقيقي بدل التقدير.
4. **التنقل السريع/التداخل:** عنصر `<audio>` واحد + `stop()` موحّد يلغي الطابور عند تغيير الاستراتيجية أو إغلاق النافذة (نفس عقد `speech.stop()` الحالي)؛ اختبار يضغط «لسه مش فاهم» بسرعة ويتحقق أن مصدرًا واحدًا فقط يعمل.
5. **انجراف المحتوى:** اختبار تغطية يمر على كل قوالب `explain.js` ويفشل إن ظهر مقطع بلا ملف -> لا يمكن تعديل نص الشرح ونسيان الصوت.
6. **مقطع ناقص وقت التشغيل:** Adapter يسقط تلقائيًا: مقاطع -> Web Speech (إن وُجد صوت عربي فعلي نطق) -> كاريوكي بصري متّزن (12.2). لا صمت مع وميض أبدًا.
7. **الخصوصية/الأمان:** لا مفتاح في المتصفح؛ التوليد offline فقط (كما AUDIT_REPORT.md:38).

### 6) المعمارية المقترحة (B' + A)
```
app/js/engines/voice/
  provider.js        واجهة موحدة: speak(text,{onWord,onEnd}) / stop() / preload(texts) / ready
  clipsProvider.js   يقسّم الجملة إلى [مقطع ثابت | رقم] -> طابور ملفات على <audio> واحد، onWord من manifest
  ttsProvider.js     speech.js الحالي كما هو (rank/phonetic/pacing guard)
  visualProvider.js  schedule() المتّزن (بلا صوت)
app/content/audio/explain/
  manifest.json      { key -> { file, ms, words:[t0..] } }  + textHash لكشف الانجراف
  f/<key>.mp3        190 مقطعًا    n/<n>.mp3  ~101 رقم بالعامية
tools/build_explain_audio.py   يستخرج المقاطع من explain.js، يولّد عبر send_voice.py، يحسب المدد والتوقيتات
app/tests/phase13_voice_*.py   تغطية + zero-voices mock + تنقل سريع + iOS-like (Web Audio مكتوم) + الـ20 suite
```
`explainSheet.js` يغيّر سطر استيراد واحد تقريبًا (`speech` -> `voice.provider`)؛ `speech.js` لا يُمس، فلا ينكسر `phase11_voice` / `phase12_mobile_tts`.

**ترتيب المزوّدات المقترح:** المقاطع **أولًا على كل الأجهزة** (صوت مصري واحد ثابت ومعتمد، كاريوكي دقيق)، ثم TTS للنصوص التي لا مقاطع لها (مثل «قريب! جرّب تاني.» إن لم تُسجّل)، ثم البصري.

### 7) قرارات مطلوبة منك قبل أي كود
1. **اعتماد B' + A** أم تفضّل خيارًا آخر (مثلًا C مع backend مستضاف)؟
2. **مفتاح Fish Audio:** غير موجود في هذا الـsandbox. إما أن تضع `FISH_API_KEY` لأولّد هنا (لن يُرفع للمستودع — `.env` في `.gitignore`)، أو أجهّز الأداة وتشغّلها أنت محليًا وترفع الملفات.
3. **أي صوت من presets `send_voice.py`** (مثلًا «شاب مصري» الافتراضي في سطر 318) هو صوت الشرح المعتمد لسليم؟
4. **ترتيب المزوّدات:** مقاطع أولًا دائمًا (مقترحي)، أم TTS الجهاز أولًا حين يوجد صوت عربي؟
5. **خطوة تشخيص اختيارية أولًا (صغيرة):** زر في لوحة الأب يعرض عدد الأصوات العربية على جهازك ونتيجة تجربة نطق فعلية (بدأ/لم يبدأ/انتهى في كم ms) -> دليل من هاتفك بدل الافتراض.
6. **Offline كامل:** كاش HTTP العادي يكفي، أم تريد إعادة Service Worker (أُزيل عمدًا في Phase 6)؟

**خطة التنفيذ بعد الاعتماد (push-per-chunk):** P1 أداة الاستخراج + manifest + اختبار التغطية (بدون صوت) -> P2 توليد المقاطع والأرقام + توقيتات الكلمات -> P3 provider/clipsProvider + ربط explainSheet -> P4 اختبارات zero-voices / تنقل سريع / iOS-like + الـ20 suite -> P5 README + v7.12 + PR + معاينة.

**(تم الاعتماد — انظر القسم التالي)**

---

## Phase 13 — التنفيذ (اعتماد المالك: gist 5e7813f5)

**القرارات المعتمدة + التحقق:**
1. B' + A: مقاطع مسجّلة مُجمّعة على `<audio>` واحد، ثم speech.js، ثم الكاريوكي البصري.
2. مفتاح Fish: وُضع في `.env` (مُتجاهَل بـ`.gitignore`، `git check-ignore` مؤكد، chmod 600) — **لا يُرفع أبدًا**. تحقق عملي: طلب تجريبي نجح (1.3s mp3 128kbps mono 44.1kHz). ملاحظة للمالك: المفتاح منشور في gist عام -> يُنصح بتدويره بعد انتهاء التوليد.
3. الصوت: «شاب مصري حماسي» `73b2c0703c6c4443949ae97092976ce9` — موجود فعلًا في `tools/send_voice.py:61` (الـgist قال سطر 31؛ السطر 31 داخل `_load_env`). السطر 25 = `def _load_env()` ولا يحوي مفتاحًا في نسخة المستودع (الـgist يشير لنسخة المالك المحلية).
4. الترتيب: مقاطع أولًا دائمًا -> speech.js -> بصري.
5. زر تشخيص صوتي في لوحة الأب.
6. كاش HTTP فقط، لا Service Worker.

**النطاق الفعلي من `app/content/activities/*.json`:** mult (جداول 2-6، range حتى 12 في hard)، grid، missing، distributive (3-5)، commutative (2-6)، pick؛ add/sub مدعومة في generators (max 50). النصوص الحرة للمواد الأخرى (generic) -> speech.js fallback.

**Chunks (push-per-chunk):**
- [x] P1: `app/js/engines/voice/segments.js` (pure، نفس الكود وقت البناء والتشغيل) + `tools/explain_segments.mjs` -> `tools/explain_clips.json`: **682 meta، 3511 نص، 257 مقطعًا (852 كلمة) + 54 رقمًا (1..72)** عبر generate() الحقيقي × 3 مستويات صعوبة. درسان: (1) `pick` meta عشوائي لا يتشبّع -> canonical على ما يُنطق فعلًا (a، good[0]) + k=1..10 صراحة؛ (2) SEEDS=6 مشتق من طول THINGS/NAMES مع حارس يفشل إن تغيّرا. أصل البند: `tools/explain_segments.mjs` يستخرج كل الجمل من `explain.js` عبر `generate()` الحقيقي (لا نسخ للنطاقات) -> مقاطع ثابتة + أرقام + manifest مبدئي؛ اختبار تغطية.
- [x] P2 (491e2f7): **311 مقطعًا كاملة (257 + 54 رقمًا)، 1.74MB، 417.5 ثانية**، Fish «شاب مصري حماسي»، قص صمت + loudnorm + 24kHz mono 32kbps. التحقق: transcription (elevenlabs scribe) لعيّنة عشوائية 11 مقطعًا مُجمّعة = تطابق كلمة-بكلمة (بما فيها ١٣/٤٨/٧٢)؛ مقطع طويل 4.8s مطابق؛ تجميع 6 كلمات قصيرة متتالية مفهوم (3.6s). ملاحظة: مقطع كلمة منفردة (430ms) يُفهم خطأً لو سُمع وحده بلا سياق = طبيعي، لا عيب. `.env` غير متتبَّع (git ls-files = 0). أصل البند: `tools/build_explain_audio.py` — توليد Fish (resume: يتخطى الموجود)، قص الصمت + ضغط 32kbps mono عبر ffmpeg، مدد في manifest؛ دفع على دفعات.
- [ ] P3: `app/js/engines/voice/` (provider + clips) + ربط explainSheet + parentSettings (تشخيص).
- [ ] P4: اختبارات (zero-voices، تنقل سريع، مقطع مفقود -> fallback، iOS-like) + الـ20 suite.
- [ ] P5: README + v7.12 + squash + PR + معاينة.

**آخر تحديث:** Phase 13 — P1-P2 ✅؛ P3 مكتوب ومدفوع (6e77619) **غير مُختبر بعد**: `voice/clipsProvider.js` (<audio> واحد، canSpeak/speak/stop/preload/unlock/count، onBlocked عند رفض play() -> لا وميض)، `voice/provider.js` (سلسلة clips -> speech.js -> بصري، `__voice.last`)، explainSheet: `voice.unlock()` داخل نقرة الزر + preload + speak/stop عبر provider (أُزيل import speech غير المستخدم). ملاحظة: `.env` لا يعيش بعد reset (غير مرفوع عمدًا) -> مطلوب فقط لإعادة التوليد، لا للتشغيل.
P3b ✅ smoke Chromium (mult_3 سؤال pick): clips=311 محمّلة، canSpeak=true، provider=`clips`، 32 mp3 بلا أي 4xx، 0 page errors، التظليل يتبع الصوت: said كل 500ms = 0,1,2,4,5,7,8 (33 كلمة). P3c ✅ زر «افحص الصوت» في لوحة الأب: يقيس فعليًا (utterance حقيقي مؤقَّت: onstart + مدة >= 400ms = الجهاز نطق فعلًا) + حالة المقاطع + الأصوات العربية + «اللي سليم هيسمعه». على headless: «المسجّل شغال 311 / الجهاز صامت synthesis-failed / مفيش أصوات عربي / سليم هيسمع المصري المسجّل» = نفس حالة أندرويد المالك. P4a: phase11_voice + phase12_mobile_tts فشلا بعد تفعيل clips (لا انحدار: لم يعد speech.js هو المسار الافتراضي فصار `utterances=[]` والمزامنة تُقاس على مسار آخر) -> وُجّها صراحة لمسار الـfallback بـ`__voice.pref='speech'` = PASS. + إصلاح سباق في `clips.unlock()` (كان قد يوقف الشرح الفعلي لو بدأ في نفس اللحظة). P4b ✅ `app/tests/phase13_voice.py` PASS (Pixel 5، speechSynthesis بلا أي صوت): (1) تغطية 229,842 نصًا من فضاء الأسئلة الحقيقي = 0 فجوات؛ (2) provider=clips، mp3 200/206، <audio> يعمل فعلًا؛ (3) الكاريوكي يتبع currentTime بالترتيب بلا وميض؛ (4) 5 تبديلات سريعة = تشغيل واحد، الإغلاق يوقف الصوت؛ (5) مقطع ناقص -> speech.js؛ (6) play() مرفوض -> speech.js من الكلمة التي وصلها بلا وميض؛ (7) segments يملك كل كلمة مرة واحدة. فشلان أوليان كانا في الاختبار نفسه (say فارغ + utterance الإحماء '' من 12.2 يُعدّ كلامًا) وأُصلحا بعد التحقق. P4c ✅ **21/21 suite PASS على v7.12** (cachebust كان فاشلًا فعليًا قبل التحديث لأن ملفات voice/ خارج الـimportmap -> صُحّح بالتحديث؛ e2e تذبذب مرة واحدة بعدد الفقاعات 7<8 ثم PASS منفردًا وفي الدفعة النهائية، bubbles.js/parent.js بلا فرق عن main). sha256 المحميات مطابق. P5: README append + v7.12 (5c5837d, c1ddf11) + PR15_BODY.md + معاينة مُتحقَّقة من الخارج (200، v7.12، manifest 311، mp3 audio/mpeg): https://8090-iph5bme2ju997o2b16o9w-b32ec7bb.sandbox.novita.ai/app/index.html#/play/mult_3 -> squash (commit واحد فوق main) + **PR #15: https://github.com/html-mobile-audio/html-mobile-audio/pull/15**.

**آخر تحديث:** Phase 13 ✅ مكتملة P1-P5 — **PR #15 دُمج (1b85647): https://github.com/html-mobile-audio/html-mobile-audio/pull/15** + معاينة حية مُتحقَّقة. المالك أكّد: الصوت المصري يعمل على موبايله واللابتوب. التالي: تجربة المالك على هاتف Android الحقيقي (سماع الصوت المسجّل + زر «افحص الصوت») ثم الدمج. الرابط يتوقف عند reset -> إعادة تشغيل serve.py 8090 + GetServiceUrl + تحقق خارجي.

---

## Phase 14 — تشجيع صوتي أخوي وإيماني + أرقام حتى 100 + نص مكتوب لكل صوت (gist 13c2784a) — خطة مجمّدة

**التحقق من ادعاءات الـgist قبل التنفيذ (RULES.md):**
- ✅ PR #15 دُمج (1b85647)؛ و`PROJECT_VISION.md` أضافه المالك مباشرة على main (f256692) — مرجع ثابت، لا يُعدَّل إلا بطلبه.
- ❌ «تم تثبيت `.agents/memory/CHANGELOG_DECISIONS.md` و`00-EXAMPLES.md`» — **غير موجودين** في المستودع (`git cat-file` على main). لن أنشئ ملفات تزعم أنها «تُقرأ تلقائيًا» — هذا غير صحيح لأي وكيل؛ المرجع الفعلي الذي أقرؤه عند كل استئناف هو `PROGRESS.md` + `RULES.md`، وسأضيف فيهما قاعدة ثابتة تشير لـ`PROJECT_VISION.md`.
- ❌ «README فيه المشكلة #5 والدروس 6 و7» — **غير موجودة** (الجدولان ينتهيان عند #4). سأضيفها append-only.
- ❌ «90% من هواتف أندرويد صامتة» (منسوخة في PROJECT_VISION.md) — رقم غير مُثبت؛ لن أكرّره في وثائقي، والمثبت هو هاتف المالك نفسه.
- ⚠ «الأرقام 73-100 لتغطية الضرب والجمع»: الأرقام الحالية (1..72) تغطي **100%** من الشرح الحالي (مُثبت: 229,842 نصًا بلا فجوة). 73-100 إضافة احتياطية لتوسيع الجداول مستقبلًا (hard=حتى 12×12=144 لا يدخل الشرح الحالي). سأولّدها بلا ضرر، والتغطية تبقى مُختبرة.
- ⚠ الاسم: التطبيق يكتب **«كندة»** (store.js:19)، والـgist يكتب «كندا». سأستخدم «كندة» في النص المكتوب ليطابق شاشة الطفل.
- ⚠ «مش مهم المساحة»: مقبول، لكن أبقي كل عبارة مقطعًا مستقلًا خفيفًا (~10-20KB) كي لا يثقل التحميل على باقة الموبايل.
- ⚠ **المحتوى الديني:** لن أنسب أي حديث أو قول لصحابي أو إمام إلا بنص مشهور صحيح الإسناد والمعنى. أي عبارة تحمل نسبة للنبي ﷺ تُعلَّم «تحتاج مراجعة ولي الأمر» في السجل. الأذكار العامة (ما شاء الله، الحمد لله، تبارك الله) آمنة. «نبينا ﷺ علمنا إن المسلم شاطر ومجتهد» ليست حديثًا بنصّها -> تُصاغ كمعنى عام بلا نسبة لفظية.
- ⚠ عبارة «بوس إيد بابا وماما»: مقبولة كبر، أُبقيها.

**Chunks (push-per-chunk):**
- [x] C1: 45 عبارة (سليم 27 / كارما 27 / كندة 22 عبر كل الأحداث)، 6 نصوص قرآن/حديث بـ`src` + `review:true`. **التحقق من المراجع بالبحث**: «الكلمة الطيبة صدقة» البخاري 2989 ومسلم 1009 (dorar.net)؛ «من سلك طريقًا» مسلم 2699؛ «لا يؤمن أحدكم» البخاري 13 ومسلم 45؛ الآيات: طه 114، الشرح 5، الإسراء 23. حارس: عبارة موجّهة لبطل لا تنادي بطلًا آخر؛ Zero-Emoji PASS. أصل البند: `app/content/cheers/bank.json` — بنك عبارات مصنّف (correct / recovered / wrong / finish) × (selim / karma / kenda / any) × (bir / siblings / dhikr / effort)، كل عبارة `{id, text, tags, review}`؛ بدون أسماء غير موجودة في HEROES.
- [ ] C2: توليد Fish لكل عبارة كمقطع كامل (لا تجميع: جمل عاطفية تحتاج نبرة متصلة) + الأرقام 73-100 -> `app/content/audio/cheers/` + manifest مستقل بـvoice id (أساس تبديل الأصوات).
- [ ] C3: `voice/cheers.js` — اختيار عبارة حسب البطل الحالي + الحدث بلا تكرار متتالي؛ تشغيل عبر `<audio>` المشترك؛ ربط play.js (CHEERS/RETRY/OOPS/RECOVERED) مع إبقاء النص المكتوب.
- [ ] C4: شريط النص (subtitle) لكل صوت بشري + «سجل الكلمات المنطوقة» في لوحة الأب مع «نسخ».
- [ ] C5: voice packs: `manifest.json` يحمل `voice` + بنية مجلد لكل صوت + اختيار في لوحة الأب (صوت واحد متوفر الآن).
- [ ] C6: اختبار `phase14_cheers.py` + الـ21 suite + README (#5 + الدروس 6-7 + Phase 14) + RULES.md إشارة للميثاق + v7.13 + squash + PR + معاينة.

**قيد:** `.env` فُقد مع الـreset (غير مرفوع عمدًا) -> توليد C2 يحتاج المفتاح مرة أخرى؛ سأعيد وضعه من الـgist السابق (5e7813f5) محليًا فقط.

**آخر تحديث:** Phase 14 — C1 ✅؛ C2a ✅ 45 عبارة مسجّلة (650KB، 160s) في `app/content/audio/cheers/shab_masri/` + manifest بـ voiceKey و hash لكل نص (تعديل النص = إعادة تسجيله تلقائيًا). **تفريغ صوتي لـ10 عبارات: النصوص الشرعية الستة منطوقة حرفيًا كما في المصدر** («من سلك طريقًا...» ، «لا يؤمن أحدكم...» ، «الكلمة الطيبة صدقة» ، طه 114، الشرح 5، الإسراء 23) + الأسماء صحيحة. C2b ✅ الأرقام **1..100 كاملة** (46 رقمًا جديدًا عبر `extraNumbers` في explain_clips.json)؛ حزمة الشرح الآن 357 مقطعًا، 1.95MB. تفريغ 23/47/73/88/99/100 = صحيح. C3-C5 مكتوبة ومدفوعة (غير مُختبرة بعد): `voice/cheers.js` (اختيار حسب البطل الحالي، «كيس» بلا تكرار متتالي، `<audio>` مستقل يوقف صوت الشرح أولًا، subtitle، مفتاح الأب)، `voice/log.js` (سجل ≤300، دمج التكرار ×n، asText مع المصدر)، provider يسجّل كل شرح، play.js: correct/recovered/wrong/finish (finish بعد الفانفير)، لوحة الأب: مفتاح التشجيع + اختيار حزمة الصوت + سجل الكلمات مع «نسخ النص» و«مسح». CSS `.voice-sub` + `.voice-log`. v7.13. نقطة استئناف بعد reset: `app/tests/phase14_cheers.py` كُتب ولم يُدفع فضاع -> يُعاد كتابته مع حلّال إجابات مأخوذ من `math_random.py` (لا تخمين لـDOM الـnumpad). `.env` ضاع أيضًا (غير مرفوع عمدًا) ولا حاجة له الآن (كل المقاطع مسجّلة). C6a ✅ `phase14_cheers.py` PASS (7ccd6a6) بعد إصلاحين حقيقيين كشفهما: (1) **صيغة المذكّر لبنت**: عبارات `all` فيها أفعال مذكّر («قولها»، «اسمع»، «ساعد»، «يا بطل») كانت تصل لكارما -> العبارة المذكّرة لسليم فقط + توأم مؤنث `<id>g` لكارما/كندة (7 توائم) + w09 صيغة محايدة «يلا نبص»؛ آلية الـhash أعادت تسجيل الـ8 المعدّلة فقط. (2) في الاختبار: `/profile` مع بطل نشط يعرض كارته لا المنتقي -> زر «تبديل البطل»؛ إعدادات الأب لكل طفل -> اختيار تبويب كارما قبل المفتاح.
**اكتشاف بالتفريغ الصوتي (يجب إصلاحه قبل الدمج):** نطق الآيات بلا تشكيل غير ثابت — c20g قُرئت «وقل **لربي**» ثم «**وقال** رب» (3 تسجيلات من 4 بها خطأ أو غموض). مع التشكيل الكامل («وَقُل رَّبِّ زِدْنِي عِلْمًا») = تسجيلان متتاليان صحيحان حرفيًا. **القرار:** كل عبارة قرآن/حديث (10 عبارات) تأخذ حقل `say` = النص بالتشكيل الكامل (يُنطق)، و`text` يبقى المعروض للطفل؛ الـhash على `say`. + إعادة تسجيلها + تفريغ **كل** العبارات الشرعية العشر (لا عيّنة) للتحقق حرفًا بحرف.
نقطة استئناف بعد reset ثانٍ: تعديل `say` ضاع قبل الدفع -> يُعاد. C6a2 ✅ (38c26d0 + 01455fa): حقل `say` بالتشكيل الكامل على العبارات الشرعية العشر، والـhash على المنطوق؛ أعاد تسجيل العشر فقط. **تفريغ العشر كلها (لا عيّنة): كل آية وحديث منطوق حرفيًا** — «وقل رب زدني علما» (مرتين، بلا «وقال»/«لربي»)، «فإن مع العسر يسرا»، «وبالوالدين إحسانا» ×2، «من سلك طريقا يلتمس فيه علما سهل الله له به طريقا إلى الجنة»، «لا يؤمن أحدكم حتى يحب لأخيه ما يحب لنفسه» ×2، «الكلمة الطيبة صدقة» ×2؛ والتوائم المؤنثة صحيحة (اسمعي/ساعدي/قولي/يا بطلة). C6b ✅ **22/22 suite PASS على v7.13 من أول تشغيل** (21 السابقة + phase14_cheers). sha256 المحميات مطابق، و`PROJECT_VISION.md` بلا أي تعديل. C6c ✅ RULES.md (0511884: تعديل قاعدة الصوت القديمة + بند 6 الميثاق/النصوص الشرعية/الجنس) + README append (de7cb1e: #5 + دروس 5-7 + Phase 14) + PR16_BODY.md + معاينة مُتحقَّقة من الخارج (200، v7.13، bank 52 منها 10 بالتشكيل، 52 مقطعًا، c20g.mp3 و n/100.mp3 audio/mpeg): https://8090-i9ohy3ahzz1uu6hv9f22l-2b54fc91.sandbox.novita.ai/app/index.html#/play/mult_3 -> squash (commit واحد فوق main) + **PR #16: https://github.com/html-mobile-audio/html-mobile-audio/pull/16**.

**آخر تحديث:** Phase 14 ✅ مكتملة C1-C6 — **PR #16 مفتوح: https://github.com/html-mobile-audio/html-mobile-audio/pull/16** + معاينة حية مُتحقَّقة. التالي: مراجعة المالك للعبارات الشرعية العشر وصياغة التشجيع (السجل في لوحة الأب + نسخ النص) ثم الدمج؛ أي تعديل نصي = إعادة تسجيل العبارة وحدها (hash). الرابط يتوقف عند reset -> serve.py 8090 + GetServiceUrl + تحقق خارجي.

نقطة استئناف بعد reset: PR #16 ما زال مفتوحًا (clean، بلا تعليقات من المالك بعد)؛ لا تغيير جديد على main. أُعيد تشغيل الخادم ورابط المعاينة الجديد مُتحقَّق من الخارج (200، v7.13، bank 52/say 10، c20g.mp3 و n/100.mp3). التالي: انتظار مراجعة المالك (لا كود جديد بلا توجيه).

## Phase 14.1 HOTFIX (gist b2075ed8) - ExplainSheet [X] deadlock
- PR #16 merged (6814ff0). Branch reset onto origin/main.
- Verified: explainSheet.js:70 [X] -> close() only; play.js:178 explain click hides retry bar; renderers.js:11 lock() keeps only .explain-btn enabled -> after [X]: no bar + locked buttons = frozen.
- No Escape/backdrop dismiss path exists. onTry guarded in play.js:148 and mistakeLoop.js:61 (no-op unless pending retry).
- Plan: [X] handler -> close(); onTry?.()  (architecture K3 unchanged). Test app/tests/phase14_1_deadlock.py. v7.14. PR #17.
- Resume: if not done, implement fix in explainSheet.js line 70.
- 14.1 DONE: fix + test (fails before/passes after) + phase14_cheers whole-word false-positive fix + 23/23 PASS v7.14 + README + preview verified: https://8090-i7n1dehr8e0ydwyhqlbuj-3844e1b6.sandbox.novita.ai/app/index.html#/play/mult_3 -> squash + PR #17.

## Phase 15 RFC (gist a0b32e1a) - research only, NO code
- PR #17 merged (d8ff063). Gist forbids any code change -> deliverable = genspark_ai_developer/RESEARCH_VISUAL_3D.md only.
- Verified: grid type already exists (5 activities); numpad/quiz mult have no visual; no auto-read (q.speak never set); "3 in 4 equals how much?" fully covered by existing clips; platform is online (no SW) not offline; audio sizes 2.7MB+880KB not 1.7MB; cheers are Fish TTS; .agents absent; group convention inconsistent (story = b groups of a, grid rows = a).
- Key evidence: Kaminski & Sloutsky 2013 (extraneous detail hurts 6-8 y/o) -> simple identical units, not gems.
- Next: wait for owner decisions (section 7 of the RFC). No app/ change, no version bump.

## Phase 15.1 (gist c5203c99) - spoken math question from existing clips
- PR #18 merged (06e3516). Owner decisions: Selim 8 (G3), Karma 5, Kenda 2; a x b = a groups of b; clean cubes (15.2).
- Verified with segments.js + manifest: "٣ في ٤ يساوي كام؟" OK, but "... يساوي كام يا بطل؟" NOT covered (no clip) -> dropped (would need 2 gendered recordings). All 5 activities' question kinds have fully-covered sentences (mult, missing, commutative numpad/tf, distributive numpad/sum/branch, grid, pick).
- Plan: engines/voice/questionVoice.js (pure builder by meta.kind + clips-only playback, waits for a playing cheer to end - never cuts a verse), replay button .q-hear (excluded from lock so it works after a miss; K3 logic unchanged), parent switch explain.readQuestion, log kind 'question', unlock clips in the start tap. Test phase15_1_question_voice.py. v7.15.
- Out of scope, noted: story/readaloud explain text says "b groups of a" - contradicts decision a x b = a groups of b -> fix in 15.2/15.4 with the visual.
- Resume after reset: remote has WIP d6b7560 (module, button, parent switch, v7.15). LOST (unpushed): (a) CSS no-overlap fix (card padding-top 58px + `.q-card .btn.q-hear` absolute - fx.css `.btn{position:relative}` beat the old rule -> button overlapped text), (b) cheers.playing() busy-from-request (`busyUntil`, play() async), (c) test phase15_1_question_voice.py. Measured before loss: 45,914 generated questions -> 0 missing clips, 0 empty; card +34px (numpad 565->599). The OS-voice "call" in the test was speech.warm()'s muted empty utterance -> count only non-empty text. Redo a,b,c in chunks.
- 15.1 chunk: test PASS 23/23 checks (cheer-wait fixed: stale play() rejection cleared busy -> reqId guard; test used evaluate() which awaited say()).
- 15.1: 2 regressions analysed: deadlock selector counted .q-hear (test fix); phase13 fallback test guessed by substring, grid sentence owns full clip 'f:السؤال بيقول: كام نقطة في الشبكة؟' -> expectation = real canSpeak (test fix). No app change.
- 15.1 DONE: 24/24 suites PASS v7.15, protected sha256 unchanged, README appended, preview verified externally (200, v7.15, n/12.mp3 audio/mpeg): https://8090-ivpoj0ctmre1e6heqhq52-ecea8f22.sandbox.novita.ai/app/index.html#/play/mult_3 -> squash + PR.

## Phase 15.2 (owner PROCEED msg) - groups bar + story unification a x b = a groups of b - v7.16
- PR #19 merged (7c7fe7b). Branch reset onto origin/main.
- Verified in explain.js: mult readaloud/story/reallife/steps, commutative_tf steps, distributive_sum steps all use "b groups of a" (skipCount(a,b)); grid & commutative already a groups of b. missing/distributive stories: old convention too -> check coverage after rewrite.
- Constraint: no Fish key in sandbox (.env lost) -> every new sentence must be covered by existing clips (phase13_voice coverage gate + tools/explain_segments.mjs --check). Measured: swapped story/reallife 100% covered; "مرات،"/"كل مرة." missing -> rephrase with existing fragments.
- Bar: only meta.kind==='mult' (missing would reveal b; grid already visual). New ui/groupsBar.js (pure layout + HTML/CSS cubes, no SVG ids/filters), fixed height <=110px, a trays x b identical cubes (rows of 5), aria-label without the product. Inserted above .q-text in play.js. Test phase15_2_groups_bar.py. Measure page height before/after on 360x740 (numpad already scrolled before: 870 > 740).
- 15.2 C1 done: mult readaloud/story/reallife/steps + commutative_tf + distributive_sum skip-counts -> a groups of b; explain_segments --check: 3,523 texts, 0 missing fragments/numbers. NOT changed (needs new recordings, no Fish key here): missing story ('في كل X فيه كام؟' has no clip) and distributive story ('عندك b units كل واحد فيه a'). Reported to owner. Next C2: ui/groupsBar.js.
- 15.2 C2: groupsBar layout = all trays one row (min cube 14px over a<=6,b<=12), rows of 5 (ten-frame) when fit; fixed 104px; measured 314x104 at 360w, 0 overflow; only meta.kind mult.
- 15.2 resume after reset: test fixes re-applied (bar-above-text by position; product check by whole numbers, skip when product == operand e.g. 4x1).
- 15.2 C3: test PASS (real bug fixed: tray border not in fit -> 6x6 trays spilled 4px; now 2px border counted + real inner width). Next: full suite.
- 15.2 C4: 25/25 suites PASS v7.16; protected sha256 unchanged. Next: README + PR.
- 15.2 DONE: 25/25 PASS v7.16, README appended, preview verified externally (200, v7.16, groupsBar served): https://8090-i5svpommqbite2zklvdrd-b32ec7bb.sandbox.novita.ai/app/index.html#/play/mult_3 -> squash + PR.

## Phase 15.3 (gist e8e6b1f3) - Sunny joyful theme + colourful 3D trays/cubes + mascot - v7.17
- PR #20 merged (b71a824). Branch reset onto origin/main.
- BLOCKER: token ghp_0VW3... now returns 401 (it was published in a public gist -> GitHub auto-revokes leaked tokens). Push impossible; work committed locally only. Owner must issue a new token (and never paste it in a gist).
- Gist verified against code: (1) bar trays = one amber tint, cubes = one blue gradient, default theme = dark navy -> TRUE. (2) "brown frame" = amber rgba(255,209,102,.45) on dark -> looks brown, TRUE. (3) CHANGELOG_DECISIONS.md "updated" -> file does not exist in repo, FALSE. (4) light theme exists already ([data-theme=light], profile switch) but is plain grey-blue, not sunny.
- Plan (research-checked, RFC Kaminski 2013): colour PER TRAY (one colour per group -> strengthens grouping, no extra detail inside the math unit); cubes identical within a tray, glossy 3D (highlight + bevel + drop shadow); NO faces on trays (extraneous detail on the counted unit) - mascot lives outside the bar.
  C1 sunny theme = default for everyone once (meta.themeV=2 migration; dark still selectable in profile), warm sky gradient + code-drawn sun/clouds layer (pointer-events none, aria-hidden, static; reduced-motion safe).
  C2 groups bar palette gold/green/coral/sky/purple/orange cycling per tray, glossy cubes, pop-in; height unchanged 104.
  C3 embossed question numbers + warmer cards/numpad in sunny theme.
  C4 mascot (inline SVG monkey drawn in code, corner of q-card, still while thinking; cheers on correct, encourages on first miss; no ids -> svg_leak safe).
  C5 test phase15_3_sunny.py + 26 suites + README + v7.17.
- 15.3 C1 sunny theme (sunny.css, themeV=2 one-time migration), C2 per-tray palette + glossy cubes + grid rows, C4 mascot.js, C5 test phase15_3_sunny.py 21/21.
- 15.3 DONE locally: 26/26 suites PASS v7.17 (quran_reader failed once on a Google Fonts network timeout, re-run PASS), protected sha256 unchanged, README appended. PUSH BLOCKED: token 401 (leaked in public gist -> revoked). Waiting for a new token.

## Phase 15.4 (gist 5c01d3fb) - match Karma's reference (issue #10 r7) - real 3D toy trays/cubes - v7.18
- New token works; 15.3 restored from patch and pushed (ed22176).
- Gist verified: the images it "compared" are MY OWN screenshots (8tjZBcgR etc.), the real reference is issue #10 image 7 (sunny, 3 chunky clay trays with faces, 2x2 square 3D cubes numbered 1..12, 3D sun, full-body monkey). Owner criticism is TRUE: layout picked cols=1 -> thin vertical pill trays, cubes ~20px, flat sun, tiny monkey head.
- Numbers in cubes: continuous 1..a*b (as in reference) would reveal the product (last cube = answer) -> during the question number 1..b per tray; after the answer (correct / final reveal) cubes renumber 1..a*b in a counting wave (skip-count lesson). K3 intact.
- Plan: C1 layout: tray rows 1..3, cube up to 40px, square-ish trays (reference 2x2), bar height adaptive <= 200 (spec change 104 -> adaptive, owner asked for reference look). C2 CSS real 3D: cube top face + front + bevel + drop shadow + white number; chunky clay tray with rim, recessed well, front face (eyes + smile) when tray wide enough. C3 generated 3D art (sun, monkey) as small local webp (transparent), mascot bigger. C4 count-up after answer. C5 tests (15.2/15.3 height rule updated), suites, README, PR.
- 15.4 DONE: layout rewrite (<=3 tray rows, aspect <=1.6 preferred, cubes 14-40px, adaptive h reserved), CSS clay trays + faces + square numbered cubes + countUp after answer, shaded sun, full-body monkey; image generation failed (no credits) -> all code-drawn. 26/26 PASS v7.18 -> squash + PR #21.

## Phase 16 (gist be1a1308 + owner voice note) - reach the reference render (issue #10 img 7) + Fish clips - v7.19
- PR #21 merged (1f2edd7). Owner: "nothing less than the reference picture". Gist claims checked: "CHANGELOG_DECISIONS.md updated in .agents/memory" -> path not in this repo (their local machine), irrelevant. "GitHub Pages updated" -> not verified here. Fish key WORKS (tested 1 clip, 22KB).
- Research conclusion (honest): CSS box-shadow can not reach a CGI clay render (no soft global lighting, no subsurface, no real perspective). The only way to LOOK like the picture is real rendered assets: generate 3D PNG sprites (white bg -> alpha via rembg / flood-fill), keep cubes/trays as image sprites tinted per tray via CSS filter hue-rotate or one sprite per colour, numbers overlaid as HTML text (so K3 numbering logic stays code-driven).
- Plan: C1 generate assets: cube sprite (one, glossy clay, front view, 6 colours by hue-rotate or 6 sprites), tray sprite (empty chunky box with face, 6 colours), sun, monkey (idle/happy/encourage poses), balloons/clouds. Convert to transparent WebP <= 40KB each, store app/assets/3d/. C2 groupsBar renders trays/cubes as sprites (9-slice for the tray so it stretches) with numbers on top; fallback to CSS when the image fails. C3 mascot uses sprite poses. C4 Fish: record missing-story + distributive-story fragments on the new convention, rewrite those stories, --check 0 missing. C5 tests + suites + README + v7.19 + PR #22.
- 16 C1 done (cube x6 renders, sun, monkey idle), C2 done: tray SPRITE dropped (perspective render can not 9-slice -> warps), trays = layered gradient box (rim, opening, front wall with face), cubes = real renders. Verified 3x4/6x7/2x10/5x3 screenshots. Next C3: sun.webp + monkey poses (idle/happy/encourage renders) replace the SVGs; C4 Fish clips; C5 tests/README/v7.19/PR #22.
- 16 resume #N (sandbox reset, new token OK): remote HEAD b101f36 = C3 pushed (sun.webp + monkey idle/happy/encourage renders wired in mascot.js with SVG fallback) but NOT yet smoke-tested in browser. `.env` re-created locally from owner message (ignored, never pushed). Frozen remaining plan: C3b smoke (mascot poses/sun load, 0 page errors, 0 4xx) -> C4 Fish clips for missing-story + distributive-story fragments on the a-groups-of-b convention + rewrite stories + `explain_segments.mjs --check` = 0 missing -> C5 tests (phase16) + all suites + README append + v7.19 + squash + PR #22 + external preview.
- 16 C3b smoke PASS (Chromium 390x844, sandbox needed `playwright install-deps`): mascot.is-3d=true, 3 renders loaded (200x231/208/216), inline SVG display:none, body::before uses sun.webp, mood happy/encourage switch opacity [0,1,0]/[0,0,1], encourage auto-returns to idle after 2.6s, 0 pageerrors, 0 4xx. Screenshots: idle https://www.genspark.ai/api/files/s/JVfgU1yT | happy https://www.genspark.ai/api/files/s/YwkwOmgm. Observation (pre-existing since 15.3, same coordinates): the play-view close button [X] sits over the sun at top-left -> owner to decide (move sun or leave). Next C4: Fish clips for missing-story + distributive-story.
- 16 C4 DONE (2f90809): explain.js missing story -> "a groups, same unknown count each; share one by one, every round adds a" (asks "how many in each?"), distributive story -> "a groups of b; take s1 from EVERY group, remainder b-s1 per group" (matches the bar). explain_segments: 3,523 texts, 273 fragments (+17 net, 49 new clips recorded with Fish, 373 total, 2.1MB, 504s), --check = 0 missing fragments / 0 missing numbers. Transcription (scribe v2, 7 concatenated new clips): word-for-word match except "جراج" heard as "جرة" inside a run -> re-checked the 3 garage clips alone with a second engine = "جراج" x4 correct (context artefact, not a recording defect). Sun/[X] overlap noted for owner. Next C5: phase16 test (renders + stories + coverage) + all suites + README + v7.19 + PR #22.
- 16 C5 in progress (reset again; everything up to README + v7.19 is on remote @ e9f8c30). Last measured before the reset: suites need BOTH servers (old suites -> :8080, new -> :8090); with both up: cachebust/e2e/emoji_audit/layering PASS, `behaviour` FAILED with a 30s timeout waiting for `.feedback [data-act="next"]` - root cause NOT yet analysed (must check whether it is a real regression from Phase 16 or a flaky/environment issue; do not guess). Remaining: analyse behaviour -> run all 27 suites -> sha256 protected files -> PR22_BODY.md -> preview verified externally -> squash onto origin/main -> PR #22.
- 16 C5a behaviour analysed (no guess): reproduced on origin/main v7.18 served from a worktree -> identical timeout. Cause: behaviour.py (Phase 2) answers wrong and waits for `.feedback [data-act="next"]`, but since Phase 11 K3 the first miss shows `.feedback.retry [data-act="retry"]` (no reveal). AUDIT_REPORT.md:95 already lists behaviour/emoji_sweep/shots_calmjoy as legacy suites outside the current cycle; the 24/25/26-suite counts never included them. Verdict: NOT a Phase 16 regression; legacy suite left untouched (rewriting it is out of this phase's scope). Standard cycle = 26 + phase16_render = 27.
- 16 C5b first 27-suite batch: 22 PASS + 5 FAIL, each analysed: (1) phase15_2 mirrored the 15.4 tray geometry (+20/+29px constants) while Phase 16 reserves SPRITE(top/side/lip) -> test now derives tw/th from L.top/side/lip (real layout unchanged, all 72 a x b fit); (2) phase15_3 read borderTopColor (Phase 16 trays have border 0, colour in --t) and required an inset box-shadow (sprite cubes use drop-shadow) -> test reads --t and accepts sprite+drop-shadow OR the no-3d fallback; (3) phase16 encourage-pose opacity read 250ms after mood() under batch load (0.15s transition) -> polls up to 2s; (4) quran_reader "Target crashed" on screenshot (renderer OOM in batch) and (5) viewports "ipad820 no floater text" (timing) -> both PASS alone, no code diff vs main in those areas. Test-only fixes pushed (de0f3ec). Final batch running.
- 16 C5c resume (reset #3 in this phase): remote @ f3f17fe has everything (code, 49 clips, tests fixed, README, v7.19, PR22_BODY.md). The FINAL 27-suite batch was interrupted by the reset (only 5 PASS recorded, 0 FAIL) -> must be re-run to completion in one go. Remaining: full batch -> record result -> preview URL (new sandbox) verified externally -> squash onto origin/main -> PR #22 -> link in PROGRESS.
- 16 C5c final batch (v7.19, both servers up), per-suite results pushed live: cachebust=PASS; e2e=PASS; emoji_audit=PASS; layering=PASS; math_random=PASS; navoverlap=PASS; phase10=PASS; phase10_celebration=PASS; phase10_insights=PASS; phase11_mistake=PASS; phase11_rtl=PASS; phase11_voice=PASS; phase12_branch=PASS; phase12_loop_all=PASS; phase12_mobile_tts=PASS; phase12_ux=PASS; phase13_voice=PASS; phase14_1_deadlock=PASS; phase14_cheers=PASS; phase15_1_question_voice=PASS; phase15_2_groups_bar=PASS; phase15_3_sunny=PASS; phase16_render=PASS; plant_story=PASS; quran_reader=PASS; svg_leak=PASS; viewports=PASS;
- 16 C5 DONE: **27/27 suites PASS on v7.19** in one uninterrupted batch (26 standard + phase16_render; each result pushed live above). Protected files sha256 unchanged (plant fb197ed2, math 694859aa, albayyinah aac6bafb, alqadr 52758e3f) + PROJECT_VISION.md untouched. Preview verified externally (200, v7.19, cube0.webp/monkey_happy.webp image/webp, manifest 373 clips): https://8090-i1nf9ydvdi6rs98w9wkxg-5185f4aa.sandbox.novita.ai/app/index.html#/play/mult_3 -> squash onto origin/main + PR #22.

**آخر تحديث:** Phase 16 ✅ مكتملة C1-C5 — squash 2d0b306 (commit واحد فوق main) -> **PR #22 مفتوح: https://github.com/html-mobile-audio/html-mobile-audio/pull/22** + معاينة حية مُتحقَّقة من الخارج. التالي: مراجعة المالك (قرار الشمس/زرار [X]، ومطابقة الشكل للمرجع على هاتفه) ثم الدمج. الرابط يتوقف عند reset -> serve.py 8090 + GetServiceUrl + تحقق خارجي. `.env` غير مرفوع عمدًا (مطلوب فقط لتسجيل مقاطع جديدة).

## Phase 17 — «رفقاء التشجيع» Companion Cast: شخصيات متعددة متحركة تفاعلية لكل المواد (gist eafceafc + رسالة صوتية) — v7.20 — خطة مجمّدة

**توجيه المالك (نصًا):** حاجة «تقنمك، مش ثابتة، مش في طرفي… تشوف الصورة نفسها»، محترمة/متطورة/عصرية، حركات جميلة تشجيعية مؤثرة تلفت الانتباه، مناسبة لكل المواد الحالية وأي مادة جديدة، أشكال كتير غير القرد ومتغيرة («مفيش قرد بس وحركتين تلاتة»)، «ابحث وافضل حاجة أعملها».

**تحقق من الـgist قبل التنفيذ (RULES.md):**
- ✅ PR #22 مدموج (ec91866) — صحيح. الفرع أُعيد فوق main.
- ❌ «README فيه جدول issues #9/#10» و«CHANGELOG_DECISIONS.md في .agents/memory» — غير موجودين في المستودع (سكربت المالك المحلي كتب في نسخته). لن أنشئهما.
- ✅ «[X] راكب فوق الشمس» — صحيح: `sunny.css:33` الشمس `left -22px top 54px` و`play-head [data-act=quit]` في نفس الركن (15.4 أعطاه خلفية بيضاء بدل نقله). يُحل في هذه المرحلة.
- ⚠ «المكعبات 18px في 3×8» — قياس صحيح بحكم عرض الشاشة (layout ديناميكي)؛ ليس عيبًا في هذه المرحلة.

**بحث (موثّق في RESEARCH.md ملحق Phase 17):**
- Duolingo: 10 شخصيات عالمية بـRive State Machine (idle/blink/eye-darts/react correct-wrong/speaking) — blog.duolingo.com/world-character-visemes + rive.app/blog (Duolingo). المبدأ: **شخصية = آلة حالات مطبَّقة برمجيًا، لا فيديو ولا صور ثابتة**.
- Rive runtime web ≈ 40-50KB مضغوط + WASM canvas؛ Lottie (lottie-web) ≈ 60KB+ JSON لكل حركة؛ كلاهما تبعية خارجية + أدوات تأليف غير متاحة هنا (لا Rive editor، لا After Effects). قيد المشروع: «بدون تبعيات ثقيلة» + pure-web + أصول موجودة/قابلة للتوليد هنا.
- **القرار: محرك آلة حالات خاص بنا على Web Animations API + rigged sprites** — كل شخصية = صورة WebP مرندرة (كما القرد الحالي، ثبت نجاحه) مقسّمة لطبقات (جسم/رأس/يد/عين) تُحرَّك بـtransform/opacity فقط (60fps، بلا layout thrash)، مع حالات: idle (تنفس + رمش عشوائي + نظرات) / think (يميل ويبص للسؤال) / happy (قفز + تصفيق) / encourage (إيماءة + تلويح) / celebrate (دورة + confetti) / wave (دخول). **الانتقالات مُجدولة عشوائيًا بلا تكرار متتالٍ** (نفس آلية «الكيس» في cheers.js) = «مش ثابتة».
- **Cast متعدد data-driven:** `app/content/companions.json` — كل شخصية `{id, name, subjects:[...]|'*', poses:{...}, palette}`؛ اختيار الشخصية حسب المادة الحالية + دوران بين الجلسات (لا نفس الشخصية مرتين متتاليتين) + الطفل يقدر يثبّت المفضّل من الملف الشخصي. أي مادة جديدة بلا شخصية مخصّصة تأخذ من مجموعة `'*'` تلقائيًا.
- الشخصيات المقترحة (Kaminski 2013: البهجة خارج وحدة العدّ؛ ميثاق PROJECT_VISION: محتشم، بلا رموز مخالفة): قرد (رياضيات، موجود)، **بومة** (قرآن/دين — رمز الحكمة)، **قطة** (عربي)، **ببغاء** (بودكاست/استماع)، **نحلة** (`*` — نشاط/اجتهاد)، **سلحفاة** (`*` — صبر/مثابرة، تظهر عند «اتعلمت من الغلط»)، **روبوت صغير** (`*` — عصري). 7 شخصيات × 5 وضعيات = 35 رندر WebP شفاف ≤ 12KB (≈ 400KB إجمالي، تحميل كسول لكل شخصية).
- **طبقة FX متطورة موحّدة** (fx.js v3): «انفجار نجوم» + شرائط + قلوب + نص عائم متغير + **حلقة نبض على الإجابة** + «دخول الشخصية» من الجانب — كلها على `#fx-canvas` الحالي (z-index 9999) — تعمل لكل المواد لأنها مربوطة بـ`fx.celebrate/encourage` المستخدمة أصلًا في play/phaseRunner/story/mistakeLoop.
- **تشجيع بصري لكل حدث** (لا صوت جديد — المقاطع المسجّلة كما هي): correct / recovered (أكبر) / wrong (لطيف) / finish / streak / levelup.

**قيود ثابتة:** K3 بلا تغيير؛ الشخصية زخرفة (aria-hidden، pointer-events none، لا تغطي نص/أزرار — نفس اختبار 15.3)؛ prefers-reduced-motion يوقف كل شيء؛ Zero-Emoji؛ لا SVG بـid؛ الملفات المحمية لا تُمس؛ إعداد شدّة الاحتفال الحالي (`meta.celebration` 0..3) يحكم الكثافة.

**Chunks (push-per-chunk):**
- [ ] R0: تجميد هذه الخطة + push (هذا).
- [ ] R1: إصلاح الشمس/[X] (نقل الشمس لليمين أعلى بعيدًا عن play-head، والتحقق بـDOM أن مستطيلي [X] والشمس لا يتقاطعان) + test.
- [ ] R2: توليد رندرات الشخصيات (بومة/قطة/ببغاء/نحلة/سلحفاة/روبوت × idle/happy/encourage/think/celebrate) بنفس أسلوب القرد (Pixar-clay، خلفية بيضاء -> alpha) -> `app/assets/companions/<id>/<pose>.webp` — على دفعات مدفوعة.
- [ ] R3: `app/content/companions.json` + `engines/companion.js` (آلة حالات WAAPI: idle loop عشوائي، انتقالات، pool بلا تكرار، اختيار حسب المادة، تفضيل الطفل) — يستبدل mascot.js بواجهة متوافقة (`mount/mood`) فلا يتغير play.js إلا سطر الاستيراد.
- [ ] R4: fx.js v3 (starburst/ribbons/pulse-ring/entrance) + ربط الأحداث في play/phaseRunner/story (مواد كلها) + واجهة اختيار الرفيق في الملف الشخصي.
- [ ] R5: `phase17_companions.py` (كل مادة تحصل على رفيق، لا تكرار متتالٍ، الوضعيات تتبدّل، لا تغطية، reduced-motion، الشمس/[X]) + كل الـsuites + README + RESEARCH + v7.20 + squash + PR #23 + معاينة.
- 17 resume (reset): remote = R0 plan (be54918) + R1 sun CSS (a294e7e, NOT yet DOM-verified). LOST unpushed: tools/cut_sprite_sheet.py (column split on white gaps + flood-fill alpha + resize + webp) and the owl sheet (generated once: 5 poses idle/think/happy/encourage/celebrate, graduation-cap owl, sheet https://www.genspark.ai/api/files/s/B7wJcSEm) - the 3rd/4th figures touched (wing tips) -> splitter needs a "split widest run at thinnest column" fallback. Lesson: push the cut sprites IMMEDIATELY after each sheet. Redo: tool -> owl -> push; then cat/parrot/bee/turtle/robot one sheet each, push per sheet.
- 17 R2 partial: owl (88a5c72) + cat (3181bcc) cut and pushed (5 poses each, ~10KB per sprite, verified visually: clean alpha, consistent character). **BLOCKED: image-generation credits exhausted** at the parrot sheet -> parrot/bee/turtle/robot deferred; the cast is data-driven so they are added later by dropping a folder + a JSON entry, no code change. Proceeding with R3 (engine) on 3 companions: monkey (existing 3 poses, think/celebrate fall back to idle/happy), owl, cat.
- 17 resume (reset): remote @ 5bffd14 = R0 plan, R1 sun CSS (unverified), R2 owl+cat, R3a engine + JSON. LOST: R3b wiring (play.js import swap + subject + think pose + celebrate on recovered; app.js import). Redo R3b now -> push -> R3c CSS (bigger companion, no overlap) -> smoke -> R4 (fx v3 + profile picker) -> R5 tests/README/v7.20/PR #23.
- 17 R3 DONE + smoke PASS (390x844): monkey on mult_3, owl on bayyinah_fill/iman_quiz/tajweed_quiz (quran/deen), cat on plant_quiz (via '*' pool) - 5 poses loaded each, think pose after 900ms, idle bag varies (glance/breath/lean/blink/wiggle - no static idle), celebrate pose on demand, companion 92x100 never overlaps q-text/q-hear/answers/groups-bar, pointer-events none, 0 pageerrors, 0 4xx. R1 verified by DOM: quit [X] rect 12..56px left, sun background-position `calc(100% + 18px) 104px` (right edge) -> no intersection. Screenshot: https://www.genspark.ai/api/files/s/loxbQl3i. Next R4: fx.js v3 (starburst/ribbons/pulse ring) + profile companion picker.
- 17 resume (reset): sandbox was on main; branch restored from origin @ c70c5ad (R4a fx v3 pushed). LOST: R4b (recovered flag in play.js celebrate call, profile companion picker + CSS) - none present on remote. Redo R4b now -> push -> smoke fx v3 + picker -> R5.
- 17 R4b DONE (028dffb) + R5a: app/tests/phase17_companions.py PASS (44 checks: cast per subject, rotation no repeat, think/encourage/celebrate/happy, K3 retry bar, fx v3 ring/starburst/ribbons/rays + shape rotation, idle variety, no overlap, [X] vs sun, reduced-motion, picker favourite/surprise, 0 errors, 0 4xx). Next: screenshots -> full batch (both servers) -> RESEARCH/README -> v7.20 -> squash -> PR #23.
- 17 R5b full batch START 22:17 (excluded legacy: behaviour.py, emoji_sweep.py, shots_calmjoy.py):
  - cachebust: FAIL(rc=1)
  - e2e: PASS
  - emoji_audit: PASS
  - layering: PASS
  - math_random: PASS
  - navoverlap: PASS
  - phase10: PASS
  - phase10_celebration: PASS
  - phase10_insights: PASS
  - phase11_mistake: PASS
  - phase11_rtl: PASS
  - phase11_voice: PASS
  - phase12_branch: PASS
  - phase12_loop_all: PASS
  - phase12_mobile_tts: PASS
  - phase12_ux: PASS
  - phase13_voice: PASS
  - phase14_1_deadlock: PASS
  - phase14_cheers: PASS
  - phase15_1_question_voice: PASS
  - phase15_2_groups_bar: PASS
  - phase15_3_sunny: FAIL(rc=1)
  - phase16_render: FAIL(rc=1)
  - phase17_companions: FAIL(rc=1)
  - plant_story: PASS
  - quran_reader: PASS
  - svg_leak: PASS
  - viewports: PASS
- 17 R5b full batch END 22:31
- 17 R5c batch triage: cachebust -> fixed (v7.20 importmap + ?v= on companions.json/sprites, PASS). phase16_render -> real gap: the companion had no sprite-failure fallback -> companion.js now falls back to the code-drawn monkey (mascot.js) when the idle sprite errors; test mirror updated to 5 stacked poses (PASS 28/28). phase15_3_sunny -> mirror updated (reduced-motion probe = no running WAAPI animations) PASS. phase17 -> retry step hardened (wait for the retry bar to detach; 60s for the fresh numpad).
- 17 resume (reset): remote @ 235a2e4, nothing lost. Open item: phase17_companions.py retry step - debug showed after clicking [data-act=retry] the retry bar is gone and 1 .q-card exists but 0 .numpad .btn for >1.5s (re-asked question renders differently/slower) -> inspect ask() re-render path, fix test (or code if a real bug), then rerun phase17 + full batch, squash, PR #23.
- 17 R5c: retry-step root cause = test assumption (mult_3 re-asks some questions as quiz .choice, not numpad) -> selector accepts both; phase17_companions.py PASS 45/45.
- 17 R5d full batch #2 START 23:07 (excluded legacy: behaviour.py, emoji_sweep.py, shots_calmjoy.py):
  - cachebust: PASS
  - e2e: FAIL(rc=1)
  - emoji_audit: PASS
  - layering: PASS
- 17 R2 (cont.): parrot cut + pushed (e0a021d, podcast+arabic). Credits exhausted again at the bee sheet -> bee/turtle/robot still deferred.
  - math_random: PASS
  - navoverlap: PASS
  - phase10: PASS
  - phase10_celebration: PASS
  - phase10_insights: PASS
  - phase11_mistake: PASS
  - phase11_rtl: PASS
  - phase11_voice: PASS
  - phase12_branch: PASS
  - phase12_loop_all: PASS
  - phase12_mobile_tts: PASS
  - phase12_ux: PASS
  - phase13_voice: PASS
  - phase14_1_deadlock: PASS
  - phase14_cheers: PASS
  - phase15_1_question_voice: PASS
  - phase15_2_groups_bar: PASS
  - phase15_3_sunny: PASS
  - phase16_render: PASS
  - phase17_companions: FAIL(rc=1)
  - plant_story: PASS
  - quran_reader: PASS
  - svg_leak: PASS
  - viewports: PASS
- 17 R5d full batch #2 END 23:20
- 17 R5d result: 26 PASS in batch; e2e (bubbles 7 < 8 count flake under load, untouched code) and phase17 (arabic pool widened by the parrot -> test expects a pool) rerun standalone -> both PASS => 28/28. README/PR body updated for the parrot. Next: squash onto origin/main -> PR #23 -> external preview.
- 17 DONE: squashed 0c92d84 over origin/main (ec91866); PR #23 https://github.com/html-mobile-audio/html-mobile-audio/pull/23; external preview OK (0 console errors, assets 200) https://8090-iat5ikt5r07bajapto4wf-cc2fbc16.sandbox.novita.ai/app/index.html#/play/mult_3

## Phase 17.5 - «ميثاق العيلة» Family Charter (repo moved to Kimi-K3-code/RESEARCH-md-Duolingo-Rive) - v7.21
Verified: new token = Kimi-K3-code; new repo = full history + owner commit e50b5c9 (README rewritten: phase log 9-17 removed, PROJECT_VISION +22 lines); Pages live v7.20; old repo 404. Token was posted in a public gist -> never written to files; owner advised to rotate.
Owner ask: keep the family gist links permanently, in MORE THAN ONE GitHub file, clearly, and on the site; professional, never done before.
Design ("self-verifying redundancy"): one machine-readable source app/content/family.json -> (a) FAMILY_CHARTER.md (raw transcript + organized vision + links), (b) .agents/memory/CHANGELOG_DECISIONS.md (decision log, the file the owner expected), (c) docs/PHASES_HISTORY.md (the README phase log the rewrite dropped, verbatim from df2ae23), (d) README append (links block), (e) genspark_ai_developer/RESUME.md, (f) in-app view #/charter rendering family.json (links, principles, roadmap) reachable from profile settings, (g) tools/check_family_links.py: every copy must contain every canonical link or exit 1 (also a pytest-style suite app/tests/phase17_5_charter.py). v7.21, PR on the new repo.
Chunks: F1 family.json + charter md + changelog + history + resume + README (push) -> F2 checker tool (push) -> F3 in-app view + CSS + route + profile link (push) -> F4 test + cachebust + bump 7.21 + full batch subset + PR.
- 17.5 resume (reset): remote @ 26a9239 (F1-F3 pushed). LOST: bump 7.21 + app/tests/phase17_5_charter.py (unpushed). Old repo still 404 -> continuing on Kimi-K3-code/RESEARCH-md-Duolingo-Rive. Redo F4: test -> bump -> cachebust/emoji_audit/phase17_5 + subset -> PR.
- 17.5 F4 batch START 02:44 (already PASS standalone: cachebust emoji_audit svg_leak phase17_5_charter phase17_companions; excluded legacy: behaviour emoji_sweep shots_calmjoy):
  - e2e: PASS
  - layering: PASS
  - math_random: PASS
  - navoverlap: PASS
  - phase10: PASS
  - phase10_celebration: PASS
  - phase10_insights: PASS
  - phase11_mistake: PASS
  - phase11_rtl: PASS
  - phase11_voice: PASS
  - phase12_branch: PASS
  - phase12_loop_all: PASS
  - phase12_mobile_tts: PASS
  - phase12_ux: PASS
  - phase13_voice: PASS
  - phase14_1_deadlock: PASS
  - phase14_cheers: PASS
  - phase15_1_question_voice: PASS
  - phase15_2_groups_bar: PASS
  - phase15_3_sunny: PASS
  - phase16_render: PASS
  - plant_story: PASS
  - quran_reader: PASS
  - viewports: PASS
- 17.5 F4 batch END 02:58
- 17.5 F4 result: 24/24 batch + 5 standalone = 29/29 PASS. Squash -> PR on Kimi-K3-code/RESEARCH-md-Duolingo-Rive.
- 17.5 DONE: squashed 9247c57 over main e50b5c9; PR #1 https://github.com/Kimi-K3-code/RESEARCH-md-Duolingo-Rive/pull/1; preview https://8090-invbpnkmmymqs5a0qfu9j-dfc00ec5.sandbox.novita.ai/app/index.html#/charter (v7.21).

## Phase 18-prep - AGENTS.md constitution + move to just-SsSsSsSsSsSsSsSs (owner: gist abb6d424)
- resume (reset): branch @ 5cd6b41 verified: v7.21, family.json + check_family_links.py present -> Phase 17.5 intact (not redone). AGENTS.md missing -> written.
- DONE (this step): AGENTS.md (full constitution: session order, verify-before-execute, quiet push rules 10-15 min parallel / no per-test push / no force-push / one PR, no AI Drive, one account, security, quality gate, product rules, generic resume prompt); PROGRESS header + RESUME point to it; family.json repo/live links follow the account move (+AGENTS.md as 7th mirror); mirrors updated; CHANGELOG_DECISIONS entry. check_family_links 7x4 PASS; phase17_5_charter PASS; Zero-Emoji; no secrets. Single push (completed step).
- NEXT: Phase 18 R0 - research appendix (fluid micro-physics on WAAPI: spring easing, layered rig body/head/eyes from the existing sprites via CSS masks?, touch reaction) -> frozen plan in PROGRESS -> chunks.
- resume (reset): branch @ d17f551 verified (AGENTS.md present, v7.21, 17.5 intact, family links 7x4 PASS). LOST unpushed: Phase 18 research appendix + frozen plan + M1 companion.js v2 rewrite (were local under the 10-15 min rule). Also family.json roadmap still says 17.5=current -> corrected to done/18=current in this step. Redo R0 (research + plan) then M1.

## Phase 18 - «حركة حية انسيابية» Fluid Companion Motion - v7.22 (frozen plan)
Research: RESEARCH.md appendix Phase 18. Push rule: after a completed step and >= 10-15 min since last push; immediate on a completed feature with tests.
- [x] M1 companion.js v2 core (same public API): body/head mask layers (+single-layer fallback), spring()->linear() (+bezier fallback), infinite breath loop on both layers (head +120ms), random actions composed on top, squash/stretch show(). CSS for layers. node --check + smoke.
- [x] M2 interaction: tickle (pointerdown on companion -> react + small hearts burst; stopPropagation, never answers), lookAt on pointerdown of .choice/.numpad .btn, anticipate on first numpad digit. Rule change documented in AGENTS.md + CHANGELOG_DECISIONS.
- [x] M3 tests: app/tests/phase18_fluid.py + mirrors in phase15_3_sunny/phase17_companions (companion pointer-events auto but never over buttons; a tap never answers). Run both + cachebust.
- [x] M4 cast: one image_generation attempt (bee); ok -> cut -> companions.json ('*'); else document. turtle/robot only if credits remain.
- [x] M5 gate: all suites (both servers), family links, emoji, sha256 protected, bump 7.22, README append, family.json roadmap (18 done, 19 current), single PR, external preview.
- resume-check (session after reset): branch=5bfd7de (R0 pushed), version 7.21, AGENTS.md present. M1/M2 local edits LOST (companion.js has no Phase 18 marker, components.css has no cp-layer). Redoing M1+M2 from the frozen design; R0 not redone.
- M1+M2 DONE (redone after reset): companion.js v2 (2 mask layers, spring()->linear(), infinite breath x2, composite:add micro-actions, squash/stretch, tickle/lookAt/anticipate/relax) + components.css (layers, pointer-events auto, legacy keyframes off). Smoke /tmp/smoke18.py 18/18 PASS (0 console errors, 0 4xx, reduced-motion 0 running). AGENTS.md bend 5 + CHANGELOG row written. NEXT: M3 app/tests/phase18_fluid.py + mirrors (phase15_3_sunny pe, phase17 pe, phase16 imgs x2).
- resume-check (session after reset): branch @ 95d75c5 verified (M1+M2 present: companion.js Phase 18 marker, cp-layer CSS, AGENTS bend 5, CHANGELOG row). Sandbox lost playwright/servers only -> reinstalled. Nothing redone.
- M3 DONE: app/tests/phase18_fluid.py (35 checks: 2 mask layers + distinct gradients, 2 infinite breath loops head +120ms, never-still 30/30 distinct transforms, body/head independent, spring()->linear() overshoot>1 settles 1, micro-action composite add while breath runs, squash/stretch on show(), tickle reacts + swallowed (index/hash/feedback unchanged) + hearts burst, lookAt data-look + anticipate/relax on numpad, visibility pause/resume, reduced-motion 0 running + pose-only tickle, layout x5 subjects, 0 errors/4xx; the version=7.22 check is the only pending FAIL until M5 bump). Mirrors: phase17 answer() handles pick/truefalse (fixes KeyError 'answer'), COMP probes body layer only, section 4 asserts pe=auto + tap never answers/navigates -> 50/50 PASS; phase15_3_sunny pe in (none,auto) -> 25/25; phase16_render probes body layer -> 28/28. cachebust PASS, family links 7x4 PASS, Zero-Emoji 0. NEXT: M4 one bee image_generation attempt, then M5 gate + bump 7.22.
- resume-check (session after reset #2): branch @ cc375d6 verified (M1-M3 pushed: phase18_fluid.py present, companion.js Phase 18 marker, cp-layer CSS). LOST local: bee cut + companions.json entry + bump 7.22 + roadmap edits (uncommitted). Bee sheet re-downloaded from the same generation (no second attempt) and re-cut identically; edits redone.
- M4 DONE: bee sprite sheet generated in ONE attempt (nano-banana-2, parrot idle as style reference) -> tools/cut_sprite_sheet.py -> app/assets/companions/bee/{idle,think,happy,encourage,celebrate}.webp (148-184 x 240, 9.3-10.6 KB each, transparent, wings preserved) -> companions.json id=bee «النحلة نونة» subjects [science, '*'] tint #ffd166. phase17 rotation check widened to >= 2 distinct ('*' pool = cat + bee). turtle/robot deferred (one attempt per session rule).
- M5 DONE: bump 7.22 (53 modules mapped); full gate one uninterrupted batch on both servers: 32 suites, 31 rc=0 (phase18_fluid 35/35, phase17_companions 50/50, phase15_3_sunny 25/25, phase16_render 28/28, phase17_5_charter 30/30, cachebust v7.22 PASS, emoji_audit 0, all legacy suites PASS); behaviour.py rc=1 = the known legacy timeout documented at 16 C5a (file unchanged vs remote, identical on origin/main; excluded in every batch since Phase 16). Protected files sha256 unchanged (plant fb197ed2, math 694859aa, albayyinah aac6bafb, alqadr 52758e3f, PROJECT_VISION 417f8ff7). family links 7x4 PASS, no secrets. README append (Phase 18 section), docs/PHASES_HISTORY append, CHANGELOG_DECISIONS row, family.json roadmap 18 done -> 19 current (7.23) + FAMILY_CHARTER table synced (17.5 done / 18 done / 19 current).
- 18 DONE -> single PR on just-SsSsSsSsSsSsSsSs/RESEARCH-md-Duolingo-Rive (genspark_ai_developer -> main). NEXT: Phase 19 R0 research (family challenge board) - new phase, research appendix first, then frozen plan.
- 18 DONE: pushed cf31b6c (5 commits over main 5cd6b41, no force-push); single PR #1 https://github.com/just-SsSsSsSsSsSsSsSs/RESEARCH-md-Duolingo-Rive/pull/1; external preview verified https://8090-ir7jha796cb5nmnsf8kcv-2b54fc91.sandbox.novita.ai/app/index.html (version.json 7.22; bee rig layered, 2 infinite breath loops running, pointer-events auto, linear() true; tickle -> mood tickle + 14 heart particles, __play.i unchanged, 0 page errors). Screenshot https://www.genspark.ai/api/files/s/fQsD8fBi. NEXT: Phase 19 R0 - research appendix (family challenge board: Selim/Karma/Kenda/relatives leaderboard, local-first, no backend) -> frozen chunked plan -> M1.

## Phase 18.5 - «رفيق ثابت في الدرس + روابط حية + أجنحة وفم وصوت» - v7.23 (frozen plan; owner gist 87dd0a06 verified - RESEARCH.md appendix)
- resume-check (reset #3): branch @ ad80062 = main 3f779e7 + progress line, v7.22, Pages live 200. LOST unpushed (interval rule): 18.5 research appendix, frozen plan, A1 links, A2 session-stable pick, react() think-guard, phase18 test poll. Gist claims re-verified earlier with evidence (8 dead README links + index.html:371; companion changed every question: parrot/cat/parrot/cat). Phase 19 not started -> 18.5 inserted before it, no conflict. Redoing from the design; pushing right after A1+A2 pass.
- [x] A1 links: README append «روابط محدّثة» (dead -> live Pages, each verified 200, mp3 URL-encoded); index.html:371 -> new repo; family.json roadmap 18.5 current (+FAMILY_CHARTER table).
- [x] A2 companion stability: forSession(session) WeakMap pick, mount(card,{subject,session}); react('think') never cuts a running reaction; phase18_fluid tickle probe polls the .18s opacity transition; phase18_5_alive.py section (same id across questions, rotation on quit/again with no repeat).
- [x] B1 limbs layer: third mask layer from companions.json `rig.limbs` with its own infinite flutter loop (faster, phase-shifted); reduced-motion off; single-layer fallback unchanged.
- [x] B2 mouth + voice: `rig.mouth` box; mouth mask layer scaleY driven by Web Audio envelope (timed fallback); Fish Audio laugh+cheer per companion (one attempt each per session; missing -> silent); play on tickle (laugh) / correct (cheer) respecting the sound toggle.
- [x] B3 tests app/tests/phase18_5_alive.py: limbs loop running, mouth layer only during a clip, stability + rotation, links section present, 0 errors; cachebust.
- [x] C gate: all suites both servers, family links, emoji, sha256 protected, bump 7.23, README append, roadmap (18.5 done, 19 current), single PR, external preview.
- A1+A2 DONE (redone after reset): README «روابط محدّثة» (8 live links each verified 200 + repo + episodes), index.html -> new repo, roadmap 18.5 current (family.json + FAMILY_CHARTER); companion.js forSession() WeakMap + mount({session}) from play.js ask(); react('think') guard (real bug: the 900ms nudge cut a tickle); phase18_fluid tickle probe polls. Measured: plant_quiz 5 questions -> one id; 5 restarts -> alternating, no repeat; favourite wins. Tests: phase18_5_alive 9/9, phase18_fluid 35/35, phase17 50/50. Immediate push (completed feature). NEXT: B1 limbs layer (rig.limbs in companions.json + flutter loop).
- resume-check (reset #4): branch @ 66250d5 (A1+A2 safe). LOST unpushed: B1 limbs + 10 Fish Audio clips (generated, not yet committed). B1 redone from design; voice will be regenerated (one attempt each) in B2.
- B1 DONE: companions.json rig.limbs per companion (bee/parrot/owl wings, cat tail, monkey arms: percent boxes + hinge origin + motion flutter|flap|sway); companion.js LIMB table, one radial-mask layer per limb with its own infinite alternating loop (mirrored on the right side, phase-shifted), body layer cuts the limbs out via mask-composite exclude so nothing is drawn twice; CSS limb rules. Tests: phase18_5_alive 18/18 (B1 x9: layer count = declared, loops running, body holes, transforms change), phase18_fluid 35/35 (loop count check widened to >= 2). Push (completed step). NEXT: B2 mouth layer + Fish Audio voice identity.
- resume-check (reset #5): branch @ fa856c1 (A1,A2,B1 safe); LOST: voice assets commit + B2 code. Regenerated clips (one attempt each, all 10 ok) -> pushed as bbab488 first; B2 code redone.
- B2 DONE: companions.json rig.mouth box + voice {laugh,cheer} per companion; companion.js speak() (single Audio element, Web Audio AnalyserNode envelope -> mouth layer translateY/scaleY per frame, timed open/close fallback, sound-off/reduced-motion respected), cheer(card), voiceUrl resolved against content dir; tickle -> laugh; play.js -> companion cheer every 3rd correct only when the sibling cheer is silent; CSS mouth layer hidden until data-speaking. Tests phase18_5_alive 28/28 (B2 x10). Push (completed feature). NEXT: B3 (mirrors + cachebust) then C gate + bump 7.23 + PR.
- resume-check (reset #6): branch @ 0250701 (A1,A2,B1,B2 + assets safe). LOST: bump 7.23 + docs + gate run (local). Redone; docs pushed before the gate this time.
- C docs: bump 7.23 (53 modules), README append (18.5 section), PHASES_HISTORY, CHANGELOG x2, family.json roadmap 18.5 done -> 19 current (7.24) + FAMILY_CHARTER, RESUME. phase18_fluid version check >= 7.22. Gate batch next.
- resume-check (reset #7): remote @ 052ae4f = full 18.5 tree (v7.23, docs, roadmap); no open PR. Lost only the PROGRESS gate line. Re-ran fresh on 052ae4f: phase18_5_alive 28/28, phase18_fluid 35/35, phase17_companions 50/50, cachebust v7.23 PASS, emoji 0, family links 7x4, protected sha256 = main.
- C GATE DONE (batch on 052ae4f, both servers, 34 suites): 33 rc=0; behaviour.py rc=1 = legacy timeout identical to main (16 C5a). -> single PR.
- resume-check (reset #8): remote @ c8096dd (18.5 complete, merged main, PR #2 open, v7.23). Nothing lost but the preview step.
- 18.5 DONE: single PR #2 https://github.com/just-SsSsSsSsSsSsSsSs/RESEARCH-md-Duolingo-Rive/pull/2; external preview verified https://8090-ia3e3iku19fwmewxxokh0-cc2fbc16.sandbox.novita.ai/app/index.html (version.json 7.23; bee layers [body, limb, limb, head, mouth], 4 infinite loops running, mouth hidden while silent; tickle -> mood tickle + speaking=laugh with analyser=true + __play.i unchanged; 0 page errors). Screenshot https://www.genspark.ai/api/files/s/mvGzImlp. NEXT: Phase 19 R0 - research appendix (family challenge board: Selim/Karma/Kenda/relatives, local-first, no backend, privacy for children) -> frozen chunked plan -> M1. Do not start until PR #2 is merged or the owner says so.


## Phase 19 - «التحدي العائلي» Family Challenge Board - v7.24 (frozen plan; R0 appendix in RESEARCH.md)

Principles frozen: local-first, no backend, no PII in any payload, no numeric rank / nobody «last», ipsative growth metric, cooperative shared quest, guests behind parent PIN, K3 + protected files untouched, Zero-Emoji, no deps.

- [x] M1 engine `app/js/engines/family.js`: weekly window (Sat-Fri, Egypt), per-hero metrics from daily buckets (answers, correct, xp, minutes, recovered, active days), personal-best growth % vs previous 4-week average (baseline min 5; first week flagged), streak days, category winners (growth/streak/recovered/minutes; headline category rotates by ISO week), shared family quest target + progress, guests in meta (parent-managed). Pure functions + node checks.
- [x] M2 view `#/family` (`app/js/ui/views/family.js` + css): hero tiles with companion sprite, growth ring, crown for category winner, one personal-best line each, no numeric rank; family quest bar; entry from home + profile; RTL, mobile-first; aria; reduced-motion.
- [x] M3 family card: export (Web Share API with file fallback) / import with monotonic merge; hero ids + day-level buckets only; parent PIN gate for guests + import + clear.
- [x] M4 celebration: shared quest reached -> all companions cheer (fx + companion voices, respects sound toggle), once per week (meta flag).
- [x] M5 tests `app/tests/phase19_family.py`: metrics math, youngest-with-most-growth leads, nobody labelled last, quest bar, card export/import monotonic, guests behind PIN, no PII in payload, a11y + overlap, 0 errors; mirrors (`family.json` links unchanged).
- [x] M6 gate: all suites both servers, family links, emoji, sha256 protected, bump 7.24, README append, roadmap (19 done, 20 current placeholder), single PR, external preview.

- resume-check (reset #9): remote @ 7a8f803 (18.5 closed, PR #2 merged into main 696ab7e, live 7.23). The interrupted R0 commit never landed (0 hits for the appendix/plan) -> redone now; merged origin/main (fast-forward to 696ab7e). Nothing else lost.
- M1 DONE: `app/js/engines/family_core.js` (pure: weekStart Sat, memberMetrics growth vs 4-week avg w/ MIN_BASELINE 5, crowns w/ ties, rotating headline by ISO week, familyQuest 100/hero min 150, personalLine, makeCard/validCard/cardIsClean/mergeDaily/applyCard monotonic) + `family.js` (store-bound: members heroes+meta.familyGuests, token, card, importCard, guests CRUD, questJustReached once/week). session.js: `d.recovered` counted in daily bucket. Unit `node app/tests/unit/family_core.test.mjs` 31/31. NEXT: M2 view #/family.
- M2 DONE: `app/js/ui/views/family.js` (hero card, quest bar w/ progressbar aria, tiles: deterministic companion sprite, conic growth ring, crowns w/ headline lead, one personal line, 4 stats; legend of the 4 crowns; `window.__family` probe) + CSS `.fam-*` (color-mix hero tint, reduced-motion) + route `/family` (requireProfile) + entries home `[data-act=family]` and profile. Smoke (8090, 390x844, seeded 3 heroes): kenda +100% growth crown, selim +10%, karma first week, headline minutes tie -> both lead, 0 errors 0 4xx, no «last» text. NEXT: M3 family card + guests behind parent PIN (parent.js section).
- M3 DONE: `app/js/ui/views/parentFamily.js` rendered inside PIN-gated parent dashboard: share card (Web Share file -> download -> clipboard), import (file / pasted text) via `family.importCard` (validCard + cardIsClean + monotonic merge, own card ignored), payload preview, guests list (local rename, remove, clear all). Smoke (8090): own card keys [v,kind,src,week,heroes], no PII; relative card -> 2 guests; re-import with lower value keeps max (6); invalid card rejected; guests on #/family as `.fam-tile.guest`; after reload parent shows PIN gate and no family section; 0 errors 0 4xx. NEXT: M4 celebration wiring check (familyCheer once/week via questJustReached already in view) -> verify with seeded quest-done + then M5 tests.
- M4 DONE: `familyCheer` in family.js: all tile companions switch to celebrate pose + WAAPI pop (reduced-motion aware), confetti + fanfare, then each companion's own cheer clip sequentially (sound toggle respected); `bus family:celebrate`; `window.__familyCheer` probe; fires once per week via `familyQuestWeek` meta flag; board redraws on `family:change`, `activity:complete`, cross-tab `storage`. Smoke: quest 315/300 -> celebrate true, cast [parrot,bee,monkey], second visit celebrate false, 0 errors. NEXT: M5 `app/tests/phase19_family.py`.
- resume-check (reset #10): remote @ 74b55af = R0 + M1..M4 all present (family_core.js, family.js, views/family.js, parentFamily.js, unit 31/31, version 7.23). M5 suite app/tests/phase19_family.py was written but the reset hit before commit -> redo M5 now; nothing else lost.
- M6 GATE (batch on ab06cdb+docs, servers 8080+8090, 33 suites run, 2 skipped by constitution): 30 rc=0 in batch; cachebust rc=1 before bump (new modules unmapped) -> `bump_version.py 7.24` (57 modules) -> CACHEBUST PASS; phase19_family rc=1 = my own broken final print line -> fixed -> 41/41 PASS on 7.24; phase12_branch (numpad timeout) and viewports (renderer Target crashed) failed only under batch load -> rerun alone: both PASS; behaviour.py rc=1 = legacy timeout identical to main (16 C5a). sha256 of 5 protected files = origin/main. Family links PASS, emoji 0. Docs: README append (Phase 19), PHASES_HISTORY, CHANGELOG_DECISIONS, RESUME, roadmap family.json + FAMILY_CHARTER (19 done 7.24, 20 current 7.25 placeholder). -> single PR.
- 19 DONE: single PR #3 https://github.com/just-SsSsSsSsSsSsSsSs/RESEARCH-md-Duolingo-Rive/pull/3 (branch a37d892, v7.24); external preview verified https://8090-ik1zc4uhg675aigqz94mq-0e616f0a.sandbox.novita.ai/app/index.html#/family (version.json 7.24; 3 tiles w/ companion sprites + crowns, quest 49/300, headline minutes, 0 page errors, 0 4xx). Screenshot https://www.genspark.ai/api/files/s/Q9lz3HiD. Note: a 277MB 'core' dump from a renderer crash was removed from the commit and added to .gitignore. NEXT: wait for the owner to merge PR #3; then Phase 20 R0 (research appendix -> frozen plan) - do not start until merged or the owner says so.


## Phase 20 - «تقرير الأهل الأسبوعي» Parent Weekly Report - v7.25 (frozen plan; R0 appendix in RESEARCH.md)

Principles frozen: local-first, no backend / e-mail / notifications, archive holds aggregates only, parent-only behind PIN, improvement-framed one-sentence headline (Kraft & Rogers 2015), data-driven conversation starters (Kraft & Bolves 2022), no sibling comparison, K3 + protected files untouched, Zero-Emoji, no deps.

- [x] M1 `app/js/engines/report_core.js` (pure) + `app/tests/unit/report_core.test.mjs`: week vs previous week deltas (correct, minutes, active days, accuracy, recovered), hour histogram -> best slot, headline sentence rules (first week / improved / steady / dipped, always with the next step), 3 conversation starters from real data (recovered question skill, best day, quest contribution, weakest skill tip), nextFocus, `familySummary`, `archiveMerge` (max 8, idempotent by week), `reportText`.
- [x] M2 `app/js/engines/report.js`: store-bound (profiles daily + events + insights.analyze + family.board), `report(heroId)`, `summary()`, `isFresh()` / `markSeen()` via `meta.reportSeenWeek`, archive in `meta.parentReports` (aggregates only).
- [x] M3 view `app/js/ui/views/parentReport.js` mounted in the PIN-gated dashboard: per-child report card (headline, deltas w/ arrows, best slot, skills, starters, next focus, 8-week mini trend from archive) + family summary card; print stylesheet (one page); share text (Web Share -> clipboard); nav dot on «الأهل» when fresh; `window.__report` probe.
- [x] M4 tests `app/tests/phase20_report.py`: unit first; seeded two weeks -> deltas + headline kind; hour histogram -> slot; starters reference real skill; archive grows to 8 max and is idempotent; fresh dot appears then clears after opening; report only behind PIN; share text has no question keys/events; print stylesheet hides nav; family summary has no rank/«last»; 0 errors 0 4xx; links; emoji.
- [ ] M5 gate: all suites both servers, family links, emoji, sha256 protected, bump 7.25, README append, roadmap (20 done, 21 current placeholder), single PR, external preview.

- resume-check (post-PR#3): owner claims verified - PR #3 merged 942268d (23:57Z), live 7.24, family.js 200; branch merged with main. Phase 20 R0 written now.
- M1+M2 DONE: `report_core.js` (weekWindow, skillStats per week from raw events, bestSlot hour histogram min 4, headline kinds quiet/first/improved/steady/dipped always with next step, starters x3 grounded in data and never comparing siblings, weekReport deltas vs previous week, familySummary no rank, snapshot/archiveMerge cap 8 idempotent/archiveClean whitelist, reportText) unit 27/27; `report.js` (report/reports/summary from heroes + family.board, archiveWeek in meta.parentReports, isFresh/markSeen via meta.reportSeenWeek, text). NEXT: M3 parentReport.js view + print CSS + nav dot.
- resume-check (reset #11): remote @ bdc044b = Phase 20 R0 + M1 + M2 present (report_core.js, report.js, unit 27/27, version 7.24, roadmap 20 current). M3 view (parentReport.js + CSS + parent.js mount + nav dot) was written but the reset hit before commit -> redo M3 now; nothing else lost.
- M3 DONE (redone after reset, pushed 2593dc6): `parentReport.js` renderReportCard (headline w/ kind tag, 4 stats w/ deltas, recovered/slot/strong/weak+tip/crowns facts, 3 starters, next focus, 8-week trend bars, share text (Web Share -> clipboard), print via body[data-print=report] + .rp-printing) + renderFamilySummary (line, 3 member chips w/ kind, quest, leaders, link to #/family); mounted in parent.js (per child before insights; summary before family card); `.rp-*` CSS + print rules; nav dot via dynamic import of report.isFresh in components.nav. Smoke (8090): dot 1 before -> PIN -> report improved (20->30, morning slot, weak جدول ٧ / strong جدول ٢, starters recovered/strong/bestday), archive snapshot written, seen week set, dot 0 after; 0 errors 0 4xx. NEXT: M4 `app/tests/phase20_report.py`.
- resume-check (reset #12): remote @ cafcb50 = Phase 20 R0 + M1 + M2 + M3 present (report_core, report, parentReport.js mounted, CSS, nav dot; unit 27/27; version 7.24; roadmap 20 current). Lost before commit: M4 suite phase20_report.py (had 33/35, 2 print-related fails under investigation) + print re-entrancy guard -> redo now.
- M4 DONE: `app/tests/phase20_report.py` 37/37 PASS (8090 mobile): U unit 27/27; R1 improved 20->30, headline w/ next step, morning slot, weak/strong from this week only, tip, 4 stats; R2 3 grounded starters, no sibling mention; R3 archive aggregates only, idempotent reopen, cap 8; R4 fresh dot before -> seen -> dot gone; R5 family summary 3 members, no rank/last, quest 36 + link; R6 no report on child views / before PIN, share text clean; R7 one click one print + re-entrancy guard, print media hides nav+siblings (CSS fixed: `:not(.rp-printing):not(:has(.rp-printing)):not(.rp-printing *)` because the old `#app > *` rule hid the .view ancestor), afterprint restores; A trend role=img, no overlap, nav free; hygiene 0/0, links, emoji. Root cause of the earlier «print fired twice»: the test stub `pg.evaluate("window.print = () => ...")` was itself invoked by evaluate - not a product bug; guard kept anyway. NEXT: M5 gate (all suites both servers, sha256 protected, bump 7.25, README append, roadmap 20 done / 21 current, single PR, external preview).
- resume-check (reset #13): remote @ 4fdfcd3 = Phase 20 R0 + M1..M4 present (suite 37/37, print guard, :has print CSS, version 7.24, roadmap 20 current, README without Phase 20). Lost before commit: M5 (bump 7.25, docs append, roadmap, gate run) -> redo M5 now.
- resume-check (reset #14): remote @ 9af29b0 = Phase 20 complete through M5 docs (version 7.25, README Phase 20, roadmap 20 done / 21 current). Lost: gate-record commit + PR creation (interrupted). Last session's gate on 9af29b0 content: 31 rc=0 in batch, phase15_2 + phase16 batch flakes -> rc=0 alone, behaviour legacy. Re-running gate now for fresh evidence, then single PR.
- M5 GATE (fresh, batch on ff33480, servers 8080+8090, 33 suites, 2 skipped by constitution): 32 rc=0 in batch incl. cachebust (7.25, 60 modules), phase20_report 37/37, phase15_2 + phase16 (last run's flakes) PASS; phase19_family rc=1 only in batch (reduced-motion second-context wait timeout) -> alone 41/41 rc=0; behaviour.py rc=1 = legacy (16 C5a). sha256 of 5 protected files = origin/main; family links PASS; emoji 0; unit 27/27 + 31/31. External preview verified https://8090-i4zva5ptdqjg1ptcvn047-c81df28e.sandbox.novita.ai/app/index.html (version 7.25; nav dot 1; PIN -> report improved / morning / weak جدول ٧ / strong جدول ٢ / starters recovered,strong,bestday; family line; 0 errors 0 4xx). -> single PR.
- resume-check (reset #15): remote @ 7a433bd = Phase 20 complete incl. gate record; PR creation had been interrupted -> created now.
- 20 DONE: single PR #4 https://github.com/just-SsSsSsSsSsSsSsSs/RESEARCH-md-Duolingo-Rive/pull/4 (branch 7a433bd, v7.25); external preview verified https://8090-ilo2wx6oquw8hruyw80oi-ea026bf9.sandbox.novita.ai/app/index.html (version.json 7.25; nav dot 1; PIN -> report improved / morning / weak جدول ٧ / strong جدول ٢ / starters recovered,strong,bestday; 0 page errors, 0 4xx). Screenshot https://www.genspark.ai/api/files/s/LRhugn6C. NEXT: wait for the owner to merge PR #4; then Phase 21 R0 (research appendix -> frozen plan) - do not start until merged or the owner says so.

- resume-check (reset #16, planning session): remote genspark_ai_developer @ 928d3d9 = Phase 20 closed; origin/main @ 47080d3 = PR #4 merged (2026-09-26T01:16:48Z); app/version.json 7.25; roadmap 21 current (placeholder). Owner gists 2e5c85db (three axes) + 9e3c5eb6 (plan on GitHub only, zero implementation code) read from raw and verified. GitLab sync claim not verifiable from the sandbox. This session writes DOCS ONLY on branch `genspark_plan_phase21` (from main) and opens a planning PR. No app code, content, audio or test file is created or modified.

## Phase 21 / 22 / 23 - ROADMAP PLAN (frozen for review; NOT STARTED; owner gists 2e5c85db + 9e3c5eb6; R0 appendix in RESEARCH.md)

Planning rules in force (owner, 2026-09-26): understand -> plan -> discuss -> execute; no execution before a written plan approved by the owner; silence is not approval; one task at a time; stop and ask on anything unexpected; Zero Regression is the top priority. The owner announced further architecture changes, additions and removals to be discussed BEFORE any code; every task below is therefore a proposal and may be reordered, removed or replaced at that discussion.

### Goal
Deliver the three owner axes as three shippable phases, lowest risk first: (21) curriculum expansion on the existing engines, (22) a dependency-free vector motion engine beside the current mask rig, (23) the turtle and the robot «بيبو» as the first vector-native companions. Each phase ends with the full gate, one PR and a verified external preview.

### Current state and what is affected
- Engines that will carry Phase 21 unchanged: mult generator (`activities/*.json` kinds mult/grid/missing/pickProducts), `story.js` (plant_story format), `quranReader.js` (quran_qadr format), `companion.pick(subject)`.
- Files that Phase 21 would ADD only: `activities/mult_6..9.json`, `activities/story_mult_6..9.json` + `content/audio/stories/mult_N/*.mp3`, `activities/quran_alaq.json`, `quran_tin.json`, `quran_sharh.json` + `content/audio/quran/{husary,minshawi}/{096,095,094}_NNN.mp3`, `app/tests/phase21_curriculum.py`, `app/tests/unit/catalog_schema.test.mjs`.
- Files that Phase 21 would APPEND to: `catalog.json` (11 new items), README, PROGRESS, RESUME, RESEARCH, `family.json` + `FAMILY_CHARTER.md` roadmap, `AGENTS.md` (new planning rules section), version files via `bump_version.py` only.
- Never touched: the 5 protected files, `companion.js`, `store.js`, `app.js`, Phase 19/20 engines, K3.
- Known conflicts to resolve with the owner before Phase 22/23: AGENTS.md section 5 forbids Rive/Lottie; the owl is already «حكيمة».

### Phase 21 - «توسيع المنهج» Curriculum expansion - target v7.26 (data-only)
- [ ] M0 docs: append owner planning rules to AGENTS.md (new section, nothing removed); resume line; roadmap titles for 21/22/23 (this PR does the roadmap titles only).
- [ ] M1 tables 6-9: `mult_6.json .. mult_9.json` (intro baladi + generator mult/grid/missing, range 1-10) + 4 catalog items (`math`, `numpad`, xp 25, tags ضرب/جدول) + `catalog_schema.test.mjs` (every `src` exists, ids unique, known types, no emoji). DoD: 4 activities playable end-to-end with K3; unit + `phase21_curriculum.py` part M1 on 8080 + 8090. Push.
- [ ] M2 table stories: `story_mult_6..9.json` in the plant_story format, each built on the table's trick (6 = double 3, 7 = 5 + 2, 8 = double 4, 9 = 10 - 1 / digit sum), fusha + baladi tracks (Fish Audio, same pipeline as `tools/build_explain_audio.py`), phases true-false -> comprehension -> order -> table map; monkey companion. Budget <= 600 KB audio per story. If Fish credits run out: document and stop, no improvisation. DoD: 4 stories complete; suite part S. Push.
- [ ] M3 surahs 96 / 95 / 94: download per-ayah mp3 for both reciters (35 x 2 files), Uthmani text from the same source as 97/98 with ayah-count check (19 / 8 / 8) and sha256 recorded; `quran_alaq.json`, `quran_tin.json`, `quran_sharh.json` with baladi meaning + word glossary per ayah, `order` groups of 5-7 ayat for al-Alaq, `fill` 3-5 items per surah, badges quran_reader_2..4. Show the owner the al-Alaq sample BEFORE writing at-Tin and ash-Sharh. First step: confirm `quranReader.js` has no per-surah hardcode; if it does, propose the <= 5-line change to the owner before touching it. DoD: highlighting follows audio, order/fill work, 0 404; suite part Q. Push.
- [ ] M4 companion routing check: monkey picked for math stories, owl for the surahs, with zero change to `companion.js` (suite part C).
- [ ] M5 gate: all suites both servers (skip emoji_sweep, shots_calmjoy; behaviour legacy), unit, Zero-Emoji, sha256 protected = main, family links, `bump_version.py 7.26` + cachebust, README append, roadmap 21 done / 22 current, PROGRESS, one PR, verified external preview.
Out of scope unless the owner asks: widening `mult_mix` to 2-9; any engine change; any new UI.

### Phase 22 - «محرك الحركة الشعاعي» Vector motion engine - target v7.27 (engine beside engine)
Decision required first: keep constitution section 5 (SVG + WAAPI, no runtime - recommended) or amend it to allow the Rive runtime (WASM ~1 MB + .riv authored in an external tool).
- [ ] M1 spec: `companions.json` v2 schema - `rig.kind: "mask"` (default, unchanged) | `"svg"` (inline SVG with `<g id>` parts, `poses{}`, `actions{fly,run,jump,wave}` as WAAPI keyframe arrays, `offset-path` for flight); written in RESEARCH + PROGRESS, reviewed by the owner.
- [ ] M2 `app/js/engines/companion_svg.js` (new module): mount/pose/action/lookAt/mouth on SVG parts using existing `spring()` and `easing()`; `prefers-reduced-motion` respected; `pointer-events` rules per constitution.
- [ ] M3 one-line delegation in `companion.js`: `if (c.rig?.kind === 'svg') return svgRig.mount(...)`; all 5 raster companions keep the mask path bit-for-bit (phase17/18/18.5 suites must stay green).
- [ ] M4 memory budget test: Playwright measures `performance.memory.usedJSHeapSize` delta + DOM node count + transferred bytes when mounting an SVG companion; fails above 20 MB heap delta or above an agreed asset cap. Honest note: JS heap does not include GPU textures; asset bytes are measured separately.
- [ ] M5 demo companion in SVG (a placeholder or the first Phase 23 character) exercising fly / run / jump in a lesson; suite `phase22_vector.py`.
- [ ] M6 gate, bump 7.27, README, roadmap, one PR, preview.

### Phase 23 - «استكمال الطاقم» Turtle + robot «بيبو» - target v7.28
Decision required first: turtle name (owl is already «حكيمة»): rename the turtle, rename the owl (check whether owl voice clips speak the name), or accept the duplicate (not recommended).
- [ ] M1 identity sheets: turtle = slow, deliberate mentor («راجع قبل ما تجاوب»), subjects quran/deen or arabic per owner; robot «بيبو» = mechanical, hopping, science/logic mentor; motion vocabulary per character (turtle: shell tuck, slow walk, peek; robot: hop, antenna blink, arm servo).
- [ ] M2 SVG art authored as data (no image-generation credits needed), consistent with the existing palette; two JSON entries in `companions.json` with `rig.kind: "svg"`.
- [ ] M3 voices: laugh + cheer clips via Fish Audio (same pipeline as the 5 existing companions); if credits run out: document and stop.
- [ ] M4 tests `phase23_cast.py`: both appear via `pick(subject)`, actions run, reduced-motion, pointer rules, memory budget from Phase 22, no regression on the 5 raster companions.
- [ ] M5 gate, bump 7.28, README, roadmap, one PR, preview.

### Safety strategy (Zero Regression) - binding for all three phases
1. Additions over modifications: Phase 21 is JSON + audio only; Phase 22 adds a module behind a per-companion data switch; Phase 23 is data + art + voice.
2. Gate before every push: unit + all suites on 8080 + 8090, sha256 of the 5 protected files, `check_family_links.py`, Zero-Emoji. Undocumented failure = stop and ask.
3. New `catalog_schema.test.mjs` guards the catalog contract for all future content.
4. Written budgets: Phase 21 <= +20 MB on disk, all lazy-loaded (no preload); Phase 22 <= 20 MB heap delta per SVG companion.
5. Push after every completed M task (+10-15 min rule); no force-push; one PR per phase.
6. Stop rules: any need to edit an existing engine, exhausted Fish/image credits, any text mismatch in Quran sources -> document in PROGRESS and ask the owner before continuing.

### Risks and mitigation
| Risk | Mitigation |
|---|---|
| Quran text error | same source as 97/98, sha256 + ayah-count check, owner reviews the al-Alaq sample first |
| Fish Audio credits | run M3 (free audio) before M2 if needed; document and stop |
| audio size | 64 kbps Husary, per-ayah files, measure after download; return to owner above 20 MB |
| hidden surah hardcode in quranReader.js | check first; propose the minimal diff before editing |
| suite flakes under batch load | rerun the suite alone (documented Phase 19/20 pattern) |
| sandbox resets | push per completed M; PROGRESS updated with each push |
| constitution vs Rive; turtle name | explicit owner decisions before Phase 22 / 23; Phase 21 unaffected |

### Open questions for the owner (answers change the plan, not the code)
1. Approve the order 21 curriculum -> 22 engine -> 23 cast?
2. Rive runtime or constitution-compliant SVG + WAAPI engine (recommended)?
3. Turtle name given the owl «حكيمة»?
4. Widen `mult_mix` to 2-9 inside Phase 21? (default: no)
5. Levels: tables 6-7 level 2 and 8-9 level 3, or all level 2?
6. The owner's announced architecture changes: which of the tasks above are removed, replaced or reprioritised?

- PLAN-ONLY: branch `genspark_plan_phase21` (from main 47080d3) carries this plan + RESEARCH appendix + roadmap titles + AGENTS.md planning rules; zero implementation code. NEXT: owner reviews the planning PR, states the architecture changes, and answers the 6 open questions; only then M0 of the approved phase starts on `genspark_ai_developer`.

## EFRP - Evidence-First Review Protocol (owner gist 98e59929, permanent reference) - research branches, docs only

- Permanent governing reference: https://gist.github.com/pijsal1-tech/98e599291bb543d2237f71ac97d97749 (read from raw every session; revision e14796a = 7019 lines read 2026-09-26; AGENTS.md section 9 records it).
- resume-check (reset #17): main @ e1315c6 = PR #5 merged (docs only, frozen draft per owner). No research branch existed on remote; the R1-A1 report, AGENTS section 9 and this PROGRESS section had been written but the reset hit before commit -> rewritten now from the same sources and pushed immediately.
- Gate 0 DONE (chat): understanding, 6 axes, claims list, 8 questions. Owner answered all 8 in the gist: PR #5 frozen draft; section 5 default, revisit only on proof; baseline Android 2-3 GB Chrome; weak 3G/4G + Wi-Fi, fetch once + offline; ages 6-10; axis by axis starting A1; sandbox branch allowed for measurements only; tafsir Al-Muyassar / Al-Mukhtasar.
- Gate 1 DONE (read-only, RESEARCH.md R1 section 3): CSS-mask + WAAPI rig without joints, 3 poses per character, no Service Worker (purgeLegacyPWA), Pages max-age=600 + accept-ranges + CORS *, 637 mp3 = 49.5 MB, pack 50 MiB, catalog 29 items (13 external).
- Gate 2 DONE for A1 (RESEARCH.md `R1 - ... Axis A1`): 20 evidence rows E1-E20 with L1/L2/L3 and direct links; circulating numbers without source rejected; 8 alternatives x 10 criteria; 4 unproven hypotheses; 3 priority options (A pedagogy first / B measure B,C,D / C balanced SW + B,C); 4 work-package suggestions; 4 new questions Q-A1-1..4.
- NOT done, not authorised: Gate 3 decision, Gate 4 measurement, any code. Branch `research/evidence-a1-animation` (docs only) -> docs PR. NEXT: owner reads R1-A1, answers Q-A1-1..4, picks Option A/B/C; then Gate 3/4 only with separate explicit approval.
- resume-check (reset #18, 2026-09-26): main @ 127189f = PR #6 merged (verified via API: merged 04:56:22Z). Gist re-read from raw via API: latest revision still `5b0800c3` (05:08:26Z, 7226 lines) - no newer owner update. The local Gate 3 commit 8091e6e written before the reset never reached the remote (branch `sandbox/a1-vector-rig` was absent on origin) -> Gate 3 rewritten from the same sources and pushed as f0cab3e.
- Owner decisions (gist rev 5b0800c3, verified): PR #6 accepted as evidence; Q-A1-1 = 3-5 companions (owl, monkey/bee, robot, turtle); Q-A1-2 = AI layered parts + local assembly scripts; Q-A1-3 = no paid/subscription tools, open web standards only; Q-A1-4 = no visemes, expressive talking loop + blink + nod + celebration. Path C chosen: (a) Service Worker research/prep first, (b) Gate 4 limited to a light SVG/Canvas rig with no libraries on `sandbox/a1-vector-rig` only. Authorised: Gate 3 then Gate 4. NOT authorised: Gate 5 adoption, any change to `app/` or `main`.
- Gate 3 DONE (docs only): RESEARCH.md `R1-A1 Gate 3` D1 native SVG+WAAPI zero libraries / D2 canvas strip fallback per action only / D3 art lanes P1 geometric SVG proof then P2 AI layered parts on the same skeleton / D4 SW cache-first versioned assets, conflict with purgeLegacyPWA recorded for Gate 5 / D5 isolation under `sandbox/` + metrics (heap delta, DOM nodes, animations, rAF p50/p95, bytes) for 1/3/5 companions.
- NEXT: Gate 4 on this branch: `sandbox/` prototype (SVG rigs owl + bee, WAAPI joints, blink, talking loop, celebrate, 1/3/5 scene), sandbox-scoped SW prototype, `sandbox/measure.py`, screenshots for the owner, Gate 4 report in RESEARCH.md, review-only PR. No merge into `app/`.
- Gate 4 DONE on `sandbox/a1-vector-rig` (sandbox only, nothing in app/): owl+bee layered SVG rigs (47 joints for 3 rigs), `sandbox/rig.js` WAAPI engine (breath, blink, look, talk loop with hysteresis, celebrate with spring, nod, think, sad, dispose), sandbox-scoped SW (offline reload verified), `sandbox/measure.py`. Results: rAF p95 16.7-16.8 ms at 1/3/5, heap delta 0.5-0.6 MB, animations after dispose 0, about 5.7 KB per companion, no console errors; D5 thresholds PASS. Samples: sandbox/samples (3 png + 12.6 s webm). Guards: family links PASS, Zero-Emoji PASS, protected files = origin/main. Report: RESEARCH.md `R1-A1 Gate 4`.
- NEXT: owner reviews the sample PR (review only, not to be merged into app/ behaviour) and decides Gate 5 (adopt SVG skeleton + P2 AI layered art lane; SW coexistence with purgeLegacyPWA; real 2-3 GB Android run). No Gate 5/6/7 work without a separate explicit order.
- PR #7 opened (review only): https://github.com/just-SsSsSsSsSsSsSsSs/RESEARCH-md-Duolingo-Rive/pull/7 - Gate 3 decision + Gate 4 sandbox sample; branch `sandbox/a1-vector-rig` @ 3902aea + this line. Temporary live preview (sandbox session only): https://8080-it2med70p1kcsjogreq4d-b237eb32.sandbox.novita.ai/sandbox/index.html?n=3 . NEXT: wait for the owner's judgement of the sample and Gate 5 answer; no further gates without explicit order.

## Gate 5 - owner authorisation (chat message 2026-09-26, after PR #7 merged 53a3f80)
- Verified: PR #7 merged into main (`53a3f80`); gist still rev 5b0800c3 (the Gate 5 authorisation came in chat, quoted here): owner adopts the WAAPI joint skeleton as the platform engineering standard; authorises Gate 5 = (a) P2 art pipeline: high-detail 3D-rendered layered parts for the core companions (owl, bee/monkey) mounted on the same skeleton; (b) Service Worker coexistence plan for platform assets (audio + images); (c) full isolation until Gate 5 is approved - no merge into main behaviour, `app/` untouched.
- Branch `sandbox/a1-gate5-art-sw` (from main 53a3f80). Plan (small chunks): C1 generate layered 3D character sheets (AI, transparent parts) -> C2 local cut/assemble script -> C3 P2 rigs on the same data-joint skeleton + measurement rerun -> C4 SW coexistence plan document (purgeLegacyPWA replacement design, asset manifest, cache budget) -> C5 report + PR for owner judgement.
- Gate 5 C1-C4 DONE on `sandbox/a1-gate5-art-sw`: C1 owl 3D parts sheet (AI, chroma green); C2 `sandbox/art/cut_parts.py` -> 9 transparent WebP parts (87 KB) + parts.json; C3 `sandbox/art/assemble.py` -> `owl_p2.svg` on the same data-joint skeleton, rig.js unchanged, demo P1/P2 toggle, SW precache g5-1; measured P2 1/3/5: p95 16.7-16.8 ms, heap 0.6 MB, dispose leak 0, 139 KB scene; C4 SW-1 coexistence design written (purgeLegacyPWA replaced by a version.json flag, cache-first versioned assets, network-first shell/JSON, audio cache-first without 206, 64 MB cap, lesson manifest). Report: RESEARCH.md `R1-A1 Gate 5`.
- BLOCKED (credits): bee/monkey/robot/turtle parts sheets - image-generation credits exhausted this session; resume when credits return (no improvisation).
- NEXT: C5 review PR of this branch (docs + sandbox only) for the owner's visual sign-off on the owl P2 sample; then Gate 6 plan and Gate 7 order for SW-1 and the app-side `rig.kind` switch.
- PR #8 opened (review only): https://github.com/just-SsSsSsSsSsSsSsSs/RESEARCH-md-Duolingo-Rive/pull/8 - Gate 5 P2 owl + SW-1 design; branch `sandbox/a1-gate5-art-sw` @ d901151 + this line. Temporary preview (session only): https://8080-idn09rz6abwdv400d05or-8f57ffe2.sandbox.novita.ai/sandbox/index.html?art=p2&n=3 . NEXT: owner's visual sign-off on the owl P2 sample -> Gate 6 plan (SW-1 + app rig.kind switch + remaining 4 character sheets when credits return) -> Gate 7 only by explicit order.
- Owner critique after PR #8 (merged 93c2a8c) applied on `sandbox/a1-gate5-art-sw` (re-based on main): (2) feather edge fix via key-colour un-mixing + soft alpha, 60 percent export (110.6 KB); (1) flight system: flap, waypoint paths with banking, 360 roll, 180 flip, 3 curated plans clamped to the stage, take-off/landing; (3) dramatic think (eye roll, chin taps, aha) and wrong-answer recoil (startle, dizzy, shrug), tap variety, autonomous life every 3.5-7.5 s; (4) owl-only focus, sky stage, P1 kept as test fixture. Measured P2 with flight: p95 16.7 ms at 1/3/5, heap 0.6 MB, rig leaks 0, 193 KB. Samples: p2_owl_acting_flight_30s.webm + frames. Report: RESEARCH.md `Gate 5 addendum`.
- PR #9 opened (follow-up to merged #8, review only): https://github.com/just-SsSsSsSsSsSsSsSs/RESEARCH-md-Duolingo-Rive/pull/9 ; branch `sandbox/a1-gate5-art-sw` @ 9c55bf8 + this line. Preview (session only): https://8080-ixozwi5zyfp2bpdvy8vep-ecea8f22.sandbox.novita.ai/sandbox/index.html . NEXT: owner's live judgement of flight + acting; candidates for the next round: perch-to-perch flight to a target element, side-view sheet for true 180 turns (credits), real-device run. No other companion until the owl is signed off.
- resume-check (reset #19, 2026-09-26): remote `sandbox/a1-gate5-art-sw` @ d61f132 = last recorded state (nothing lost); PR #9 open, 0 comments, not merged (owner judgement pending); main @ 93c2a8c (PR #8); gist still rev 5b0800c3. Nothing to redo. Continuing inside the authorised Gate 5 owl scope only (sandbox/, no app/): real-audio talking loop (Q-A1-4), perch-to-perch flight to a target, prefers-reduced-motion respect (constitution section 5). Gate 6/7 still not authorised.
- Owl round 3 DONE on `sandbox/a1-gate5-art-sw` @ 65f8126: real-audio talking loop (AnalyserNode RMS envelope, `say()`, owl's own cheer/laugh + explain clip), perch-to-perch `flyTo(target|home)` with kept perch, prefers-reduced-motion respect, mock lesson perches in the demo, autonomous perch hops, SW precache g5-3. Verified by Playwright (mouth follows real audio; perch offsets; REDUCED path). Samples: p2_owl_perch_voice_26s.webm + frames. Report: RESEARCH.md `Gate 5 addendum 2`. NEXT: owner judgement on PR #9 (updated with this round); Gate 6 plan only after sign-off.
- PR #9 updated with round 3 (comment): https://github.com/just-SsSsSsSsSsSsSsSs/RESEARCH-md-Duolingo-Rive/pull/9 ; branch @ 88ffa37 + this line. Preview (session only): https://8080-i3ohi8ra4l799htb05pfa-3c7ff1b5.sandbox.novita.ai/sandbox/index.html (buttons: fly to card / answer / home, real voice). NEXT: owner's judgement; Gate 6 plan (app rig.kind adapter, SW-1, real device, 4 sheets on credits) only by explicit order. Owl only.

## Owl cinematic cycle (constitution gist 015a32a6 rev 555a2147) - branch `sandbox/a1-gate5-art-sw`
- resume-check (reset #20, 2026-09-26): PR #9 merged into main 13:59:40Z (`17d9407`); remote sandbox branch @ 6819f2f holds AGENTS section 10 + ADR-001 (both present, nothing lost); the Character Spec `sandbox/companions/owl.motion.json` that was being written at the reset does NOT exist -> to be written now. Gists unchanged (98e59929 rev 5b0800c3; 015a32a6 rev 555a2147). Branch merged with main (07a43a7). Owl only; `app/` untouched.
- FROZEN PLAN (ADR-001 execution, small chunks, each pushed):
  - K1 `sandbox/companions/owl.motion.json` Character Spec (hierarchy delays, spring groups, squash, timing ranges, flight arc params, gaze-from-envelope, state machine with layers + events + variety).
  - K2 `sandbox/engine/physics.js` spring-damper integrator running only during motion + settle window (no idle loop), driven by analytic velocity of the flight curve; volume-preserving squash spring.
  - K3 `sandbox/engine/motion.js` v2 engine on the same SVG skeleton: Bezier arcs with arc-length sampling, anticipation crouch from spec, landing squash + rebound from spec, hierarchy overlap, secondary groups from physics, gaze/head reacting to the audio envelope.
  - K4 `sandbox/engine/states.js` data-driven state machine (layers body/mouth/gaze, blend, events, variety) -> `owl.fire(event)`.
  - K5 demo: `?engine=v2` default with `v1` flag for side-by-side; path-trace overlay toggle; slow-motion capture helper.
  - K6 proofs: slow-motion landing frames (G2), crouch frames (G3), path trace (G4), settle frames (G5), voice video (G6), edge zooms (G7), v1/v2 side-by-side (G8), measure.py with jank = frames over 20 ms (G9), "add a fake character by data only" test (G10).
  - K7 10-point report in RESEARCH.md + principles matrix + risk log; review PR.
