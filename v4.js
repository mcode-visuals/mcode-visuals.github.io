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
    .filter((el) => !el.closest('.room__bg') && !el.closest('.intro__bg')
                 && !el.classList.contains('setlist__alt'));
  if (!items.length) return;

  const box = document.createElement('div');
  box.className = 'lightbox';
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Media viewer');
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
      img.src = el.src; // always the full-size asset, not a srcset variant
      img.alt = el.alt || '';
      stage.appendChild(img);
    }

    const flag = el.closest('.section')?.querySelector('.section__flag');
    const ch    = flag?.querySelector('.section__flag-ch')?.textContent || '';
    const title = flag?.querySelector('.section__flag-title')?.textContent || '';
    caption.textContent = ch && title ? `${ch} — ${title}` : '';
    counter.textContent = `${pad(current + 1)} / ${pad(items.length)}`;
  }

  let lastFocused = null;

  function open(i) {
    lastFocused = document.activeElement;
    show(i);
    box.hidden = false;
    document.body.style.overflow = 'hidden';
    box.querySelector('.lightbox__btn--close').focus();
  }

  function close() {
    box.hidden = true;
    stage.innerHTML = '';
    document.body.style.overflow = '';
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  items.forEach((el, i) => {
    el.classList.add('lb-target');
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    if (!el.getAttribute('aria-label') && !el.alt) {
      el.setAttribute('aria-label', 'View media larger');
    }
    el.addEventListener('click', () => open(i));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); }
    });
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
    else if (e.key === 'Tab') {
      // trap focus within the lightbox controls
      const focusables = [...box.querySelectorAll('.lightbox__btn')];
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!box.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    }
  });
})();


// ─── Setlist hover crossfade ──────────────────────────────────────────────────
// Second clip loads on first hover only, fades in once it's actually playing.
document.querySelectorAll('.setlist__item').forEach((item) => {
  const alt = item.querySelector('.setlist__alt');
  if (!alt) return;
  let hovered = false;

  alt.addEventListener('playing', () => {
    if (hovered) item.classList.add('is-alt');
  });

  item.addEventListener('mouseenter', () => {
    hovered = true;
    if (!alt.src) alt.src = alt.dataset.altSrc;
    alt.play().catch(() => {});
  });

  item.addEventListener('mouseleave', () => {
    hovered = false;
    item.classList.remove('is-alt');
    alt.pause();
  });
});


