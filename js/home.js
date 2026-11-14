/* Homepage interactions: hero card parallax, scroll-driven big names,
   and cursor-following work previews. Everything is
   decoration over working links, so failing here leaves a usable page. */
(function(){
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* ---------- hero: cards drift away from the cursor, each at its own depth ---------- */
  const hero = document.querySelector('.pop-hero');
  const cards = hero ? [...hero.querySelectorAll('.hc')] : [];
  if (hero && cards.length && fine && !still) {
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const tick = () => {
      cx += (tx - cx) * .08; cy += (ty - cy) * .08;
      cards.forEach(c => {
        const d = +getComputedStyle(c).getPropertyValue('--d') || .6;
        c.style.setProperty('--px', (cx * d * -40).toFixed(1) + 'px');
        c.style.setProperty('--py', (cy * d * -30).toFixed(1) + 'px');
      });
      raf = (Math.abs(tx - cx) + Math.abs(ty - cy) > .001) ? requestAnimationFrame(tick) : 0;
    };
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - .5;
      ty = (e.clientY - r.top) / r.height - .5;
      if (!raf) raf = requestAnimationFrame(tick);
    });
    hero.addEventListener('pointerleave', () => { tx = ty = 0; if (!raf) raf = requestAnimationFrame(tick); });
  }

  /* ---------- big names: move sideways as the page scrolls ---------- */
  const bign = document.querySelector('.bign-track');
  if (bign && !still) {
    let pending = false;
    const move = () => {
      pending = false;
      const r = bign.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const p = (innerHeight - r.top) / (innerHeight + r.height);   /* 0 → 1 while on screen */
      const span = bign.scrollWidth / 2 - innerWidth * .5;
      bign.style.setProperty('--bx', (-p * Math.max(span, 0)).toFixed(1) + 'px');
    };
    addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(move); } }, { passive: true });
    addEventListener('resize', move);
    move();
  }

  /* ---------- work list: the picture follows the cursor and leans with it ---------- */
  const float = document.querySelector('.wl-float');
  const rows = [...document.querySelectorAll('.wl')];
  if (float && rows.length && fine) {
    let x = innerWidth / 2, y = innerHeight / 2, fx = x, fy = y, vx = 0, raf = 0, on = false;
    const tick = () => {
      const nx = fx + (x - fx) * .18, ny = fy + (y - fy) * .18;
      vx = nx - fx; fx = nx; fy = ny;
      float.style.setProperty('--fx', (fx + 24) + 'px');
      float.style.setProperty('--fy', (fy - float.offsetHeight / 2) + 'px');
      float.style.setProperty('--fr', still ? '0deg' : Math.max(-6, Math.min(6, vx * .35)).toFixed(2) + 'deg');
      raf = (on || Math.abs(x - fx) > .5) ? requestAnimationFrame(tick) : 0;
    };
    addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; if (on && !raf) raf = requestAnimationFrame(tick); }, { passive: true });
    rows.forEach(a => {
      a.addEventListener('pointerenter', e => {
        if (float.getAttribute('src') !== a.dataset.img) float.src = a.dataset.img;
        if (!on) { fx = x = e.clientX; fy = y = e.clientY; }
        on = true; float.classList.add('on');
        if (!raf) raf = requestAnimationFrame(tick);
      });
      a.addEventListener('pointerleave', () => { on = false; float.classList.remove('on'); });
    });
    /* warm the cache so the first hover is instant */
    const idle = window.requestIdleCallback || (fn => setTimeout(fn, 400));
    addEventListener('load', () => idle(() => rows.forEach(a => { const i = new Image(); i.src = a.dataset.img; })), { once: true });
  }

})();
