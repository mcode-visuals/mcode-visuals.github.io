// Hero animation: Feedback
// A video-feedback loop: each frame the picture is redrawn slightly rotated and zoomed, so glowing orbs smear into tunnels and spirals.
// Edit freely: the engine (hero/engine.js) calls build(env) once, then frame(now) every animation frame.
HERO.register('feedback', function (env) {
  const { ctx, agent, small, reduced } = env;
  const { hue, fade, TAU, BG } = env.helpers;
  let W = env.W, H = env.H;
  const sync = () => { W = env.W; H = env.H; };   // canvas size can change (resize / rotate phone)

  function build() {
    const buf = document.createElement('canvas'), bctx = buf.getContext('2d');
    const reset = () => { buf.width = env.canvas.width; buf.height = env.canvas.height; ctx.clearRect(0, 0, W, H); };
    reset();
    return {
      resize() { sync(); reset(); },
      frame(now) { sync();
        bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.clearRect(0, 0, buf.width, buf.height); bctx.drawImage(env.canvas, 0, 0);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = `rgba(${BG},.075)`; ctx.fillRect(0, 0, env.canvas.width, env.canvas.height);
        const cx = env.canvas.width * .5, cy = env.canvas.height * .5;
        ctx.translate(cx, cy);
        ctx.rotate(Math.sin(now * .0003) * .006 + .0035);
        ctx.scale(1.0075, 1.0075);
        ctx.translate(-cx, -cy);
        ctx.globalAlpha = .962;
        ctx.drawImage(buf, 0, 0);
        ctx.restore();
        ctx.setTransform(env.dpr, 0, 0, env.dpr, 0, 0);
        ctx.globalCompositeOperation = 'lighter';
        const orb = (x, y, h, r) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, hue(h, .85)); g.addColorStop(1, hue(h, 0)); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
        for (let i = 0; i < 3; i++) {
          const a = now * (.0005 + i * .00021) + i * 2.1, rr = Math.min(W, H) * (.16 + i * .06);
          orb(W * .5 + Math.cos(a) * rr * 1.4, H * .5 + Math.sin(a * 1.3) * rr, [185, 265, 320][i], small ? 20 : 28);
        }
        orb(agent.x, agent.y, (now * .05) % 360, small ? 20 : 28);
        ctx.globalCompositeOperation = 'source-over';
      },
    };
  }

  return build();
}, 'Feedback');
