/* Hero engine: canvas sizing, pointer/touch input, the idle "agent", the animation loop and
   the picker buttons. Loaded last. Normally you do not need to edit this file; write animations in
   hero/variants/ instead (see hero/README.md). */
(() => {
  'use strict';
  const canvas = document.querySelector('.hero__net');
  if (!canvas || !window.HERO) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const IDLE_MS = 2200;            // no input for this long -> the agent wanders on its own
  const TAU = Math.PI * 2;
  const BG = '11,11,10';           // page background as r,g,b (used by fade())

  // Everything an animation can use. Read env.W / env.H each frame: they change on resize.
  const env = {
    canvas, ctx,
    W: 0, H: 0, dpr: 1,
    small: window.innerWidth < 700,                 // phone-sized: use fewer particles
    reduced,                                        // user asked for less motion
    agent: { x: 0, y: 0, active: false },           // what to follow: pointer, or a wandering point when idle
    pointer: { x: -1e4, y: -1e4, down: false },     // raw pointer, relative to the canvas (down = finger on screen)
    helpers: {
      TAU, BG,
      hue: (h, a) => `hsla(${h},100%,62%,${a})`,    // hue(185, .5) -> cyan at 50% opacity
      fade: (a) => { ctx.fillStyle = `rgba(${BG},${a})`; ctx.fillRect(0, 0, env.W, env.H); },   // soft clear -> trails
    },
    // Ask for an extra full-size canvas behind the text, e.g. for WebGL / three.js / shaders.
    // Get the context yourself: const c = env.layer(); const gl = c.getContext('webgl');
    // It is resized automatically (a 'hero-resize' event fires on it) and removed when you switch animation.
    layer() {
      const c = document.createElement('canvas');
      c.className = 'hero__net hero__net--layer';
      c.setAttribute('aria-hidden', 'true');
      canvas.after(c);
      layers.push(c); fitLayer(c);
      canvas.style.visibility = 'hidden';
      return c;
    },
  };

  const layers = [];
  const fitLayer = (c) => { c.width = Math.round(env.W * env.dpr); c.height = Math.round(env.H * env.dpr); c.dispatchEvent(new Event('hero-resize')); };

  function size() {
    env.dpr = Math.min(window.devicePixelRatio || 1, 2);
    env.W = canvas.clientWidth; env.H = canvas.clientHeight;
    canvas.width = Math.round(env.W * env.dpr); canvas.height = Math.round(env.H * env.dpr);
    ctx.setTransform(env.dpr, 0, 0, env.dpr, 0, 0);
    layers.forEach(fitLayer);
  }

  let current = null, visible = true, lastInput = -1e9, lastWidth = window.innerWidth, framesLeft = Infinity, running = false;

  function setVariant(name) {
    if (!HERO.variants[name]) name = HERO.order[0];
    if (current && current.destroy) { try { current.destroy(); } catch (e) { console.error(e); } }
    layers.splice(0).forEach((c) => c.remove());
    canvas.style.visibility = '';
    ctx.setTransform(env.dpr, 0, 0, env.dpr, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, env.W, env.H);
    try { current = HERO.variants[name].factory(env); } catch (e) { console.error('hero animation "' + name + '" failed to build:', e); current = null; }
    canvas.dataset.variant = name;
    framesLeft = reduced ? 90 : Infinity;      // reduced motion: draw a still after ~1.5 s, then stop
    document.querySelectorAll('.hero__pick button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === name)));
    try { localStorage.setItem('mcode-hero', name); } catch (e) { /* private mode */ }
    if (!running) { running = true; requestAnimationFrame(frame); }
  }

  function frame(now) {
    if (framesLeft <= 0) { running = false; return; }
    requestAnimationFrame(frame);
    if (!visible || !current) return;
    const idle = !env.pointer.down && now - lastInput > IDLE_MS;
    const a = env.agent;
    a.active = !idle;
    const tx = idle ? env.W * (.5 + .36 * Math.cos(now * .00052) * Math.cos(now * .00011)) : env.pointer.x;
    const ty = idle ? env.H * (.46 + .24 * Math.sin(now * .00077)) : env.pointer.y;
    if (!frame.ready) { a.x = tx; a.y = ty; frame.ready = true; }
    const ease = idle ? .04 : .28;             // glides between wandering and following
    a.x += (tx - a.x) * ease; a.y += (ty - a.y) * ease;
    try { current.frame(now); } catch (e) { console.error('hero frame error:', e); current = null; }
    framesLeft--;
  }

  // ── input ────────────────────────────────────────────────────────────────
  const rel = (x, y) => { const r = canvas.getBoundingClientRect(); env.pointer.x = x - r.left; env.pointer.y = y - r.top; lastInput = performance.now(); };
  document.addEventListener('mousemove', (e) => rel(e.clientX, e.clientY));
  const touch = (e) => { env.pointer.down = true; rel(e.touches[0].clientX, e.touches[0].clientY); };
  document.addEventListener('touchstart', touch, { passive: true });
  document.addEventListener('touchmove', touch, { passive: true });
  document.addEventListener('touchend', () => { env.pointer.down = false; lastInput = performance.now(); }, { passive: true });

  size();
  window.addEventListener('resize', () => {
    const widthChanged = window.innerWidth !== lastWidth; lastWidth = window.innerWidth;   // phones resize when the toolbar hides
    size();
    if (current && current.resize) current.resize(widthChanged);
  });
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(canvas);   // pause when scrolled away

  // ── picker (a preview tool; delete the .hero__pick block in index.html to remove it) ──
  const pick = document.querySelector('.hero__pick');
  const wrap = document.querySelector('.hero__pickwrap');
  if (wrap && !new URLSearchParams(location.search).has('pick')) wrap.hidden = true;   // visitors don't see it; open /?pick to show it
  if (pick) {
    HERO.order.forEach((name, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.v = name; b.setAttribute('aria-pressed', 'false');
      b.textContent = (i + 1) + ' ' + HERO.variants[name].label;
      b.addEventListener('click', () => setVariant(name));
      pick.appendChild(b);
    });
  }

  let start = new URLSearchParams(location.search).get('hero');
  if (!start) { try { start = localStorage.getItem('mcode-hero'); } catch (e) { /* ignore */ } }
  setVariant(start);
})();
