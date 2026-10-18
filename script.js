/* ── script.js — Portfolio interactive logic ── */

'use strict';

/* ============================================================
   Utility helpers
   ============================================================ */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ============================================================
   NAVBAR — scroll styling + active link tracking
   ============================================================ */
(function initNavbar() {
  const navbar   = $('#navbar');
  const links    = $$('.nav-link');
  const sections = $$('.section');
  const hamburger = $('#hamburger');
  const navLinks  = $('#nav-links');

  // Scroll → add class + active link
  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);

    // Active section detection
    let current = '';
    sections.forEach(sec => {
      const top = sec.offsetTop - 120;
      if (window.scrollY >= top) current = sec.id;
    });
    links.forEach(l => {
      const active = l.dataset.section === current;
      l.classList.toggle('active', active);
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Hamburger toggle
  hamburger.addEventListener('click', () => {
    const open = hamburger.classList.toggle('open');
    navLinks.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', open);
  });

  // Close menu on nav-link click (mobile)
  links.forEach(l => {
    l.addEventListener('click', () => {
      hamburger.classList.remove('open');
      navLinks.classList.remove('open');
    });
  });
})();


/* ============================================================
   SLIDER factory — reusable for projects & skills
   params:
     trackId   : ID of the .slider-track element
     prevId    : ID of the left arrow button
     nextId    : ID of the right arrow button
     dotsId    : ID of the dots container
     visibleFn : () => number of slides visible at current viewport
   ============================================================ */
function createSlider({ trackId, prevId, nextId, dotsId, visibleFn }) {
  const track   = $(`#${trackId}`);
  const prevBtn = $(`#${prevId}`);
  const nextBtn = $(`#${nextId}`);
  const dotsWrap = $(`#${dotsId}`);

  if (!track || !prevBtn || !nextBtn) return;

  const slides   = $$('.slide', track);
  const total    = slides.length;
  let   current  = 0;
  let  startX   = 0;
  let  isDrag   = false;

  // ── Dots ──
  const dots = [];
  if (dotsWrap) {
    slides.forEach((_, i) => {
      const d = document.createElement('button');
      d.className = 'dot';
      d.setAttribute('role', 'tab');
      d.setAttribute('aria-label', `Slide ${i + 1}`);
      d.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(d);
      dots.push(d);
    });
  }

  // ── Go to slide ──
  function goTo(index) {
    const vis = visibleFn();
    const max = Math.max(0, total - vis);
    const allFit = total <= vis;
    current = Math.max(0, Math.min(index, max));

    // Calculate offset: each slide is (100 / vis)% of viewport
    const slideWidthPct = 100 / vis;
    track.style.transform = allFit
      ? 'translateX(0)'
      : `translateX(-${current * slideWidthPct}%)`;

    // Hide arrows entirely when all items fit
    prevBtn.classList.toggle('hidden', allFit);
    nextBtn.classList.toggle('hidden', allFit);

    // Disable arrows at bounds (when slider is active)
    if (!allFit) {
      prevBtn.disabled = current <= 0;
      nextBtn.disabled = current >= max;
    }

    // Hide dots when all items fit
    if (dotsWrap) dotsWrap.classList.toggle('hidden', allFit);
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  // ── Arrow clicks ──
  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));

  // ── Swipe / drag ──
  const viewport = track.parentElement;

  const onTouchStart = (e) => {
    startX = (e.touches ? e.touches[0].clientX : e.clientX);
    isDrag = true;
  };
  const onTouchEnd = (e) => {
    if (!isDrag) return;
    const endX = (e.changedTouches ? e.changedTouches[0].clientX : e.clientX);
    const diff = startX - endX;
    if (Math.abs(diff) > 50) goTo(current + (diff > 0 ? 1 : -1));
    isDrag = false;
  };

  viewport.addEventListener('touchstart', onTouchStart, { passive: true });
  viewport.addEventListener('touchend',   onTouchEnd,   { passive: true });
  viewport.addEventListener('mousedown',  onTouchStart);
  viewport.addEventListener('mouseup',    onTouchEnd);

  // ── Keyboard on focused slide ──
  viewport.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); goTo(current - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1); }
  });

  // ── Re-render on resize ──
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => goTo(current), 100);
  }, { passive: true });

  // ── Init ──
  goTo(0);

  return { goTo };
}


/* ============================================================
   PROJECTS SLIDER
   ============================================================ */
