import { projects } from './projects.js?v=202611151659';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const lerp = (a, b, t) => a + (b - a) * t;
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

/* --------------------------------------------------------------------------
   Projects
   -------------------------------------------------------------------------- */
const arrow = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M1 8h14M9 2l6 6-6 6"/></svg>';
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function renderProjects() {
  const list = $('[data-projects]');
  if (!list) return;
  const rows = projects.map((p, i) => `
    <li class="project" data-reveal style="--d:${i * 0.08}s">
      <a class="project__link" href="${esc(p.url)}" target="_blank" rel="noopener"
         aria-label="${esc(p.name)}, ${esc(p.category)} (opens in a new tab)">
        <span class="project__num">${String(i + 1).padStart(2, '0')}</span>
        <div class="project__main">
          <h3 class="project__name">${esc(p.name)}</h3>
          ${p.summary ? `<p class="project__summary">${esc(p.summary)}</p>` : ''}
          ${p.tags?.length ? `<div class="project__tags">${p.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
        </div>
        <span class="project__cat">${esc(p.category)}</span>
        <span class="project__year">${p.year ? esc(p.year) : `<i class="dot"></i>${esc(p.status || '')}`}</span>
        <span class="project__arrow">${arrow}</span>
      </a>
    </li>`);

  rows.push(`
    <li class="project project--next" data-reveal>
      <a class="project__link" href="#contact">
        <span class="project__num">${String(projects.length + 1).padStart(2, '0')}</span>
        <div class="project__main">
          <h3 class="project__name">Your project</h3>
          <p class="project__summary">Have an idea that deserves to be built with care? Let’s talk.</p>
        </div>
        <span class="project__cat">Next</span>
        <span class="project__year"></span>
        <span class="project__arrow">${arrow}</span>
      </a>
    </li>`);
  list.innerHTML = rows.join('');
}

/* --------------------------------------------------------------------------
   Text splitting + reveal on scroll
   -------------------------------------------------------------------------- */
function splitLines() {
  $$('[data-split]').forEach((el) => {
    const parts = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = parts
      .map((part, i) => `<span class="split-line"><span style="--d:${(i * 0.12).toFixed(2)}s">${part.trim()}</span></span>`)
      .join('');
  });
}

function initReveal() {
  const targets = $$('[data-reveal], [data-split]');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
  targets.forEach((el) => io.observe(el));
}

/* --------------------------------------------------------------------------
   Cursor + magnetic elements
   -------------------------------------------------------------------------- */
function initCursor() {
  if (!finePointer) return;
  const cursor = $('.cursor');
  const dot = $('.cursor__dot');
  const ring = $('.cursor__ring');
  const label = $('.cursor__label');
  const m = { x: -100, y: -100 }, r = { x: -100, y: -100 };

  window.addEventListener('pointermove', (e) => { m.x = e.clientX; m.y = e.clientY; }, { passive: true });

  document.addEventListener('pointerover', (e) => {
    const labelled = e.target.closest('[data-cursor]');
    const interactive = e.target.closest('a, button');
    cursor.classList.toggle('is-label', !!labelled);
    cursor.classList.toggle('is-hover', !!interactive && !labelled);
    if (labelled) label.textContent = labelled.dataset.cursor;
  });
  document.addEventListener('pointerleave', () => { m.x = m.y = -100; });

  (function loop() {
    r.x = lerp(r.x, m.x, 0.16);
    r.y = lerp(r.y, m.y, 0.16);
    dot.style.transform = `translate3d(${m.x}px, ${m.y}px, 0)`;
    ring.style.transform = `translate3d(${r.x}px, ${r.y}px, 0)`;
    requestAnimationFrame(loop);
  })();
}

function initMagnetic() {
  if (!finePointer || reducedMotion) return;
  $$('[data-magnetic]').forEach((el) => {
    const inner = el.firstElementChild;
    el.addEventListener('pointermove', (e) => {
      const b = el.getBoundingClientRect();
      const x = e.clientX - b.left - b.width / 2;
      const y = e.clientY - b.top - b.height / 2;
      el.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      if (inner) inner.style.transform = `translate(${x * 0.12}px, ${y * 0.12}px)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transition = 'transform .8s cubic-bezier(.22,.8,.2,1)';
      el.style.transform = '';
      if (inner) { inner.style.transition = el.style.transition; inner.style.transform = ''; }
      setTimeout(() => { el.style.transition = ''; if (inner) inner.style.transition = ''; }, 800);
    });
  });
}

