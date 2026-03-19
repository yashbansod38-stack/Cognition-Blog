/**
 * COGNITION BLOG — main.js
 * Modular vanilla JS for the personal media platform.
 * Sections:
 *   1. Config & State
 *   2. Dark Mode
 *   3. Navigation
 *   4. Analytics (localStorage)
 *   5. Blog Card Renderer
 *   6. Category Filter
 *   7. Newsletter Form
 *   8. Reading Progress Bar
 *   9. Share Buttons
 *  10. Skeleton Loaders
 *  11. Toast Notifications
 *  12. Components (Injection)
 *  13. Init
 */

/* ============================================================
   1. CONFIG & STATE
   ============================================================ */

const CONFIG = {
  blogsJsonPath: './data/blogs.json',    // relative from index.html
  gaTrackingId: 'G-XXXXXXXXXX',           // Replace with real GA4 ID
  maxRows: 3,                              // max card rows visible
  cardsPerRowDesktop: 4,
  cardsPerRowMobile: 2,
};

// Shared state object — updated by filters
const state = {
  allBlogs: [],         // raw JSON data
  activeCategories: [], // [] = "All"
  visitorType: 'new',   // 'new' | 'returning'
};

/* ============================================================
   2. DARK MODE
   ============================================================ */

const DarkMode = (() => {
  const STORAGE_KEY = 'cognition-theme';
  const ICONS = { dark: '☀️', light: '🌙' };

  function getPreferred() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);

    // Update all toggle buttons on the page
    document.querySelectorAll('.dark-toggle').forEach(btn => {
      btn.textContent = theme === 'dark' ? ICONS.dark : ICONS.light;
      btn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    });
  }

  function toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    apply(current === 'dark' ? 'light' : 'dark');
  }

  function init() {
    apply(getPreferred());
    document.querySelectorAll('.dark-toggle').forEach(btn => {
      btn.addEventListener('click', toggle);
    });
  }

  return { init, toggle, apply };
})();

/* ============================================================
   3. NAVIGATION
   ============================================================ */

const Nav = (() => {
  function init() {
    const hamburger = document.getElementById('nav-hamburger');
    const mobileNav = document.getElementById('cognition-mobile-nav');
    if (!hamburger || !mobileNav) return;

    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('open');
      mobileNav.classList.toggle('open', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close mobile nav on link click
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
      });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !mobileNav.contains(e.target)) {
        hamburger.classList.remove('open');
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }

  return { init };
})();

/* ============================================================
   4. ANALYTICS — localStorage + GA4 events
   ============================================================ */

const Analytics = (() => {
  const KEYS = {
    firstVisit: 'cog_first_visit',
    visitCount: 'cog_visit_count',
    blogClicks: 'cog_blog_clicks',
  };

  /**
   * Track a custom GA4 event (if gtag is loaded).
   */
  function gaEvent(name, params = {}) {
    if (typeof gtag !== 'undefined') {
      gtag('event', name, params);
    }
  }

  /**
   * On page load: determine new vs returning, increment counter.
   */
  function trackVisit() {
    const isFirst = !localStorage.getItem(KEYS.firstVisit);
    const visitCount = parseInt(localStorage.getItem(KEYS.visitCount) || '0') + 1;

    if (isFirst) {
      localStorage.setItem(KEYS.firstVisit, Date.now());
      state.visitorType = 'new';
      gaEvent('first_visit');
    } else {
      state.visitorType = 'returning';
      gaEvent('returning_visit', { visit_count: visitCount });
    }

    localStorage.setItem(KEYS.visitCount, visitCount);
    updateAnalyticsBadge(visitCount);
  }

  /**
   * Track a blog card click by slug.
   */
  function trackBlogClick(slug) {
    const raw = localStorage.getItem(KEYS.blogClicks) || '{}';
    const clicks = JSON.parse(raw);
    clicks[slug] = (clicks[slug] || 0) + 1;
    localStorage.setItem(KEYS.blogClicks, JSON.stringify(clicks));
    gaEvent('blog_card_click', { blog_slug: slug, count: clicks[slug] });
  }

  /**
   * Update the analytics badge in the DOM.
   */
  function updateAnalyticsBadge(visitCount) {
    const badge = document.getElementById('analytics-badge');
    if (!badge) return;

    const typeEl = document.getElementById('ab-visitor-type');
    const countEl = document.getElementById('ab-visit-count');

    if (typeEl) typeEl.textContent = state.visitorType === 'new' ? '🆕 New' : '🔄 Returning';
    if (countEl) countEl.textContent = visitCount;
  }

  function init() {
    trackVisit();
  }

  return { init, trackBlogClick, gaEvent };
})();

