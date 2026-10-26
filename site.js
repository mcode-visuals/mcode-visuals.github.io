'use strict';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;
const MOBILE = window.matchMedia('(max-width: 800px), (pointer: coarse)').matches;

// ─── Reload starts at the top ─────────────────────────────────────────────────
// Browsers restore the old scroll position (and the #section in the address) on
// reload; a refresh should instead bring back the beginning of the page.
(() => {
  const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  const isReload = nav ? nav.type === 'reload' : (performance.navigation && performance.navigation.type === 1);
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (isReload) {
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    window.scrollTo(0, 0);
    window.addEventListener('load', () => window.scrollTo(0, 0));
    window.addEventListener('pageshow', () => window.scrollTo(0, 0));
  }
})();

// ─── Menu (phones) ───────────────────────────────────────────────────────────
(() => {
  const btn = document.querySelector('.bar__menu');
  const panel = document.getElementById('panel');
  if (!btn || !panel) return;
  const set = (open) => {
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    btn.querySelector('.bar__label').textContent = open ? 'Close' : 'Index';
    document.body.style.overflow = open ? 'hidden' : '';
  };
  btn.addEventListener('click', () => set(panel.hidden));
  panel.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
  // clicking the empty area of the open panel closes it too
  panel.addEventListener('click', (e) => { if (e.target === panel) set(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) set(false); });
})();

// ─── Current section in the top bar ──────────────────────────────────────────
(() => {
  const now = document.getElementById('now');
  const secs = [...document.querySelectorAll('section[data-now]')];
  if (!now || !secs.length || !('IntersectionObserver' in window)) return;
  const live = new Set();
  const pick = () => {
    // the visible section whose top is closest to the top of the screen
    let best = null, bestTop = Infinity;
    live.forEach((s) => { const t = Math.abs(s.getBoundingClientRect().top); if (t < bestTop) { bestTop = t; best = s; } });
    if (best) { now.textContent = best.dataset.now; now.classList.add('on'); }
    else now.classList.remove('on');
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) live.add(e.target); else live.delete(e.target); });
    pick();
  }, { rootMargin: '-45% 0px -50% 0px' });
  secs.forEach((s) => io.observe(s));
})();

// ─── Index panel: preview on hover (mouse, wide screens) ─────────────────────
(() => {
  const panel = document.getElementById('panel');
  const box = panel && panel.querySelector('.panel__preview');
  if (!box || !window.matchMedia('(min-width: 1100px) and (hover: hover)').matches) return;
  const im = box.querySelector('img');
  panel.querySelectorAll('a[data-img]').forEach((a) => {
    const show = () => { im.src = a.dataset.img; box.classList.add('on'); };
    a.addEventListener('mouseenter', show);
    a.addEventListener('focus', show);
    a.addEventListener('mouseleave', () => box.classList.remove('on'));
    a.addEventListener('blur', () => box.classList.remove('on'));
  });
})();

// ─── Videos: lazy, light on phones ───────────────────────────────────────────
// Phones load small "-m.mp4" encodes and only the two most central visible
// videos play at once; many decoding streams make iOS Safari reload the page.
const pageVideos = (() => {
  if (MOBILE) {
    document.querySelectorAll('video source[src*=".mp4"]').forEach((s) => {
      s.src = s.getAttribute('src').replace(/\.mp4(\?.*)?$/, '-m.mp4$1');   // keeps the ?v= cache-buster
      s.parentElement.load();                                  // re-pick the source now that it changed
    });
  }
  const visible = new Set();
  let paused = false;                      // true while the viewer is open
  const play = (v) => { if (v.readyState === 0) v.load(); v.play().catch(() => {}); };

  function rebalance() {
    if (paused) { visible.forEach((v) => v.pause()); return; }
    const mid = window.innerHeight / 2;
    const center = (v) => { const r = v.getBoundingClientRect(); return Math.abs((r.top + r.bottom) / 2 - mid); };
    const limit = MOBILE ? 2 : Infinity;
    [...visible].sort((a, b) => center(a) - center(b)).forEach((v, i) => (i < limit ? play(v) : v.pause()));
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(({ target: v, isIntersecting }) => {
      if (isIntersecting) visible.add(v); else { visible.delete(v); v.pause(); }
    });
    rebalance();
  }, MOBILE ? { threshold: 0.35 } : { rootMargin: '300px 0px' });

  document.querySelectorAll('video[data-lazy]').forEach((v) => io.observe(v));
  return { hold(on) { paused = on; rebalance(); } };
})();

