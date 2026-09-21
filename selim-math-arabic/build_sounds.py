# -*- coding: utf-8 -*-
"""دمج الصوت التفاعلي في لعبة سر التقسيم السحري.
- يقرأ النسخة الأصلية
- يطبّق تعديلات JS (محرك صوت + ربط الأحداث + زر كتم)
- يعيد ترميز المقاطع mp3 (24kbps mono) ويحقنها base64 مكان التوكنات
- يكتب النسخة النهائية بالصوت
"""
import os, subprocess, base64, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'تطبيق_سر_التقسيم_السحري_سليم.html')
OUT = os.path.join(HERE, 'تطبيق_سر_التقسيم_السحري_سليم_بالصوت.html')
SND_DIR = os.path.join(HERE, 'snd')

# ======== نصوص المقاطع (مرجع — الصوت متولّد مسبقًا بصوت voice-01) ========
TEXTS = {
 'welcome': "أهلًا أهلًا يا بطل! أنا القطة الشقية، صاحبتك من كتاب الرياضيات! يلا بينا نلعب بسر التقسيم السحري: نقسّم الأرقام الكبيرة، نضرب كل حتة، ونجمّع... ونلمّ النجوم! مستعد يا سليم؟ يلا بينا!",
 'pick': "مسألة جديدة يا نجم! بص على الرقمين كويس، واختار الفِكَّة اللي تعجبك... التلاتة صح، بس دايمًا في واحدة أسهل من خواتها!",
 'fill': "اختيار موفق! دلوقتي اكتب ناتج كل عملية في خانتها، وبعدين اجمعهم في المجموع الكبير تحت... ولو خلّصت، اضغط اتأكد!",
 'complete': "لحظة كده يا شاطر! لسه في خانات فاضية فوق... كمّل الخانات التلاتة الأول، وبعدين اضغط اتأكد!",
 'praise1': "برافووو عليك يا وحش! إجابة صح مية المية! نجومك بتزيد يا سليم يا معلم!",
 'praise2': "عااااش يا سليم! عبقري التقسيم السحري! كمّل بنفس الشطارة دي!",
 'gentle1': "قريب أووي يا نجم! دي مش غلطة، دي محاولة أولى... بص على الخانات تاني بهدوء، وجِرّب مرة كمان!",
 'gentle2': "ولا يهمك يا بطل! الغلط أول الصح... خد نفَس عميق، وفكّر في جدول الضرب تاني!",
 'hint': "جدو حسن بيهمس لك: دوّر على الفِكَّة اللي فيها خمسة أو عشرة... دي أسهل الجداول على قلبك!",
 'finish': "خلّصت كل المسائل يا بطل؟ انت رسميًا تاجر بلح محترف زي جدو حسن! يا ماما، يا بابا... افخروا بسليم: شاطر، وذكي، ومجتهد!",
}

TOKEN_OF = {
 'welcome': '@S_WELCOME@', 'pick': '@S_PICK@', 'fill': '@S_FILL@',
 'complete': '@S_COMPLETE@', 'hint': '@S_HINT@', 'finish': '@S_FINISH@',
 'praise1': '@S_PRAISE1@', 'praise2': '@S_PRAISE2@',
 'gentle1': '@S_GENTLE1@', 'gentle2': '@S_GENTLE2@',
}

