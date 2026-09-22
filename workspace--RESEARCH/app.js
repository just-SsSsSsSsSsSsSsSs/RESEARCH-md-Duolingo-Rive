/**
 * ============================================
 * بوابة أبطال البيت — Main Application
 * ============================================
 */

// ===== APP STATE =====
const AppState = {
  user: null,
  theme: localStorage.getItem('theme') || 'light',
  currentFilter: 'all',
  searchQuery: '',
  xp: parseInt(localStorage.getItem('xp') || '0'),
  level: parseInt(localStorage.getItem('level') || '1'),
  streak: parseInt(localStorage.getItem('streak') || '0'),
  hearts: parseInt(localStorage.getItem('hearts') || '5'),
  badges: JSON.parse(localStorage.getItem('badges') || '[]'),
  achievements: JSON.parse(localStorage.getItem('achievements') || '[]'),
  lastVisit: localStorage.getItem('lastVisit') || null,
  soundEnabled: localStorage.getItem('soundEnabled') !== 'false',
};

// ===== DOM ELEMENTS =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== THEME MANAGEMENT =====
const ThemeManager = {
  init() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (AppState.theme === 'dark' || (AppState.theme === 'light' && prefersDark)) {
      this.setTheme('dark');
    }
    this.updateIcon();
  },

  toggle() {
    const newTheme = AppState.theme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
    Toast.show(newTheme === 'dark' ? 'تم تفعيل الوضع الداكن 🌙' : 'تم تفعيل الوضع الفاتح ☀️');
  },

  setTheme(theme) {
    AppState.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    this.updateIcon();
  },

  updateIcon() {
    const icon = $('#themeToggle i');
    if (icon) {
      icon.className = AppState.theme === 'dark' ? 'ri-sun-fill' : 'ri-moon-fill';
    }
  }
};

// ===== XP SYSTEM =====
const XPSystem = {
  // XP values for different activities
  values: {
    lessonComplete: 10,
    quizComplete: 15,
    perfectScore: 25,
    dailyLogin: 5,
    streakBonus: 2,
    badgeEarned: 50,
    achievementEarned: 100,
  },

  // Level thresholds
  levels: [
    { level: 1, xp: 0, title: 'مبتدئ' },
    { level: 2, xp: 100, title: 'متعلم' },
    { level: 3, xp: 250, title: 'متحمس' },
    { level: 4, xp: 500, title: 'مجتهد' },
    { level: 5, xp: 1000, title: 'خبير' },
    { level: 6, xp: 2000, title: 'محترف' },
    { level: 7, xp: 3500, title: 'ماهر' },
    { level: 8, xp: 5000, title: 'بطل' },
    { level: 9, xp: 7500, title: 'أسطورة' },
    { level: 10, xp: 10000, title: 'معلم' },
  ],

  addXP(amount, reason) {
    AppState.xp += amount;
    localStorage.setItem('xp', AppState.xp);
    
    // Check for level up
    const newLevel = this.calculateLevel();
    if (newLevel > AppState.level) {
      AppState.level = newLevel;
      localStorage.setItem('level', AppState.level);
      this.onLevelUp(newLevel);
    }
    
    this.updateUI();
    SoundManager.play('xp');
    Toast.show(`+${amount} XP ${reason ? `— ${reason}` : ''}`);
  },

  calculateLevel() {
    for (let i = this.levels.length - 1; i >= 0; i--) {
      if (AppState.xp >= this.levels[i].xp) {
        return this.levels[i].level;
      }
    }
    return 1;
  },

  getCurrentLevelInfo() {
    const currentLevel = this.levels.find(l => l.level === AppState.level);
    const nextLevel = this.levels.find(l => l.level === AppState.level + 1);
    
    if (!nextLevel) {
      return { ...currentLevel, progress: 100, nextXP: null };
    }
    
    const xpForLevel = AppState.xp - currentLevel.xp;
    const xpNeeded = nextLevel.xp - currentLevel.xp;
    const progress = Math.round((xpForLevel / xpNeeded) * 100);
    
    return {
      ...currentLevel,
      progress,
      nextXP: nextLevel.xp,
      xpForLevel,
      xpNeeded,
    };
  },

  onLevelUp(newLevel) {
    const levelInfo = this.levels.find(l => l.level === newLevel);
    Toast.show(`🎉 مبروك! وصلت المستوى ${newLevel} — ${levelInfo.title}`, 'success');
    SoundManager.play('levelup');
    BadgesSystem.checkBadges();
  },

  updateUI() {
    const levelInfo = this.getCurrentLevelInfo();
    
    // Update XP display
    const xpEl = $('#xpDisplay');
    if (xpEl) xpEl.textContent = AppState.xp;
    
    // Update level display
    const levelEl = $('#levelDisplay');
    if (levelEl) levelEl.textContent = `المستوى ${AppState.level}`;
    
    // Update level title
    const titleEl = $('#levelTitle');
    if (titleEl) titleEl.textContent = levelInfo.title;
    
    // Update progress bar
    const progressEl = $('#levelProgress');
    if (progressEl) progressEl.style.width = `${levelInfo.progress}%`;
    
    // Update progress text
    const progressTextEl = $('#progressText');
    if (progressTextEl) {
      if (levelInfo.nextXP) {
        progressTextEl.textContent = `${levelInfo.xpForLevel} / ${levelInfo.xpNeeded} XP`;
      } else {
        progressTextEl.textContent = 'المستوى الأقصى!';
      }
    }
  }
};