// ─── Reveal on scroll ────────────────────────────────────────────────────────
(() => {
  const items = document.querySelectorAll('.rv');
  if (reduced || !('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });
  items.forEach((el) => io.observe(el));
})();

// ─── Viewer: photos and videos ───────────────────────────────────────────────
// Tap/click any photo or video to open it large. Arrows, swipe left/right, or
// arrow keys move through the section; swipe up/down, Esc or X closes.
// Video uses our own slim control bar under the picture (the browser's native
// controls cover most of a small video).
(() => {
  const lb = document.getElementById('lb');
  if (!lb) return;
  const img = lb.querySelector('img');
  const vid = lb.querySelector('video');
  const ctl = lb.querySelector('.lb__ctl');
  const playBtn = lb.querySelector('.lb__play');
  const seek = lb.querySelector('.lb__seek');
  const timeEl = lb.querySelector('.lb__time');
  const countEl = lb.querySelector('.lb__count');
  const capEl = lb.querySelector('.lb__cap');
  const SEL = '.media img[data-lb], .media video[data-lazy]';
  let group = [], idx = 0, opener = null, scrubbing = false;

  // make videos obviously tappable
  document.querySelectorAll('.media video[data-lazy]').forEach((v) => {
    const m = v.closest('.media');
    m.classList.add('has-video');
    m.setAttribute('role', 'button');
    m.setAttribute('tabindex', '0');
    m.setAttribute('aria-label', 'Open video: ' + (v.getAttribute('aria-label') || ''));
  });

  const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  function syncBar() {
    const d = vid.duration || 0;
    if (!scrubbing) seek.value = d ? Math.round((vid.currentTime / d) * 1000) : 0;
    timeEl.textContent = fmt(vid.currentTime) + ' / ' + fmt(d);
  }
  function syncPlay() {
    const playing = !vid.paused;
    playBtn.classList.toggle('is-playing', playing);
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }
  vid.addEventListener('timeupdate', syncBar);
  vid.addEventListener('loadedmetadata', syncBar);
  vid.addEventListener('play', syncPlay);
  vid.addEventListener('pause', syncPlay);
  const toggle = () => { if (vid.paused) vid.play().catch(() => {}); else vid.pause(); };
  playBtn.addEventListener('click', toggle);
  vid.addEventListener('click', toggle);                       // tap the picture to pause / play
  seek.addEventListener('input', () => { scrubbing = true; if (vid.duration) vid.currentTime = (seek.value / 1000) * vid.duration; syncBar(); });
  seek.addEventListener('change', () => { scrubbing = false; });

  function show(i) {
    idx = (i + group.length) % group.length;
    const el = group[idx];
    countEl.textContent = (idx + 1) + ' / ' + group.length;
    const title = (el.closest('section').querySelector('h2') || {}).textContent || '';
    const what = el.tagName === 'VIDEO' ? (el.getAttribute('aria-label') || '') : (el.alt || '');
    capEl.textContent = what && !what.startsWith(title) ? title + ' \u2014 ' + what : (what || title);
    if (el.tagName === 'VIDEO') {
      img.hidden = true; img.removeAttribute('src');
      vid.hidden = false; ctl.hidden = false;
      vid.poster = el.getAttribute('poster') || '';
      vid.src = el.querySelector('source').getAttribute('src');   // small file on phones
      vid.play().catch(() => {});
      seek.value = 0; timeEl.textContent = '0:00'; syncPlay();
    } else {
      vid.pause(); vid.hidden = true; ctl.hidden = true; vid.removeAttribute('src'); vid.load();
      img.hidden = false;
      img.src = el.currentSrc ? el.currentSrc.replace('-sm.', '.') : el.src;
      img.alt = el.alt;
    }
  }
  function open(el) {
    opener = el;
    group = [...el.closest('section').querySelectorAll(SEL)];
    pageVideos.hold(true);
    show(group.indexOf(el));
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    lb.querySelector('.lb__x').focus();
  }
  function close() {
    lb.hidden = true;
    vid.pause(); vid.removeAttribute('src'); vid.load(); img.removeAttribute('src');
    document.body.style.overflow = '';
    pageVideos.hold(false);
    if (opener) (opener.closest('.media') || opener).focus({ preventScroll: true });
  }

  document.addEventListener('click', (e) => {
    const m = e.target.closest('.media');
    if (!m) return;
    const t = m.querySelector('img[data-lb], video[data-lazy]');
    if (t) open(t);
  });
  document.addEventListener('keydown', (e) => {
    if (lb.hidden) {
      const m = e.target.closest && e.target.closest('.media.has-video');
      if (m && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(m.querySelector('video')); }
      return;
    }
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(idx - 1);
    else if (e.key === 'ArrowRight') show(idx + 1);
    else if (e.key === ' ' && !vid.hidden && e.target !== seek) { e.preventDefault(); toggle(); }
  });
  lb.querySelector('.lb__x').addEventListener('click', close);
  lb.querySelector('.lb__p').addEventListener('click', () => show(idx - 1));
  lb.querySelector('.lb__n').addEventListener('click', () => show(idx + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lb__stage')) close(); });

  // swipe: left/right = next/previous, up or down = close
  let sx = 0, sy = 0, skip = false;
  lb.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { skip = true; return; }
    const t = e.touches[0];
    sx = t.clientX; sy = t.clientY;
    skip = !!e.target.closest('.lb__bar, button');          // controls are not swipe areas
  }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (skip || lb.hidden) return;
    const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) show(idx + (dx < 0 ? 1 : -1));
    else if (Math.abs(dy) > 90 && Math.abs(dy) > Math.abs(dx) * 1.3) close();
  }, { passive: true });
})();

