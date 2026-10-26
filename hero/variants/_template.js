// Hero animation: MyIdea   (copy this file, rename it, then follow hero/README.md)
//
// The engine calls this function once, when your animation is selected. Return an object with:
//   frame(now)            required. Draw one frame. `now` = time in milliseconds.
//   resize(widthChanged)  optional. The canvas size changed. widthChanged is false when only the height
//                         changed (phones do that when the browser toolbar hides: do NOT reseed then).
//   destroy()             optional. Clean up (timers, event listeners, WebGL resources).
HERO.register('myidea', function (env) {
  const { ctx, agent, small } = env;          // 2D context, the agent to follow, true on phones
  const { hue, fade, TAU } = env.helpers;      // hue(h, alpha) -> colour string · fade(alpha) -> soft clear

  // Setup (runs once). Use env.W / env.H for the canvas size in CSS pixels.
  const COUNT = small ? 200 : 500;             // keep phones light: fewer things
  const dots = Array.from({ length: COUNT }, () => ({
    x: Math.random() * env.W, y: Math.random() * env.H, vx: 0, vy: 0,
  }));

  return {
    frame(now) {
      fade(0.12);                               // soft clear = trails. Use ctx.clearRect(0, 0, env.W, env.H) for no trails

      for (const d of dots) {
        // 1) update: drift a little, get pulled toward the agent when it is close
        const dx = agent.x - d.x, dy = agent.y - d.y, dist = Math.hypot(dx, dy) || 1;
        if (dist < 220) { d.vx += (dx / dist) * 0.05; d.vy += (dy / dist) * 0.05; }
        d.vx = d.vx * 0.98 + Math.sin(now * 0.0004 + d.y * 0.01) * 0.02;
        d.vy = d.vy * 0.98 + Math.cos(now * 0.0005 + d.x * 0.01) * 0.02;
        d.x = (d.x + d.vx + env.W) % env.W;
        d.y = (d.y + d.vy + env.H) % env.H;

        // 2) draw
        ctx.fillStyle = hue(185 + (d.x / env.W) * 100, 0.8);   // cyan -> violet across the width
        ctx.fillRect(d.x, d.y, 1.6, 1.6);
      }
    },

    resize(widthChanged) {
      if (widthChanged) for (const d of dots) { d.x = Math.random() * env.W; d.y = Math.random() * env.H; }
    },
  };
}, 'My idea');                                   // label shown on the picker button