// ===== STREAK SYSTEM =====
const StreakSystem = {
  init() {
    this.checkStreak();
    this.updateUI();
  },

  checkStreak() {
    const today = new Date().toDateString();
    const lastVisit = AppState.lastVisit;
    
    if (!lastVisit) {
      // First visit
      AppState.streak = 1;
    } else if (lastVisit === today) {
      // Already visited today
      return;
    } else {
      const lastDate = new Date(lastVisit);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        // Consecutive day
        AppState.streak++;
        XPSystem.addXP(XPSystem.values.dailyLogin, 'دخول يومي');
        if (AppState.streak > 1) {
          XPSystem.addXP(AppState.streak * XPSystem.values.streakBonus, 'مكافأة streak');
        }
      } else if (diffDays > 1) {
        // Streak broken
        AppState.streak = 1;
        Toast.show('بدأت streak جديدة! 🔥');
      }
    }
    
    AppState.lastVisit = today;
    localStorage.setItem('streak', AppState.streak);
    localStorage.setItem('lastVisit', AppState.lastVisit);
  },

  updateUI() {
    const streakEl = $('#streakDisplay');
    if (streakEl) streakEl.textContent = AppState.streak;
    
    const streakIconEl = $('#streakIcon');
    if (streakIconEl) {
      if (AppState.streak >= 7) {
        streakIconEl.className = 'ri-fire-fill';
        streakIconEl.style.color = '#ef4444';
      } else if (AppState.streak >= 3) {
        streakIconEl.className = 'ri-fire-fill';
        streakIconEl.style.color = '#f59e0b';
      } else {
        streakIconEl.className = 'ri-fire-line';
        streakIconEl.style.color = '#94a3b8';
      }
    }
  }
};

