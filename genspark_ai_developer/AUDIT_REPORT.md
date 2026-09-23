# AUDIT_REPORT.md — مراجعة شاملة للمشروع (المهمة 0)

**المستودع الوحيد للمشروع:** `html-mobile-audio/html-mobile-audio` (فرع النشر `main` → GitHub Pages).
**تاريخ المراجعة:** 2026-09-22 — على `main @ c5cd0d3` (بعد دمج PR #7).
**نطاق المراجعة:** الكود نفسه سطرًا سطرًا (لا README فقط). لم يُعدَّل أي كود في هذه المهمة.

> ملاحظة منهجية: لا توجد repos أخرى مرتبطة (لا backend، لا admin، لا DB). كل شيء static على GitHub Pages ويعمل offline-first. أي افتراض مكتوب صراحةً بعلامة **[افتراض]**.

---

## 1) البنية العامة — خريطة المشروع (مين بيكلّم مين)

| الجزء | المسار | الدور | يتواصل مع |
|---|---|---|---|
| **البوابة الرئيسية (كلاسيك)** | `index.html` | فهرس روابط لكل التطبيقات القديمة | روابط فقط |
| **تطبيق الطفل الحديث (SPA)** | `app/` (index.html + js/ + css/ + content/) | المنصّة المُلعّبة: أبطال، مواد، أنشطة، XP/جواهر/قلوب، شارات، مهام، شهادات، لوحة أهل | `localStorage` فقط + everyayah CDN (سبق تحميل الملفات محليًا) |
| **الأصول الكلاسيكية (محمية — لا تُلمس)** | `plant.html`, `math.html`, `albayyinah.html`, `quran-alqadr/index.html`, `quran-albayyinah/*` | تطبيقات HTML مستقلة single-file (صوت Base64/MP3) | تُعرض داخل iframe من `app` عبر «كلاسيك <-> حديث» |
| **حلقات البودكاست** | `episodes-selim/`, `selim-math-arabic/`, `audio/` | سكريبتات بناء (python) + MP3 + docx | لا تعتمد عليها `app` إلا كروابط external في الكتالوج |
| **أدوات** | `tools/serve.py` (Range 206), `tools/bump_version.py`, `tools/send_voice.py` (Fish Audio TTS offline tool) | تطوير/توليد صوت | — |
| **اختبارات** | `app/tests/*.py` (13 suite Playwright) | E2E/regression | تعمل على `:8090` |
| **توثيق/تشغيل** | `genspark_ai_developer/PROGRESS.md`, `workspace--RESEARCH/RESEARCH.md` (append-only) | نقطة استئناف + بحث | — |

**تدفّق التشغيل في `app`:** `index.html` (importmap `?v=7.1`) → `js/main.js` → `core/router.js` (hash routes) → `ui/views/*` → `activities/session.js` (+ `generators.js`/`renderers.js`) → `engines/*` (xp, hearts, streak, badges, quests, sound, storyAudio, fx, bubbles) → `core/store.js` (localStorage) عبر `core/bus.js` (events).

---

## 2) الـTech stack الفعلي

| الطبقة | الواقع |
|---|---|
| Frontend | Vanilla ES Modules (بلا framework، بلا bundler)، CSS متغيّرات، SVG icons مضمّنة (`icons.js`/`icons3d.js`)، Zero-Emoji policy |
| Backend | **لا يوجد** |
| DB | **لا يوجد** — `localStorage` بمخطط `abtal:v1:meta` + `abtal:v1:profile:<id>` مع `schema` + `migrate()` |
| Auth | لا حسابات؛ لوحة الأهل بـ PIN (4 أرقام) مُجزّأ SHA-256 محليًا، جلسة 10 دقائق في الذاكرة |
| Hosting | GitHub Pages (static) — يعمل offline بعد أول تحميل (لا Service Worker حاليًا) |
| CI | **لا يوجد** GitHub Actions؛ الاختبارات تُشغَّل يدويًا (`app/tests/*.py`) |
| صوت | `engines/sound.js` (Web Audio API synth للـSFX + `speak()` بسيط عبر `speechSynthesis` ar-EG)، `engines/storyAudio.js` (MP3 dual-track مع seek/verify)، ملفات MP3 محلية (`app/content/audio/**` ≈ 8.3MB) |
| TTS خارجي | أداة python `tools/send_voice.py` (Fish Audio API) للتوليد offline فقط — المفتاح في `.env` (مُتجاهَل بالـgitignore، `.env.example` موجود) |

---

## 3) الـData model (كيف نمثّل الطالب/الدرس/المرحلة/السؤال/المحاولة/النتيجة)

- **الطالب** = `profile` (`store.js: defaultProfile`) — `{ id, name, xp, gems, hearts, streak, badges{}, activities{}, daily{}, quests, certificates[], counters{}, settings{fontScale, difficulty} }`. 3 أبطال ثابتون (`HEROES`).
- **المادة** = `catalog.json.subjects[]` (`id,title,icon,color,desc,classic[]`).
- **النشاط/الدرس** = `catalog.json.items[]` (`id, subject, title, desc, icon, xp, level, src, type?, heroes?, external?`) + ملف `content/activities/<id>.json`.
- **السؤال** = كائن `Q` (`type: quiz|truefalse|fillblank|numpad|match|order|grid|pick`, `q, answer, choices?, key, explain?`) — إما ثابت في JSON أو **مولَّد** (`generators.js`).
- **المحاولة** = `Session.answers[]` `{ i, ok, ...meta }` — **مؤقتة داخل الجلسة فقط**؛ لا تُخزَّن. يُخزَّن فقط التجميع: `profile.activities[id] = { plays, best, mastery, lastPlayed, correct, total }` + `daily[YYYY-MM-DD] = { xp, minutes, answers, correct, activities[] }` + `counters`.
- **النتيجة** = `Session.finish()` → `{ score, perfect, xp, mastery, streakUp, certificate, newBadges }`.

**الكيان الذي يعبّر عن «مجموعة تبدأ وتخلص»:** هو **`Session` لنشاط واحد** (activity play) — يبدأ بـ`start()` وينتهي بـ`finish()` مع حدث `bus.emit('activity:complete', {id, subject, score, perfect, aborted})`. نفس المفهوم في `story.js` (قصة + أسئلة) و`phaseRunner.js` (مراحل المصحف) — كلها تنتهي بـ`Session.finish()`.
→ **هذا هو موضع إطلاق «سارينة الإنجاز» الصحيح: عند `activity:complete` بشرط `!aborted` و(الافتراضي) `score === 100`.**

---

## 4) لوحة تحكم الأب الحالية

- موجودة: `#/parent` (`ui/views/parent.js`) خلف PIN.
- تعرض لكل طفل: مستوى/شعلة/دقة/دقائق، رسم 7 أيام، تفصيل المواد، جدول الأنشطة، شارات/شهادات.
- إعدادات موجودة: **صعوبة الأسئلة المولَّدة** (`profile.settings.difficulty`: easy/auto/hard — تُقرأ فعلًا في `generators.js`), ملء القلوب، منح جواهر، تصفير الطفل؛ عام: تصدير/استيراد JSON، تغيير PIN، تشغيل/إيقاف الأصوات، مسح الكل.
- **كيف تصل الإعدادات للطفل:** نفس `localStorage`؛ تُكتب عبر `saveProfile()` وتُقرأ لحظيًا عند بداية الجلسة التالية (لا حاجة لإعادة نشر). ✅ مناسب تمامًا لمتطلب «تسري فورًا».
- **غير موجود:** أي إعداد للاحتفال/الصوت بالمدة/نوع الصوت/تنبيه الأب، أو للشرح، أو تقرير سلوكي.

---

## 5) الموجود حاليًا (نبني عليه ولا نكرّره)

| القدرة | الحالة | ملاحظة للبناء |
|---|---|---|
| SFX مُولَّد (Web Audio) | ✅ `sound.js` (`play(name)`, combo, `resetCombo`) | نضيف `celebration.js` مستقل يشترك في نفس `AudioContext` عبر `sound` أو يخلق سياقه — **لا نلمس SFX الحالية** |
| TTS | ⚠️ `sound.speak(text, rate, pitch)` بسيط، بلا تظليل كلمة-كلمة، بلا حدث انتهاء | نبني `speech.js` فوقه: queue، `onboundary` karaoke، fallback زمني، `stop()` |
| تشغيل MP3 دقيق | ✅ `storyAudio.js` | يُستخدم للقصة والمصحف |
| احتفال بصري | ✅ `fx.celebrate`, `confetti`, `__bubbles.party/celebrate` | السارينة تتزامن معها |
| تتبّع الأحداث | ⚠️ `bus.emit('activity:answer' / 'activity:complete')` فقط — بلا زمن، بلا قيمة الخطأ، بلا مهارة | نضيف `telemetry.js` يلتقط أحداثًا مفصّلة إلى `profile.events[]` |
| إشعارات | ❌ لا | Parent alert: صوت/إشعار داخل التطبيق (Notification API اختياري عند الإذن) |
| مهارات دقيقة | ⚠️ كل سؤال له `key` (مثل `m3x7`, `g3x5`) لكن بلا `skill` صريحة | نضيف `skill` في المولّدات (جدول ٣، عدد مفقود، شبكة، مضاعفات، توزيع، تبديل...) |

---

## 6) الأخطاء والمشاكل / الاختبارات / الأداء

### 🔴 حرجة
- لا شيء يكسر التشغيل حاليًا. (كل الـ10 suites الأساسية PASS على `main`).

### 🟡 مهمة
1. **المحاولات لا تُخزَّن** (فقط تجميع) → تحليل السلوك مستحيل بدون طبقة أحداث جديدة (المهمة 3 تحلّها).
2. **`sound.speak()` يعتمد على أصوات المتصفح**: على أندرويد/كروم يوجد ar-EG غالبًا؛ على iOS Safari أصوات عربية محدودة **[افتراض: يجب fallback إلى تظليل بلا صوت + رسالة صغيرة]**.
3. **لا Service Worker** → يعمل offline فقط بالـcache العادي للمتصفح؛ ليس مضمونًا.
4. **لا CI** → الاختبارات يدوية.
5. **حجم الريبو**: MP3 (8.3MB في `app` + مئات MB في الحلقات القديمة) تُرفع مع الريبو نفسه.
6. `parent.js` يكتب `localStorage` مباشرة لطفل غير نشط (`saveProfile`) — يعمل، لكن يلتف حول `store` (خطر تعارض عند إضافة `events[]`) → سنمرّ عبر `store`.
7. `innerHTML` مستخدم في 12 view — كل النصوص الديناميكية تمر عبر `esc()` (مراجعة: ✅) لكن يبقى نقطة انتباه لأي محتوى جديد.

### 🟢 تحسينات
- `emoji_sweep.py`, `behaviour.py`, `shots_calmjoy.py` suites قديمة غير مُشغَّلة في الدورة الحالية.
- `run_local_server.py` مكرّر مع `tools/serve.py` (الأول بلا Range).
- الأصول القديمة (`episodes-selim/build_*.py`) خارج نطاق `app` — تبقى كما هي.

### الاختبارات (تغطية)
- 10 suites فعّالة: `emoji_audit, svg_leak, cachebust, layering, e2e, viewports, navoverlap, plant_story, quran_reader, math_random` — تغطي التوجيه، كل الأنشطة، لعب كامل، المصحف، العشوائية، cache-busting، طبقات UI.
- **غير مغطّى:** لوحة الأهل بالتفصيل (PIN فقط)، التصدير/الاستيراد، الشعلة عبر الأيام، `speak()`.

### الأداء
- SPA بلا bundler: 34 module → importmap مع `?v=` (cache-bust) — أول تحميل ≈ 660KB بدون الصوت. مقبول على 3G.
- لا استعلامات/شبكة سوى الخطوط (Google Fonts) — تفشل بصمت offline.

---

## 7) الأمان والخصوصية (بيانات الطفل)

- **لا تُرسَل أي بيانات لأي طرف** — كل شيء في `localStorage` على الجهاز. ✅
- لا أسرار في الريبو (`.env` مُتجاهَل، `.env.example` فقط). ✅ *(ملاحظة: token الـGitHub المستخدم في المحادثة يجب تدويره بعد انتهاء العمل؛ غير موجود في الكود.)*
- PIN مُجزّأ (SHA-256 + salt ثابت) — حماية «من الطفل» لا «من مهاجم»؛ كافية للسياق. 
- **الأحداث الجديدة (المهمة 3)** ستُخزَّن محليًا فقط، بسقف عددي (3000 حدث)، بلا نص حر من الطفل، وتُصدَّر فقط ضمن النسخة الاحتياطية التي يصنعها الأب بنفسه. التحليل والوصف السلوكي في لوحة الأب فقط — الطفل لا يرى أي تصنيف.

---

## 8) ديون تقنية قد تعطّل الميزات الجديدة — وكيف نتعامل

| الدين | الأثر | القرار |
|---|---|---|
| لا تخزين للمحاولات | المهمة 3 | `telemetry.js` + `profile.events[]` + migrate آمن (deepMerge يضيف الحقل تلقائيًا) |
| `speak()` بدائي | المهمة 1 | `speech.js` جديد؛ `sound.speak` يبقى للتوافق |
| لا إعدادات احتفال | المهمة 2 | `profile.settings.celebration` بقيم افتراضية آمنة + UI في لوحة الأب |
| `parent.js` كبير (164 سطر ملف واحد) | المهام 1–3 تضيف أقسامًا | نضيف أقسامًا كوحدات (`parentInsights.js`, `parentSettings.js`) تُستدعى من `parent.js` |

---

## 9) قرارات التنفيذ (بديل + تبرير)

| الاختيار | القرار | البديل | لماذا |
|---|---|---|---|
| TTS | Web Speech API محلي | Fish Audio/ElevenLabs مسبق التوليد | صفر تكلفة، فوري، يعمل offline، لا backend؛ الجودة أقل لكن كافية + الكلمات مُظلَّلة. لاحقًا يمكن cache MP3 لأكثر الشروح تكرارًا |
| توليد الشرح | قوالب حتمية بالعامية من meta السؤال | LLM | حتمي، فوري، بلا تكلفة/خصوصية؛ الأسئلة مولَّدة بأنماط معروفة (ضرب/مفقود/شبكة/مضاعفات/توزيع/تبديل/آيات) فالقوالب تغطيها 100% |
| السارينة | Web Audio مُولَّدة (two-tone sweep) | ملف MP3 royalty-free | قانوني 100%، 0KB، تحكّم كامل بالمدة/الصوت/fade |
| الأحداث | `localStorage` داخل الـprofile | IndexedDB | حجم صغير (3000 حدث ≈ 300KB)، نفس آلية التصدير |
| التحليل | Rule-based + إحصاء شفاف | ML/LLM | قابل للشرح للأب، بلا بيانات خارجية |

---

## 10) أسئلة مفتوحة (افتراضات مُتخذة حتى يُجاب عنها)

1. **شرط السارينة الافتراضي:** اعتمدت «إكمال 100% بلا خروج» (كما في الـgist «اكتمال كل عناصر المرحلة 100%») مع خيار الأب «مجرد الإكمال» أو «≥X%».
2. **المدة الافتراضية:** 30 ثانية (نطاق 5–120) — الـgist ذكر مرة 30 ومرة 45؛ اخترت 30 (الأقصر أمانًا للسمع).
3. **تنبيه الأب:** بلا خادم لا توجد push حقيقية؛ سأنفّذ `sound | notification (Notification API عند الإذن) | both | none` داخل الجهاز نفسه.
4. **الصور في الشرح:** الـgist قال «من غير صور دلوقتي» → نص كبير + صوت + أمثلة + خطوات فقط (الشبكة النقطية الموجودة أصلًا تبقى كجزء من السؤال).

---

# Phase 11 — K1: تدقيق شامل للروابط والملفات (2026-09-23)

المنهج (RULES.md §1): فحص ثابت (regex على href/src/import/url() + JSON catalog) ثم فحص حي في Chromium (Playwright) بعد DOMContentLoaded مع رصد كل استجابة HTTP >= 400 وأخطاء الصفحة.

## النتائج المُثبتة
| البند | الدليل | الحالة |
|---|---|---|
| index.html (البوابة) | 11 رابطًا محليًا -> كلها 200 (بما فيها ملفات بأسماء عربية بعد URL-encoding) | OK |
| الصفحات الكلاسيكية الأربع: شريط التنقل | كل صفحة 5 روابط data-target؛ `navApp()` + DOMContentLoaded يعيد كتابة href من `getAppBase()`؛ كلها 200 في المتصفح | OK |
| ملاحظة الفحص الثابت | `quran-alqadr/index.html` يحمل href نسبية (`math.html`…) تُقرأ 404 بالنص الخام، لكنها تُصحَّح بـJS قبل أي نقرة -> **ليست 404 فعلية** (تم التأكد بالنقر الحي). لا تعديل (ملف محمي). | OK |
| app/: كل import ESM + css url() | 68 مرجعًا -> 200 | OK |
| app/content: catalog + activities | 88 مرجعًا؛ صوت القرآن 30/30 و قصة النبتة 22/22 -> 200؛ قيم `icon` هي معرّفات sprite لا ملفات | OK |
| classic<->modern | `[data-act=compare]` في quran_qadr/quran_bayyinah/plant_story يفتح iframe للملف الأصلي الصحيح (عناوين الصفحات تُقرأ من داخل الإطار)، و`[data-act=modern]` يزيل الإطار | OK |
| pageerror في app | 0 | OK |
| **404 وحيد حقيقي** | `math.html` (محمي) يشير إلى `بودكاست_سليم_1_شاب_مصري_حماسي.mp3` (+2 و3) وهي غير موجودة في أي commit في تاريخ المستودع (`git log --all`) | معروف من Phase 10؛ خارج نطاق التعديل (ملف محمي + منع إضافة MP3). موثّق فقط. |

## قرار
لا إصلاحات كود مطلوبة في K1؛ الموقع خالٍ من 404 قابلة للإصلاح ضمن القيود. الـ404 الوحيد في ملف محمي وبأصل لم يُرفع أصلًا للمستودع — يُبلَّغ للمالك.

# Phase 11 — K2: بعثرة نص الكاريوكي (RTL) — إثبات ثم إصلاح
- **ادعاء الـgist:** «inline-block + الأرقام تجعل كروم يعامل الكلمات كإنجليزي». **الفحص:** في Chromium 390px مع `<html dir=rtl>` الترتيب البصري = المنطقي في كل الاستراتيجيات الأربع و7 عينات (أرقام هندية، علامات ترقيم، لاتيني) -> **لا يُعاد إنتاج الخلل بهذا السبب وحده**.
- **التجربة الحاسمة:** فرض `direction:ltr` على الحاوية `.explain-sheet` -> ظهرت البعثرة بالضبط كما لاحظها المستخدم (`٣ فيه واحد كل كراتين عندك`). إذًا السبب الجذري: الـsheet تُلحق بـ`<body>` وتَرِث الاتجاه؛ أي سياق LTR (متصفح/WebView يتجاهل dir على html، أو إعدادات نظام) يبعثر spans الـinline-block لأنها كلها runs محايدة الاتجاه من منظور الحاوية.
- **الإصلاح الأدنى المُثبت:** `dir="rtl"` على الـsheet و`.k-text`؛ CSS `direction:rtl; unicode-bidi:isolate` على `.k-text` و`.k-sent` و`.kw`؛ كل جملة في `<span class="k-sent">` (block) لسطر مستقل. لم يُستخدم `!important` (غير ضروري بعد الإثبات).
- **الاختبار:** `app/tests/phase11_rtl.py` يقيس getBoundingClientRect لكل `.kw` ويقارن الترتيب البصري بالمنطقي تحت host rtl **و** host ltr مفروض: 18/18 MATCH + الجُمل في صفوف y مختلفة.