/* ============================================================
   5. BLOG CARD RENDERER
   ============================================================ */

const BlogRenderer = (() => {
  /**
   * Fetch blogs.json (path differs: index.html vs subpages).
   * Tries the root-relative path first, then a relative one.
   */
  async function fetchBlogs() {
    // Try to detect if we're on the homepage or a sub-page
    const paths = ['./data/blogs.json', '../data/blogs.json'];
    for (const path of paths) {
      try {
        const res = await fetch(path);
        if (res.ok) return res.json();
      } catch (_) { /* continue */ }
    }
    throw new Error('Could not load blogs.json');
  }

  /**
   * Format ISO date to readable string.
   */
  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /**
   * Get category badge class.
   */
  function badgeClass(cat) {
    const map = { ai: 'badge-ai', longevity: 'badge-longevity', investing: 'badge-investing', creator: 'badge-creator' };
    return map[cat] || '';
  }

  /**
   * Determine blog post URL from the current page context.
   */
  function blogUrl(slug) {
    const isRoot = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/') || window.location.pathname === '';
    return isRoot ? `./blogs/${slug}.html` : `./${slug}.html`;
  }

  /**
   * Get emoji placeholder per category.
   */
  function categoryEmoji(cat) {
    const map = { ai: '🤖', longevity: '🧬', investing: '📊', creator: '🎥' };
    return map[cat] || '📝';
  }

  /**
   * Build a single blog card HTML string.
   */
  function buildCard(blog) {
    const url = blogUrl(blog.slug);
    return `
      <article 
        class="blog-card fade-in" 
        role="link"
        tabindex="0"
        data-category="${blog.category}"
        data-slug="${blog.slug}"
        onclick="BlogRenderer.openBlog('${url}', '${blog.slug}')"
        onkeydown="if(event.key==='Enter')BlogRenderer.openBlog('${url}', '${blog.slug}')"
        aria-label="${blog.title}"
      >
        <div class="blog-card-img">
          ${blog.image
        ? `<img 
                src="${blog.image}" 
                alt="${blog.title}" 
                loading="lazy"
                onerror="this.parentNode.innerHTML='<div class=blog-card-img-placeholder>${categoryEmoji(blog.category)}</div>'"
              >`
        : `<div class="blog-card-img-placeholder">${categoryEmoji(blog.category)}</div>`
      }
        </div>
        <div class="blog-card-body">
          <h3 class="blog-card-title">${blog.title}</h3>
          <p class="blog-card-desc">${blog.description}</p>
          <div class="blog-card-meta">
            <span class="meta-date">📅 ${formatDate(blog.date)}</span>
            <span class="meta-dot"></span>
            <span class="meta-read">⏱ ${blog.readTime} min read</span>
          </div>
        </div>
      </article>
    `;
  }

  /**
   * Open a blog post and track the click.
   */
  function openBlog(url, slug) {
    Analytics.trackBlogClick(slug);
    window.location.href = url;
  }

  /**
   * Render skeleton cards while blogs load.
   */
  function showSkeletons(container, count = 8) {
    container.innerHTML = Array(count).fill(`
      <div class="skeleton-card">
        <div class="skeleton skeleton-img"></div>
        <div class="skeleton-body">
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-title-2"></div>
          <div class="skeleton skeleton-desc"></div>
          <div class="skeleton skeleton-desc-2"></div>
          <div class="skeleton skeleton-meta"></div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Render filtered blogs into the grid.
   */
  function render(blogs) {
    const grid = document.getElementById('blogs-grid');
    const countEl = document.getElementById('blogs-count');
    if (!grid) return;

    if (blogs.length === 0) {
      grid.innerHTML = `
        <div class="no-results">
          <div class="no-results-icon">🔍</div>
          <h3>No articles found</h3>
          <p>Try a different category or check back soon.</p>
        </div>
      `;
    } else {
      grid.innerHTML = blogs.map(buildCard).join('');
    }

    if (countEl) countEl.textContent = `${blogs.length} article${blogs.length !== 1 ? 's' : ''}`;
  }

  async function init() {
    const grid = document.getElementById('blogs-grid');
    if (!grid) return;

    // Show skeletons immediately
    showSkeletons(grid);

    try {
      state.allBlogs = await fetchBlogs();
      // Small artificial delay so skeleton feels intentional (remove for prod)
      await new Promise(r => setTimeout(r, 400));
      render(state.allBlogs);
    } catch (err) {
      console.error('Failed to load blogs:', err);
      grid.innerHTML = `<div class="no-results"><div class="no-results-icon">⚠️</div><h3>Couldn't load articles</h3><p>Please refresh the page.</p></div>`;
    }
  }

  return { init, render, openBlog };
})();

