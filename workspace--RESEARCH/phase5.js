/**
 * ============================================
 * Phase 5: Multi-language, API, Teacher Portal, Community
 * ============================================
 */

// ===== INTERNATIONALIZATION (i18n) =====
const I18nSystem = {
  currentLocale: localStorage.getItem('locale') || 'ar',
  
  translations: {
    ar: {
      // Navigation
      home: 'الرئيسية',
      quran: 'القرآن',
      math: 'الرياضيات',
      arabic: 'العربي',
      podcast: 'البودكاست',
      
      // Hero
      badge: 'المنصة التعليمية التفاعلية',
      title: 'بوابة أبطال البيت',
      subtitle: 'تطبيقات تفاعلية متكاملة بالصوت والشرح الممتع وتلوين الأحكام.. شغالة في أي مكان ومن أي جهاز',
      
      // Stats
      apps: 'تطبيق تفاعلي',
      surahs: 'سور قرآنية',
      episodes: 'حلقات بودكاست',
      free: 'مجاني ومفتوح',
      
      // Actions
      search: 'ابحث عن تطبيق أو موضوع...',
      startLearning: 'ابدأ التعلم',
      viewStats: 'الإحصائيات',
      share: 'المشاركة',
      download: 'تحميل',
      
      // Gamification
      xp: 'نقاط خبرة',
      level: 'المستوى',
      streak: 'أيام متتالية',
      hearts: 'القلوب',
      badges: 'الشارات',
      achievements: 'الإنجازات',
      certificates: 'الشهادات',
      
      // Sections
      quranTitle: 'مصاحف التجويد والقرآن الكريم',
      quranDesc: 'صوت بنت + الشيخ الحصري + تلوين الأحكام',
      mathTitle: 'معمل الرياضيات والماث',
      mathDesc: 'المنهج الجديد وتفكيك الأعداد',
      arabicTitle: 'اللغة العربية والقصص التفاعلية',
      arabicDesc: 'استماع + تقويم تفاعلي',
      podcastTitle: 'استوديو حلقات بودكاست سليم',
      podcastDesc: 'صوت كرتون نتورك وشبابي حماسي',
      
      // Footer
      footerTitle: 'بوابة أبطال البيت',
      footerDesc: 'سليم، كارما، وكندة — للأطفال العرب في كل مكان',
      madeWith: 'صُمّمت بـ ❤️ للأطفال العرب',
      
      // Messages
      welcome: 'مرحباً بك!',
      levelUp: 'مبروك! لقد تقدمت في المستوى',
      badgeEarned: 'حصلت على شارة جديدة!',
      streakWarning: 'لا تنس streak!',
      offline: 'أنت غير متصل بالإنترنت',
      
      // Quiz
      quiz: 'اختبار',
      correct: 'إجابة صحيحة!',
      wrong: 'إجابة خاطئة',
      score: 'النتيجة',
      retry: 'إعادة المحاولة',
      back: 'العودة'
    },
    
    en: {
      // Navigation
      home: 'Home',
      quran: 'Quran',
      math: 'Math',
      arabic: 'Arabic',
      podcast: 'Podcast',
      
      // Hero
      badge: 'Interactive Educational Platform',
      title: 'Heroes of Home Portal',
      subtitle: 'Interactive apps with voice, fun explanations, and Tajweed coloring.. Works anywhere, on any device',
      
      // Stats
      apps: 'Interactive Apps',
      surahs: 'Quran Surahs',
      episodes: 'Podcast Episodes',
      free: 'Free & Open',
      
      // Actions
      search: 'Search for an app or topic...',
      startLearning: 'Start Learning',
      viewStats: 'Statistics',
      share: 'Share',
      download: 'Download',
      
      // Gamification
      xp: 'Experience Points',
      level: 'Level',
      streak: 'Day Streak',
      hearts: 'Hearts',
      badges: 'Badges',
      achievements: 'Achievements',
      certificates: 'Certificates',
      
      // Sections
      quranTitle: 'Quran & Tajweed Mushafs',
      quranDesc: 'Girl voice + Al-Husary + Tajweed coloring',
      mathTitle: 'Math Laboratory',
      mathDesc: 'New curriculum & number decomposition',
      arabicTitle: 'Arabic Language & Interactive Stories',
      arabicDesc: 'Listening + Interactive assessment',
      podcastTitle: 'Selim Podcast Studio',
      podcastDesc: 'Cartoon Network style & youth voice',
      
      // Footer
      footerTitle: 'Heroes of Home Portal',
      footerDesc: 'Selim, Karma, & Kunda — For Arab kids everywhere',
      madeWith: 'Made with ❤️ for Arab children',
      
      // Messages
      welcome: 'Welcome!',
      levelUp: 'Congratulations! You leveled up!',
      badgeEarned: 'You earned a new badge!',
      streakWarning: "Don't forget your streak!",
      offline: 'You are offline',
      
      // Quiz
      quiz: 'Quiz',
      correct: 'Correct!',
      wrong: 'Wrong',
      score: 'Score',
      retry: 'Retry',
      back: 'Back'
    }
  },

  init() {
    this.applyLocale(this.currentLocale);
    this.updateUI();
  },

  setLocale(locale) {
    this.currentLocale = locale;
    localStorage.setItem('locale', locale);
    this.applyLocale(locale);
    this.updateUI();
    Toast.show(locale === 'ar' ? 'تم تغيير اللغة إلى العربية' : 'Language changed to English');
  },

  applyLocale(locale) {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  },

  t(key) {
    return this.translations[this.currentLocale]?.[key] || key;
  },

  updateUI() {
    const localeBtn = $('#localeToggle');
    if (localeBtn) {
      localeBtn.innerHTML = this.currentLocale === 'ar' ? 'EN' : 'عر';
    }
  }
};

