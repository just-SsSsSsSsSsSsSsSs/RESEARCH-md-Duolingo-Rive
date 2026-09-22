/**
 * ============================================
 * Phase 4: Adaptive Learning & AI
 * ============================================
 */

// ===== ADAPTIVE LEARNING SYSTEM =====
const AdaptiveLearning = {
  userProfile: null,
  
  init() {
    this.loadProfile();
    this.analyzePerformance();
  },

  loadProfile() {
    this.userProfile = JSON.parse(localStorage.getItem('userProfile') || 'null');
    
    if (!this.userProfile) {
      this.userProfile = {
        id: 'user_1',
        strengths: [],
        weaknesses: [],
        learningStyle: 'visual', // visual, auditory, kinesthetic
        pace: 'normal', // slow, normal, fast
        preferredSubjects: [],
        completedTopics: [],
        performanceHistory: [],
        recommendations: []
      };
      this.saveProfile();
    }
  },

  saveProfile() {
    localStorage.setItem('userProfile', JSON.stringify(this.userProfile));
  },

  trackPerformance(topic, score, timeSpent) {
    const entry = {
      topic: topic,
      score: score,
      timeSpent: timeSpent,
      timestamp: new Date().toISOString()
    };
    
    this.userProfile.performanceHistory.push(entry);
    this.analyzePerformance();
    this.generateRecommendations();
    this.saveProfile();
  },

  analyzePerformance() {
    const history = this.userProfile.performanceHistory;
    if (history.length < 3) return;

    // Group by topic
    const topicScores = {};
    history.forEach(entry => {
      if (!topicScores[entry.topic]) {
        topicScores[entry.topic] = [];
      }
      topicScores[entry.topic].push(entry.score);
    });

    // Calculate averages
    const averages = {};
    Object.keys(topicScores).forEach(topic => {
      const scores = topicScores[topic];
      averages[topic] = scores.reduce((a, b) => a + b, 0) / scores.length;
    });

    // Identify strengths and weaknesses
    this.userProfile.strengths = Object.keys(averages).filter(t => averages[t] >= 80);
    this.userProfile.weaknesses = Object.keys(averages).filter(t => averages[t] < 60);

    // Determine pace
    const avgTime = history.reduce((a, b) => a + b.timeSpent, 0) / history.length;
    this.userProfile.pace = avgTime < 5 ? 'fast' : avgTime > 15 ? 'slow' : 'normal';
  },

  generateRecommendations() {
    const recommendations = [];
    
    // Based on weaknesses
    this.userProfile.weaknesses.forEach(topic => {
      recommendations.push({
        type: 'practice',
        topic: topic,
        message: `تحتاج مزيد من التدريب في ${topic}`,
        priority: 'high'
      });
    });

    // Based on learning style
    if (this.userProfile.learningStyle === 'visual') {
      recommendations.push({
        type: 'content',
        message: 'استخدم الفيديوهات والرسوم التوضيحية',
        priority: 'medium'
      });
    }

    // Based on pace
    if (this.userProfile.pace === 'slow') {
      recommendations.push({
        type: 'pace',
        message: 'خذ وقتاً أكبر في كل درس',
        priority: 'low'
      });
    }

    this.userProfile.recommendations = recommendations;
  },

  getDifficultyLevel(topic) {
    const history = this.userProfile.performanceHistory
      .filter(e => e.topic === topic)
      .slice(-5);
    
    if (history.length === 0) return 'medium';
    
    const avgScore = history.reduce((a, b) => a + b.score, 0) / history.length;
    
    if (avgScore >= 90) return 'hard';
    if (avgScore >= 70) return 'medium';
    return 'easy';
  },

  getNextTopic() {
    const allTopics = ['quran', 'math', 'arabic', 'podcast'];
    const completed = this.userProfile.completedTopics;
    
    // Find topic with lowest score
    const topicScores = {};
    allTopics.forEach(topic => {
      const history = this.userProfile.performanceHistory
        .filter(e => e.topic === topic);
      
      if (history.length === 0) {
        topicScores[topic] = 50; // Default
      } else {
        topicScores[topic] = history.reduce((a, b) => a + b.score, 0) / history.length;
      }
    });

    // Return topic with lowest score
    return Object.keys(topicScores).reduce((a, b) => 
      topicScores[a] < topicScores[b] ? a : b
    );
  },

  updateUI() {
    const container = $('#adaptiveRecommendations');
    if (!container) return;

    const recommendations = this.userProfile.recommendations;
    
    if (recommendations.length === 0) {
      container.innerHTML = '<p class="no-recommendations">لا توجد توصيات حالياً</p>';
      return;
    }

    container.innerHTML = recommendations.map(rec => `
      <div class="recommendation-card ${rec.priority}">
        <div class="recommendation-icon">
          ${rec.type === 'practice' ? '📝' : rec.type === 'content' ? '📚' : '⏱️'}
        </div>
        <div class="recommendation-text">${rec.message}</div>
      </div>
    `).join('');
  }
};

