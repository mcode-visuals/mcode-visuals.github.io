// Hero animation: Attractor
// A Clifford strange attractor accumulates like a long exposure. The agent position bends its parameters.
// Edit freely: the engine (hero/engine.js) calls build(env) once, then frame(now) every animation frame.
HERO.register('attractor', function (env) {
  const { ctx, agent, small, reduced } = env;
  const { hue, fade, TAU, BG } = env.helpers;
  let W = env.W, H = env.H;
  const sync = () => { W = env.W; H = env.H; };   // canvas size can change (resize / rotate phone)

  function build() {
    const ITER = small ? 1800 : 4200;
    let x = .1, y = .1;
    ctx.clearRect(0, 0, W, H);
    return {
      resize() { sync(); ctx.clearRect(0, 0, W, H); },
      frame(now) { sync();
        fade(.04);
        const t = now * .00012;
        const px = agent.x / W - .5, py = agent.y / H - .5;       // the agent bends the attractor's parameters
        const a = -1.45 + Math.sin(t) * .22 + px * .5, b = 1.62 + Math.cos(t * 1.3) * .18 + py * .4;
        const c = 1.0 + Math.sin(t * .7) * .15, d = .72 + Math.cos(t * .9) * .12;
        const cx = W * (small ? .5 : .66), cy = H * (small ? .72 : .5), s = Math.min(W, H) * (small ? .17 : .21);
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < ITER; i++) {
          const nx = Math.sin(a * y) + c * Math.cos(a * x), ny = Math.sin(b * x) + d * Math.cos(b * y);
          x = nx; y = ny;
          if (i % 2) ctx.fillStyle = 'rgba(0,229,255,.24)'; else ctx.fillStyle = 'rgba(190,90,255,.2)';
          ctx.fillRect(cx + x * s, cy + y * s, 1.1, 1.1);
        }
        ctx.globalCompositeOperation = 'source-over';
      },
    };
  }

  return build();
}, 'Attractor');
