// Hero animation: Slitscan
// Time smeared into ribbons: the picture scrolls left and a fresh column from moving sources is drawn at the right edge.
// Edit freely: the engine (hero/engine.js) calls build(env) once, then frame(now) every animation frame.
HERO.register('slitscan', function (env) {
  const { ctx, agent, small, reduced } = env;
  const { hue, fade, TAU, BG } = env.helpers;
  let W = env.W, H = env.H;
  const sync = () => { W = env.W; H = env.H; };   // canvas size can change (resize / rotate phone)

  function build() {
    const buf = document.createElement('canvas'), bctx = buf.getContext('2d');
    const STEP = small ? 2 : 3, BAND = 3;
    const reset = () => { buf.width = env.canvas.width; buf.height = env.canvas.height; ctx.clearRect(0, 0, W, H); };
    reset();
    const srcs = [{ f: .00031, p: 0, h: 188 }, { f: .00047, p: 1.7, h: 268 }, { f: .00023, p: 3.1, h: 320 }, { f: .00059, p: 4.4, h: 205 }, { f: .00039, p: 5.5, h: 285 }];
    return {
      resize() { sync(); reset(); },
      frame(now) { sync();
        // shift the whole picture left: the right edge is "now", the rest is the past
        bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.clearRect(0, 0, buf.width, buf.height); bctx.drawImage(env.canvas, 0, 0);
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, env.canvas.width, env.canvas.height);
        ctx.drawImage(buf, -STEP * env.dpr, 0); ctx.restore();
        const list = srcs.map((s) => ({ y: H * (.5 + .36 * Math.sin(now * s.f + s.p) * Math.cos(now * s.f * .37 + s.p)), h: s.h, w: 1 }));
        if (agent.active || env.pointer.down) list.push({ y: agent.y, h: 160, w: 1.6 });
        const sig = H * (small ? .07 : .06);
        for (let y = 0; y < H; y += BAND) {
          let I = 0, hh = 0, wsum = 0;
          for (const s of list) { const g = Math.exp(-((y - s.y) ** 2) / (2 * sig * sig)) * s.w; I += g; hh += g * s.h; wsum += g; }
          if (I < .035) continue;
          ctx.fillStyle = hue(hh / wsum, Math.min(.75, I * .6));
          ctx.fillRect(W - STEP, y, STEP + .5, BAND);
        }
      },
    };
  }

  return build();
}, 'Slitscan');