// ===== HEARTS SYSTEM =====
const HeartsSystem = {
  maxHearts: 5,
  refillTime: 30 * 60 * 1000, // 30 minutes

  init() {
    this.checkRefill();
    this.updateUI();
  },

  checkRefill() {
    const lastRefill = localStorage.getItem('lastHeartRefill');
    if (lastRefill && AppState.hearts < this.maxHearts) {
      const elapsed = Date.now() - parseInt(lastRefill);
      const heartsToAdd = Math.floor(elapsed / this.refillTime);
      
      if (heartsToAdd > 0) {
        AppState.hearts = Math.min(AppState.hearts + heartsToAdd, this.maxHearts);
        localStorage.setItem('hearts', AppState.hearts);
        localStorage.setItem('lastHeartRefill', Date.now().toString());
      }
    }
  },

  loseHeart() {
    if (AppState.hearts > 0) {
      AppState.hearts--;
      localStorage.setItem('hearts', AppState.hearts);
      
      if (AppState.hearts === 0) {
        localStorage.setItem('lastHeartRefill', Date.now().toString());
        Toast.show('หมดหัวใจแล้ว! ⏳ انتظر 30 دقيقة', 'warning');
      }
      
      this.updateUI();
      SoundManager.play('error');
    }
  },

  refill() {
    AppState.hearts = this.maxHearts;
    localStorage.setItem('hearts', AppState.hearts);
    this.updateUI();
    Toast.show('تم ملء القلوب! ❤️', 'success');
  },

  updateUI() {
    const heartsEl = $('#heartsDisplay');
    if (heartsEl) {
      heartsEl.innerHTML = '';
      for (let i = 0; i < this.maxHearts; i++) {
        const heart = document.createElement('i');
        heart.className = i < AppState.hearts ? 'ri-heart-fill' : 'ri-heart-line';
        heart.style.color = i < AppState.hearts ? '#ef4444' : '#94a3b8';
        heartsEl.appendChild(heart);
      }
    }
  }
};

// ===== BADGES SYSTEM =====
const BadgesSystem = {
  badges: [
    { id: 'first_lesson', name: 'أول درس', icon: 'ri-book-open-fill', description: 'أكمل أول درس', condition: () => AppState.xp >= 10 },
    { id: 'streak_3', name: '3 أيام متتالية', icon: 'ri-fire-fill', description: '3 أيام streak', condition: () => AppState.streak >= 3 },
    { id: 'streak_7', name: 'أسبوع كامل', icon: 'ri-fire-fill', description: '7 أيام streak', condition: () => AppState.streak >= 7 },
    { id: 'streak_30', name: 'شهر كامل', icon: 'ri-fire-fill', description: '30 يوم streak', condition: () => AppState.streak >= 30 },
    { id: 'xp_100', name: '100 XP', icon: 'ri-star-fill', description: 'اجمع 100 XP', condition: () => AppState.xp >= 100 },
    { id: 'xp_500', name: '500 XP', icon: 'ri-star-fill', description: 'اجمع 500 XP', condition: () => AppState.xp >= 500 },
    { id: 'xp_1000', name: '1000 XP', icon: 'ri-star-fill', description: 'اجمع 1000 XP', condition: () => AppState.xp >= 1000 },
    { id: 'level_5', name: 'المستوى 5', icon: 'ri-award-fill', description: 'وصل المستوى 5', condition: () => AppState.level >= 5 },
    { id: 'quran_master', name: 'خبير القرآن', icon: 'ri-book-open-fill', description: 'أكمل كل سور القرآن', condition: () => false },
    { id: 'math_wizard', name: 'ساحر الرياضيات', icon: 'ri-calculator-fill', description: 'أكمل كل تمارين الرياضيات', condition: () => false },
  ],

  checkBadges() {
    this.badges.forEach(badge => {
      if (!AppState.badges.includes(badge.id) && badge.condition()) {
        this.awardBadge(badge);
      }
    });
  },

  awardBadge(badge) {
    AppState.badges.push(badge.id);
    localStorage.setItem('badges', JSON.stringify(AppState.badges));
    
    Toast.show(`🏅 شارة جديدة: ${badge.name}!`, 'success');
    SoundManager.play('badge');
    XPSystem.addXP(XPSystem.values.badgeEarned, `شارة: ${badge.name}`);
    
    this.updateUI();
  },

  updateUI() {
    const badgesEl = $('#badgesDisplay');
    if (badgesEl) {
      badgesEl.innerHTML = '';
      AppState.badges.forEach(badgeId => {
        const badge = this.badges.find(b => b.id === badgeId);
        if (badge) {
          const badgeEl = document.createElement('div');
          badgeEl.className = 'badge-item';
          badgeEl.innerHTML = `
            <i class="${badge.icon}" style="color: var(--color-warning-500); font-size: 24px;"></i>
            <span>${badge.name}</span>
          `;
          badgesEl.appendChild(badgeEl);
        }
      });
    }
  }
};

