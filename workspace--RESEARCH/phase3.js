/**
 * ============================================
 * Phase 3: Parent Dashboard & Social Features
 * ============================================
 */

// ===== PARENT DASHBOARD =====
const ParentDashboard = {
  children: [],
  
  init() {
    this.loadChildren();
    this.setupEventListeners();
  },

  loadChildren() {
    this.children = JSON.parse(localStorage.getItem('children') || '[]');
    
    if (this.children.length === 0) {
      // Default child
      this.children = [{
        id: 'child_1',
        name: 'سليم',
        avatar: '🦸‍♂️',
        grade: 'الصف الرابع',
        xp: AppState.xp,
        level: AppState.level,
        streak: AppState.streak,
        badges: AppState.badges.length,
        lessonsCompleted: 12,
        timeSpent: 45, // minutes
        lastActive: new Date().toISOString()
      }];
      this.saveChildren();
    }
  },

  saveChildren() {
    localStorage.setItem('children', JSON.stringify(this.children));
  },

  addChild(name, grade) {
    const child = {
      id: `child_${Date.now()}`,
      name: name,
      avatar: '👦',
      grade: grade,
      xp: 0,
      level: 1,
      streak: 0,
      badges: 0,
      lessonsCompleted: 0,
      timeSpent: 0,
      lastActive: new Date().toISOString()
    };
    
    this.children.push(child);
    this.saveChildren();
    this.updateUI();
    Toast.show(`تمت إضافة ${name} بنجاح!`, 'success');
  },

  generateReport(childId) {
    const child = this.children.find(c => c.id === childId);
    if (!child) return null;

    return {
      child: child,
      period: 'أسبوعي',
      summary: {
        totalXP: child.xp,
        level: child.level,
        streak: child.streak,
        badges: child.badges,
        lessonsCompleted: child.lessonsCompleted,
        avgTimePerDay: Math.round(child.timeSpent / 7),
        strongestSubject: 'القرآن الكريم',
        improvementArea: 'الرياضيات'
      },
      recommendations: [
        'استمر في مراجعة سور القرآن يومياً',
        'زد وقت التدريب على الرياضيات 10 دقائق',
        'حاول الحفاظ على streak لمدة أسبوع كامل'
      ]
    };
  },

  exportReport(childId) {
    const report = this.generateReport(childId);
    if (!report) return;

    const reportText = `
تقرير ${report.child.name} — ${report.period}
═══════════════════════════════════

📊 الإحصائيات العامة:
• XP المكتسبة: ${report.summary.totalXP}
• المستوى: ${report.summary.level}
• الأيام المتتالية: ${report.summary.streak}
• الشارات: ${report.summary.badges}
• الدروس المكتملة: ${report.summary.lessonsCompleted}
• متوسط الوقت يومياً: ${report.summary.avgTimePerDay} دقيقة

📈 التقييم:
• أقوى مادة: ${report.summary.strongestSubject}
• مجال التحسين: ${report.summary.improvementArea}

💡 التوصيات:
${report.recommendations.map(r => `• ${r}`).join('\n')}

═══════════════════════════════════
تقرير من بوابة أبطال البيت
    `.trim();

    // Download as text file
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${child.name}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    Toast.show('تم تحميل التقرير!', 'success');
  },

  updateUI() {
    const container = $('#parentDashboard');
    if (!container) return;

    container.innerHTML = this.children.map(child => `
      <div class="child-card">
        <div class="child-header">
          <div class="child-avatar">${child.avatar}</div>
          <div class="child-info">
            <h3>${child.name}</h3>
            <span class="child-grade">${child.grade}</span>
          </div>
          <button class="btn btn-sm btn-secondary" onclick="ParentDashboard.exportReport('${child.id}')">
            <i class="ri-download-line"></i> تقرير
          </button>
        </div>
        <div class="child-stats">
          <div class="child-stat">
            <span class="stat-icon">⭐</span>
            <span class="stat-value">${child.xp}</span>
            <span class="stat-label">XP</span>
          </div>
          <div class="child-stat">
            <span class="stat-icon">🏆</span>
            <span class="stat-value">${child.level}</span>
            <span class="stat-label">المستوى</span>
          </div>
          <div class="child-stat">
            <span class="stat-icon">🔥</span>
            <span class="stat-value">${child.streak}</span>
            <span class="stat-label">Streak</span>
          </div>
          <div class="child-stat">
            <span class="stat-icon">🏅</span>
            <span class="stat-value">${child.badges}</span>
            <span class="stat-label">شارات</span>
          </div>
        </div>
        <div class="child-progress">
          <div class="progress-label">
            <span>التقدم الأسبوعي</span>
            <span>${Math.min(Math.round((child.xp / 1000) * 100), 100)}%</span>
          </div>
          <div class="progress">
            <div class="progress-bar progress-primary" style="width: ${Math.min((child.xp / 1000) * 100, 100)}%"></div>
          </div>
        </div>
      </div>
    `).join('');
  },

  setupEventListeners() {
    const addChildBtn = $('#addChildBtn');
    if (addChildBtn) {
      addChildBtn.addEventListener('click', () => {
        const name = prompt('اسم الطفل:');
        const grade = prompt('الصف الدراسي:');
        if (name && grade) {
          this.addChild(name, grade);
        }
      });
    }
  }
};