// ─── Generative layer ─────────────────────────────────────────────────────────
// Four systems sharing one rAF loop:
//   1. Proximity field — the intro runs an agent/connection system (the
//      Proximity piece itself); the visitor's cursor joins as an agent.
//   2. Presence echoes — ghost crosshairs trail the cursor through time
//      (State V: "you are here, and you were here, and both are true").
//   3. Signal interference — fast scrolling degrades the signal: grain
//      thickens and horizontal tear bands jitter until it settles.
//   4. Ghost number parallax — section numbers drift against the scroll.
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const root = document.documentElement;

  // — 1. Proximity field —
  const canvas = document.querySelector('.intro__net');
  const ctx = canvas ? canvas.getContext('2d') : null;
  const COUNT = window.innerWidth < 700 ? 42 : 88;
  const LINK = 110;          // px — connection distance
  const CURSOR_LINK = 240;   // px — cursor connection distance
  let pts = [], W = 0, H = 0, canvasTop = 0, introVisible = true;
  const mouse = { x: -1e4, y: -1e4 };

  function sizeCanvas() {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvasTop = canvas.getBoundingClientRect().top + window.scrollY;
  }

  function seedPoints() {
    pts = Array.from({ length: COUNT }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
    }));
  }

  function drawField() {
    ctx.clearRect(0, 0, W, H);
    const mx = mouse.x, my = mouse.y - (canvasTop - window.scrollY);

    for (const p of pts) {
      if (!reduced) {
        // gentle pull toward the cursor-agent
        const dx = mx - p.x, dy = my - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < CURSOR_LINK * CURSOR_LINK && d2 > 1) {
          const d = Math.sqrt(d2);
          p.vx += (dx / d) * 0.035;
          p.vy += (dy / d) * 0.035;
        }
        p.vx = Math.max(-0.9, Math.min(0.9, p.vx));
        p.vy = Math.max(-0.9, Math.min(0.9, p.vy));
        p.x += p.vx; p.y += p.vy;
        if (p.x < -20) p.x = W + 20; else if (p.x > W + 20) p.x = -20;
        if (p.y < -20) p.y = H + 20; else if (p.y > H + 20) p.y = -20;
      }
    }

    // point-to-point connections
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      for (let j = i + 1; j < pts.length; j++) {
        const b = pts[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < LINK * LINK) {
          const alpha = (1 - Math.sqrt(d2) / LINK) * 0.15;
          ctx.strokeStyle = `rgba(240,239,233,${alpha.toFixed(3)})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      ctx.fillStyle = 'rgba(240,239,233,0.45)';
      ctx.fillRect(a.x - 0.75, a.y - 0.75, 1.5, 1.5);
    }

    // cursor-to-point connections — the visitor as an agent, in accent
    if (finePointer && mx > -100 && my > -100 && my < H + 100) {
      let linked = false;
      for (const p of pts) {
        const dx = p.x - mx, dy = p.y - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < CURSOR_LINK * CURSOR_LINK) {
          linked = true;
          const t = 1 - Math.sqrt(d2) / CURSOR_LINK;
          ctx.strokeStyle = `rgba(0,229,255,${(t * 0.55).toFixed(3)})`;
          ctx.lineWidth = 1 + t * 0.6;
          ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(p.x, p.y); ctx.stroke();
          // linked points light up in accent
          ctx.fillStyle = `rgba(0,229,255,${(0.3 + t * 0.6).toFixed(3)})`;
          ctx.fillRect(p.x - 1.25, p.y - 1.25, 2.5, 2.5);
        }
      }
      ctx.lineWidth = 1;
      // the cursor-agent itself: accent node + halo ring
      if (linked) {
        ctx.fillStyle = 'rgba(0,229,255,0.9)';
        ctx.fillRect(mx - 1.5, my - 1.5, 3, 3);
        ctx.strokeStyle = 'rgba(0,229,255,0.18)';
        ctx.beginPath(); ctx.arc(mx, my, 26, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }

  if (canvas) {
    sizeCanvas(); seedPoints();
    window.addEventListener('resize', () => { sizeCanvas(); seedPoints(); });
    new IntersectionObserver((entries) => {
      introVisible = entries[0].isIntersecting;
    }).observe(canvas);
  }

  document.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });

  // — 2. Presence echoes —
  const ECHO_DELAYS = [300, 600, 900]; // ms behind the cursor
  const trail = [];                    // ring buffer of {x, y, t}
  let echoEls = [];
  if (finePointer && !reduced) {
    echoEls = ECHO_DELAYS.map((_, i) => {
      const el = document.createElement('span');
      el.className = 'cursor-echo';
      el.setAttribute('aria-hidden', 'true');
      el.textContent = '+';
      el.style.opacity = String(0.65 - i * 0.2);
      el.style.fontSize = (16 - i * 3) + 'px';
      document.body.appendChild(el);
      return el;
    });
  }

  function drawEchoes(now) {
    if (!echoEls.length) return;
    trail.push({ x: mouse.x, y: mouse.y, t: now });
    while (trail.length > 90) trail.shift();
    echoEls.forEach((el, i) => {
      const target = now - ECHO_DELAYS[i];
      let pos = null;
      for (let k = trail.length - 1; k >= 0; k--) {
        if (trail[k].t <= target) { pos = trail[k]; break; }
      }
      if (pos) el.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`;
    });
  }

  // — 3. Signal interference —
  const itfBands = [...document.querySelectorAll('.interference span')];
  let lastScrollY = window.scrollY;
  let interference = 0;

  function drawInterference() {
    const dy = Math.abs(window.scrollY - lastScrollY);
    lastScrollY = window.scrollY;
    interference = Math.max(interference * 0.88, Math.min(1, dy / 110));
    if (interference < 0.02) {
      if (interference !== 0) { interference = 0; root.style.setProperty('--itf', '0'); }
      itfBands.forEach((b) => { b.style.opacity = '0'; });
      return;
    }
    root.style.setProperty('--itf', interference.toFixed(3));
    itfBands.forEach((b) => {
      b.style.top = (Math.random() * 100) + '%';
      b.style.transform = `translateX(${((Math.random() - 0.5) * 60 * interference).toFixed(1)}px)`;
      b.style.opacity = (interference * 0.5).toFixed(3);
    });
  }

  // — 4. Ghost number parallax —
  const ghosts = [...document.querySelectorAll('.section__ghost')].map((el) => ({
    el, section: el.closest('.section'),
  }));

  function drawParallax() {
    const vh = window.innerHeight;
    const moves = [];
    for (const g of ghosts) {
      const r = g.section.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      const progress = (vh - r.top) / (vh + r.height); // 0 entering → 1 leaving
      moves.push([g.el, (progress - 0.5) * -130]);
    }
    for (const [el, ty] of moves) el.style.transform = `translateY(${ty.toFixed(1)}px)`;
  }

  // — shared loop —
  let lastParallaxY = -1;
  function loop(now) {
    if (canvas && introVisible) drawField();
    if (!reduced) {
      drawEchoes(now);
      drawInterference();
      if (window.scrollY !== lastParallaxY) {
        lastParallaxY = window.scrollY;
        drawParallax();
      }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