/* --------------------------------------------------------------------------
   Navigation
   -------------------------------------------------------------------------- */
function initNav() {
  const nav = $('.nav');
  const toggle = $('.nav__toggle');
  let last = 0;

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    nav.classList.toggle('is-hidden', y > last && y > 400 && !nav.classList.contains('is-open'));
    last = y;
  }, { passive: true });

  const menu = $('.nav__links');
  const mobileMq = window.matchMedia('(max-width: 760px)');
  const syncInert = () => { menu.inert = mobileMq.matches && !nav.classList.contains('is-open'); };
  mobileMq.addEventListener('change', syncInert);
  syncInert();
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('is-open')) toggle.click(); });

  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    syncInert();
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
  });
  $$('.nav__links a').forEach((a) => a.addEventListener('click', () => {
    if (!nav.classList.contains('is-open')) return;
    nav.classList.remove('is-open');
    syncInert();
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }));

  // Active section highlight.
  const links = new Map($$('.nav__links a').map((a) => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => { a.classList.remove('is-active'); a.removeAttribute('aria-current'); });
      const a = links.get(e.target.id);
      a?.classList.add('is-active');
      a?.setAttribute('aria-current', 'true');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('section[id]').forEach((s) => io.observe(s));
}

/* Gentle parallax on the big kanji. */
function initParallax() {
  if (reducedMotion) return;
  const kanji = $('.hero__kanji');
  window.addEventListener('scroll', () => {
    if (kanji) kanji.style.transform = `translateY(calc(-50% + ${window.scrollY * 0.25}px))`;
  }, { passive: true });
}

/* --------------------------------------------------------------------------
   Loader + WebGL
   -------------------------------------------------------------------------- */
async function boot() {
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
  renderProjects();
  splitLines();
  initNav();
  initCursor();
  initMagnetic();
  initParallax();

  const bar = $('.loader__bar span');
  const count = $('[data-count]');
  let shown = 0, goal = 10;
  const tick = () => {
    shown = Math.min(goal, shown + Math.max(1, (goal - shown) * 0.12));
    count.textContent = Math.round(shown);
    bar.style.transform = `scaleX(${shown / 100})`;
    if (shown < 100) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // WebGL is progressive enhancement: the site works without it.
  let scene = null;
  const canvas = $('.webgl');
  const scenePromise = import('./scene.js?v=202611151659')
    .then(({ createScene }) => { scene = createScene(canvas, { reducedMotion }); })
    .catch((err) => { console.warn('WebGL disabled:', err); canvas.remove(); })
    .finally(() => { goal = Math.max(goal, 70); });

  const fonts = (document.fonts?.ready || Promise.resolve()).then(() => { goal = Math.max(goal, 45); });
  const minTime = new Promise((r) => setTimeout(r, reducedMotion ? 0 : 1400));
  const maxTime = new Promise((r) => setTimeout(r, 5000));

  await Promise.race([Promise.all([scenePromise, fonts, minTime]), maxTime]);
  goal = 100;
  await new Promise((r) => setTimeout(r, reducedMotion ? 0 : 450));

  document.body.classList.remove('is-loading');
  document.body.classList.add('is-loaded');
  scene?.start();
  setTimeout(initReveal, reducedMotion ? 0 : 350);
}

boot();
