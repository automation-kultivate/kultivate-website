const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const heroStage = qs('#heroStage');
const tiltCards = qsa('.tilt-card');
const speedItems = qsa('[data-speed]');
let revealObserver;
let parallaxFrame = null;

function startHeroAnimation() {
  if (!heroStage) return;

  const heroSection = heroStage.closest('.hero-section');

  // Easy manual timing controls:
  // Step 1: KLTV fill starts
  // Step 2: KULTIVATE. fill starts
  // Step 3: ticker/loop bar fades in
  const KLTV_FILL_START = 520;
  const STEP_GAP = 1200;
  const WORD_FILL_START = KLTV_FILL_START + STEP_GAP;      // 2300
  const TICKER_FADE_START = WORD_FILL_START + STEP_GAP;    // 4080

  heroStage.classList.add('is-final');

  if (reducedMotion) {
    heroStage.classList.add('is-kltv-fill', 'is-word-fill', 'is-hoverable');
    if (heroSection) heroSection.classList.add('is-ticker-visible');
    return;
  }

  window.setTimeout(() => heroStage.classList.add('is-kltv-fill'), KLTV_FILL_START);
  window.setTimeout(() => heroStage.classList.add('is-word-fill'), WORD_FILL_START);
  window.setTimeout(() => {
    if (heroSection) heroSection.classList.add('is-ticker-visible');
  }, TICKER_FADE_START);
  window.setTimeout(() => heroStage.classList.add('is-hoverable'), TICKER_FADE_START + 420);
}

function initReveal() {
  const elements = qsa('.reveal');
  if (!('IntersectionObserver' in window)) {
    elements.forEach(el => el.classList.add('is-visible'));
    return;
  }

  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.14,
    rootMargin: '0px 0px -10% 0px'
  });

  elements.forEach(el => revealObserver.observe(el));
}

function initHeroWarp() {
  if (!heroStage || reducedMotion) return;

  const logo = qs('#heroLogoComposite', heroStage);
  if (!logo) return;

  function getPathGroups() {
    const outlinePaths = qsa('.logo-svg-outline path', logo);
    const fillPaths = qsa('.logo-svg-fill path', logo);
    return outlinePaths.map((path, index) => [path, fillPaths[index]].filter(Boolean));
  }

  function resetBulge() {
    getPathGroups().flat().forEach(path => {
      path.classList.remove('is-letter-bulge');
      path.style.transform = '';
      path.style.filter = '';
    });
  }

  logo.addEventListener('mousemove', (event) => {
    if (!heroStage.classList.contains('is-hoverable')) return;

    const groups = getPathGroups();
    const pointerX = event.clientX;
    const pointerY = event.clientY;

    let best = null;

    groups.forEach((group, index) => {
      const rect = group[0].getBoundingClientRect();
      const margin = 26;
      const inside =
        pointerX >= rect.left - margin &&
        pointerX <= rect.right + margin &&
        pointerY >= rect.top - margin &&
        pointerY <= rect.bottom + margin;

      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(pointerX - cx, pointerY - cy);

      if (inside && (!best || dist < best.dist)) {
        best = { index, rect, dist };
      }
    });

    resetBulge();

    if (!best) return;

    const { index, rect } = best;
    const localX = ((pointerX - rect.left) / Math.max(rect.width, 1)) - 0.5;
    const localY = ((pointerY - rect.top) / Math.max(rect.height, 1)) - 0.5;

    const lift = -8 - Math.abs(localY) * 3;
    const scaleX = 1.075 + Math.abs(localX) * 0.045;
    const scaleY = 1.055 + Math.abs(localY) * 0.035;
    const rotateY = localX * 8;
    const rotateX = localY * -6;
    const skew = localX * 2.2;

    groups[index].forEach(path => {
      path.classList.add('is-letter-bulge');
      path.style.transform = `translate3d(0, ${lift}px, 0) perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) skewX(${skew}deg) scale(${scaleX}, ${scaleY})`;
      path.style.filter = 'drop-shadow(0 18px 20px rgba(28,38,41,.16))';
    });
  });

  logo.addEventListener('mouseleave', resetBulge);
}