// ─── Stage carousel dots ─────────────────────────────────────────────────────
(() => {
  const track = document.querySelector('.stages');
  const dots = document.querySelector('.dots');
  if (!track || !dots) return;
  const cards = [...track.children];
  cards.forEach((card, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', 'Show stage ' + (i + 1));
    b.addEventListener('click', () => {
      // scroll only the card row, never the page
      const tr = track.getBoundingClientRect(), cr = card.getBoundingClientRect();
      track.classList.add('jump');           // snapping would stop the scroll at the next card
      track.scrollBy({ left: (cr.left + cr.width / 2) - (tr.left + tr.width / 2), behavior: reduced ? 'auto' : 'smooth' });
      clearTimeout(track._jump);
      track._jump = setTimeout(() => { track.classList.remove('jump'); update(); }, 900);
    });
    dots.appendChild(b);
  });
  function update() {
    const tr = track.getBoundingClientRect();
    const mid = tr.left + tr.width / 2;
    let best = 0, bestD = Infinity;
    cards.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - mid);
      if (d < bestD) { bestD = d; best = i; }
    });
    [...dots.children].forEach((b, i) => b.classList.toggle('on', i === best));
  }
  track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  window.addEventListener('resize', update);
  update();
})();

// ─── Copy email ──────────────────────────────────────────────────────────────
(() => {
  const btn = document.querySelector('.copy');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const mail = btn.dataset.mail;
    try { await navigator.clipboard.writeText(mail); btn.textContent = 'Copied'; }
    catch { btn.textContent = mail; }
    setTimeout(() => { btn.textContent = 'Copy email'; }, 2200);
  });
})();