// ===== NOTIFICATIONS SYSTEM =====
const NotificationsSystem = {
  notifications: [],
  
  init() {
    this.loadNotifications();
    this.requestPermission();
    this.scheduleReminders();
    this.updateUI();
  },

  loadNotifications() {
    this.notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
  },

  saveNotifications() {
    localStorage.setItem('notifications', JSON.stringify(this.notifications));
  },

  async requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  },

  send(title, body, icon = '🔔') {
    const notification = {
      id: Date.now(),
      title: title,
      body: body,
      icon: icon,
      time: new Date().toISOString(),
      read: false
    };
    
    this.notifications.unshift(notification);
    this.saveNotifications();
    
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png'
      });
    }
    
    this.updateUI();
  },

  scheduleReminders() {
    // Check every hour for streak reminder
    setInterval(() => {
      const hour = new Date().getHours();
      const lastVisit = AppState.lastVisit;
      const today = new Date().toDateString();
      
      if (hour >= 18 && lastVisit !== today) {
        this.send(
          '🔥 لا تنسَ streak!',
          'لم تفتح التطبيق اليوم. احفظ streak الخاص بك!',
          '🔥'
        );
      }
    }, 60 * 60 * 1000); // Every hour
  },

  markAsRead(id) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.saveNotifications();
      this.updateUI();
    }
  },

  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.saveNotifications();
    this.updateUI();
  },

  updateUI() {
    const badge = $('#notificationBadge');
    const list = $('#notificationList');
    
    const unread = this.notifications.filter(n => !n.read).length;
    
    if (badge) {
      badge.textContent = unread;
      badge.style.display = unread > 0 ? 'flex' : 'none';
    }
    
    if (list) {
      list.innerHTML = this.notifications.slice(0, 10).map(n => `
        <div class="notification-item ${n.read ? 'read' : 'unread'}" onclick="NotificationsSystem.markAsRead(${n.id})">
          <div class="notification-icon">${n.icon}</div>
          <div class="notification-content">
            <div class="notification-title">${n.title}</div>
            <div class="notification-body">${n.body}</div>
            <div class="notification-time">${this.formatTime(n.time)}</div>
          </div>
          ${!n.read ? '<div class="notification-dot"></div>' : ''}
        </div>
      `).join('');
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

// ===== SOCIAL SHARING =====
const SocialSharing = {
  shareOptions: {
    whatsapp: 'https://wa.me/?text=',
    twitter: 'https://twitter.com/intent/tweet?text=',
    facebook: 'https://www.facebook.com/sharer/sharer.php?u='
  },

  shareToWhatsApp(text) {
    const url = this.shareOptions.whatsapp + encodeURIComponent(text);
    window.open(url, '_blank');
  },

  shareToTwitter(text) {
    const url = this.shareOptions.twitter + encodeURIComponent(text);
    window.open(url, '_blank');
  },

  shareToFacebook() {
    const url = this.shareOptions.facebook + encodeURIComponent(window.location.href);
    window.open(url, '_blank');
  },

  shareAchievement(platform, achievement) {
    const text = `🏅 حصلت على شارة "${achievement.name}" في بوابة أبطال البيت! 🎉\n\nجربها: ${window.location.href}`;
    
    switch(platform) {
      case 'whatsapp':
        this.shareToWhatsApp(text);
        break;
      case 'twitter':
        this.shareToTwitter(text);
        break;
      case 'facebook':
        this.shareToFacebook();
        break;
    }
  }
};

// Initialize Phase 3
document.addEventListener('DOMContentLoaded', () => {
  ParentDashboard.init();
  NotificationsSystem.init();
});
