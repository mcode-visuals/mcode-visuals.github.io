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


// ─── REC timecode ─────────────────────────────────────────────────────────────
const recTime = document.getElementById('rec-time');
if (recTime) {
  const tick = () => { recTime.textContent = new Date().toTimeString().slice(0, 8); };
  tick();
  setInterval(tick, 1000);
}


// ─── Scroll progress line ─────────────────────────────────────────────────────
const progressEl = document.querySelector('.scroll-progress');
if (progressEl) {
  let progressQueued = false;
  const paint = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    progressEl.style.width = (max > 0 ? (doc.scrollTop / max) * 100 : 0) + '%';
    progressQueued = false;
  };
  window.addEventListener('scroll', () => {
    if (!progressQueued) { progressQueued = true; requestAnimationFrame(paint); }
  }, { passive: true });
  paint();
}


// ─── Copy email on click ──────────────────────────────────────────────────────
const emailLink = document.getElementById('contact-email');
const emailHint = document.getElementById('email-hint');
if (emailLink && emailHint) {
  let hintTimer = null;
  emailLink.addEventListener('click', (e) => {
    if (!navigator.clipboard) return; // fall through to mailto
    e.preventDefault();
    navigator.clipboard.writeText('m.scandola1998@gmail.com').then(() => {
      emailHint.textContent = '// copied to clipboard';
      emailHint.classList.add('is-copied');
      clearTimeout(hintTimer);
      hintTimer = setTimeout(() => {
        emailHint.textContent = '// click to copy';
        emailHint.classList.remove('is-copied');
      }, 2000);
    });
  });
}


// ─── Lightbox ─────────────────────────────────────────────────────────────────
// Click any project image/video to view it large. ← → navigate, ESC closes.
// Ambient backgrounds (.room__bg, .intro__bg) stay non-interactive.
(() => {
  const items = [...document.querySelectorAll('.section img, .section video')]
    .filter((el) => !el.closest('.room__bg') && !el.closest('.intro__bg'));
  if (!items.length) return;

  const box = document.createElement('div');
  box.className = 'lightbox';
  box.hidden = true;
  box.innerHTML = `
    <div class="lightbox__stage"></div>
    <div class="lightbox__bar">
      <span class="lightbox__caption"></span>
      <span class="lightbox__nav">
        <button class="lightbox__btn" data-dir="-1" aria-label="Previous">&larr;</button>
        <span class="lightbox__counter"></span>
        <button class="lightbox__btn" data-dir="1" aria-label="Next">&rarr;</button>
        <button class="lightbox__btn lightbox__btn--close" aria-label="Close">ESC</button>
      </span>
    </div>`;
  document.body.appendChild(box);

  const stage   = box.querySelector('.lightbox__stage');
  const caption = box.querySelector('.lightbox__caption');
  const counter = box.querySelector('.lightbox__counter');
  let current = -1;

  const pad = (n) => String(n).padStart(2, '0');

  function show(i) {
    current = (i + items.length) % items.length;
    const el = items[current];
    stage.innerHTML = '';

    if (el.tagName === 'VIDEO') {
      const src = el.querySelector('source')?.src || el.src;
      const v = document.createElement('video');
      v.src = src;
      v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
      stage.appendChild(v);
    } else {
      const img = new Image();
      img.src = el.currentSrc || el.src;
      img.alt = el.alt || '';
      stage.appendChild(img);
    }

    const flag = el.closest('.section')?.querySelector('.section__flag');
    const ch    = flag?.querySelector('.section__flag-ch')?.textContent || '';
    const title = flag?.querySelector('.section__flag-title')?.textContent || '';
    caption.textContent = ch && title ? `${ch} — ${title}` : '';
    counter.textContent = `${pad(current + 1)} / ${pad(items.length)}`;
  }

  function open(i) {
    show(i);
    box.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function close() {
    box.hidden = true;
    stage.innerHTML = '';
    document.body.style.overflow = '';
  }

  items.forEach((el, i) => {
    el.classList.add('lb-target');
    el.addEventListener('click', () => open(i));
  });

  box.addEventListener('click', (e) => {
    const btn = e.target.closest('.lightbox__btn');
    if (btn) {
      if (btn.dataset.dir) show(current + Number(btn.dataset.dir));
      else close();
      return;
    }
    if (!e.target.closest('.lightbox__bar')) close(); // backdrop click
  });

  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(current - 1);
    else if (e.key === 'ArrowRight') show(current + 1);
  });
})();
