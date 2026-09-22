/**
 * ============================================
 * Phase 2: Rewards, Challenges, Leaderboards
 * ============================================
 */

// ===== REWARDS SYSTEM =====
const RewardsSystem = {
  dailyRewards: [
    { day: 1, xp: 10, icon: '🎁', name: 'مكافأة اليوم الأول' },
    { day: 2, xp: 15, icon: '⭐', name: 'نجمة اليوم الثاني' },
    { day: 3, xp: 20, icon: '🌟', name: 'نجمة متألقة' },
    { day: 4, xp: 25, icon: '💎', name: 'جوهرة اليوم الرابع' },
    { day: 5, xp: 30, icon: '🏆', name: 'كأس اليوم الخامس' },
    { day: 6, xp: 40, icon: '👑', name: 'تاج اليوم السادس' },
    { day: 7, xp: 50, icon: '🎯', name: 'مكافأة الأسبوع!' },
  ],

  weeklyChallenges: [
    { id: 'w1', name: 'أكمل 5 دروس', target: 5, xp: 100, icon: '📚' },
    { id: 'w2', name: 'احصل على 3 شارات', target: 3, xp: 150, icon: '🏅' },
    { id: 'w3', name: '7 أيام streak', target: 7, xp: 200, icon: '🔥' },
    { id: 'w4', name: 'اجمع 500 XP', target: 500, xp: 250, icon: '⭐' },
  ],

  init() {
    this.checkDailyReward();
    this.checkWeeklyChallenges();
    this.updateUI();
  },

  checkDailyReward() {
    const lastReward = localStorage.getItem('lastDailyReward');
    const today = new Date().toDateString();
    
    if (lastReward !== today) {
      const consecutiveDays = parseInt(localStorage.getItem('consecutiveDays') || '0');
      const rewardIndex = Math.min(consecutiveDays, this.dailyRewards.length - 1);
      const reward = this.dailyRewards[rewardIndex];
      
      setTimeout(() => {
        this.giveDailyReward(reward, consecutiveDays);
      }, 2000);
    }
  },

  giveDailyReward(reward, dayIndex) {
    XPSystem.addXP(reward.xp, reward.name);
    localStorage.setItem('lastDailyReward', new Date().toDateString());
    localStorage.setItem('consecutiveDays', (dayIndex + 1).toString());
    
    Toast.show(`${reward.icon} ${reward.name}! +${reward.xp} XP`, 'success');
    SoundManager.play('success');
  },

  checkWeeklyChallenges() {
    const progress = JSON.parse(localStorage.getItem('weeklyProgress') || '{}');
    const startDate = localStorage.getItem('weekStart');
    const now = new Date();
    
    // Reset weekly if new week
    if (!startDate || (now - new Date(startDate)) > 7 * 24 * 60 * 60 * 1000) {
      localStorage.setItem('weekStart', now.toISOString());
      localStorage.setItem('weeklyProgress', '{}');
      return;
    }
    
    // Check completion
    this.weeklyChallenges.forEach(challenge => {
      const current = progress[challenge.id] || 0;
      if (current >= challenge.target && !progress[`${challenge.id}_claimed`]) {
        this.completeChallenge(challenge);
        progress[`${challenge.id}_claimed`] = true;
        localStorage.setItem('weeklyProgress', JSON.stringify(progress));
      }
    });
  },

  completeChallenge(challenge) {
    XPSystem.addXP(challenge.xp, `تحدي: ${challenge.name}`);
    Toast.show(`🎯 أكملت التحدي: ${challenge.name}!`, 'success');
    SoundManager.play('badge');
  },

  updateProgress(type, amount = 1) {
    const progress = JSON.parse(localStorage.getItem('weeklyProgress') || '{}');
    
    switch(type) {
      case 'lessons':
        progress['w1'] = (progress['w1'] || 0) + amount;
        break;
      case 'badges':
        progress['w2'] = (progress['w2'] || 0) + amount;
        break;
      case 'streak':
        progress['w3'] = Math.max(progress['w3'] || 0, amount);
        break;
      case 'xp':
        progress['w4'] = (progress['w4'] || 0) + amount;
        break;
    }
    
    localStorage.setItem('weeklyProgress', JSON.stringify(progress));
    this.checkWeeklyChallenges();
  },

  updateUI() {
    const container = $('#rewardsDisplay');
    if (!container) return;
    
    container.innerHTML = this.weeklyChallenges.map(challenge => {
      const progress = JSON.parse(localStorage.getItem('weeklyProgress') || '{}');
      const current = progress[challenge.id] || 0;
      const percentage = Math.min((current / challenge.target) * 100, 100);
      
      return `
        <div class="challenge-card ${percentage >= 100 ? 'completed' : ''}">
          <div class="challenge-icon">${challenge.icon}</div>
          <div class="challenge-info">
            <div class="challenge-name">${challenge.name}</div>
            <div class="challenge-progress">
              <div class="progress">
                <div class="progress-bar progress-primary" style="width: ${percentage}%"></div>
              </div>
              <span>${current}/${challenge.target}</span>
            </div>
          </div>
          <div class="challenge-reward">+${challenge.xp} XP</div>
        </div>
      `;
    }).join('');
  }
};