// ===== SOUND MANAGER =====
const SoundManager = {
  sounds: {
    xp: 'https://assets.mixkit.co/sfx/preview/mixkit-unlock-game-notification-253.mp3',
    levelup: 'https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3',
    badge: 'https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3',
    success: 'https://assets.mixkit.co/sfx/preview/mixkit-success-fanfare-trumpets-614.mp3',
    error: 'https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3',
    click: 'https://assets.mixkit.co/sfx/preview/mixkit-modern-technology-select-3124.mp3',
  },

  play(soundName) {
    if (!AppState.soundEnabled) return;
    
    const soundUrl = this.sounds[soundName];
    if (soundUrl) {
      const audio = new Audio(soundUrl);
      audio.volume = 0.3;
      audio.play().catch(() => {}); // Ignore autoplay restrictions
    }
  },

  toggle() {
    AppState.soundEnabled = !AppState.soundEnabled;
    localStorage.setItem('soundEnabled', AppState.soundEnabled);
    Toast.show(AppState.soundEnabled ? 'تم تفعيل الصوت 🔊' : 'تم إيقاف الصوت 🔇');
    this.updateIcon();
  },

  updateIcon() {
    const icon = $('#soundToggle i');
    if (icon) {
      icon.className = AppState.soundEnabled ? 'ri-volume-up-fill' : 'ri-volume-mute-fill';
    }
  }
};

// ===== SEARCH =====
const SearchManager = {
  init() {
    const input = $('#searchInput');
    const clearBtn = $('#searchClear');
    
    if (input) {
      input.addEventListener('input', (e) => this.handleSearch(e));
    }
    
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clear());
    }
  },

  handleSearch(e) {
    AppState.searchQuery = e.target.value.toLowerCase().trim();
    const clearBtn = $('#searchClear');
    if (clearBtn) {
      clearBtn.classList.toggle('visible', AppState.searchQuery.length > 0);
    }
    FilterManager.apply();
  },

  clear() {
    const input = $('#searchInput');
    if (input) {
      input.value = '';
      AppState.searchQuery = '';
      $('#searchClear')?.classList.remove('visible');
      FilterManager.apply();
      input.focus();
    }
  }
};

// ===== FILTER MANAGER =====
const FilterManager = {
  init() {
    $$('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => this.setFilter(tab.dataset.filter));
    });
    
    $$('.nav-link[data-filter]').forEach(link => {
      link.addEventListener('click', () => this.setFilter(link.dataset.filter));
    });
  },

  setFilter(filter) {
    AppState.currentFilter = filter;
    
    // Update active states
    $$('.filter-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.filter === filter);
    });
    $$('.nav-link[data-filter]').forEach(link => {
      link.classList.toggle('active', link.dataset.filter === filter);
    });
    
    this.apply();
  },

  apply() {
    let visibleCount = 0;
    const query = AppState.searchQuery;
    const filter = AppState.currentFilter;

    $$('.card[data-type]').forEach(card => {
      const type = card.dataset.type;
      const search = (card.dataset.search || '').toLowerCase();
      const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
      const desc = card.querySelector('p')?.textContent.toLowerCase() || '';
      
      const matchesFilter = filter === 'all' || type === filter;
      const matchesSearch = !query || search.includes(query) || title.includes(query) || desc.includes(query);
      
      const isVisible = matchesFilter && matchesSearch;
      card.classList.toggle('hidden', !isVisible);
      if (isVisible) visibleCount++;
    });

    // Show/hide sections
    $$('.section[data-category]').forEach(section => {
      const category = section.dataset.category;
      const hasVisibleCards = section.querySelectorAll('.card[data-type]:not(.hidden)').length > 0;
      const matchesFilter = filter === 'all' || category === filter;
      section.classList.toggle('hidden', !matchesFilter || !hasVisibleCards);
    });

    // Empty state
    const emptyState = $('#emptyState');
    if (emptyState) {
      emptyState.classList.toggle('visible', visibleCount === 0);
    }
  }
};

