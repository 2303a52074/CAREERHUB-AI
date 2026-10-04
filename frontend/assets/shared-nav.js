/**
 * CareerHub AI — Shared Navigation & Layout Controller
 * Auto-injects consistent sidebar, top header, user auth state, and shared utilities.
 */

(function () {
  window.API_BASE_URL = window.API_BASE_URL || '';

  // Auth token helper
  function getAuthHeader() {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  // Toast notification
  window.showToast = function (message, type = 'info') {
    let container = document.getElementById('careerhub-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'careerhub-toast-container';
      container.className = 'careerhub-toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `careerhub-toast toast-${type}`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  };

  // Nav items configuration for all 14 pages
  const navSections = [
    {
      group: 'Cockpit & Growth',
      items: [
        { path: '/dashboard', label: 'Placement Cockpit', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>' },
        { path: '/daily-plan', label: 'Daily Preparation', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', badge: 'Today' },
        { path: '/analytics', label: 'Progress Analytics', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>' }
      ]
    },
    {
      group: 'Skill & Assessment',
      items: [
        { path: '/assessment', label: 'Career Assessment', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>' },
        { path: '/skills', label: 'Skill Gap Analysis', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>' },
        { path: '/roadmap', label: 'Career Roadmap', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>' },
        { path: '/coding', label: 'Coding Practice', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>', badge: 'IDE' },
        { path: '/interviews', label: 'AI Mock Interview', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>', badge: 'Voice' }
      ]
    },
    {
      group: 'Placement & Job Hunt',
      items: [
        { path: '/resume', label: 'Resume Analyzer', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>', badge: 'ATS' },
        { path: '/job-analyzer', label: 'Job Description Analyzer', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' },
        { path: '/job-matching', label: 'AI Job Matching', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' },
        { path: '/jobs', label: 'Opportunities Board', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>' },
        { path: '/applications', label: 'Application Tracker', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>' }
      ]
    },
    {
      group: 'AI Copilot',
      items: [
        { path: '/assistant', label: 'Career Assistant', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', badge: 'AI' }
      ]
    }
  ];

  // Render Sidebar
  function renderSidebar(userData) {
    const sidebarEl = document.getElementById('sidebar-container');
    if (!sidebarEl) return;

    const currentPath = window.location.pathname.replace('.html', '');

    let menuHtml = '';
    navSections.forEach(section => {
      menuHtml += `
        <div class="menu-group">
          <div class="menu-group-title">${section.group}</div>
          <ul class="nav-links">
            ${section.items.map(item => {
              const isActive = currentPath === item.path || (currentPath === '' && item.path === '/dashboard');
              return `
                <li>
                  <a href="${item.path}" class="nav-link-item ${isActive ? 'active' : ''}">
                    ${item.icon}
                    <span>${item.label}</span>
                    ${item.badge ? `<span class="nav-badge-pill">${item.badge}</span>` : ''}
                  </a>
                </li>
              `;
            }).join('')}
          </ul>
        </div>
      `;
    });

    const userInitial = (userData?.name || 'Candidate').charAt(0).toUpperCase();

    sidebarEl.innerHTML = `
      <aside class="app-sidebar" id="appSidebar">
        <a href="/" class="sidebar-brand">
          <img src="/assets/logo.png" alt="CareerHub AI" class="brand-logo" onerror="this.src='/logo.png'">
          <span class="brand-text">CareerHub AI</span>
          <span class="brand-badge">PRO</span>
        </a>
        <div class="sidebar-menu">
          ${menuHtml}
        </div>
        <div class="sidebar-footer">
          <div class="user-profile-widget">
            <div class="user-avatar">${userInitial}</div>
            <div class="user-info-text">
              <div class="user-name-text">${userData?.name || 'Demo Candidate'}</div>
              <div class="user-meta-sub">
                <span>Lvl ${userData?.level || 1}</span> • <span>${userData?.xp || 0} XP</span>
              </div>
            </div>
            <button class="btn-logout-icon" title="Logout" id="btnLogoutNav">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </aside>
    `;

    document.getElementById('btnLogoutNav')?.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.showToast('Logged out successfully', 'info');
      setTimeout(() => window.location.href = '/login', 500);
    });
  }

  // Render Header
  function renderHeader(userData, pageTitle, pageSubtitle) {
    const headerEl = document.getElementById('header-container');
    if (!headerEl) return;

    const readinessScore = userData?.careerReadinessScore || userData?.readinessScore || 0;
    const targetRole = userData?.targetRole || 'Full Stack Developer';

    headerEl.innerHTML = `
      <header class="app-header">
        <div class="header-left">
          <button class="mobile-nav-toggle" id="mobileNavToggle" aria-label="Toggle Navigation">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <div class="header-title-box">
            <h1>${pageTitle || 'Placement Cockpit'}</h1>
            <p>${pageSubtitle || 'AI-Powered Placement Preparation & Intelligence'}</p>
          </div>
        </div>
        <div class="header-right">
          <button class="role-tag-pill" id="btnChangeRole" title="Click to switch target role">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
            <span>${targetRole}</span>
            <span style="font-size:0.65rem; opacity:0.7">▼</span>
          </button>
          <div class="readiness-kpi-pill">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span>Readiness: ${readinessScore}%</span>
          </div>
          <div class="xp-level-pill">
            <span>⚡ Level ${userData?.level || 1}</span>
            <span>•</span>
            <span>${userData?.xp || 0} XP</span>
          </div>
        </div>
      </header>
    `;

    document.getElementById('mobileNavToggle')?.addEventListener('click', () => {
      document.getElementById('appSidebar')?.classList.toggle('open');
    });

    document.getElementById('btnChangeRole')?.addEventListener('click', () => {
      window.openRoleModal();
    });
  }

  // Target Role Switcher Modal
  window.openRoleModal = function () {
    let modal = document.getElementById('role-switcher-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'role-switcher-modal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(6,11,23,0.85);backdrop-filter:blur(10px);z-index:10000;display:flex;align-items:center;justify-content:center;';
      modal.innerHTML = `
        <div style="background:rgba(14,25,48,0.98);border:1px solid rgba(56,189,248,0.3);padding:2rem;border-radius:16px;width:90%;max-width:480px;box-shadow:0 20px 50px rgba(0,0,0,0.6);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
            <h3 style="font-size:1.15rem;font-weight:700;color:#fff;">🎯 Select Target Career Role</h3>
            <button id="closeRoleModal" style="background:transparent;border:none;color:#94a3b8;font-size:1.5rem;cursor:pointer;">&times;</button>
          </div>
          <p style="font-size:0.85rem;color:#cbd5e1;margin-bottom:1.5rem;">
            Changing your target role re-calibrates your skill gap analysis, roadmap milestones, daily preparation schedule, and interview questions.
          </p>
          <div style="display:flex;flex-direction:column;gap:0.75rem;" id="roleOptionsList">
            ${[
              'Full Stack Developer',
              'Frontend Engineer',
              'Backend Engineer',
              'Software Development Engineer 1 (SDE-1)',
              'Data Analyst / ML Engineer'
            ].map(r => `
              <button class="role-select-btn" data-role="${r}" style="padding:0.85rem 1.25rem;background:rgba(255,255,255,0.04);border:1px solid rgba(56,189,248,0.2);border-radius:10px;color:#fff;text-align:left;font-weight:600;font-size:0.9rem;cursor:pointer;display:flex;justify-content:space-between;align-items:center;transition:all 0.2s ease;">
                <span>${r}</span>
                <span style="color:#00d2ff;font-size:0.8rem;">Select →</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#closeRoleModal').onclick = () => modal.remove();
      modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

      modal.querySelectorAll('.role-select-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const newRole = btn.dataset.role;
          await window.setTargetRole(newRole);
          modal.remove();
        });
      });
    }
  };

  // Change Role API Call
  window.setTargetRole = async function (role) {
    try {
      window.showToast(`Updating target role to ${role}...`, 'info');
      const res = await fetch(`${window.API_BASE_URL}/api/career/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ targetRole: role })
      });
      if (res.ok) {
        window.showToast(`Target role updated to ${role}!`, 'success');
        setTimeout(() => window.location.reload(), 600);
      } else {
        window.showToast('Failed to update target role.', 'error');
      }
    } catch (e) {
      console.error(e);
      window.showToast('Network error updating role.', 'error');
    }
  };

  // Main Initialize function for every page
  window.initCareerHubNav = async function (pageTitle, pageSubtitle) {
    try {
      const res = await fetch(`${window.API_BASE_URL}/api/career/readiness`, {
        headers: { ...getAuthHeader() }
      });
      if (res.ok) {
        const data = await res.json();
        const userData = {
          name: data.user?.name || 'Demo Candidate',
          targetRole: data.user?.targetRole || 'Full Stack Developer',
          xp: data.user?.xp || 0,
          level: data.user?.level || 1,
          careerReadinessScore: data.overallScore || 0
        };
        renderSidebar(userData);
        renderHeader(userData, pageTitle, pageSubtitle);
        return userData;
      }
    } catch (err) {
      console.warn('Nav init fallback:', err);
    }

    // Offline / fallback data
    const fallbackUser = {
      name: 'Demo Candidate',
      targetRole: 'Full Stack Developer',
      xp: 380,
      level: 3,
      careerReadinessScore: 82
    };
    renderSidebar(fallbackUser);
    renderHeader(fallbackUser, pageTitle, pageSubtitle);
    return fallbackUser;
  };

  // Auto-run if containers exist on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    const pageHeading = document.body.dataset.pageTitle || document.title;
    const pageSub = document.body.dataset.pageSubtitle || '';
    if (document.getElementById('sidebar-container') && document.getElementById('header-container')) {
      window.initCareerHubNav(pageHeading, pageSub);
    }
  });

})();
