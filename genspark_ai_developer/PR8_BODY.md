## Phase 10 — PR #8: «يعني إيه يا بابا؟» + سارينة الإنجاز + تحليل السلوك (من gist RO4_.md)

المصدر: https://gist.github.com/pijsal1-tech/7c51347c47d953b36618577cacb5baa2 — المهمة 0 (Audit) + 3 ميزات. كل شيء على الجهاز (بلا backend)، صوت أولًا، عامية مصرية، **لا قيم hard-coded** (كل إعداد من لوحة الأب ويسري فورًا)، الأصول المحمية لم تُلمس.

### المهمة 0 — Audit
- `genspark_ai_developer/AUDIT_REPORT.md`: خريطة الريبو، الـstack الفعلي، الـdata model (كيان «مجموعة تبدأ وتخلص» = `Session` → `activity:complete`)، لوحة الأب الحالية، الموجود صوت/تتبع، ديون تقنية، أمان/خصوصية، قرارات تقنية مع البدائل، الافتراضات.

### الميزة 1 — «يعني إيه يا بابا؟» (Ask-For-Explanation)
- `engines/speech.js`: Web Speech TTS (ar-EG) مع **تظليل كلمة-كلمة (karaoke)** عبر `onboundary` + fallback زمني (يعمل حتى بلا صوت).
- `engines/explain.js`: شروح حتمية بالعامية من `q.meta` لكل أنواع الأسئلة المولَّدة — 4 أساليب: **اقرأهالك / حدوتة / من حياتك / خطوة خطوة** (أسئلة صغيرة تفاعلية؛ **الإجابة النهائية تظهر فقط في آخر خطوة**). «لسه مش فاهم» = أسلوب مختلف فعلًا (دورة بلا تكرار، تبدأ بالأنفع للطفل). + `parentScript()` سكريبت للأب.
- `ui/explainSheet.js`: زر كبير تحت كل سؤال (play / phaseRunner / story) → bottom sheet بخط كبير، صوت تلقائي، «اسمع تاني»، «لسه مش فاهم»، «هجرّب أحلّ». كل طلب يُسجَّل في telemetry.

### الميزة 2 — سارينة الإنجاز
- `engines/celebration.js`: 4 أصوات **مُولَّدة بـWeb Audio** (بلا ملفات، بلا حقوق): `police_siren_eg` (two-tone سويب مصري) / `school_bell` / `applause` / `victory_tune`. Loop حتى المدة + fade-out + **حد أقصى للصوت** لحماية السمع + تتوقف عند الخروج من الشاشة.
- إطلاق مرة واحدة عند `activity:complete` بشرط (افتراضي) **100٪** — أو «مجرد الإكمال» أو «≥ X٪» حسب الأب. تنبيه الأب: صوت/إشعار/الاثنين. أوقات هادئة.
- `ui/views/parentSettings.js`: تشغيل/إيقاف، نوع الصوت، **المدة بالثانية (5–120، افتراضي 30)**، مستوى الصوت، الشرط، تنبيه الأب، أوقات هادئة، «جرّب الصوت»، إذن الإشعارات + إعدادات الشرح + خصوصية (حجم الأحداث/مسح).

### الميزة 3 — تحليل السلوك ونقاط الضعف
- `engines/telemetry.js` + `Session`: أحداث `question_shown / question_attempted{skill, time_ms, attempts, wrong_value, expected, pos, hour} / explanation_requested / explanation_result / stage_completed / session_quit` في `profile.events[]` (سقف 3000، على الجهاز فقط). كل مولّد يحمل `skill` دقيقة و`meta`.
- `engines/insights.js` (rule-based شفاف): خريطة إتقان لكل مهارة (نسبة/اتجاه/ثقة)، **أنماط الخطأ** (خانة مجاورة في الجدول، جمع بدل ضرب، عكس أرقام، تخمين)، مؤشرات السلوك (اندفاعي، مثابرة، تعب، إحباط، أنفع أسلوب شرح، أفضل وقت)، توصيات للبيت، **أثر قبل/بعد**.
- الفعل: `targeted_practice` نشاط افتراضي على الرئيسية لأضعف 2–3 مهارات (يبدأ أسهل، بلا قلوب)؛ **تأخير قبول الإجابة** للاندفاعي؛ **كارت راحة** عند التعب.
- `ui/views/parentInsights.js`: أضعف 3 + ليه + إيه اللي بيتعمل، شخصيته في التعلّم، توصيات، الأثر، أسئلة اتعثّر فيها → **«إزاي أشرحها لابني؟»** (سكريبت بالحرف). الطفل لا يرى أي تصنيف.

### الاختبارات (Range server `:8090`)
| suite | النتيجة |
|---|---|
| emoji_audit / svg_leak / layering / cachebust | PASS |
| e2e / math_random / viewports / navoverlap | PASS |
| plant_story / quran_reader | PASS |
| **phase10** (زر الشرح، karaoke، أسلوب مختلف، خطوات حتى الإجابة، أحداث) | PASS |
| **phase10_celebration** (إعدادات الأب تُحفظ، 100٪ → الصوت المختار بالمدة المختارة + تنبيه الأب، يتوقف عند الخروج) | PASS |
| **phase10_insights** (telemetry → أضعف مهارة + نمط الخطأ + توصيات + سكريبت الأب + تدريب مخصص على جدول ٣ فقط + delay للاندفاعي) | PASS |

### المحميات (sha256 prefix بلا تغيير)
`plant.html` fb197ed22c2fca54 · `albayyinah.html` aac6bafbec577baa · `math.html` 694859aac12c7222 · `quran-alqadr/index.html` 52758e3f208999c8

Commit واحد مضغوط فوق `main @ c5cd0d3`. نقطة الاستئناف: `genspark_ai_developer/PROGRESS.md`.
