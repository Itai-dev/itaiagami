/* ============================================================
   HERO — featured work reel
   Four case studies in the hero, one at a time. Crossfades on a
   timer; pauses while pointed at, focused, off-screen or in a
   hidden tab. Dots switch directly. With reduced motion on, it
   never advances by itself. No dependencies.
   ============================================================ */
(function(){
  const root = document.getElementById('heroWork');
  if(!root) return;
  const slides = Array.from(root.querySelectorAll('.hw-slide'));
  const dots   = Array.from(root.querySelectorAll('.hw-dots button'));
  const idx    = root.querySelector('.hw-idx b');
  if(slides.length < 2) return;

  const INTERVAL = 5500;                                    /* ms per slide */
  root.style.setProperty('--hw-interval', INTERVAL + 'ms');
  const still = matchMedia('(prefers-reduced-motion:reduce)').matches;

  let cur = Math.max(0, slides.findIndex(s => s.classList.contains('is-on')));
  let timer = 0, hovered = false, visible = true;

  function show(i){
    cur = (i + slides.length) % slides.length;
    slides.forEach((s, k) => {
      const on = k === cur;
      s.classList.toggle('is-on', on);
      if(on) s.setAttribute('aria-current', 'true'); else s.removeAttribute('aria-current');
    });
    dots.forEach((d, k) => {
      const on = k === cur;
      d.setAttribute('aria-selected', on ? 'true' : 'false');
      d.classList.remove('is-on');
      if(on){ void d.offsetWidth; d.classList.add('is-on'); }   /* restart the fill */
    });
    if(idx) idx.textContent = String(cur + 1).padStart(2, '0');
  }

  function tick(){ show(cur + 1); }
  function arm(){
    clearInterval(timer); timer = 0;
    if(still || hovered || !visible || document.hidden) return;
    timer = setInterval(tick, INTERVAL);
  }
  function pause(on){
    hovered = on;
    root.classList.toggle('is-paused', on);
    arm();
  }

  dots.forEach((d, k) => d.addEventListener('click', () => { show(k); arm(); }));
  root.addEventListener('pointerenter', () => pause(true));
  root.addEventListener('pointerleave', () => pause(false));
  root.addEventListener('focusin',  () => pause(true));
  root.addEventListener('focusout', e => { if(!root.contains(e.relatedTarget)) pause(false); });
  document.addEventListener('visibilitychange', arm);
  new IntersectionObserver(es => { visible = es[0].isIntersecting; arm(); }, {threshold:.2}).observe(root);

  /* the dot fill should start with the first frame, not on page parse */
  show(cur);
  arm();
})();
