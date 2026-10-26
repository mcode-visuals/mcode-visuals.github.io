# Hero animations — how to work on them

The animation behind "m.code" at the top of the page. Each animation is **one small file**.

```
hero/
  api.js            registry (HERO.register). Don't edit.
  engine.js         canvas, mouse/touch, idle agent, loop, picker. Rarely edit.
  variants/
    proximity.js    ← the six current animations: edit these, copy these
    flow.js
    feedback.js
    attractor.js
    slitscan.js
    physarum.js
    _template.js    ← start a new one from this (NOT loaded by the page)
```

## Run it locally
```bash
cd /path/to/portfolio/site
python3 -m http.server 3900        # then open http://localhost:3900/?pick
```
- `?pick` shows the animation picker (hidden for normal visitors).
- `?hero=flow` opens a specific animation. The last choice is remembered in the browser.
- Hard-refresh (Cmd+Shift+R) after editing; Safari on a phone also needs the tab closed and reopened.
- Errors in your animation never break the page: the engine logs them in the browser console
  (`hero animation "name" failed to build…`) and the canvas just stays empty.

## Change an existing animation
Open its file in `hero/variants/` and edit. Each file looks like:

```js
HERO.register('flow', function (env) {
  const { ctx, agent, small } = env;            // what you get from the engine
  const { hue, fade, TAU, BG } = env.helpers;
  ... setup ...
  return { resize(widthChanged) {…}, frame(now) {…} };
}, 'Flow');                                       // label on the picker button
```

## Add a new animation (3 steps)
1. Copy `variants/_template.js` to `variants/myidea.js`. Change the name (`'myidea'`) and the label.
2. In `index.html`, add one line **above** `hero/engine.js` (there is a comment marking the spot):
   ```html
   <script src="hero/variants/myidea.js?v=1"></script>
   ```
3. Reload `http://localhost:3900/?pick&hero=myidea`. A button for it appears in the picker automatically.
   Bump `?v=1` to `?v=2` whenever you edit it, so browsers fetch the new file.

## What `env` gives you
| | |
|---|---|
| `env.ctx` | the 2D drawing context (already scaled for retina; draw in CSS pixels) |
| `env.W`, `env.H` | canvas size in CSS pixels — **read them every frame**, they change on resize |
| `env.dpr` | device pixel ratio (1–2); only needed when you copy canvases pixel-for-pixel |
| `env.small` | `true` on phones: use fewer particles / lower resolution |
| `env.reduced` | `true` if the visitor asked for less motion |
| `env.agent` | `{x, y, active}` — **follow this**. It is the mouse / finger, or a point that wanders alone when idle. `active` is true while a person is interacting |
| `env.pointer` | `{x, y, down}` — the raw pointer (`down` = finger on screen) |
| `env.helpers.hue(h, a)` | colour string, e.g. `hue(185, .5)` = cyan at 50% opacity (185 cyan, 265 violet, 320 magenta) |
| `env.helpers.fade(a)` | paints the page background at opacity `a` → soft trails. Use `ctx.clearRect(0,0,env.W,env.H)` for no trails |
| `env.helpers.TAU`, `BG` | `2π`, and the background as `'11,11,10'` |
| `env.canvas` | the canvas element |
| `env.layer()` | **a second canvas** for WebGL/three.js/shaders: `const gl = env.layer().getContext('webgl')`. Resized automatically (it fires `hero-resize`), removed when the visitor switches animation. |

## What you return
```js
return {
  frame(now) { … },            // required: draw one frame (now = ms)
  resize(widthChanged) { … },  // optional: width/height changed. If !widthChanged only the height moved
                               //           (phone toolbar) — don't re-seed everything then
  destroy() { … },             // optional: remove listeners/timers/GL objects
};
```

## Tips
- **Phones first.** Test on a real phone. Keep `COUNT = small ? 200 : 600` style limits; avoid allocating arrays/objects inside `frame`.
- **Keep the left side calm.** The title and text sit over the canvas. Bright, busy areas under the text hurt reading; keep alpha low there, or put the action to the right (`W * 0.66`) like the attractor does.
- **Trails** = `fade(0.05)` (long) … `fade(0.2)` (short) instead of clearing.
- **Feedback loops**: copy the canvas to a buffer, draw it back scaled/rotated slightly (see `feedback.js`).
- The animation pauses by itself when scrolled out of view and stops after ~1.5 s for visitors with "reduce motion".
- Only the six scripts listed in `index.html` are loaded. When you've decided on a favourite you can delete the other
  `<script>` lines (and their files) and the `<div class="wrap hero__pickwrap">…</div>` block; the page works with a single animation.
- To make one the default for new visitors, put its script **first** in the list (the first registered animation is the default).