// ===== QUIZ SYSTEM =====
const QuizSystem = {
  currentQuiz: null,
  
  quizzes: {
    quran: [
      {
        id: 'quran_1',
        title: 'اختبار سورة القدر',
        questions: [
          { q: 'ما هي سورة القدر؟', options: ['سورة مكية', 'سورة مدنية', 'سورة مختلطة'], correct: 0 },
          { q: 'كم عدد آيات سورة القدر؟', options: ['3 آيات', '5 آيات', '7 آيات'], correct: 1 },
          { q: 'ما فضيلة ليلة القدر؟', options: ['ألف شهر', 'مائة شهر', 'عشرة أشهر'], correct: 0 }
        ]
      }
    ],
    math: [
      {
        id: 'math_1',
        title: 'اختبار جدول الضرب',
        questions: [
          { q: '3 × 4 = ?', options: ['10', '12', '14'], correct: 1 },
          { q: '5 × 6 = ?', options: ['25', '30', '35'], correct: 1 },
          { q: '7 × 8 = ?', options: ['54', '56', '58'], correct: 1 }
        ]
      }
    ],
    arabic: [
      {
        id: 'arabic_1',
        title: 'اختبار اللغة العربية',
        questions: [
          { q: 'ما هو جمع "كتاب"?', options: ['كتابات', 'كتب', 'كتابون'], correct: 1 },
          { q: 'ما هو مضاد "كبير"?', options: ['صغير', 'ضخم', 'طويل'], correct: 0 }
        ]
      }
    ]
  },

  startQuiz(topic) {
    const quiz = this.quizzes[topic]?.[0];
    if (!quiz) return;

    this.currentQuiz = {
      ...quiz,
      currentQuestion: 0,
      score: 0,
      answers: []
    };

    this.showQuestion();
  },

  showQuestion() {
    const quiz = this.currentQuiz;
    if (!quiz) return;

    const question = quiz.questions[quiz.currentQuestion];
    const container = $('#quizContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="quiz-card">
        <div class="quiz-header">
          <h3>${quiz.title}</h3>
          <span class="quiz-progress">${quiz.currentQuestion + 1}/${quiz.questions.length}</span>
        </div>
        <div class="quiz-question">
          <p>${question.q}</p>
        </div>
        <div class="quiz-options">
          ${question.options.map((opt, i) => `
            <button class="quiz-option" onclick="QuizSystem.answer(${i})">
              ${opt}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  },

  answer(index) {
    const quiz = this.currentQuiz;
    if (!quiz) return;

    const question = quiz.questions[quiz.currentQuestion];
    const isCorrect = index === question.correct;
    
    quiz.answers.push({ question: quiz.currentQuestion, answer: index, correct: isCorrect });
    
    if (isCorrect) {
      quiz.score++;
      SoundManager.play('success');
      Toast.show('إجابة صحيحة! ✅', 'success');
    } else {
      HeartsSystem.loseHeart();
      Toast.show('إجابة خاطئة ❌', 'error');
    }

    // Move to next question
    quiz.currentQuestion++;
    
    if (quiz.currentQuestion < quiz.questions.length) {
      setTimeout(() => this.showQuestion(), 1000);
    } else {
      setTimeout(() => this.showResults(), 1000);
    }
  },

  showResults() {
    const quiz = this.currentQuiz;
    if (!quiz) return;

    const percentage = Math.round((quiz.score / quiz.questions.length) * 100);
    const container = $('#quizContainer');
    if (!container) return;

    // Track performance
    AdaptiveLearning.trackPerformance(quiz.id, percentage, 5);

    // Award XP
    let xpEarned = quiz.score * 10;
    if (percentage === 100) {
      xpEarned += 25; // Perfect score bonus
      SoundManager.play('levelup');
    }
    XPSystem.addXP(xpEarned, `اختبار: ${quiz.title}`);

    container.innerHTML = `
      <div class="quiz-results">
        <div class="results-icon">${percentage >= 80 ? '🎉' : percentage >= 50 ? '👍' : '📚'}</div>
        <h3>النتيجة: ${percentage}%</h3>
        <p>${quiz.score} من ${quiz.questions.length} إجابات صحيحة</p>
        <div class="results-xp">+${xpEarned} XP</div>
        <div class="results-actions">
          <button class="btn btn-primary" onclick="QuizSystem.startQuiz('${quiz.id.split('_')[0]}')">
            إعادة المحاولة
          </button>
          <button class="btn btn-secondary" onclick="document.getElementById('quizContainer').innerHTML = ''">
            العودة
          </button>
        </div>
      </div>
    `;
  }
};

// ===== CERTIFICATES SYSTEM =====
const CertificatesSystem = {
  certificates: [],
  
  init() {
    this.loadCertificates();
    this.checkForNewCertificates();
  },

  loadCertificates() {
    this.certificates = JSON.parse(localStorage.getItem('certificates') || '[]');
  },

  saveCertificates() {
    localStorage.setItem('certificates', JSON.stringify(this.certificates));
  },

  checkForNewCertificates() {
    // Check for level-based certificates
    const levelCertificates = [
      { level: 5, name: 'شهادة المستوى الخامس', description: 'أكمل 5 مستويات' },
      { level: 10, name: 'شهادة المستوى العاشر', description: 'أكمل 10 مستويات' },
    ];

    levelCertificates.forEach(cert => {
      if (AppState.level >= cert.level && !this.certificates.find(c => c.id === `level_${cert.level}`)) {
        this.awardCertificate({
          id: `level_${cert.level}`,
          ...cert,
          date: new Date().toISOString(),
          type: 'level'
        });
      }
    });

    // Check for streak-based certificates
    const streakCertificates = [
      { streak: 7, name: 'شهادة الأسبوع', description: '7 أيام متتالية' },
      { streak: 30, name: 'شهادة الشهر', description: '30 يوم متتالية' },
    ];

    streakCertificates.forEach(cert => {
      if (AppState.streak >= cert.streak && !this.certificates.find(c => c.id === `streak_${cert.streak}`)) {
        this.awardCertificate({
          id: `streak_${cert.streak}`,
          ...cert,
          date: new Date().toISOString(),
          type: 'streak'
        });
      }
    });
  },

  awardCertificate(certificate) {
    this.certificates.push(certificate);
    this.saveCertificates();
    
    Toast.show(`🎓 شهادة جديدة: ${certificate.name}!`, 'success');
    SoundManager.play('badge');
    XPSystem.addXP(100, `شهادة: ${certificate.name}`);
  },

  generateCertificateHTML(cert) {
    return `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>${cert.name}</title>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Tajawal', sans-serif;
            margin: 0;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .certificate {
            background: white;
            padding: 60px;
            border-radius: 20px;
            text-align: center;
            max-width: 800px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            position: relative;
            overflow: hidden;
          }
          .certificate::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 10px;
            background: linear-gradient(90deg, #f59e0b, #6366f1, #10b981, #8b5cf6);
          }
          .logo {
            font-size: 48px;
            margin-bottom: 20px;
          }
          h1 {
            font-size: 36px;
            font-weight: 900;
            color: #1e293b;
            margin-bottom: 10px;
          }
          h2 {
            font-size: 24px;
            font-weight: 700;
            color: #6366f1;
            margin-bottom: 30px;
          }
          .name {
            font-size: 48px;
            font-weight: 900;
            color: #0f172a;
            margin: 30px 0;
            border-bottom: 3px solid #6366f1;
            display: inline-block;
            padding-bottom: 10px;
          }
          .description {
            font-size: 18px;
            color: #64748b;
            margin-bottom: 40px;
          }
          .date {
            font-size: 14px;
            color: #94a3b8;
          }
          .badge {
            display: inline-block;
            background: linear-gradient(135deg, #f59e0b, #f97316);
            color: white;
            padding: 10px 30px;
            border-radius: 50px;
            font-weight: 700;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="logo">🏠</div>
          <h1>بوابة أبطال البيت</h1>
          <h2>${cert.name}</h2>
          <div class="name">${AppState.user?.name || 'الطالب المجتهد'}</div>
          <p class="description">${cert.description}</p>
          <div class="badge">🎓 شهادة إنجاز</div>
          <p class="date">تاريخ الإصدار: ${new Date(cert.date).toLocaleDateString('ar-EG')}</p>
        </div>
      </body>
      </html>
    `;
  },

  downloadCertificate(certId) {
    const cert = this.certificates.find(c => c.id === certId);
    if (!cert) return;

    const html = this.generateCertificateHTML(cert);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate_${cert.id}.html`;
    a.click();
    URL.revokeObjectURL(url);
    
    Toast.show('تم تحميل الشهادة!', 'success');
  },

  updateUI() {
    const container = $('#certificatesDisplay');
    if (!container) return;

    if (this.certificates.length === 0) {
      container.innerHTML = '<p class="no-certificates">لم تحصل على أي شهادات بعد</p>';
      return;
    }

    container.innerHTML = this.certificates.map(cert => `
      <div class="certificate-card">
        <div class="certificate-icon">🎓</div>
        <div class="certificate-info">
          <h4>${cert.name}</h4>
          <p>${cert.description}</p>
          <span class="certificate-date">${new Date(cert.date).toLocaleDateString('ar-EG')}</span>
        </div>
        <button class="btn btn-sm btn-secondary" onclick="CertificatesSystem.downloadCertificate('${cert.id}')">
          <i class="ri-download-line"></i>
        </button>
      </div>
    `).join('');
  }
};

// Initialize Phase 4
document.addEventListener('DOMContentLoaded', () => {
  AdaptiveLearning.init();
  CertificatesSystem.init();
});
