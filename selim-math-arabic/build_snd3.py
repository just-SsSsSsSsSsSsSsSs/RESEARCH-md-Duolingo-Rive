# -*- coding: utf-8 -*-
"""نسخة «بالبلدي» — يأخذ تطبيق ازرع نبتة (بعد حقن صوت الفصحى) ويضيف:
   - شرح مكتوب بالبلدي تحت كل عبارة فصحى
   - زر «👄 افهمني بالبلدي» بكل نشاط
   - زر شرح القصة بالبلدي في شاشة القصة
   - ترحيب بلدي جديد
ويكتب ملفًا جديدًا: تطبيق_ازرع_نبتة_سليم_بالبلدي.html
"""
import os, subprocess, base64, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'تطبيق_ازرع_نبتة_سليم.html')
OUT = os.path.join(HERE, 'تطبيق_ازرع_نبتة_سليم_بالبلدي.html')
SND3 = os.path.join(HERE, 'snd3')

TOKENS = {
 '@B_WELCOME@': 'welcome', '@B_STORY@': 'story',
 '@B_TF1@': 'tf1', '@B_TF2@': 'tf2', '@B_TF3@': 'tf3',
 '@B_COMPLETE@': 'complete', '@B_Q1@': 'q1', '@B_Q2@': 'q2', '@B_Q3@': 'q3',
 '@B_MAP@': 'map',
}