// ===== LEADERBOARD SYSTEM =====
const LeaderboardSystem = {
  // Simulated leaderboard data (would come from server)
  leaderboardData: {
    weekly: [
      { name: 'سليم', xp: 1250, level: 8, streak: 15 },
      { name: 'نور', xp: 1100, level: 7, streak: 12 },
      { name: 'محمد', xp: 980, level: 6, streak: 10 },
      { name: 'فاطمة', xp: 850, level: 5, streak: 8 },
      { name: 'أحمد', xp: 720, level: 4, streak: 7 },
    ],
    allTime: [
      { name: 'سارة', xp: 15000, level: 15, streak: 45 },
      { name: 'خالد', xp: 12000, level: 13, streak: 30 },
      { name: 'ليلى', xp: 10000, level: 12, streak: 25 },
      { name: 'يوسف', xp: 8500, level: 11, streak: 20 },
      { name: 'مريم', xp: 7000, level: 10, streak: 18 },
    ]
  },

  init() {
    this.updateUI('weekly');
  },

  updateUI(type) {
    const container = $('#leaderboardDisplay');
    if (!container) return;
    
    const data = this.leaderboardData[type] || [];
    
    container.innerHTML = data.map((user, index) => {
      const rank = index + 1;
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
      
      return `
        <div class="leaderboard-item ${rank <= 3 ? 'top-3' : ''}">
          <div class="rank">${medal}</div>
          <div class="user-info">
            <div class="user-name">${user.name}</div>
            <div class="user-stats">
              <span>⭐ ${user.xp} XP</span>
              <span>🏆 المستوى ${user.level}</span>
              <span>🔥 ${user.streak} يوم</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
};

// ===== SHARING SYSTEM =====
const SharingSystem = {
  init() {
    const shareBtn = $('#shareBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => this.share());
    }
  },

  async share() {
    const shareData = {
      title: 'بوابة أبطال البيت',
      text: 'منصة تعليمية تفاعلية للأطفال — سليم، كارما، وكندة',
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        Toast.show('تمت المشاركة بنجاح!', 'success');
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(window.location.href);
        Toast.show('تم نسخ الرابط!', 'success');
      }
    } catch (err) {
      console.log('Share failed:', err);
    }
  },

  shareAchievement(achievement) {
    const text = `🏅 حصلت على شارة "${achievement.name}" في بوابة أبطال البيت! 🎉`;
    
    if (navigator.share) {
      navigator.share({
        title: 'إنجاز جديد!',
        text: text,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(text);
      Toast.show('تم نسخ نص الإنجاز!', 'success');
    }
  }
};

// ===== ACHIEVEMENTS DISPLAY =====
const AchievementsDisplay = {
  init() {
    this.updateUI();
  },

  updateUI() {
    const container = $('#achievementsDisplay');
    if (!container) return;
    
    const achievements = [
      { id: 'first_lesson', name: 'أول خطوة', icon: '🎯', description: 'أكمل أول درس', unlocked: AppState.xp >= 10 },
      { id: 'streak_3', name: 'ثلاثة أيام', icon: '🔥', description: '3 أيام متتالية', unlocked: AppState.streak >= 3 },
      { id: 'streak_7', name: 'أسبوع كامل', icon: '📅', description: '7 أيام متتالية', unlocked: AppState.streak >= 7 },
      { id: 'xp_100', name: 'مئة نقطة', icon: '⭐', description: 'اجمع 100 XP', unlocked: AppState.xp >= 100 },
      { id: 'xp_500', name: 'خمسمئة نقطة', icon: '🌟', description: 'اجمع 500 XP', unlocked: AppState.xp >= 500 },
      { id: 'level_5', name: 'المستوى الخامس', icon: '🏆', description: 'وصل المستوى 5', unlocked: AppState.level >= 5 },
      { id: 'quran_reader', name: 'قارئ القرآن', icon: '📖', description: 'أكمل قسم القرآن', unlocked: false },
      { id: 'math_genius', name: 'عبقري الرياضيات', icon: '🧮', description: 'أكمل قسم الرياضيات', unlocked: false },
      { id: 'arabic_star', name: 'نجم العربية', icon: '✍️', description: 'أكمل قسم العربي', unlocked: false },
      { id: 'podcast_fan', name: 'مستمع متحمس', icon: '🎧', description: 'أكمل قسم البودكاست', unlocked: false },
    ];
    
    container.innerHTML = achievements.map(a => `
      <div class="achievement-card ${a.unlocked ? 'unlocked' : 'locked'}">
        <div class="achievement-icon">${a.icon}</div>
        <div class="achievement-info">
          <div class="achievement-name">${a.name}</div>
          <div class="achievement-desc">${a.description}</div>
        </div>
        ${a.unlocked ? '<i class="ri-check-line" style="color: var(--color-success-500);"></i>' : '<i class="ri-lock-line" style="color: var(--text-tertiary);"></i>'}
      </div>
    `).join('');
  }
};

// Initialize Phase 2
document.addEventListener('DOMContentLoaded', () => {
  RewardsSystem.init();
  LeaderboardSystem.init();
  SharingSystem.init();
  AchievementsDisplay.init();
});