// ===== TEACHER PORTAL =====
const TeacherPortal = {
  classes: [],
  students: [],
  
  init() {
    this.loadData();
    this.setupUI();
  },

  loadData() {
    this.classes = JSON.parse(localStorage.getItem('teacherClasses') || '[]');
    this.students = JSON.parse(localStorage.getItem('teacherStudents') || '[]');
    
    if (this.classes.length === 0) {
      // Demo data
      this.classes = [
        { id: 'class_1', name: 'الصف الرابع - أ', grade: '4', studentsCount: 25 },
        { id: 'class_2', name: 'الصف الرابع - ب', grade: '4', studentsCount: 28 }
      ];
      
      this.students = [
        { id: 's1', name: 'أحمد محمد', classId: 'class_1', xp: 850, level: 6, streak: 12 },
        { id: 's2', name: 'فاطمة علي', classId: 'class_1', xp: 920, level: 7, streak: 15 },
        { id: 's3', name: 'محمد حسن', classId: 'class_1', xp: 650, level: 5, streak: 8 },
        { id: 's4', name: 'نور أحمد', classId: 'class_2', xp: 1100, level: 8, streak: 20 },
        { id: 's5', name: 'سارة خالد', classId: 'class_2', xp: 780, level: 6, streak: 10 }
      ];
      
      this.saveData();
    }
  },

  saveData() {
    localStorage.setItem('teacherClasses', JSON.stringify(this.classes));
    localStorage.setItem('teacherStudents', JSON.stringify(this.students));
  },

  getClassReport(classId) {
    const classStudents = this.students.filter(s => s.classId === classId);
    const cls = this.classes.find(c => c.id === classId);
    
    if (!cls || classStudents.length === 0) return null;

    const avgXP = Math.round(classStudents.reduce((a, b) => a + b.xp, 0) / classStudents.length);
    const avgLevel = Math.round(classStudents.reduce((a, b) => a + b.level, 0) / classStudents.length);
    const avgStreak = Math.round(classStudents.reduce((a, b) => a + b.streak, 0) / classStudents.length);

    return {
      class: cls,
      stats: {
        totalStudents: classStudents.length,
        avgXP: avgXP,
        avgLevel: avgLevel,
        avgStreak: avgStreak,
        topStudent: classStudents.reduce((a, b) => a.xp > b.xp ? a : b)
      },
      students: classStudents.sort((a, b) => b.xp - a.xp)
    };
  },

  exportClassReport(classId) {
    const report = this.getClassReport(classId);
    if (!report) return;

    const reportText = `
تقرير الفصل: ${report.class.name}
═══════════════════════════════════

📊 إحصائيات الفصل:
• عدد الطلاب: ${report.stats.totalStudents}
• متوسط XP: ${report.stats.avgXP}
• متوسط المستوى: ${report.stats.avgLevel}
• متوسط Streak: ${report.stats.avgStreak}

🏆 أفضل طالب: ${report.stats.topStudent.name} (${report.stats.topStudent.xp} XP)

📋 قائمة الطلاب:
${report.students.map((s, i) => `${i + 1}. ${s.name} — XP: ${s.xp} | المستوى: ${s.level} | Streak: ${s.streak}`).join('\n')}

═══════════════════════════════════
تقرير من بوابة أبطال البيت
    `.trim();

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `class_report_${report.class.name}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    Toast.show('تم تحميل تقرير الفصل!', 'success');
  },

  setupUI() {
    const container = $('#teacherDashboard');
    if (!container) return;

    container.innerHTML = `
      <div class="teacher-header">
        <h2>📚 لوحة تحكم المعلم</h2>
        <button class="btn btn-primary" onclick="TeacherPortal.exportClassReport('class_1')">
          <i class="ri-download-line"></i> تصدير التقرير
        </button>
      </div>
      
      <div class="classes-grid">
        ${this.classes.map(cls => {
          const report = this.getClassReport(cls.id);
          return `
            <div class="class-card">
              <div class="class-header">
                <h3>${cls.name}</h3>
                <span class="student-count">${cls.studentsCount} طالب</span>
              </div>
              ${report ? `
                <div class="class-stats">
                  <div class="class-stat">
                    <span class="stat-value">${report.stats.avgXP}</span>
                    <span class="stat-label">متوسط XP</span>
                  </div>
                  <div class="class-stat">
                    <span class="stat-value">${report.stats.avgLevel}</span>
                    <span class="stat-label">المستوى</span>
                  </div>
                </div>
                <div class="class-leaderboard">
                  <h4>🏆 أفضل الطلاب</h4>
                  ${report.students.slice(0, 3).map((s, i) => `
                    <div class="student-row">
                      <span class="rank">${i + 1}</span>
                      <span class="name">${s.name}</span>
                      <span class="xp">${s.xp} XP</span>
                    </div>
                  `).join('')}
                </div>
              ` : '<p>لا توجد بيانات</p>'}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
};

// ===== COMMUNITY SYSTEM =====
const CommunitySystem = {
  posts: [],
  
  init() {
    this.loadPosts();
    this.setupUI();
  },

  loadPosts() {
    this.posts = JSON.parse(localStorage.getItem('communityPosts') || '[]');
    
    if (this.posts.length === 0) {
      // Demo posts
      this.posts = [
        {
          id: 1,
          author: 'سليم',
          avatar: '🦸‍♂️',
          content: 'أكملت سورة القدر اليوم! 🎉 التجويد ممتع جداً!',
          likes: 12,
          comments: 3,
          time: new Date(Date.now() - 3600000).toISOString(),
          topic: 'quran'
        },
        {
          id: 2,
          author: 'كارما',
          avatar: '🌸',
          content: 'تعلمت جدول الضرب ٣ بطريقة ممتعة! 🧮',
          likes: 8,
          comments: 2,
          time: new Date(Date.now() - 7200000).toISOString(),
          topic: 'math'
        },
        {
          id: 3,
          author: 'كندة',
          avatar: '⭐',
          content: 'حلقة بودكاست سليم عن التقسيم السحري رائعة! 🎧',
          likes: 15,
          comments: 5,
          time: new Date(Date.now() - 10800000).toISOString(),
          topic: 'podcast'
        }
      ];
      this.savePosts();
    }
  },

  savePosts() {
    localStorage.setItem('communityPosts', JSON.stringify(this.posts));
  },

  addPost(content, topic) {
    const post = {
      id: Date.now(),
      author: 'طالب مجهول',
      avatar: '👦',
      content: content,
      likes: 0,
      comments: 0,
      time: new Date().toISOString(),
      topic: topic
    };
    
    this.posts.unshift(post);
    this.savePosts();
    this.setupUI();
    Toast.show('تم نشر المشاركة!', 'success');
  },

  likePost(postId) {
    const post = this.posts.find(p => p.id === postId);
    if (post) {
      post.likes++;
      this.savePosts();
      this.setupUI();
    }
  },

  setupUI() {
    const container = $('#communityFeed');
    if (!container) return;

    container.innerHTML = `
      <div class="community-header">
        <h3>👥 مجتمع أبطال البيت</h3>
        <button class="btn btn-primary btn-sm" onclick="CommunitySystem.showNewPostForm()">
          <i class="ri-add-line"></i> مشاركة
        </button>
      </div>
      
      <div class="posts-feed">
        ${this.posts.map(post => `
          <div class="post-card">
            <div class="post-header">
              <div class="post-avatar">${post.avatar}</div>
              <div class="post-meta">
                <span class="post-author">${post.author}</span>
                <span class="post-time">${this.formatTime(post.time)}</span>
              </div>
              <span class="post-topic badge-${post.topic}">${post.topic}</span>
            </div>
            <div class="post-content">${post.content}</div>
            <div class="post-actions">
              <button class="post-action" onclick="CommunitySystem.likePost(${post.id})">
                <i class="ri-heart-line"></i> ${post.likes}
              </button>
              <button class="post-action">
                <i class="ri-chat-3-line"></i> ${post.comments}
              </button>
              <button class="post-action">
                <i class="ri-share-line"></i>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  showNewPostForm() {
    const content = prompt('اكتب مشاركتك:');
    if (content) {
      const topic = prompt('اختر الموضوع (quran/math/arabic/podcast):') || 'general';
      this.addPost(content, topic);
    }
  },

  formatTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'الآن';
    if (diff < 3600000) return `منذ ${Math.floor(diff / 60000)} دقيقة`;
    if (diff < 86400000) return `منذ ${Math.floor(diff / 3600000)} ساعة`;
    return date.toLocaleDateString('ar-EG');
  }
};

// ===== API ENDPOINTS (Mock) =====
const API = {
  baseURL: '/api',
  
  async get(endpoint) {
    // Mock API response
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, data: {} });
      }, 100);
    });
  },

  async post(endpoint, data) {
    // Mock API response
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, data: data });
      }, 100);
    });
  },

  // Progress API
  async saveProgress(userId, progress) {
    return this.post('/progress', { userId, progress });
  },

  async getProgress(userId) {
    return this.get(`/progress/${userId}`);
  },

  // Leaderboard API
  async getLeaderboard(type = 'weekly') {
    return this.get(`/leaderboard/${type}`);
  },

  // User API
  async getUserProfile(userId) {
    return this.get(`/users/${userId}`);
  },

  async updateUserProfile(userId, data) {
    return this.post(`/users/${userId}`, data);
  }
};

// ===== MOBILE OPTIMIZATIONS =====
const MobileOptimizations = {
  init() {
    this.setupTouchHandlers();
    this.setupPullToRefresh();
    this.setupSwipeGestures();
  },

  setupTouchHandlers() {
    // Add touch feedback to interactive elements
    document.querySelectorAll('.card, .btn, .filter-tab').forEach(el => {
      el.addEventListener('touchstart', () => {
        el.style.transform = 'scale(0.98)';
      });
      el.addEventListener('touchend', () => {
        el.style.transform = '';
      });
    });
  },

  setupPullToRefresh() {
    let startY = 0;
    let pulling = false;

    document.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        pulling = true;
      }
    });

    document.addEventListener('touchmove', (e) => {
      if (!pulling) return;
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      
      if (diff > 100) {
        // Trigger refresh
        pulling = false;
        window.location.reload();
      }
    });

    document.addEventListener('touchend', () => {
      pulling = false;
    });
  },

  setupSwipeGestures() {
    let startX = 0;
    const threshold = 100;

    document.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
    });

    document.addEventListener('touchend', (e) => {
      const endX = e.changedTouches[0].clientX;
      const diff = startX - endX;

      if (Math.abs(diff) > threshold) {
        if (diff > 0) {
          // Swipe left - next section
          this.navigateToSection('next');
        } else {
          // Swipe right - previous section
          this.navigateToSection('prev');
        }
      }
    });
  },

  navigateToSection(direction) {
    const sections = ['quran', 'math', 'arabic', 'podcast'];
    const currentSection = AppState.currentFilter;
    const currentIndex = sections.indexOf(currentSection);
    
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % sections.length;
    } else {
      newIndex = (currentIndex - 1 + sections.length) % sections.length;
    }
    
    FilterManager.setFilter(sections[newIndex]);
  }
};

// ===== PERFORMANCE MONITORING =====
const PerformanceMonitor = {
  metrics: {},
  
  init() {
    this.measurePageLoad();
    this.measureInteractions();
  },

  measurePageLoad() {
    window.addEventListener('load', () => {
      const timing = performance.getEntriesByType('navigation')[0];
      
      this.metrics.pageLoad = {
        dns: timing.domainLookupEnd - timing.domainLookupStart,
        tcp: timing.connectEnd - timing.connectStart,
        ttfb: timing.responseStart - timing.requestStart,
        domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
        load: timing.loadEventEnd - timing.navigationStart
      };
      
      console.log('📊 Page Load Metrics:', this.metrics.pageLoad);
    });
  },

  measureInteractions() {
    // Measure click response time
    document.addEventListener('click', (e) => {
      const start = performance.now();
      
      requestAnimationFrame(() => {
        const duration = performance.now() - start;
        if (duration > 100) {
          console.warn(`⚠️ Slow interaction: ${duration.toFixed(2)}ms`);
        }
      });
    });
  }
};

// Initialize Phase 5
document.addEventListener('DOMContentLoaded', () => {
  I18nSystem.init();
  TeacherPortal.init();
  CommunitySystem.init();
  MobileOptimizations.init();
  PerformanceMonitor.init();
});
