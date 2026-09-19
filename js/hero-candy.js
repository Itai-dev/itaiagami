/* ============================================================
   HERO — pick up, throw, and knock the gummy bears about
   Each sweet can be dragged. Let go with speed and it keeps
   going: stretching along its flight, spinning, bouncing off the
   walls of the hero, and shoving any other bear it runs into.
   Everything squashes on impact and wobbles back, the way a
   gummy does.

   Four layers per sweet, so nothing fights over a transform:
     .cy    — where the throw put it  (--tx, --ty)
     .cy-b  — the idle bob, a CSS animation
     .cy-s  — squash and stretch      (--sa, --sx, --sy)
     .cy-i  — the tilt                (--r)

   Home positions stay in CSS. This only ever adds an offset to
   them, so a resize re-lays the sweets out and the offsets still
   mean the same thing.
   ============================================================ */
(function(){
  const host = document.getElementById('heroCandy');
  if(!host) return;

  const items = Array.from(host.querySelectorAll('.cy'));
  if(!items.length) return;

  const reduced = matchMedia('(prefers-reduced-motion:reduce)');

  const CFG = {
    drag:     .0022,   /* velocity lost per ms — what brings a throw to rest */
    spinDrag: .0026,
    bounce:   .62,     /* speed kept off a wall */
    hitBounce:.74,     /* speed kept off another bear */
    maxSpeed: 4.2,     /* px/ms, so one hard flick cannot send it into orbit */
    spinFrom: .55,     /* how much of a throw's speed becomes spin */
    stop:     .012,    /* below this it is considered still */

    /* a circle stands in for the bear. Inset, because a bear is not one:
       the corners of its box are mostly empty, and touching there would
       read as a miss */
    grip:     .82,
    slack:    .4,      /* overlap small enough to leave alone, in px */

    /* squash and stretch. A spring, so it overshoots coming back — which is
       the whole difference between gummy and rubber */
    stretch:  .10,     /* stretch per px/ms of speed */
    maxStretch: .34,
    squash:   .3,      /* how hard an impact flattens it */
    stiff:    .00063,  /* spring — about a 250ms wobble */
    damp:     .0175
  };

  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  for(const el of items){
    el.state = {
      x: 0, y: 0, vx: 0, vy: 0,
      r: parseFloat(el.style.getPropertyValue('--r')) || 0,
      vr: 0,
      sq: 0, sqv: 0, sa: 0,          /* deform: amount, its velocity, its axis */
      held: false, dvx: 0, dvy: 0    /* dvx/dvy: how fast the hand is moving it */
    };
  }

  function metrics(el){
    const w = el.offsetWidth, h = el.offsetHeight;
    return { w, h, hx: el.offsetLeft, hy: el.offsetTop, rad: (w + h) / 4 * CFG.grip };
  }

  function place(el){
    const s = el.state;
    el.style.setProperty('--tx', s.x.toFixed(1) + 'px');
    el.style.setProperty('--ty', s.y.toFixed(1) + 'px');
    el.style.setProperty('--r',  s.r.toFixed(1) + 'deg');
    el.style.setProperty('--sa', s.sa.toFixed(3) + 'rad');
    el.style.setProperty('--sx', (1 + s.sq).toFixed(3));
    el.style.setProperty('--sy', (1 - s.sq * .7).toFixed(3));
  }

  /* a knock, from a wall or from another bear: flatten it along the normal */
  function hit(s, nx, ny, force){
    const f = clamp(force, 0, 1);
    if(f < .04) return;
    s.sa = Math.atan2(ny, nx);
    s.sq = -CFG.squash * f;
    s.sqv = 0;
  }

  /* ---------- the loop, which only turns while something is happening ---------- */
  let raf = 0, last = 0;

  function frame(now){
    const dt = Math.min(now - last, 48);       /* a tab switch must not teleport them */
    last = now;

    const W = host.clientWidth, H = host.clientHeight;
    let busy = false;

    /* 1. carry each one along, and bounce it off the walls */
    for(const el of items){
      const s = el.state;
      if(s.held){ busy = true; continue; }
      if(!s.vx && !s.vy && !s.vr) continue;

      const m = metrics(el);
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.r += s.vr * dt;

      const minX = -m.hx, maxX = W - m.w - m.hx;
      const minY = -m.hy, maxY = H - m.h - m.hy;
      if(s.x < minX){ s.x = minX; hit(s, 1, 0, Math.abs(s.vx)); s.vx =  Math.abs(s.vx) * CFG.bounce; s.vr = -s.vr * CFG.bounce; }
      if(s.x > maxX){ s.x = maxX; hit(s, 1, 0, Math.abs(s.vx)); s.vx = -Math.abs(s.vx) * CFG.bounce; s.vr = -s.vr * CFG.bounce; }
      if(s.y < minY){ s.y = minY; hit(s, 0, 1, Math.abs(s.vy)); s.vy =  Math.abs(s.vy) * CFG.bounce; s.vr = -s.vr * CFG.bounce; }
      if(s.y > maxY){ s.y = maxY; hit(s, 0, 1, Math.abs(s.vy)); s.vy = -Math.abs(s.vy) * CFG.bounce; s.vr = -s.vr * CFG.bounce; }

      const keep = Math.max(0, 1 - CFG.drag * dt);
      s.vx *= keep; s.vy *= keep;
      s.vr *= Math.max(0, 1 - CFG.spinDrag * dt);

      if(Math.abs(s.vx) < CFG.stop && Math.abs(s.vy) < CFG.stop){ s.vx = 0; s.vy = 0; }
      if(Math.abs(s.vr) < .02) s.vr = 0;
      busy = true;
    }

    /* 2. let them find each other. A held bear has no give: it shoves, and
          nothing shoves it back, because the hand is stronger than the throw */
    for(let i = 0; i < items.length; i++){
      const a = items[i], A = a.state, ma = metrics(a);
      if(!a.offsetWidth) continue;
      const ax = ma.hx + A.x + ma.w / 2, ay = ma.hy + A.y + ma.h / 2;

      for(let j = i + 1; j < items.length; j++){
        const b = items[j], B = b.state, mb = metrics(b);
        if(!b.offsetWidth) continue;
        const bx = mb.hx + B.x + mb.w / 2, by = mb.hy + B.y + mb.h / 2;

        let dx = bx - ax, dy = by - ay;
        let d = Math.hypot(dx, dy);
        const min = ma.rad + mb.rad;
        if(d >= min) continue;

        if(d < .001){ dx = 1; dy = 0; d = .001; }        /* exactly stacked */
        const nx = dx / d, ny = dy / d;
        const over = min - d;

        /* mass by area, so a big bear wins an argument with a small one */
        const wa = A.held ? 0 : ma.rad * ma.rad;
        const wb = B.held ? 0 : mb.rad * mb.rad;
        const sum = wa + wb;
        if(sum <= 0) continue;                            /* both in hand */

        if(over > CFG.slack){
          const push = over * .5;
          A.x -= nx * push * (wb / sum) * 2;
          A.y -= ny * push * (wb / sum) * 2;
          B.x += nx * push * (wa / sum) * 2;
          B.y += ny * push * (wa / sum) * 2;
          busy = true;
        }

        /* only trade speed if they are actually closing on each other */
        const rv = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
        if(rv >= 0) continue;

        const imp = -(1 + CFG.hitBounce) * rv / sum;
        if(wa){ A.vx -= imp * wb * nx; A.vy -= imp * wb * ny; A.vr -= rv * 6; }
        if(wb){ B.vx += imp * wa * nx; B.vy += imp * wa * ny; B.vr += rv * 6; }

        const force = Math.abs(rv);
        hit(A, nx, ny, force); hit(B, nx, ny, force);
        busy = true;
      }
    }

    /* 3. settle the wobble, and write everything out once */
    for(const el of items){
      const s = el.state;
      const vx = s.held ? s.dvx : s.vx, vy = s.held ? s.dvy : s.vy;
      const sp = Math.hypot(vx, vy);
      if(sp > .05) s.sa = Math.atan2(vy, vx);

      const want = reduced.matches ? 0 : Math.min(sp * CFG.stretch, CFG.maxStretch);
      s.sqv += (want - s.sq) * CFG.stiff * dt;
      s.sqv *= Math.max(0, 1 - CFG.damp * dt);
      s.sq  += s.sqv * dt;

      if(Math.abs(s.sq - want) > .002 || Math.abs(s.sqv) > .0002) busy = true;
      else { s.sq = want; s.sqv = 0; }

      place(el);
    }

    raf = busy ? requestAnimationFrame(frame) : 0;
  }

  function wake(){ if(!raf){ last = performance.now(); raf = requestAnimationFrame(frame); } }

  /* ---------- pick up, move, let go ---------- */
  let z = 10;

  for(const el of items){
    let id = null, px = 0, py = 0, pt = 0;

    el.addEventListener('pointerdown', e => {
      if(e.button !== undefined && e.button !== 0) return;
      const s = el.state;
      id = e.pointerId;
      el.setPointerCapture(id);
      s.held = true; s.vx = 0; s.vy = 0; s.vr = 0; s.dvx = 0; s.dvy = 0;
      px = e.clientX; py = e.clientY; pt = e.timeStamp;
      el.style.zIndex = ++z;                       /* the one in hand comes forward */
      el.classList.add('is-held');
      wake();
      e.preventDefault();
    });

    el.addEventListener('pointermove', e => {
      if(e.pointerId !== id) return;
      const s = el.state;
      const dt = Math.max(1, e.timeStamp - pt);
      const dx = e.clientX - px, dy = e.clientY - py;

      s.x += dx; s.y += dy;

      /* smoothed, so the throw follows the gesture rather than its last jitter */
      s.dvx = s.dvx * .6 + (dx / dt) * .4;
      s.dvy = s.dvy * .6 + (dy / dt) * .4;

      px = e.clientX; py = e.clientY; pt = e.timeStamp;
      wake();
    });

    function release(e){
      if(e.pointerId !== id) return;
      const s = el.state;
      id = null;
      s.held = false;
      el.classList.remove('is-held');

      let vx = s.dvx, vy = s.dvy;
      s.dvx = 0; s.dvy = 0;

      if(reduced.matches){ s.vx = 0; s.vy = 0; s.vr = 0; wake(); return; }

      /* a stale sample means the pointer stopped before letting go — that is a
         place, not a throw, so it should stay put */
      if(e.timeStamp - pt > 90){ vx = 0; vy = 0; }

      const sp = Math.hypot(vx, vy);
      if(sp > CFG.maxSpeed){ vx = vx / sp * CFG.maxSpeed; vy = vy / sp * CFG.maxSpeed; }
      s.vx = vx; s.vy = vy;
      s.vr = clamp(vx * CFG.spinFrom * 12, -1.1, 1.1);   /* thrown sideways, it rolls */
      wake();
    }

    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('dragstart', e => e.preventDefault());
  }

  /* A resize re-lays the sweets out from their CSS homes. The offsets survive,
     but one thrown into a corner can end up outside a smaller hero, so anything
     out of bounds is walked back in. */
  let rz = 0;
  addEventListener('resize', () => {
    cancelAnimationFrame(rz);
    rz = requestAnimationFrame(() => {
      const W = host.clientWidth, H = host.clientHeight;
      for(const el of items){
        const s = el.state;
        if(!s.x && !s.y) continue;
        const m = metrics(el);
        s.x = clamp(s.x, -m.hx, W - m.w - m.hx);
        s.y = clamp(s.y, -m.hy, H - m.h - m.hy);
        place(el);
      }
    });
  }, { passive: true });
})();
