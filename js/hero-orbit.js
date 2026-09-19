/* ============================================================
   HERO — work orbit
   The cards around the headline follow the cursor with depth:
   each [data-depth] element slides up to that many pixels
   toward the pointer. The headline carries no depth on purpose
   — the copy stays put and only the work moves. Smoothed per
   frame, only runs on pointer devices at desktop widths, never
   under reduced motion. The entrance spin, idle float and hover
   lift are all CSS.
   ============================================================ */
(function(){
  const hero = document.querySelector('.hero');
  if(!hero) return;
  if(matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  if(!matchMedia('(min-width:901px) and (hover:hover) and (pointer:fine)').matches) return;

  const layers = Array.from(hero.querySelectorAll('[data-depth]')).map(el => ({
    el, d: parseFloat(el.dataset.depth) || 0, x: 0, y: 0
  }));
  if(!layers.length) return;

  let tx = 0, ty = 0, raf = 0;

  function step(){
    raf = 0;
    let moving = false;
    for(const l of layers){
      const gx = tx * l.d, gy = ty * l.d;
      l.x += (gx - l.x) * .08;
      l.y += (gy - l.y) * .08;
      if(Math.abs(gx - l.x) > .05 || Math.abs(gy - l.y) > .05) moving = true;
      l.el.style.transform = 'translate3d(' + l.x.toFixed(2) + 'px,' + l.y.toFixed(2) + 'px,0)';
    }
    if(moving) raf = requestAnimationFrame(step);
  }
  function kick(){ if(!raf) raf = requestAnimationFrame(step); }

  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width  - .5) * 2;
    ty = ((e.clientY - r.top)  / r.height - .5) * 2;
    kick();
  }, {passive:true});
  hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
  document.addEventListener('visibilitychange', () => { if(document.hidden){ tx = 0; ty = 0; kick(); } });
})();
