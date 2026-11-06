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
    const iconNode = document.createElement('span');
    iconNode.className = 'careerhub-toast-icon';
    iconNode.setAttribute('aria-hidden', 'true');
    const iconPaths = {
      success: '<path d="m5 12 4 4L19 6"/>',
      error: '<path d="m18 6-12 12M6 6l12 12"/>',
      info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>'
    };
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('fill', 'none');
    icon.setAttribute('stroke', 'currentColor');
    icon.setAttribute('stroke-width', '1.8');
    icon.setAttribute('stroke-linecap', 'round');
    icon.setAttribute('stroke-linejoin', 'round');
    icon.innerHTML = iconPaths[type] || iconPaths.info;
    iconNode.appendChild(icon);
    const messageNode = document.createElement('span');
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    messageNode.textContent = String(message ?? '');
    toast.append(iconNode, messageNode);
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  };

  const interfaceIcons = {
    '✅': '<path d="m5 12 4 4L19 6"/>',
    '❌': '<path d="m18 6-12 12M6 6l12 12"/>',
    'ℹ️': '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
    '⚠️': '<path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/>',
    '🏗️': '<path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6M8 10h.01M16 10h.01"/>',
    '🎯': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    '💻': '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
    '💼': '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-13 5h18m-11 0v2h4v-2"/>',
    '🔥': '<path d="M12 22c4.4 0 7-3 7-7 0-3-1.6-5.3-4-7-.2 2-1.2 3.2-2 3.5C13 7.5 10 4 8 2c.2 4-3 6.4-3 12 0 5 2.8 8 7 8Z"/><path d="M12 22c-2 0-3-1.5-3-3.4 0-1.5 1-2.7 2-3.6.1 1.3.8 2 1.5 2.2.1-1.1.7-2 1.5-2.7.7 1 1 2.1 1 3.3 0 2.5-1.2 4.2-3 4.2Z"/>',
    '🚀': '<path d="M5 14c-2 1.5-2.5 4-2.5 5.5C4 19.5 6.5 19 8 17m3-4-3-3c2.5-4 6-7 12-7 0 6-3 9.5-7 12l-3-3Z"/><circle cx="15.5" cy="8.5" r="1"/><path d="m8 11-3 .5L3 15l5 .5m5 1.5.5 3L17 22l.5-5"/>',
    '🎙️': '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8"/>',
    '🎤': '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8"/>',
    '📄': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6m-10 4h4m-4 4h6"/>',
    '🔍': '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    '📋': '<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4.5V3h6v1.5M9 10h6m-6 4h6m-6 4h4"/>',
    '⭐': '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
    '📊': '<path d="M4 20V10m5 10V4m5 16v-7m5 7V7"/>',
    '🗺️': '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15m6-12v15"/>',
    '🗑️': '<path d="M3 6h18m-2 0-.9 14H5.9L5 6m4 0V4h6v2m-5 4v6m4-6v6"/>',
    '💾': '<path d="M5 3h12l4 4v14H3V3h2Z"/><path d="M7 3v6h10V3m-9 18v-8h8v8"/>',
    '👤': '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    '🎓': '<path d="m2 10 10-5 10 5-10 5-10-5Z"/><path d="M6 12v5c3.5 3 8.5 3 12 0v-5m4-2v6"/>',
    '🧠': '<path d="M12 5a4 4 0 0 0-7.5 2A4 4 0 0 0 4 14a4 4 0 0 0 4 6h4V5Zm0 0a4 4 0 0 1 7.5 2A4 4 0 0 1 20 14a4 4 0 0 1-4 6h-4V5Z"/><path d="M8 9v2m8-2v2m-8 4h.01M16 15h.01"/>',
    '📚': '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22V4.5Z"/><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20M8 6h7m-7 4h7"/>',
    '📅': '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18m-13 4h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"/>',
    '🧩': '<path d="M19 13h-2a2 2 0 1 0-4 0v2h-2v-2a2 2 0 1 0-4 0H5V9h2a2 2 0 1 0 0-4H5V3h14v10Z"/><path d="M11 15v2a2 2 0 1 0 4 0v-2h4v6H5v-6h6Z"/>',
    '🏷️': '<path d="M20.6 13.4 13 21l-10-10V3h8l9.6 9.6a.6.6 0 0 1 0 .8Z"/><circle cx="7.5" cy="7.5" r="1"/>',
    '⚡': '<path d="m13 2-3 8H5l6 12 3-8h5L13 2Z"/>',
    '🤖': '<rect x="4" y="7" width="16" height="13" rx="3"/><path d="M12 3v4m-4 5h.01M16 12h.01M9 16h6M2 12h2m16 0h2"/>',
    '🔵': '<circle cx="12" cy="12" r="8"/>'
  };
  const interfaceIconSelector = [
    '[class*="icon"]',
    '.section-title',
    '.skills-section-title',
    '.priority-chip',
    '.top-badge',
    '.streak-badge',
    '.msg-avatar',
    '.empty-state-icon',
    '.upload-icon',
    '.file-icon',
    'h1',
    'h2',
    'h3',
    'h4',
    '.panel-title',
    '.card-title',
    'span',
    'button',
    'a[class*="btn-"]',
    'a.role-tag-pill'
  ].join(',');

  function replaceInterfaceIcons(root = document) {
    const targets = [];
    if (root.nodeType === Node.ELEMENT_NODE && root.matches(interfaceIconSelector)) targets.push(root);
    if (typeof root.querySelectorAll === 'function') {
      targets.push(...root.querySelectorAll(interfaceIconSelector));
    }

    for (const target of targets) {
      if (target.closest('.message-bubble .msg-content, .assistant-drawer-message, .chat-code-block')) continue;
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let textNode;
      while ((textNode = walker.nextNode()) && !textNode.nodeValue.trim()) {}
      if (!textNode) continue;

      const leadingWhitespace = textNode.nodeValue.match(/^\s*/)?.[0] || '';
      const leadingText = textNode.nodeValue.slice(leadingWhitespace.length);
      const symbol = Object.keys(interfaceIcons).find(candidate => leadingText.startsWith(candidate));
      if (!symbol) continue;

      const icon = document.createElement('span');
      icon.className = 'careerhub-interface-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${interfaceIcons[symbol]}</svg>`;
      textNode.nodeValue = `${leadingWhitespace}${leadingText.slice(symbol.length).replace(/^\s+/, '')}`;
      textNode.parentNode.insertBefore(icon, textNode);
    }
  }

  const iconObserver = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) replaceInterfaceIcons(node);
      }
    }
  });
  iconObserver.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', () => replaceInterfaceIcons());

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  window.renderCareerAssistantMarkdown = function (value) {
    const lines = String(value ?? '').replace(/\r\n?/g, '\n').split('\n');
    const blocks = [];
    let paragraph = [];
    let list = null;
    let code = null;

    const inline = text => escapeHtml(text)
      .replace(/`([^`\n]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    const flushParagraph = () => {
      if (paragraph.length) blocks.push(`<p>${paragraph.map(inline).join('<br>')}</p>`);
      paragraph = [];
    };
    const flushList = () => {
      if (!list) return;
      blocks.push(`<${list.type}>${list.items.map(item => `<li>${inline(item)}</li>`).join('')}</${list.type}>`);
      list = null;
    };

    for (const line of lines) {
      const fence = line.match(/^```([A-Za-z0-9+#._-]*)\s*$/);
      if (fence) {
        flushParagraph();
        flushList();
        if (code) {
          const language = code.language ? ` class="language-${escapeHtml(code.language)}"` : '';
          blocks.push(`<pre class="chat-code-block"><code${language}>${escapeHtml(code.lines.join('\n'))}</code></pre>`);
          code = null;
        } else {
          code = { language: fence[1], lines: [] };
        }
        continue;
      }
      if (code) {
        code.lines.push(line);
        continue;
      }

      const heading = line.match(/^(#{1,4})\s+(.+)$/);
      const unorderedItem = line.match(/^\s*[-*]\s+(.+)$/);
      const orderedItem = line.match(/^\s*\d+[.)]\s+(.+)$/);
      if (heading) {
        flushParagraph();
        flushList();
        const level = Math.min(heading[1].length + 1, 6);
        blocks.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      } else if (unorderedItem || orderedItem) {
        flushParagraph();
        const type = orderedItem ? 'ol' : 'ul';
        if (list && list.type !== type) flushList();
        if (!list) list = { type, items: [] };
        list.items.push((unorderedItem || orderedItem)[1]);
      } else {
        flushList();
        if (line.trim()) paragraph.push(line);
        else flushParagraph();
      }
    }
    flushParagraph();
    flushList();
    if (code) {
      blocks.push(`<pre class="chat-code-block"><code>${escapeHtml(code.lines.join('\n'))}</code></pre>`);
    }
    return blocks.join('');
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
        { path: '/coding', label: 'LeetCode Progress', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>', badge: 'DSA' },
        { path: '/resources', label: 'Learning Resources', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>' },
        { path: '/interviews', label: 'AI Mock Interview', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>', badge: 'Voice' }
      ]
    },
    {
      group: 'Placement & Job Hunt',
      items: [
        { path: '/resume', label: 'Resume Analyzer', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>', badge: 'ATS' },
        { path: '/job-analyzer', label: 'Job Description Analyzer', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' },
        { path: '/job-matching', label: 'Live Job Matching', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' },
        { path: '/jobs', label: 'Opportunities Board', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>' },
        { path: '/applications', label: 'Application Tracker', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>' }
      ]
    },
    {
      group: 'AI Copilot',
      items: [
        { path: '/assistant', label: 'Career Assistant', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', badge: 'AI' }
      ]
    },
    {
      group: 'My Account',
      items: [
        { path: '/profile', label: 'Student Profile', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' },
        { path: '/recommendations', label: 'Career Recommendations', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' }
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

    const userInitial = escapeHtml((userData?.name || 'Candidate').charAt(0).toUpperCase());
    const userName = escapeHtml(userData?.name || 'Candidate');

    sidebarEl.innerHTML = `
      <aside class="app-sidebar" id="appSidebar">
        <a href="/" class="sidebar-brand">
          <img src="/assets/logo.png" alt="CareerHub AI" class="brand-logo" onerror="this.src='/logo.png'">
          <span class="brand-text">CareerHub AI</span>
          <span class="brand-badge">WORKSPACE</span>
        </a>
        <div class="sidebar-menu">
          ${menuHtml}
        </div>
        <div class="sidebar-footer">
          <div class="user-profile-widget">
            <button class="profile-open-button" id="userProfileWidget" type="button" aria-label="Open profile editor">
              <div class="user-avatar">${userInitial}</div>
              <div class="user-info-text">
                <div class="user-name-text">${userName}</div>
                <div class="user-meta-sub">
                  <span>Lvl ${userData?.level || 1}</span> • <span>${userData?.xp || 0} XP</span>
                </div>
              </div>
            </button>
            <button class="btn-logout-icon" title="Logout" id="btnLogoutNav">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </aside>
    `;

    document.getElementById('userProfileWidget')?.addEventListener('click', window.openProfileModal);

    document.getElementById('btnLogoutNav')?.addEventListener('click', (e) => {
      e.stopPropagation();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.showToast('Logged out successfully', 'info');
      setTimeout(() => window.location.href = '/login', 500);
    });
  }

  function renderAssistantDrawer() {
    if (window.location.pathname.replace('.html', '') === '/assistant' ||
        document.getElementById('careerAssistantLauncher')) return;

    const launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.id = 'careerAssistantLauncher';
    launcher.className = 'assistant-launcher';
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-controls', 'careerAssistantDrawer');
    launcher.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h8M8 14h5"/></svg><span>Ask Career Assistant</span>';

    const drawer = document.createElement('section');
    drawer.id = 'careerAssistantDrawer';
    drawer.className = 'assistant-drawer';
    drawer.setAttribute('aria-labelledby', 'careerAssistantTitle');
    drawer.innerHTML = `
      <header class="assistant-drawer-header">
        <div><h2 id="careerAssistantTitle">Career Assistant</h2><p>Career guidance based on your conversation and saved profile.</p></div>
        <button type="button" class="assistant-drawer-close" aria-label="Close Career Assistant">&times;</button>
      </header>
      <div class="assistant-drawer-status" role="status" aria-live="polite">Checking availability…</div>
      <div class="assistant-drawer-messages" role="log" aria-live="polite" aria-relevant="additions text"></div>
      <form class="assistant-drawer-form">
        <textarea maxlength="4000" rows="2" aria-label="Message Career Assistant" placeholder="Ask about your career, resume, interviews, or skills"></textarea>
        <button type="submit">Send</button>
      </form>
      <footer class="assistant-drawer-footer"><small>Your conversation is saved to this account.</small><button type="button" class="assistant-drawer-clear">Clear history</button></footer>
    `;
    document.body.append(launcher, drawer);

    const closeButton = drawer.querySelector('.assistant-drawer-close');
    const status = drawer.querySelector('.assistant-drawer-status');
    const messages = drawer.querySelector('.assistant-drawer-messages');
    const form = drawer.querySelector('form');
    const input = form.querySelector('textarea');
    const sendButton = form.querySelector('button');
    const clearButton = drawer.querySelector('.assistant-drawer-clear');
    let historyLoaded = false;
    let assistantDataLoading = false;
    let requestPending = false;

    const appendMessage = (role, content) => {
      const message = document.createElement('div');
      message.className = `assistant-drawer-message ${role === 'user' ? 'user' : 'assistant'}`;
      message.innerHTML = window.renderCareerAssistantMarkdown(content);
      messages.appendChild(message);
      messages.scrollTop = messages.scrollHeight;
    };
    const showWelcome = () => appendMessage('assistant', 'Hey! How can I help you with your career today?');

    async function loadAssistantData() {
      if (historyLoaded || assistantDataLoading) return;
      assistantDataLoading = true;
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      try {
        const [statusResult, historyResult] = await Promise.allSettled([
          fetch(`${window.API_BASE_URL}/api/career/assistant/status`, {
            headers,
            signal: AbortSignal.timeout(15000)
          }),
          fetch(`${window.API_BASE_URL}/api/career/assistant/history`, {
            headers,
            signal: AbortSignal.timeout(15000)
          })
        ]);
        const statusResponse = statusResult.status === 'fulfilled' ? statusResult.value : null;
        const historyResponse = historyResult.status === 'fulfilled' ? historyResult.value : null;
        if (statusResponse?.status === 401 || historyResponse?.status === 401) {
          status.dataset.state = 'unavailable';
          status.textContent = 'Sign in again to use your account assistant.';
          historyLoaded = true;
          return;
        }
        if (statusResponse?.ok) {
          const providerStatus = await statusResponse.json();
          status.dataset.state = providerStatus.ready ? 'ready' : 'unavailable';
          status.textContent = providerStatus.ready
            ? 'Ready to help'
            : 'Assistant temporarily unavailable. You can try again later.';
        } else {
          status.dataset.state = 'unavailable';
          status.textContent = 'Assistant availability could not be checked.';
        }
        showWelcome();
        if (historyResponse?.ok) {
          const history = await historyResponse.json();
          if (Array.isArray(history.messages)) {
            history.messages.slice(-20).forEach(message => {
              if (['user', 'assistant'].includes(message.role) && typeof message.content === 'string') {
                appendMessage(message.role, message.content);
              }
            });
          }
        }
        historyLoaded = true;
      } catch {
        status.dataset.state = 'unavailable';
        status.textContent = 'Assistant availability could not be checked.';
        if (!messages.childElementCount) showWelcome();
      } finally {
        assistantDataLoading = false;
      }
    }

    launcher.addEventListener('click', async () => {
      const open = !drawer.classList.contains('open');
      drawer.classList.toggle('open', open);
      launcher.setAttribute('aria-expanded', String(open));
      if (open) {
        input.focus();
        if (!historyLoaded) await loadAssistantData();
      }
    });
    const closeDrawer = () => {
      drawer.classList.remove('open');
      launcher.setAttribute('aria-expanded', 'false');
      launcher.focus();
    };
    closeButton.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const message = input.value.trim();
      if (!message || requestPending) return;
      const token = localStorage.getItem('token');
      if (!token) {
        status.dataset.state = 'unavailable';
        status.textContent = 'Sign in again to use your account assistant.';
        return;
      }
      appendMessage('user', message);
      input.value = '';
      requestPending = true;
      sendButton.disabled = true;
      sendButton.textContent = '…';
      try {
        const response = await fetch(`${window.API_BASE_URL}/api/career/assistant`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ message }),
          signal: AbortSignal.timeout(30000)
        });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) {
          status.textContent = 'Sign in again to use your account assistant.';
          appendMessage('assistant', 'Your sign-in has expired. Please sign in again.');
        } else if (!response.ok || typeof data.reply !== 'string' || !data.reply.trim()) {
          status.dataset.state = 'unavailable';
          status.textContent = 'Assistant temporarily unavailable.';
          appendMessage('assistant', 'Career Assistant is temporarily unavailable. Please try again.');
        } else {
          status.dataset.state = 'ready';
          status.textContent = 'Ready to help';
          appendMessage('assistant', data.reply);
        }
      } catch {
        status.dataset.state = 'unavailable';
        status.textContent = 'Assistant temporarily unavailable.';
        appendMessage('assistant', 'Career Assistant is temporarily unavailable. Please try again.');
      } finally {
        requestPending = false;
        sendButton.disabled = false;
        sendButton.textContent = 'Send';
        input.focus();
      }
    });

    clearButton.addEventListener('click', async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        status.textContent = 'Sign in again to clear account history.';
        return;
      }
      clearButton.disabled = true;
      try {
        const response = await fetch(`${window.API_BASE_URL}/api/career/assistant/history`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('clear failed');
        messages.replaceChildren();
        showWelcome();
        historyLoaded = true;
        status.textContent = 'Conversation history cleared.';
      } catch {
        status.textContent = 'Could not clear conversation history. Please try again.';
      } finally {
        clearButton.disabled = false;
      }
    });
  }

  // Render Header
  function renderHeader(userData, pageTitle, pageSubtitle) {
    const headerEl = document.getElementById('header-container');
    if (!headerEl) return;

    const readinessScore = userData?.careerReadinessScore ?? userData?.readinessScore;
    const targetRole = escapeHtml(userData?.targetRole || 'Not set');

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
            <span>Readiness: ${readinessScore == null ? '—' : `${readinessScore}%`}</span>
          </div>
          <div class="xp-level-pill">
            <span>⚡ Level ${userData?.level || 1}</span>
            <span>•</span>
            <span>${userData?.xp || 0} XP</span>
          </div>
        </div>
      </header>
    `;

    const navToggle = document.getElementById('mobileNavToggle');
    const sidebar = document.getElementById('appSidebar');
    let backdrop = document.getElementById('navBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('button');
      backdrop.id = 'navBackdrop';
      backdrop.className = 'nav-backdrop';
      backdrop.type = 'button';
      backdrop.setAttribute('aria-label', 'Close navigation');
      document.body.appendChild(backdrop);
    }
    const closeNavigation = () => {
      sidebar?.classList.remove('open');
      backdrop?.classList.remove('open');
      navToggle?.setAttribute('aria-expanded', 'false');
    };
    navToggle?.setAttribute('aria-expanded', 'false');
    navToggle?.addEventListener('click', () => {
      const isOpen = sidebar?.classList.toggle('open') || false;
      backdrop?.classList.toggle('open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
    backdrop.addEventListener('click', closeNavigation);
    sidebar?.querySelectorAll('.nav-link-item').forEach(link => {
      link.addEventListener('click', closeNavigation);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeNavigation();
    });

    document.getElementById('btnChangeRole')?.addEventListener('click', () => {
      window.openRoleModal();
    });
    renderAssistantDrawer();
  }

  // Candidate Profile Modal
  window.openProfileModal = async function () {
    const opener = document.activeElement;
    let modal = document.getElementById('profile-editor-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'profile-editor-modal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(6,11,23,0.85);backdrop-filter:blur(10px);z-index:10000;display:flex;align-items:center;justify-content:center;';
      document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div role="dialog" aria-modal="true" aria-labelledby="profileModalTitle" style="background:rgba(14,25,48,0.98);border:1px solid rgba(56,189,248,0.3);padding:2rem;border-radius:16px;width:92%;max-width:650px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 50px rgba(0,0,0,0.6);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid rgba(56,189,248,0.15);">
          <div>
            <h3 id="profileModalTitle" style="font-size:1.25rem;font-weight:700;color:#fff;">👤 Candidate Placement Credentials</h3>
            <p style="font-size:0.8rem;color:#8da4c4;margin-top:0.2rem;">Powers your placement readiness score, skill gap analysis, and job matching</p>
          </div>
          <button id="closeProfileModal" type="button" aria-label="Close profile editor" style="background:transparent;border:none;color:#94a3b8;font-size:1.5rem;cursor:pointer;">&times;</button>
        </div>
        <div id="profileModalContent">
          <div style="text-align:center;color:#8da4c4;padding:2rem;">Loading profile data...</div>
        </div>
      </div>
    `;

    const closeModal = () => {
      modal.style.display = 'none';
      opener?.focus?.();
    };
    modal.querySelector('#closeProfileModal').onclick = closeModal;
    modal.onclick = event => { if (event.target === modal) closeModal(); };
    modal.onkeydown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
      } else if (event.key === 'Tab') {
        const focusable = [...modal.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]')];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    modal.querySelector('#closeProfileModal').focus();

    try {
      const res = await fetch(`${window.API_BASE_URL}/api/career/profile`, { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        const u = data.user || {};
        let skillsArr = Array.isArray(u.technicalSkills) ? [...u.technicalSkills] : [];
        const profileRoles = [...new Set([
          'Full Stack Developer',
          'Frontend Engineer',
          'Backend Engineer',
          'Software Development Engineer 1 (SDE-1)',
          'AI/ML Engineer',
          'Data Scientist',
          'Data Analyst',
          'Data Analyst / ML Engineer',
          'Cloud Engineer',
          'Software Developer',
          'Cybersecurity Analyst',
          'Frontend Developer',
          'Backend Developer',
          ...(u.targetRole ? [u.targetRole] : [])
        ])];

        function renderForm() {
          const content = document.getElementById('profileModalContent');
          if (!content) return;
          content.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
              <div>
                <label for="profName" style="display:block;font-size:0.75rem;font-weight:700;color:#8da4c4;margin-bottom:0.35rem;text-transform:uppercase;">Full Name</label>
                <input type="text" id="profName" value="${escapeHtml(u.name || '')}" class="input-skill" style="width:100%;">
              </div>
              <div>
                <label for="profRole" style="display:block;font-size:0.75rem;font-weight:700;color:#8da4c4;margin-bottom:0.35rem;text-transform:uppercase;">Target Career Role</label>
                <select id="profRole" style="width:100%;padding:0.75rem;background:rgba(6,11,23,0.8);border:1px solid rgba(56,189,248,0.2);border-radius:8px;color:#fff;font-size:0.85rem;outline:none;">
                  <option value="" ${u.targetRole ? '' : 'selected'}>Choose a target role</option>
                  ${profileRoles.map(r => `
                    <option value="${escapeHtml(r)}" ${u.targetRole === r ? 'selected' : ''}>${escapeHtml(r)}</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
              <div>
                <label for="profDegree" style="display:block;font-size:0.75rem;font-weight:700;color:#8da4c4;margin-bottom:0.35rem;text-transform:uppercase;">Degree / Program</label>
                <input type="text" id="profDegree" value="${escapeHtml(u.degree || '')}" class="input-skill" style="width:100%;">
              </div>
              <div>
                <label for="profBranch" style="display:block;font-size:0.75rem;font-weight:700;color:#8da4c4;margin-bottom:0.35rem;text-transform:uppercase;">Branch / Specialization</label>
                <input type="text" id="profBranch" value="${escapeHtml(u.branch || '')}" class="input-skill" style="width:100%;">
              </div>
            </div>

            <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:1rem;margin-bottom:1.25rem;">
              <div>
                <label for="profCollege" style="display:block;font-size:0.75rem;font-weight:700;color:#8da4c4;margin-bottom:0.35rem;text-transform:uppercase;">College / University</label>
                <input type="text" id="profCollege" value="${escapeHtml(u.college || '')}" placeholder="University Name" class="input-skill" style="width:100%;">
              </div>
              <div>
                <label for="profGradYear" style="display:block;font-size:0.75rem;font-weight:700;color:#8da4c4;margin-bottom:0.35rem;text-transform:uppercase;">Grad Year</label>
                <input type="text" id="profGradYear" value="${escapeHtml(u.graduationYear || '')}" class="input-skill" style="width:100%;">
              </div>
              <div>
                <label for="profCgpa" style="display:block;font-size:0.75rem;font-weight:700;color:#8da4c4;margin-bottom:0.35rem;text-transform:uppercase;">CGPA</label>
                <input type="text" id="profCgpa" value="${escapeHtml(u.cgpa || '')}" class="input-skill" style="width:100%;">
              </div>
            </div>

            <!-- Technical Skills Editor -->
            <div style="margin-bottom:1.25rem;">
              <label for="newSkillInput" style="display:block;font-size:0.75rem;font-weight:700;color:#8da4c4;margin-bottom:0.4rem;text-transform:uppercase;">Technical Skills</label>
              <div id="skillsPillsBox" style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:0.6rem;">
                ${skillsArr.map(s => `
                  <span style="background:rgba(0,210,255,0.12);border:1px solid rgba(0,210,255,0.3);color:#00d2ff;font-size:0.78rem;font-weight:600;padding:0.25rem 0.65rem;border-radius:9999px;display:inline-flex;align-items:center;gap:0.4rem;">
                    ${escapeHtml(s)}
                    <button type="button" data-skill="${escapeHtml(s)}" class="remove-skill-btn" style="background:transparent;border:none;color:#f87171;cursor:pointer;font-size:0.8rem;line-height:1;">&times;</button>
                  </span>
                `).join('')}
              </div>
              <div style="display:flex;gap:0.5rem;">
                <input type="text" id="newSkillInput" placeholder="Add technical skill (e.g. Docker, TypeScript, AWS)..." class="input-skill" style="flex:1;">
                <button type="button" id="btnAddSkillTag" class="role-tag-pill" style="padding:0.6rem 1rem;font-size:0.82rem;font-weight:700;">+ Add</button>
              </div>
            </div>

            <!-- Career Goals -->
            <div style="margin-bottom:1.5rem;">
              <label for="profGoals" style="display:block;font-size:0.75rem;font-weight:700;color:#8da4c4;margin-bottom:0.35rem;text-transform:uppercase;">Career Goals & Placement Objective</label>
              <textarea id="profGoals" class="input-skill" style="width:100%;height:70px;resize:vertical;">${escapeHtml(u.careerGoals || '')}</textarea>
            </div>

            <div style="display:flex;justify-content:flex-end;gap:0.75rem;">
              <button type="button" id="btnCancelProfile" class="btn-action btn-prev" style="padding:0.7rem 1.25rem;font-size:0.85rem;">Cancel</button>
              <button type="button" id="btnSaveProfile" class="btn-action btn-next" style="padding:0.7rem 1.5rem;font-size:0.85rem;">Save Changes ✓</button>
            </div>
          `;

          // Event Listeners for Tags
          content.querySelectorAll('.remove-skill-btn').forEach(btn => {
            btn.onclick = () => {
              const s = btn.dataset.skill;
              skillsArr = skillsArr.filter(item => item !== s);
              renderForm();
            };
          });

          content.querySelector('#btnAddSkillTag').onclick = () => {
            const input = content.querySelector('#newSkillInput');
            const val = input.value.trim();
            if (val && !skillsArr.includes(val)) {
              skillsArr.push(val);
              renderForm();
            }
          };

          content.querySelector('#newSkillInput').onkeydown = (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              content.querySelector('#btnAddSkillTag').click();
            }
          };

          content.querySelector('#btnCancelProfile').onclick = () => { modal.style.display = 'none'; };

          content.querySelector('#btnSaveProfile').onclick = async () => {
            const updatePayload = {
              name: content.querySelector('#profName').value.trim(),
              targetRole: content.querySelector('#profRole').value,
              degree: content.querySelector('#profDegree').value.trim(),
              branch: content.querySelector('#profBranch').value.trim(),
              college: content.querySelector('#profCollege').value.trim(),
              graduationYear: content.querySelector('#profGradYear').value.trim(),
              cgpa: content.querySelector('#profCgpa').value.trim(),
              technicalSkills: skillsArr,
              careerGoals: content.querySelector('#profGoals').value.trim()
            };

            try {
              window.showToast('Saving profile updates...', 'info');
              const saveRes = await fetch(`${window.API_BASE_URL}/api/career/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify(updatePayload)
              });

              if (saveRes.ok) {
                window.showToast('Profile updated successfully!', 'success');
                modal.style.display = 'none';
                setTimeout(() => window.location.reload(), 500);
              } else {
                window.showToast('Failed to update profile.', 'error');
              }
            } catch (err) {
              console.error(err);
              window.showToast('Network error saving profile.', 'error');
            }
          };
        }

        renderForm();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Target Role Switcher Modal
  window.openRoleModal = function () {
    const opener = document.activeElement;
    let modal = document.getElementById('role-switcher-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'role-switcher-modal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(6,11,23,0.85);backdrop-filter:blur(10px);z-index:10000;display:flex;align-items:center;justify-content:center;';
      modal.innerHTML = `
        <div role="dialog" aria-modal="true" aria-labelledby="roleModalTitle" style="background:rgba(14,25,48,0.98);border:1px solid rgba(56,189,248,0.3);padding:2rem;border-radius:16px;width:90%;max-width:480px;box-shadow:0 20px 50px rgba(0,0,0,0.6);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
            <h3 id="roleModalTitle" style="font-size:1.15rem;font-weight:700;color:#fff;">🎯 Select Target Career Role</h3>
            <button id="closeRoleModal" type="button" aria-label="Close target role selector" style="background:transparent;border:none;color:#94a3b8;font-size:1.5rem;cursor:pointer;">&times;</button>
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
              'AI/ML Engineer',
              'Data Scientist',
              'Data Analyst',
              'Data Analyst / ML Engineer',
              'Cloud Engineer',
              'Software Developer',
              'Cybersecurity Analyst',
              'Frontend Developer',
              'Backend Developer'
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

      const closeModal = () => {
        modal.remove();
        opener?.focus?.();
      };
      modal.querySelector('#closeRoleModal').onclick = closeModal;
      modal.onclick = event => { if (event.target === modal) closeModal(); };
      modal.onkeydown = event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeModal();
        } else if (event.key === 'Tab') {
          const focusable = [...modal.querySelectorAll('button:not(:disabled)')];
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      };
      modal.querySelector('#closeRoleModal').focus();

      modal.querySelectorAll('.role-select-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const newRole = btn.dataset.role;
          await window.setTargetRole(newRole);
          closeModal();
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
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return null;
    }

    try {
      const res = await fetch(`${window.API_BASE_URL}/api/career/readiness`, {
        headers: { ...getAuthHeader() }
      });
      if (res.status === 401 || res.status === 400) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        return null;
      }
      if (res.ok) {
        const data = await res.json();
        const userData = {
          name: data.user?.name || 'Candidate',
          targetRole: data.user?.targetRole || 'Set a target role',
          xp: data.user?.xp || 0,
          level: data.user?.level || 1,
          careerReadinessScore: data.overallScore || 0
        };
        renderSidebar(userData);
        renderHeader(userData, pageTitle, pageSubtitle);
        return userData;
      }
      throw new Error(`Account status could not be loaded (HTTP ${res.status}).`);
    } catch (err) {
      console.error('Navigation account load failed:', err);
      window.showToast('Could not load your account data. Please retry.', 'error');
    }

    return null;
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