REPLACES = [
# (1) عنوان
("🌱 ازرع نبتة — تقويم الاستماع التفاعلي",
 "🌱 ازرع نبتة — فصحى + شرح بالبلدي 👄"),
("<title>🌱 ازرع نبتة — تقويم تفاعلي لسليم</title>",
 "<title>🌱 ازرع نبتة (فصحى + بلدي) — للسليم</title>"),
# (2) CSS للشرح البلدي
("  .feedback { text-align:center; font-size:20px; font-weight:800; min-height:34px; margin-top:6px; }",
"""  .feedback { text-align:center; font-size:20px; font-weight:800; min-height:34px; margin-top:6px; }
  .balt { text-align:center; font-size:17px; color:#6a4a00; background:#fff6d6; border:2px dashed #e8c860; border-radius:12px; padding:8px 12px; margin:6px 2px; line-height:1.8; }
  .balbtn { flex:1; padding:12px; font-size:16px; font-weight:800; color:#7a4d00; background:#fff6d6; border:3px solid #e8c860; border-radius:14px; cursor:pointer; font-family:inherit; }"""),
# (3) خريطة أصوات البلدي + زر mkBal + نصوص الشرح المكتوبة
("""  var soundOn = true, curAudio = null;""",
"""  var soundOn = true, curAudio = null;

  // ======== الشرح بالبلدي (voice-01) ========
  var SNDX = {
    welcome: '@B_WELCOME@',
    story: '@B_STORY@',
    tf1: '@B_TF1@', tf2: '@B_TF2@', tf3: '@B_TF3@',
    complete: '@B_COMPLETE@',
    q1: '@B_Q1@', q2: '@B_Q2@', q3: '@B_Q3@',
    map: '@B_MAP@'
  };
  var BALTXT = {
    tf1: 'يعني: مريم كانت عايزة تزرع في جنينة البيت.',
    tf2: 'يعني: مريم طلبت من أبوها يشتري لها شوية بذور.',
    tf3: 'يعني: مريم دوّرت في رف الكتب على طريقة الزراعة في البيت.',
    complete: 'يعني: مريم زعلت... عشان مين اللي ما طلّعش وما نبّتش؟',
    q1: 'يعني بنسأل: مريم بتحب إيه كثير؟',
    q2: 'يعني بنسأل: مريم نجحت تزرع من أول مرة؟ وليه؟',
    q3: 'يعني بنسأل: مريم حسّت بإيه لما شافت الوردة؟ وليه؟',
    map: 'يعني: هنملّي خريطة القصة — كل فقاعة بنختار ليها الإجابة الصح من اللي تحت.'
  };
  function mkBal(key){
    var b = document.createElement('button');
    b.className = 'balbtn';
    b.textContent = '👄 افهمني بالبلدي';
    b.onclick = function(){ if(SNDX[key]){ spk(SNDX[key]); } };
    if(!SNDX[key]){ b.classList.add('hidden'); }
    return b;
  }"""),
# (4) ترحيب البلدي في زر البداية
("""    spk(SND.welcome);""",
"""    spk(SNDX.welcome);"""),
# (5) تشغيل شرح الخريطة البلدي تلقائيًا لما نوصل لها
("""    if(st.sound){ spk(SND[st.sound]); }""",
"""    if(st.sound){ spk(SND[st.sound]); }
    else if(st.type === 'map'){ spk(SNDX.map); }"""),
# (6) شرح مكتوب تحت كل عبارة صواب/خطأ
("""    qa.appendChild(qaDiv('qtext', '«'+st.text+'»'));""",
"""    qa.appendChild(qaDiv('qtext', '«'+st.text+'»'));
    if(st.sound && BALTXT[st.sound]){ qa.appendChild(qaDiv('balt', '👄 <b>بالبلدي:</b> '+BALTXT[st.sound])); }"""),
# (7) شرح مكتوب تحت كل سؤال اختيارات
("""    qa.appendChild(qaDiv('qlabel', st.q));""",
"""    qa.appendChild(qaDiv('qlabel', st.q));
    if(st.sound && BALTXT[st.sound]){ qa.appendChild(qaDiv('balt', '👄 <b>بالبلدي:</b> '+BALTXT[st.sound])); }"""),
# (8) شرح مكتوب في الخريطة الذهنية
("""    qa.appendChild(qaDiv('qlabel', 'كمّل الخريطة الذهنية للقصة — اختار الإجابة الصحيحة لكل فراغ 🧠'));""",
"""    qa.appendChild(qaDiv('qlabel', 'كمّل الخريطة الذهنية للقصة — اختار الإجابة الصحيحة لكل فراغ 🧠'));
    qa.appendChild(qaDiv('balt', '👄 <b>بالبلدي:</b> '+BALTXT.map));"""),
# (9) زر البلدي في صواب/خطأ
("""    var hear = mkHear(st.sound); act.appendChild(hear);""",
"""    var hear = mkHear(st.sound); act.appendChild(hear); act.appendChild(mkBal(st.sound));"""),
# (10) زر البلدي بعد زر «اسمع السؤال» (موضعان: اختيارات + شخصي)
("""    act.appendChild(mkHear(st.sound));""",
"""    act.appendChild(mkHear(st.sound)); act.appendChild(mkBal(st.sound));""",
 2),
# (11) زر البلدي في الخريطة الذهنية
("""    var nx = mkNext(); nx.classList.add('hidden'); nx.id = 'mapNext'; act.appendChild(nx);""",
"""    act.appendChild(mkBal('map'));
    var nx = mkNext(); nx.classList.add('hidden'); nx.id = 'mapNext'; act.appendChild(nx);"""),
# (12) زر شرح القصة بالبلدي
("""    <button class="listenbtn" id="btnPlay">🔊 اسمع القصة</button>""",
"""    <button class="listenbtn" id="btnPlay">🔊 اسمع القصة بالفصحى (زي الكتاب)</button>
    <button class="listenbtn" id="btnBalStory" style="background:linear-gradient(180deg,#e8a800,#c07f00);box-shadow:0 4px 0 #7a5200;">👄 اسمع الشرح بالبلدي</button>"""),
("""  el('btnPlay').onclick = function(){ spk(SND.story); };""",
"""  el('btnPlay').onclick = function(){ spk(SND.story); };
  el('btnBalStory').onclick = function(){ spk(SNDX.story); };"""),
]


def ff():
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def enc(name):
    raw = os.path.join(SND3, name + '.mp3')
    if not os.path.isfile(raw):
        sys.exit(f'missing: {raw}')
    out = os.path.join(SND3, '~' + name + '.mp3')
    subprocess.run([ff(), '-y', '-i', raw, '-ar', '22050', '-ac', '1', '-b:a', '24k', out],
                   check=True, capture_output=True)
    with open(out, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode()
    os.remove(out)
    return 'data:audio/mp3;base64,' + b64


html = open(SRC, encoding='utf-8').read()
for item in REPLACES:
    old, new = item[0], item[1]
    want = item[2] if len(item) > 2 else 1
    n = html.count(old)
    if n != want:
        sys.exit(f'anchor mismatch (want {want}, got {n}): {old[:60]}...')
    html = html.replace(old, new)
print('baladi patches applied ✓')

for tok, name in TOKENS.items():
    if html.count(tok) < 1:
        sys.exit(f'token missing: {tok}')
    html = html.replace(tok, enc(name))
    print(f'  injected {tok} ← {name}.mp3')
assert '@B_' not in html
assert '@A_' not in html
open(OUT, 'w', encoding='utf-8').write(html)
print(f'FINAL: {OUT} ({os.path.getsize(OUT)/1024:.0f} KB)')