(function initProjectsSlider() {
  function visibleProjects() {
    if (window.innerWidth <= 600) return 1;
    if (window.innerWidth <= 900) return 2;
    return 4;
  }

  createSlider({
    trackId:   'projects-track',
    prevId:    'proj-prev',
    nextId:    'proj-next',
    dotsId:    'proj-dots',
    visibleFn: visibleProjects,
  });
})();


/* ============================================================
   SKILLS SLIDER
   ============================================================ */
(function initSkillsSlider() {
  function visibleSkills() {
    if (window.innerWidth <= 900) return 1;
    return 3;   // show all 3 at once on desktop
  }

  createSlider({
    trackId:   'skills-track',
    prevId:    'skill-prev',
    nextId:    'skill-next',
    dotsId:    'skill-dots',
    visibleFn: visibleSkills,
  });
})();


/* ============================================================
   SKILL BARS — animate on scroll into view
   ============================================================ */
(function initSkillBars() {
  const fills = $$('.skill-fill');
  if (!fills.length) return;

  let animated = false;

  const animate = () => {
    const skillSection = $('#skills');
    if (!skillSection) return;
    const rect = skillSection.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.85 && !animated) {
      animated = true;
      fills.forEach(el => {
        const w = el.dataset.width || 0;
        el.style.width = `${w}%`;
      });
    }
  };

  window.addEventListener('scroll', animate, { passive: true });
  animate(); // run once in case already visible
})();


/* ============================================================
   FOLDER CARDS — toggle on mobile tap
   ============================================================ */
(function initFolderCards() {
  const cards = $$('.folder-card');

  cards.forEach(card => {
    // Touch tap toggles .active class (for mobile)
    let touchMoved = false;

    card.addEventListener('touchstart', () => { touchMoved = false; }, { passive: true });
    card.addEventListener('touchmove',  () => { touchMoved = true;  }, { passive: true });
    card.addEventListener('touchend', (e) => {
      if (touchMoved) return;           // ignore swipe gestures
      e.preventDefault();

      const isActive = card.classList.contains('active');

      // Close all others
      cards.forEach(c => c.classList.remove('active'));

      // Toggle this one
      if (!isActive) card.classList.add('active');
    });

    // Keyboard: Enter / Space toggles
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.classList.toggle('active');
      }
      if (e.key === 'Escape') card.classList.remove('active');
    });

    // Close when focus leaves (for keyboard users)
    card.addEventListener('blur', () => {
      // Small delay to allow inner elements to receive focus first
      setTimeout(() => {
        if (!card.contains(document.activeElement)) {
          card.classList.remove('active');
        }
      }, 100);
    });
  });

  // Close active folder when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.folder-card')) {
      cards.forEach(c => c.classList.remove('active'));
    }
  });
})();


/* ============================================================
   FOOTER — current year
   ============================================================ */
(function initFooter() {
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();


/* ============================================================
   SECTION ENTRANCE ANIMATIONS — fade-up on scroll
   ============================================================ */
(function initEntranceAnimations() {
  // Add entrance animation styles dynamically
  const style = document.createElement('style');
  style.textContent = `
    .fade-up {
      opacity: 0;
      transform: translateY(30px);
      transition: opacity 0.6s var(--ease-out), transform 0.6s var(--ease-out);
    }
    .fade-up.visible {
      opacity: 1;
      transform: translateY(0);
    }
    .fade-up-delay-1 { transition-delay: 0.1s; }
    .fade-up-delay-2 { transition-delay: 0.2s; }
    .fade-up-delay-3 { transition-delay: 0.3s; }
  `;
  document.head.appendChild(style);

  // Elements to animate
  const targets = [
    ...$$('.hero-greeting, .hero-name, .hero-title, .hero-bio, .hero-meta, .hero-btns, .hero-socials'),
    ...$$('.about-photo-frame, .about-bio-box, .tools-section'),
    ...$$('.section-title, .folder-card, .skill-card, .contact-card, .contact-socials'),
  ];

  targets.forEach((el, i) => {
    el.classList.add('fade-up');
    if (i % 3 === 1) el.classList.add('fade-up-delay-1');
    if (i % 3 === 2) el.classList.add('fade-up-delay-2');
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  targets.forEach(el => observer.observe(el));

  // Immediately show hero elements
  $$('.hero .fade-up').forEach(el => el.classList.add('visible'));
})();


/* ============================================================
   RESUME — button now downloads assets/resume.pdf via the
   "download" attribute on the <a> tag. No JS needed.
   Place your resume file at: assets/resume.pdf
   ============================================================ */