/* ============================================================
   6. CATEGORY FILTER
   ============================================================ */

const Filter = (() => {
  const ACTIVE_CLASSES = {
    all: 'active',
    ai: 'active-ai',
    longevity: 'active-longevity',
    investing: 'active-investing',
    creator: 'active-creator',
  };

  function updatePillStyles() {
    document.querySelectorAll('.filter-pill').forEach(pill => {
      const cat = pill.dataset.filter;
      const isActive =
        (cat === 'all' && state.activeCategories.length === 0) ||
        (cat !== 'all' && state.activeCategories.includes(cat));

      // Remove all active classes first
      Object.values(ACTIVE_CLASSES).forEach(c => pill.classList.remove(c));

      if (isActive) {
        pill.classList.add(ACTIVE_CLASSES[cat] || ACTIVE_CLASSES.all);
        pill.setAttribute('aria-pressed', 'true');
      } else {
        pill.setAttribute('aria-pressed', 'false');
      }
    });
  }

  function applyFilter() {
    const filtered = state.activeCategories.length === 0
      ? state.allBlogs
      : state.allBlogs.filter(b => state.activeCategories.includes(b.category));

    BlogRenderer.render(filtered);
    updatePillStyles();
  }

  function handlePillClick(cat) {
    if (cat === 'all') {
      state.activeCategories = [];
    } else {
      const idx = state.activeCategories.indexOf(cat);
      if (idx === -1) {
        state.activeCategories.push(cat);
      } else {
        state.activeCategories.splice(idx, 1);
      }
    }
    applyFilter();
  }

  function init() {
    document.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', () => handlePillClick(pill.dataset.filter));
    });
    updatePillStyles();
  }

  return { init, applyFilter };
})();

/* ============================================================
   7. NEWSLETTER FORM
   ============================================================ */

const Newsletter = (() => {
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function handleSubmit(form) {
    const input = form.querySelector('.newsletter-input');
    const successEl = form.parentElement.querySelector('.newsletter-success');
    const email = input.value.trim();

    if (!validateEmail(email)) {
      input.style.borderColor = 'var(--accent)';
      input.focus();
      Toast.show('Please enter a valid email address');
      return;
    }

    // Reset border
    input.style.borderColor = '';

    // TODO: Replace with actual ConvertKit / Beehiiv API call
    // Example: fetch('https://api.convertkit.com/v3/forms/FORM_ID/subscribe', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ api_key: 'YOUR_KEY', email })
    // });

    // Track with GA
    Analytics.gaEvent('newsletter_subscribe', { email_domain: email.split('@')[1] });

    // Show success state
    form.style.display = 'none';
    if (successEl) {
      successEl.style.display = 'flex';
    }

    Toast.show('🎉 You\'re subscribed! Welcome to the community.');

    // Store locally (just flag, not the email)
    localStorage.setItem('cog_subscribed', '1');
  }

  function init() {
    document.querySelectorAll('.newsletter-form').forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSubmit(form);
      });
    });
  }

  return { init };
})();

/* ============================================================
   8. READING PROGRESS BAR
   ============================================================ */