function initNavScroll() {
  qsa('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;

      const target = qs(href);
      if (!target) return;

      event.preventDefault();
      const offset = target.getBoundingClientRect().top + window.scrollY - 84;
      smoothScrollTo(Math.max(0, offset), 980);
    });
  });
}

function smoothScrollTo(targetY, duration = 1000) {
  if (window.kultivateLenis) {
    window.kultivateLenis.scrollTo(targetY, {
      duration: duration / 1000,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
    });
    return;
  }

  const startY = window.scrollY;
  const diff = targetY - startY;
  const start = performance.now();
  const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

  function step(now) {
    const progress = Math.min(1, (now - start) / duration);
    window.scrollTo(0, startY + diff * easeOutExpo(progress));
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

function initFooterYear() {
  const yearEl = qs('[data-year]');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
}

function updateParallax() {
  if (reducedMotion || !speedItems.length) return;

  const viewportH = window.innerHeight;

  speedItems.forEach(item => {
    const speed = Number(item.dataset.speed || 0.05);
    const rect = item.getBoundingClientRect();
    const centerOffset = (rect.top + rect.height / 2) - viewportH / 2;
    const translateY = centerOffset * speed * -1;
    item.style.transform = `translate3d(0, ${translateY}px, 0)`;
  });

  parallaxFrame = null;
}

function requestParallax() {
  if (parallaxFrame !== null) return;
  parallaxFrame = requestAnimationFrame(updateParallax);
}

function initParallax() {
  if (reducedMotion || !speedItems.length) return;
  requestParallax();
  window.addEventListener('scroll', requestParallax, { passive: true });
  window.addEventListener('resize', requestParallax);
}

function initTiltCards() {
  if (reducedMotion || !tiltCards.length) return;

  tiltCards.forEach(card => {
    let frame = null;

    const reset = () => {
      card.style.transform = 'translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg)';
    };

    card.addEventListener('mousemove', (event) => {
      const rect = card.getBoundingClientRect();
      const px = ((event.clientX - rect.left) / rect.width) - 0.5;
      const py = ((event.clientY - rect.top) / rect.height) - 0.5;

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rotateX = py * -4;
        const rotateY = px * 6;
        card.style.transform = `translate3d(0, -2px, 0) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });
    });

    card.addEventListener('mouseleave', reset);
    card.addEventListener('blur', reset, true);
  });
}


function initSmoothWheel() {
  if (reducedMotion) return;
  if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  if (!window.Lenis) return;

  const lenis = new Lenis({
    duration: 1.45,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    syncTouch: false,
    wheelMultiplier: 1.05,
    touchMultiplier: 1.2
  });

  window.kultivateLenis = lenis;

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }

  requestAnimationFrame(raf);
}

function initVinylCursor() {
  const cursor = qs('.vinyl-cursor');
  if (!cursor || reducedMotion) return;
  if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;
  let active = false;

  function render() {
    currentX += (targetX - currentX) * 0.34;
    currentY += (targetY - currentY) * 0.34;
    cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(render);
  }

  window.addEventListener('mousemove', (event) => {
    targetX = event.clientX;
    targetY = event.clientY;

    if (!active) {
      cursor.classList.add('is-visible');
      active = true;
      currentX = targetX;
      currentY = targetY;
    }
  }, { passive: true });

  document.addEventListener('mouseover', (event) => {
    if (event.target.closest('a, button, [role="button"], .tilt-card, .hero-logo-composite')) {
      cursor.classList.add('is-link');
    }
  });

  document.addEventListener('mouseout', (event) => {
    if (event.target.closest('a, button, [role="button"], .tilt-card, .hero-logo-composite')) {
      cursor.classList.remove('is-link');
    }
  });

  requestAnimationFrame(render);
}

document.addEventListener('DOMContentLoaded', () => {
  startHeroAnimation();
  initReveal();
  initHeroWarp();
  initNavScroll();
  initFooterYear();
  initParallax();
  initTiltCards();
  initSmoothWheel();
  initVinylCursor();
});
