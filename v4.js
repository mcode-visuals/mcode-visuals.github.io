'use strict';

// ─── Cursor coords ───────────────────────────────────────────────────────────
const coordsEl = document.getElementById('cursor-coords');
if (coordsEl) {
  document.addEventListener('mousemove', (e) => {
    coordsEl.textContent =
      String(e.clientX).padStart(4, '0') + ' · ' +
      String(e.clientY).padStart(4, '0');
  });
}


// ─── Lazy video play/pause ────────────────────────────────────────────────────
// Videos marked data-lazy start with preload="none" and no autoplay.
// They begin playing when within 300px of the viewport and pause when leaving.
const videoObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const v = entry.target;
    if (entry.isIntersecting) {
      if (v.readyState === 0) v.load();   // kick off load if untouched
      v.play().catch(() => {});            // silently ignore autoplay blocks
    } else {
      v.pause();
    }
  });
}, { rootMargin: '300px 0px' });

document.querySelectorAll('video[data-lazy]').forEach((v) => videoObserver.observe(v));


// ─── Glitch burst on scroll-in (fires once per element) ──────────────────────
const glitchObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const el = entry.target;
      el.classList.add('is-glitching');
      setTimeout(() => el.classList.remove('is-glitching'), 650);
      glitchObserver.unobserve(el);
    }
  });
}, { threshold: 0.3 });

document.querySelectorAll('.glitch-wrap').forEach((el) => glitchObserver.observe(el));


// ─── Fade in on scroll ────────────────────────────────────────────────────────
const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      fadeObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.v4-fade').forEach((el) => fadeObserver.observe(el));


// ─── Side nav: highlight active section ──────────────────────────────────────
const sidenav   = document.querySelector('.sidenav');
const sideLinks = sidenav ? [...sidenav.querySelectorAll('a[data-id]')] : [];
const idToLink  = new Map(sideLinks.map((a) => [a.dataset.id, a]));
const targets   = [...idToLink.keys()]
  .map((id) => document.getElementById(id))
  .filter(Boolean);

const navObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const link = idToLink.get(entry.target.id);
    if (!link) return;
    if (entry.isIntersecting) {
      sideLinks.forEach((l) => l.classList.remove('is-active'));
      link.classList.add('is-active');
    }
  });
}, { rootMargin: '-30% 0px -60% 0px' });

targets.forEach((el) => navObserver.observe(el));


// ─── Intro glitch on load ─────────────────────────────────────────────────────
window.addEventListener('load', () => {
  const introGlitch = document.querySelector('.intro .glitch-wrap');
  if (introGlitch) {
    setTimeout(() => {
      introGlitch.classList.add('is-glitching');
      setTimeout(() => introGlitch.classList.remove('is-glitching'), 650);
    }, 400);
  }
});
