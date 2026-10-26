// Hero animation: Proximity
// Points drift in a shared flow and link to their neighbours. The agent (cursor / finger / wandering point) pulls nearby points toward it.
// Edit freely: the engine (hero/engine.js) calls build(env) once, then frame(now) every animation frame.
HERO.register('proximity', function (env) {
  const { ctx, agent, small, reduced } = env;
  const { hue, fade, TAU, BG } = env.helpers;
  let W = env.W, H = env.H;
  const sync = () => { W = env.W; H = env.H; };   // canvas size can change (resize / rotate phone)

  function build() {
    const COUNT = small ? 46 : 96, LINK = small ? 90 : 120, CL = small ? 150 : 230;
    let pts = [];
    const seed = () => { pts = Array.from({ length: COUNT }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3 })); };
    seed();
    return {
      resize(widthChanged) { sync(); if (widthChanged) seed(); },
      frame(now) { sync();
        ctx.clearRect(0, 0, W, H);
        const mx = agent.x, my = agent.y;
        for (const p of pts) {
          p.vx += Math.sin(p.y * .006 + now * .0004) * .004;
          p.vy += Math.cos(p.x * .006 + now * .0005) * .004;
          const dx = mx - p.x, dy = my - p.y, d2 = dx * dx + dy * dy;
          if (d2 < CL * CL && d2 > 1) { const d = Math.sqrt(d2); p.vx += dx / d * .035; p.vy += dy / d * .035; }
          p.vx = Math.max(-.9, Math.min(.9, p.vx * .996)); p.vy = Math.max(-.9, Math.min(.9, p.vy * .996));
          p.x += p.vx; p.y += p.vy;
          if (p.x < -20) p.x = W + 20; else if (p.x > W + 20) p.x = -20;
          if (p.y < -20) p.y = H + 20; else if (p.y > H + 20) p.y = -20;
        }
        ctx.lineWidth = 1;
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i];
          for (let j = i + 1; j < pts.length; j++) {
            const b = pts[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
            if (d2 < LINK * LINK) { ctx.strokeStyle = `rgba(242,241,236,${((1 - Math.sqrt(d2) / LINK) * .2).toFixed(3)})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
          }
          ctx.fillStyle = 'rgba(242,241,236,.5)'; ctx.fillRect(a.x - .8, a.y - .8, 1.6, 1.6);
        }
        let linked = false;
        for (const p of pts) {
          const dx = p.x - agent.x, dy = p.y - agent.y, d2 = dx * dx + dy * dy;
          if (d2 < CL * CL) {
            linked = true; const t = 1 - Math.sqrt(d2) / CL;
            ctx.strokeStyle = `rgba(0,229,255,${(t * .6).toFixed(3)})`; ctx.beginPath(); ctx.moveTo(agent.x, agent.y); ctx.lineTo(p.x, p.y); ctx.stroke();
            ctx.fillStyle = `rgba(0,229,255,${(.35 + t * .6).toFixed(3)})`; ctx.fillRect(p.x - 1.4, p.y - 1.4, 2.8, 2.8);
          }
        }
        if (linked) { ctx.fillStyle = 'rgba(0,229,255,.95)'; ctx.fillRect(agent.x - 1.6, agent.y - 1.6, 3.2, 3.2); ctx.strokeStyle = 'rgba(0,229,255,.2)'; ctx.beginPath(); ctx.arc(agent.x, agent.y, 24, 0, TAU); ctx.stroke(); }
      },
    };
  }

  return build();
}, 'Proximity');
