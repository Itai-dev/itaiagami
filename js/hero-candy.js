/* ============================================================
   HERO — pick up and throw the candy
   Each sweet can be dragged, and let go with speed it keeps
   going, spinning, slowing and bouncing off the edges of the
   hero until it settles wherever it was sent.

   Three layers per sweet, so nothing fights over a transform:
     .cy    — where the throw puts it (--tx, --ty here)
     .cy-b  — the idle bob, a CSS animation
     .cy-i  — the tilt (--r), which the spin drives

   Home positions stay in CSS. This only ever adds an offset to
   them, so a resize re-lays the sweets out and the offsets
   still mean the same thing.
   ============================================================ */
(function(){
  const host = document.getElementById('heroCandy');
  if(!host) return;

  const items = Array.from(host.querySelectorAll('.cy'));
  if(!items.length) return;

  const reduced = matchMedia('(prefers-reduced-motion:reduce)');

  const CFG = {
    drag:     .0022,  /* velocity lost per ms — what brings a throw to rest */
    spinDrag: .0026,
    bounce:   .62,    /* speed kept when it hits a wall */
    maxSpeed: 4.2,    /* px/ms, so one hard flick cannot send it into orbit */
    spinFrom: .55,    /* how much of the throw's speed becomes spin */
    stop:     .012    /* below this it is considered still */
  };

  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  for(const el of items){
    el.state = {
      x: 0, y: 0, vx: 0, vy: 0,
      r: parseFloat(el.style.getPropertyValue('--r')) || 0,
      vr: 0, held: false
    };
  }

  /* ---------- the loop, which only turns while something is moving ---------- */
  let raf = 0, last = 0;

  function place(el){
    const s = el.state;
    el.style.setProperty('--tx', s.x.toFixed(1) + 'px');
    el.style.setProperty('--ty', s.y.toFixed(1) + 'px');
    el.style.setProperty('--r', s.r.toFixed(1) + 'deg');
  }

  function frame(now){
    const dt = Math.min(now - last, 48);            /* a tab switch must not teleport them */
    last = now;

    const W = host.clientWidth, H = host.clientHeight;
    let busy = false;

    for(const el of items){
      const s = el.state;
      if(s.held){ busy = true; continue; }
      if(Math.abs(s.vx) < CFG.stop && Math.abs(s.vy) < CFG.stop && Math.abs(s.vr) < .02) continue;

      const w = el.offsetWidth, h = el.offsetHeight;
      /* home comes from layout, so it is never polluted by the transform */
      const hx = el.offsetLeft, hy = el.offsetTop;

      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.r += s.vr * dt;

      /* walls */
      const minX = -hx, maxX = W - w - hx;
      const minY = -hy, maxY = H - h - hy;
      if(s.x < minX){ s.x = minX; s.vx = Math.abs(s.vx) * CFG.bounce; s.vr = -s.vr * CFG.bounce; }
      if(s.x > maxX){ s.x = maxX; s.vx = -Math.abs(s.vx) * CFG.bounce; s.vr = -s.vr * CFG.bounce; }
      if(s.y < minY){ s.y = minY; s.vy = Math.abs(s.vy) * CFG.bounce; s.vr = -s.vr * CFG.bounce; }
      if(s.y > maxY){ s.y = maxY; s.vy = -Math.abs(s.vy) * CFG.bounce; s.vr = -s.vr * CFG.bounce; }

      const keep = Math.max(0, 1 - CFG.drag * dt);
      s.vx *= keep; s.vy *= keep;
      s.vr *= Math.max(0, 1 - CFG.spinDrag * dt);

      if(Math.abs(s.vx) < CFG.stop && Math.abs(s.vy) < CFG.stop){ s.vx = 0; s.vy = 0; }
      if(Math.abs(s.vr) < .02) s.vr = 0;

      place(el);
      busy = true;
    }

    raf = busy ? requestAnimationFrame(frame) : 0;
  }

  function wake(){ if(!raf){ last = performance.now(); raf = requestAnimationFrame(frame); } }

  /* ---------- pick up, move, let go ---------- */
  let z = 10;

  for(const el of items){
    let id = null, px = 0, py = 0, pt = 0, vx = 0, vy = 0;

    el.addEventListener('pointerdown', e => {
      if(e.button !== undefined && e.button !== 0) return;
      const s = el.state;
      id = e.pointerId;
      el.setPointerCapture(id);
      s.held = true; s.vx = 0; s.vy = 0; s.vr = 0;
      px = e.clientX; py = e.clientY; pt = e.timeStamp;
      vx = vy = 0;
      el.style.zIndex = ++z;                       /* the one in hand comes to the front */
      el.classList.add('is-held');
      host.classList.add('has-held');
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
      vx = vx * .6 + (dx / dt) * .4;
      vy = vy * .6 + (dy / dt) * .4;

      px = e.clientX; py = e.clientY; pt = e.timeStamp;
      place(el);
    });

    function release(e){
      if(e.pointerId !== id) return;
      const s = el.state;
      id = null;
      s.held = false;
      el.classList.remove('is-held');
      if(!items.some(i => i.state.held)) host.classList.remove('has-held');

      if(reduced.matches){ s.vx = 0; s.vy = 0; s.vr = 0; return; }

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
     but one that was thrown into a corner can end up outside a smaller hero,
     so anything out of bounds is walked back in. */
  let rz = 0;
  addEventListener('resize', () => {
    cancelAnimationFrame(rz);
    rz = requestAnimationFrame(() => {
      const W = host.clientWidth, H = host.clientHeight;
      for(const el of items){
        const s = el.state;
        if(!s.x && !s.y) continue;
        s.x = clamp(s.x, -el.offsetLeft, W - el.offsetWidth - el.offsetLeft);
        s.y = clamp(s.y, -el.offsetTop,  H - el.offsetHeight - el.offsetTop);
        place(el);
      }
    });
  }, { passive: true });

  host.classList.add('grabbable');
})();