// ===== SCROLL EFFECTS =====
const ScrollManager = {
  init() {
    window.addEventListener('scroll', () => this.handleScroll(), { passive: true });
    this.handleScroll();
  },

  handleScroll() {
    const scrollY = window.scrollY;
    
    // Navbar shadow
    const navbar = $('#navbar');
    if (navbar) {
      navbar.classList.toggle('scrolled', scrollY > 10);
    }
    
    // Scroll to top button
    const scrollTopBtn = $('#scrollTop');
    if (scrollTopBtn) {
      scrollTopBtn.classList.toggle('visible', scrollY > 400);
    }
    
    // Scroll reveal
    $$('.section').forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.85) {
        section.classList.add('visible');
      }
    });
  },

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

// ===== COUNTER ANIMATION =====
const CounterAnimator = {
  init() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.animateCounters();
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    const stats = $('#stats');
    if (stats) observer.observe(stats);
  },

  animateCounters() {
    $$('.stat-value[data-count]').forEach(counter => {
      const target = parseInt(counter.dataset.count);
      const suffix = counter.dataset.suffix || '';
      const duration = 2000;
      const start = performance.now();

      const update = (currentTime) => {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(easeOut * target);
        
        counter.textContent = current + suffix;
        
        if (progress < 1) {
          requestAnimationFrame(update);
        }
      };

      requestAnimationFrame(update);
    });
  }
};

// ===== TOAST =====
const Toast = {
  show(message, type = 'default') {
    const toast = $('#toast');
    const messageEl = $('#toastMessage');
    
    if (!toast || !messageEl) return;
    
    messageEl.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('visible');
    
    setTimeout(() => toast.classList.remove('visible'), 3000);
  }
};

// ===== MOBILE MENU =====
const MobileMenu = {
  init() {
    const btn = $('#mobileMenuBtn');
    const links = $('#navLinks');
    
    if (btn && links) {
      btn.addEventListener('click', () => {
        links.classList.toggle('open');
        const icon = btn.querySelector('i');
        icon.className = links.classList.contains('open') ? 'ri-close-fill' : 'ri-menu-fill';
      });
    }
  }
};

// ===== NAVIGATION =====
const NavigationManager = {
  init() {
    // Smooth scroll for anchor links
    $$('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        $('#searchInput')?.focus();
      }
      if (e.key === 'Escape') {
        $('#searchInput')?.blur();
        $('#navLinks')?.classList.remove('open');
      }
    });
  }
};

// ===== CARD INTERACTIONS =====
const CardManager = {
  init() {
    $$('.card[data-type]').forEach(card => {
      card.addEventListener('click', (e) => {
        // Track activity
        const type = card.dataset.type;
        XPSystem.addXP(XPSystem.values.lessonComplete, type);
        BadgesSystem.checkBadges();
      });
    });
  }
};

// ===== INITIALIZATION =====
const App = {
  init() {
    // Initialize all managers
    ThemeManager.init();
    MobileMenu.init();
    SearchManager.init();
    FilterManager.init();
    ScrollManager.init();
    CounterAnimator.init();
    NavigationManager.init();
    CardManager.init();
    
    // Initialize game systems
    XPSystem.updateUI();
    StreakSystem.init();
    HeartsSystem.init();
    BadgesSystem.checkBadges();
    BadgesSystem.updateUI();
    SoundManager.updateIcon();
    
    // Scroll reveal for initial load
    setTimeout(() => {
      ScrollManager.handleScroll();
    }, 100);
    
    console.log('🚀 بوابة أبطال البيت loaded successfully!');
  }
};

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', App.init);
