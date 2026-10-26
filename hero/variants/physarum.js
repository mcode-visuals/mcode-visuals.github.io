// Hero animation: Physarum
// Slime-mould simulation: agents sense and deposit a trail map; the network grows toward the agent.
// Edit freely: the engine (hero/engine.js) calls build(env) once, then frame(now) every animation frame.
HERO.register('physarum', function (env) {
  const { ctx, agent, small, reduced } = env;
  const { hue, fade, TAU, BG } = env.helpers;
  let W = env.W, H = env.H;
  const sync = () => { W = env.W; H = env.H; };   // canvas size can change (resize / rotate phone)

  function build() {
    const GW = small ? 150 : 230, GH = Math.max(40, Math.round(GW * H / W));
    const N = small ? 1300 : 3000, SA = .62, SD = 5, TURN = .42;
    let tr = new Float32Array(GW * GH), tmp = new Float32Array(GW * GH);
    const ag = Array.from({ length: N }, () => ({ x: Math.random() * GW, y: Math.random() * GH, a: Math.random() * TAU }));
    const off = document.createElement('canvas'); off.width = GW; off.height = GH;
    const octx = off.getContext('2d'), img = octx.createImageData(GW, GH);
    const at = (x, y) => tr[((y + GH) % GH | 0) * GW + ((x + GW) % GW | 0)];
    ctx.clearRect(0, 0, W, H);
    return {
      resize() { sync(); /* grid is fixed; it is simply stretched to the env.canvas */ },
      frame() { sync();
        const gx = agent.x / W * GW, gy = agent.y / H * GH;
        for (const p of ag) {
          const l = at(p.x + Math.cos(p.a - SA) * SD, p.y + Math.sin(p.a - SA) * SD);
          const c = at(p.x + Math.cos(p.a) * SD, p.y + Math.sin(p.a) * SD);
          const r = at(p.x + Math.cos(p.a + SA) * SD, p.y + Math.sin(p.a + SA) * SD);
          if (c < l && c < r) p.a += (Math.random() < .5 ? -1 : 1) * TURN;
          else if (l > r) p.a -= TURN; else if (r > l) p.a += TURN;
          p.x = (p.x + Math.cos(p.a) * 1.1 + GW) % GW; p.y = (p.y + Math.sin(p.a) * 1.1 + GH) % GH;
          tr[(p.y | 0) * GW + (p.x | 0)] += .9;
        }
        // the agent lays a strong scent that the network grows toward
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          const ix = ((gx + dx) | 0), iy = ((gy + dy) | 0);
          if (ix >= 0 && ix < GW && iy >= 0 && iy < GH) tr[iy * GW + ix] += 2.2;
        }
        // diffuse + decay
        for (let y = 0; y < GH; y++) {
          const y0 = ((y - 1 + GH) % GH) * GW, y1 = y * GW, y2 = ((y + 1) % GH) * GW;
          for (let x = 0; x < GW; x++) {
            const x0 = (x - 1 + GW) % GW, x2 = (x + 1) % GW;
            tmp[y1 + x] = (tr[y0 + x0] + tr[y0 + x] + tr[y0 + x2] + tr[y1 + x0] + tr[y1 + x] * 2 + tr[y1 + x2] + tr[y2 + x0] + tr[y2 + x] + tr[y2 + x2]) / 10 * .94;
          }
        }
        [tr, tmp] = [tmp, tr];
        const d = img.data;
        for (let i = 0, j = 0; i < tr.length; i++, j += 4) {
          const v = Math.min(1, tr[i] * .55);
          d[j] = 20 + v * 110; d[j + 1] = 40 + v * 180; d[j + 2] = 80 + v * 175; d[j + 3] = Math.min(200, v * 280);
        }
        octx.putImageData(img, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(off, 0, 0, W, H);
      },
    };
  }

  return build();
}, 'Physarum');