const ReadingProgress = (() => {
  let bar;
  let reachedEnd = false;

  function update() {
    if (!bar) return;
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = `${pct}%`;

    // Streaks Gamification
    if (pct > 95 && !reachedEnd) {
      reachedEnd = true;
      const key = 'cog_articles_read';
      const count = parseInt(localStorage.getItem(key) || '0') + 1;
      localStorage.setItem(key, count.toString());
      
      if (count === 1) {
        Toast.show(`🔥 First article completed! Keep it up.`);
      } else if (count % 3 === 0) {
        Toast.show(`🔥 ${count} articles read! You're in the top 10% of optimizers.`);
      } else {
        Toast.show(`🔥 ${count} articles read. Great job!`);
      }
      Analytics.gaEvent('article_completed', { count });
    }
  }

  function init() {
    bar = document.getElementById('reading-progress');
    if (!bar) return;
    window.addEventListener('scroll', update, { passive: true });
  }

  return { init };
})();

/* ============================================================
   9. SHARE BUTTONS
   ============================================================ */

const Share = (() => {
  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      Analytics.gaEvent('share_click', { method: 'copy_link', page: document.title });
      Toast.show('🔗 Link copied to clipboard!');
      document.querySelectorAll('.btn-copy-link').forEach(btn => {
        btn.classList.add('copied');
        btn.textContent = '✓ Copied!';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.textContent = '🔗 Copy Link';
        }, 2000);
      });
    });
  }

  function shareTwitter() {
    Analytics.gaEvent('share_click', { method: 'twitter', page: document.title });
    const text = document.title;
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`, '_blank');
  }

  function shareLinkedIn() {
    Analytics.gaEvent('share_click', { method: 'linkedin', page: document.title });
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
  }

  function init() {
    document.querySelectorAll('.btn-copy-link').forEach(btn => {
      btn.addEventListener('click', copyLink);
    });
    document.querySelectorAll('.btn-share-twitter').forEach(btn => {
      btn.addEventListener('click', shareTwitter);
    });
    document.querySelectorAll('.btn-share-linkedin').forEach(btn => {
      btn.addEventListener('click', shareLinkedIn);
    });
  }

  return { init, copyLink, shareTwitter, shareLinkedIn };
})();

/* ============================================================
   10. TOAST NOTIFICATIONS
   ============================================================ */

const Toast = (() => {
  let el;

  function show(message, duration = 3000) {
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');

    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => el.classList.remove('show'), duration);
  }

  return { show };
})();

/* ============================================================
   12. COMPONENTS (Injection)
   ============================================================ */

const Components = (() => {
  const isRoot = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/') || window.location.pathname === '';
  const p = isRoot ? '.' : '..';

  const NAV_HTML = `
    <div class="nav-inner">
      <a href="${p}/index.html" class="nav-logo" aria-label="Cognition Home">
        <span class="nav-logo-text">Cognition</span>
        <span class="nav-logo-dot" aria-hidden="true"></span>
      </a>
      <div class="nav-links" role="list">
        <a href="${p}/index.html#ai-workflow" class="nav-link" role="listitem">AI Workflow</a>
        <a href="${p}/index.html#longevity" class="nav-link" role="listitem">Longevity</a>
        <a href="${p}/index.html#investing" class="nav-link" role="listitem">Investing</a>
        <a href="${p}/index.html#newsletter" class="nav-link" role="listitem">Newsletter</a>
        <a href="mailto:hello@cognition.blog" class="nav-link" role="listitem">Contact</a>
      </div>
      <div class="nav-actions">
        <button class="dark-toggle" aria-label="Toggle dark mode">🌙</button>
        <a href="${p}/index.html#newsletter" class="btn-newsletter-nav">Join Newsletter</a>
        <button class="nav-hamburger" id="nav-hamburger" aria-label="Open menu" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  `;

  const MOBILE_NAV_HTML = `
    <a href="${p}/index.html#ai-workflow" class="nav-link">🤖 AI Workflow Engineering</a>
    <a href="${p}/index.html#creator-economy" class="nav-link">🎥 Creator Economy</a>
    <a href="${p}/index.html#longevity" class="nav-link">🧬 Longevity & Bio-Optimization</a>
    <a href="${p}/index.html#investing" class="nav-link">📊 Fractional Asset Investing</a>
    <a href="${p}/index.html#newsletter" class="nav-link">✉️ Newsletter</a>
    <a href="mailto:hello@cognition.blog" class="nav-link">📩 Contact</a>
    <button class="dark-toggle" style="border-radius:12px;width:auto;padding:12px 20px;gap:10px;font-size:14px;font-weight:500;">
      🌙 Toggle Dark Mode
    </button>
    <a href="${p}/index.html#newsletter" class="btn-newsletter-nav">Join Newsletter →</a>
  `;

  const FOOTER_HTML = `
    <div class="footer-inner">
      <div class="footer-top">
        <div class="footer-brand">
          <a href="${p}/index.html" class="nav-logo" aria-label="Cognition Home">
            <span class="nav-logo-text">Cognition</span>
            <span class="nav-logo-dot" aria-hidden="true"></span>
          </a>
          <p>
            Short. Insightful. Data-backed ideas for people optimizing 
            their work, health, and wealth in the age of AI.
          </p>
          <div class="footer-social" aria-label="Social media links">
            <a href="https://twitter.com/cognitionblog" class="social-link" aria-label="Twitter / X" target="_blank" rel="noopener">𝕏</a>
            <a href="https://instagram.com/cognitionblog" class="social-link" aria-label="Instagram" target="_blank" rel="noopener">IG</a>
            <a href="mailto:hello@cognition.blog" class="social-link" aria-label="Email">✉</a>
          </div>
        </div>
        <div class="footer-col">
          <h4>Topics</h4>
          <a href="${p}/index.html#ai-workflow">AI Workflow Engineering</a>
          <a href="${p}/index.html#creator-economy">Creator Economy</a>
          <a href="${p}/index.html#longevity">Longevity & Bio-Optimization</a>
          <a href="${p}/index.html#investing">Fractional Asset Investing</a>
        </div>
        <div class="footer-col">
          <h4>More</h4>
          <a href="${p}/index.html#newsletter">Newsletter</a>
          <a href="mailto:hello@cognition.blog">Contact</a>
          <a href="${p}/sitemap.xml">Sitemap</a>
        </div>
      </div>
      <div class="footer-bottom">
        <p class="footer-copy">
          © <span id="footer-year">${new Date().getFullYear()}</span> Cognition. All rights reserved.
        </p>
        <p class="footer-copy" style="font-size:12px;">
          Built for clarity. Designed for speed.
        </p>
      </div>
    </div>
  `;

  const NEWSLETTER_HTML = `
    <div class="newsletter-inner">
      <p class="newsletter-eyebrow">📬 Weekly drops · No spam · Unsubscribe anytime</p>
      <h2 id="newsletter-heading">
        Intelligence worth<br />
        inbox space.
      </h2>
      <p>
        Join a community of founders, health-optimizers, and forward-thinking investors
        who read Cognition to stay ahead. Every edition: one deep idea, one data point,
        one action step.
      </p>
      <form class="newsletter-form" aria-label="Newsletter signup">
        <input type="email" class="newsletter-input" placeholder="your@email.com" required autocomplete="email"
          aria-label="Email address" />
        <button type="submit" class="btn-subscribe">
          Subscribe Free →
        </button>
      </form>
      <div class="newsletter-success" aria-live="polite">
        ✅ You're in! Check your inbox for a confirmation.
      </div>
      <p class="newsletter-note">
        Join 1,000+ readers. Zero ads. Cancel anytime.
      </p>
    </div>
  `;

  function inject() {
    const nav = document.getElementById('cognition-nav');
    const mobileNav = document.getElementById('cognition-mobile-nav');
    const footer = document.getElementById('cognition-footer');
    const newsletter = document.getElementById('cognition-newsletter');

    if (nav) nav.innerHTML = NAV_HTML;
    if (mobileNav) mobileNav.innerHTML = MOBILE_NAV_HTML;
    if (footer) footer.innerHTML = FOOTER_HTML;
    if (newsletter) {
      newsletter.innerHTML = NEWSLETTER_HTML;
      newsletter.classList.add('newsletter-section');
    }
  }

  return { inject };
})();

/* ============================================================
   13. RELATED BLOGS (for blog post pages)
   ============================================================ */

const RelatedBlogs = (() => {
  async function render(currentSlug, currentCategory) {
    const container = document.getElementById('related-grid');
    if (!container) return;

    try {
      const blogs = await fetch('../data/blogs.json').then(r => r.json());
      const related = blogs
        .filter(b => b.slug !== currentSlug && b.category === currentCategory)
        .slice(0, 3);

      if (related.length === 0) {
        document.getElementById('related-section').style.display = 'none';
        return;
      }

      container.innerHTML = related.map(blog => `
        <a href="./${blog.slug}.html" class="blog-card fade-in" style="text-decoration:none;">
          <div class="blog-card-img">
            <div class="blog-card-img-placeholder" style="background:var(--bg-tertiary);height:180px;display:flex;align-items:center;justify-content:center;font-size:40px;">
              ${{ ai: '🤖', longevity: '🧬', investing: '📊', creator: '🎥' }[blog.category] || '📝'}
            </div>
          </div>
          <div class="blog-card-body">
            <h3 class="blog-card-title">${blog.title}</h3>
            <p class="blog-card-desc">${blog.description}</p>
            <div class="blog-card-meta">
              <span class="meta-read">⏱ ${blog.readTime} min read</span>
            </div>
          </div>
        </a>
      `).join('');
    } catch (e) {
      console.error('Related blogs load failed:', e);
    }
  }

  return { render };
})();

/* ============================================================
   12. SCROLL ANIMATIONS (Intersection Observer)
   ============================================================ */

const ScrollAnimations = (() => {
  function init() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = 'running';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    // Pause fade-in animations until elements are in view
    document.querySelectorAll('.fade-in:not(.blog-card)').forEach(el => {
      el.style.animationPlayState = 'paused';
      observer.observe(el);
    });
  }

  return { init };
})();

/* ============================================================
   14. TEXT SELECTION SHARE
   ============================================================ */

const TextShare = (() => {
  let shareBtn;

  function init() {
    shareBtn = document.createElement('button');
    shareBtn.className = 'text-share-btn';
    shareBtn.innerHTML = '𝕏 Share';
    shareBtn.style.cssText = `
      position: absolute;
      display: none;
      background: #141413;
      color: #fff;
      border: 1px solid rgba(255,255,255,0.1);
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
      transform: translate(-50%, -100%);
      margin-top: -10px;
      transition: opacity 0.2s, transform 0.2s;
    `;
    
    // Add dark mode support to the button inline or rely on background
    if (document.documentElement.getAttribute('data-theme') === 'dark') {
      shareBtn.style.background = '#FFFFFF';
      shareBtn.style.color = '#141413';
    }

    document.body.appendChild(shareBtn);

    document.addEventListener('selectionchange', () => {
      const selection = window.getSelection();
      if (!selection.isCollapsed && selection.toString().trim().length > 10) {
        // Only show if selection is within an article container
        const container = document.querySelector('.article-container') || document.querySelector('.hero');
        if (container && !container.contains(selection.anchorNode)) return;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        shareBtn.style.top = `${window.scrollY + rect.top}px`;
        shareBtn.style.left = `${window.scrollX + rect.left + rect.width / 2}px`;
        shareBtn.style.display = 'block';

        const text = selection.toString().trim();
        shareBtn.onclick = () => {
          const url = encodeURIComponent(window.location.href);
          const intent = `https://twitter.com/intent/tweet?text="${encodeURIComponent(text)}" —&url=${url}`;
          window.open(intent, '_blank');
          shareBtn.style.display = 'none';
          selection.removeAllRanges();
          Analytics.gaEvent('share_highlight');
        };
      } else {
        shareBtn.style.display = 'none';
      }
    });
  }

  return { init };
})();

/* ============================================================
   15. INIT — runs on DOMContentLoaded
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Inject Components
  Components.inject();

  // Core systems
  DarkMode.init();
  Nav.init();
  Analytics.init();
  ReadingProgress.init();
  Newsletter.init();
  Share.init();
  ScrollAnimations.init();
  TextShare.init();

  // Blog-specific (homepage)
  const blogsGrid = document.getElementById('blogs-grid');
  if (blogsGrid) {
    BlogRenderer.init().then(() => Filter.init());
  }
});

// Expose for inline onclick handlers
window.BlogRenderer = BlogRenderer;
window.Toast = Toast;
