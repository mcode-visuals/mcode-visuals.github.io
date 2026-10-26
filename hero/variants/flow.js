// Hero animation: Flow
// Particles leave trails in a drifting flow field. The agent stirs the flow into a swirl.
// Edit freely: the engine (hero/engine.js) calls build(env) once, then frame(now) every animation frame.
HERO.register('flow', function (env) {
  const { ctx, agent, small, reduced } = env;
  const { hue, fade, TAU, BG } = env.helpers;
  let W = env.W, H = env.H;
  const sync = () => { W = env.W; H = env.H; };   // canvas size can change (resize / rotate phone)

  function build() {
    const N = small ? 520 : 1300;
    let ps = [];
    const spawn = (p) => { p.x = Math.random() * W; p.y = Math.random() * H; p.age = Math.random() * 220; p.px = p.x; p.py = p.y; return p; };
    const seed = () => { ps = Array.from({ length: N }, () => spawn({})); ctx.clearRect(0, 0, W, H); };
    seed();
    return {
      resize(widthChanged) { sync(); if (widthChanged) seed(); },
      frame(now) { sync();
        fade(.06);
        const t = now * .00007;
        ctx.lineWidth = 1;
        for (const p of ps) {
          const a = (Math.sin(p.x * .0021 + t * 3) * Math.cos(p.y * .0027 - t * 2) * 2.4 + Math.sin((p.x + p.y) * .0014 + t * 4)) * 1.4;
          let vx = Math.cos(a) * 1.35, vy = Math.sin(a) * 1.35;
          const dx = p.x - agent.x, dy = p.y - agent.y, d2 = dx * dx + dy * dy, R = small ? 120 : 170;
          if (d2 < R * R && d2 > 1) {                     // the agent stirs the flow into a swirl
            const d = Math.sqrt(d2), k = (1 - d / R) * 2.6;
            vx += (-dy / d) * k + (dx / d) * k * .5; vy += (dx / d) * k + (dy / d) * k * .5;
          }
          p.px = p.x; p.py = p.y; p.x += vx; p.y += vy; p.age++;
          if (p.x < 0 || p.x > W || p.y < 0 || p.y > H || p.age > 320) { spawn(p); continue; }
          ctx.strokeStyle = hue(185 + ((a * 40) % 110 + 110) % 110, .62);
          ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
        }
      },
    };
  }

  return build();
}, 'Flow');