REPLACES = [
# (1) زر كتم الصوت في الشريط العلوي
("""<div class="topbar">🧺 سر التقسيم السحري — مع سليم وجدو حسن</div>""",
"""<div class="topbar">🧺 سر التقسيم السحري — مع سليم وجدو حسن
    <button id="btnSound" style="display:inline-block;margin-top:6px;padding:5px 16px;font-size:15px;font-weight:800;border:2px solid #b8860b;border-radius:20px;background:#fff8dc;color:#5a3c00;cursor:pointer;font-family:inherit;">🔊 الصوت شغّال</button>
  </div>"""),
# (2) محرك الصوت + خريطة المقاطع
("""  var statedDone = false;
""",
"""  var statedDone = false;

  // ======== الصوت التفاعلي (voice-01 — مدمج في الملف) ========
  var SND = {
    welcome: '@S_WELCOME@',
    pick: '@S_PICK@',
    fillTips: '@S_FILL@',
    complete: '@S_COMPLETE@',
    hint: '@S_HINT@',
    finish: '@S_FINISH@',
    praise: ['@S_PRAISE1@', '@S_PRAISE2@'],
    gentle: ['@S_GENTLE1@', '@S_GENTLE2@']
  };
  var soundOn = true, curAudio = null;
  function spk(src){
    if(!soundOn || !src){ return; }
    try{
      if(curAudio){ try{ curAudio.pause(); curAudio.currentTime = 0; }catch(e2){} }
      curAudio = new Audio(src);
      var pr = curAudio.play();
      if(pr && pr.catch){ pr.catch(function(){}); }
    }catch(e){}
  }
  function spkAny(list){ spk(list[Math.floor(Math.random()*list.length)]); }
"""),
# (3) صوت «مسألة جديدة» مع كل سؤال بعد الأول
("""      chips.appendChild(b);
    });
  }
""",
"""      chips.appendChild(b);
    });
    if(qi > 0){ spk(SND.pick); }
  }
"""),
# (4) صوت تعبئة الخانات بعد اختيار الفِكّة
("""    el('numpad').classList.remove('hidden');
  }

  function boxHTML(k){""",
"""    el('numpad').classList.remove('hidden');
    spk(SND.fillTips);
  }

  function boxHTML(k){"""),
# (5) تنبيه إكمال الخانات
("""      el('feedback').textContent = 'كمّل الخانات التلاتة الأول يا نجم ✍️';
      el('feedback').className = 'feedback try';
      return;""",
"""      el('feedback').textContent = 'كمّل الخانات التلاتة الأول يا نجم ✍️';
      el('feedback').className = 'feedback try';
      spk(SND.complete);
      return;"""),
# (6) مديح عند الإصابة
("""      el('feedback').className = 'feedback good';
      chime(true); confetti();""",
"""      el('feedback').className = 'feedback good';
      chime(true); confetti();
      spkAny(SND.praise);"""),
# (7) مواساة عند المحاولة
("""      el('feedback').textContent = GENTLE[Math.floor(Math.random()*GENTLE.length)];
      el('feedback').className = 'feedback try';""",
"""      el('feedback').textContent = GENTLE[Math.floor(Math.random()*GENTLE.length)];
      el('feedback').className = 'feedback try';
      spkAny(SND.gentle);"""),
# (8) صوت تلميح جدو
("""  function showHint(){
    el('hintbox').textContent = '🧔🏻 جدو حسن بيقولك: '+cur.hint;
    el('hintbox').classList.remove('hidden');
  }""",
"""  function showHint(){
    el('hintbox').textContent = '🧔🏻 جدو حسن بيقولك: '+cur.hint;
    el('hintbox').classList.remove('hidden');
    spk(SND.hint);
  }"""),
# (9) احتفال النهاية
("""    el('endMsg').innerHTML = msg;
    chime(true); confetti();
    el('progFill').style.width = '100%';""",
"""    el('endMsg').innerHTML = msg;
    chime(true); confetti();
    spk(SND.finish);
    el('progFill').style.width = '100%';"""),
# (10) ترحيب صوتي مع زر البداية
("""  el('btnStart').onclick = function(){ el('scrHome').classList.add('hidden'); el('scrQuiz').classList.remove('hidden'); render(); };""",
"""  el('btnStart').onclick = function(){ el('scrHome').classList.add('hidden'); el('scrQuiz').classList.remove('hidden'); render(); spk(SND.welcome); };"""),
# (11) ترحيب صوتي مع إعادة اللعب
("""  el('btnAgain').onclick = function(){ qi=0; stars=0; tries=0; el('starCount').textContent='٠'; el('scrEnd').classList.add('hidden'); el('scrQuiz').classList.remove('hidden'); render(); };""",
"""  el('btnAgain').onclick = function(){ qi=0; stars=0; tries=0; el('starCount').textContent='٠'; el('scrEnd').classList.add('hidden'); el('scrQuiz').classList.remove('hidden'); render(); spk(SND.welcome); };"""),
# (12) ربط زر كتم الصوت
("""  el('btnNext').onclick = next;
""",
"""  el('btnNext').onclick = next;
  el('btnSound').onclick = function(){
    soundOn = !soundOn;
    el('btnSound').textContent = soundOn ? '🔊 الصوت شغّال' : '🔇 الصوت مقفول';
    if(!soundOn && curAudio){ try{ curAudio.pause(); }catch(e){} }
  };
"""),
# (13) تصلية bindBoxes للمتصفحات الأقدم
("""  function bindBoxes(){
    var bs = document.querySelectorAll('.ansbox');
    bs.forEach(function(b){
      b.onclick = function(){
        active = +b.getAttribute('data-k');
        document.querySelectorAll('.ansbox').forEach(function(x){ x.classList.remove('focus'); });
        b.classList.add('focus');
      };
    });
  }""",
"""  function bindBoxes(){
    var bs = document.querySelectorAll('.ansbox');
    for (var i = 0; i < bs.length; i++){
      (function(b){
        b.onclick = function(){
          active = +b.getAttribute('data-k');
          var all = document.querySelectorAll('.ansbox');
          for (var j = 0; j < all.length; j++){ all[j].classList.remove('focus'); }
          b.classList.add('focus');
        };
      })(bs[i]);
    }
  }"""),
# (14) إزالة الوسم المكرر في نهاية الملف
("""</html>

</body>
</html>""",
"""</html>"""),
]


def ff():
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def encode_uri(name):
    raw = os.path.join(SND_DIR, name + '.mp3')
    if not os.path.isfile(raw):
        sys.exit(f'missing clip: {raw}')
    out = os.path.join(SND_DIR, '_' + name + '.mp3')
    subprocess.run([ff(), '-y', '-i', raw, '-ar', '22050', '-ac', '1', '-b:a', '24k', out],
                   check=True, capture_output=True)
    with open(out, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode()
    os.remove(out)
    return 'data:audio/mp3;base64,' + b64, os.path.getsize(raw)


def main():
    html = open(SRC, encoding='utf-8').read()
    for i, (old, new) in enumerate(REPLACES, 1):
        n = html.count(old)
        if n != 1:
            sys.exit(f'replace #{i}: expected 1 match, found {n}')
        html = html.replace(old, new)
    print('JS patches: 14/14 applied ✓')

    total_kb = 0
    for name, token in TOKEN_OF.items():
        uri, raw_sz = encode_uri(name)
        if html.count(token) < 1:
            sys.exit(f'token missing: {token}')
        html = html.replace(token, uri)
        total_kb += raw_sz / 1024
    leftovers = [t for t in TOKEN_OF.values() if t in html]
    assert not leftovers, f'leftover tokens: {leftovers}'

    open(OUT, 'w', encoding='utf-8').write(html)
    print(f'audio raw: {total_kb:.0f} KB re-encoded→b64')
    print(f'FINAL: {OUT} ({os.path.getsize(OUT)/1024:.0f} KB)')


if __name__ == '__main__':
    main()
