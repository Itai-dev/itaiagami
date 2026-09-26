/* ============================================================
   Home — the work as a flat grid that arrives from the centre.

   The grid itself is plain CSS (flex-wrap, centred) and is exactly what
   no-JS, crawlers and reduced motion get. This file only animates it in:
   every card starts as a small point at the centre of the screen and
   springs out to its own place, the ones nearest the centre first, so
   the grid opens like a ripple. When the animation ends nothing is left
   transformed — the resting page is the plain grid.

   (It was 3D — a ring, then a field, then a swimming school — and the
   depth cost more in legibility and hit-testing than it gave.)

   Opening a project does not cut away: the thumbnail stays where it is
   and grows into the full-bleed cover, then the case study loads and a
   cross-document view transition settles that cover into the page's own
   hero (named by js/site.js when arriving from home).
   ============================================================ */
(function(){
  const stage=document.getElementById('field'); if(!stage)return;
  const cards=[...stage.querySelectorAll('.o-card')];
  const n=cards.length; if(!n)return;
  const still=matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- entrance ---------- */
  /* Back from a case study is not a first visit: the entrance was the
     welcome, replaying it on every return is a wait. */
  const navEntry=(performance.getEntriesByType&&performance.getEntriesByType('navigation')[0])||{};
  const returning=navEntry.type==='back_forward';

  if(!still&&!returning&&stage.animate){
    /* hidden until the first frame decides where everything goes, so the
       finished grid never flashes before the animation starts */
    stage.classList.add('arriving');
    const imgs=cards.map(c=>c.querySelector('img'));
    /* wait briefly for the thumbnails so they arrive as pictures, not as
       empty boxes — but never longer than a beat */
    Promise.race([
      Promise.all(imgs.map(i=>i.decode?i.decode().catch(()=>{}):null)),
      new Promise(r=>setTimeout(r,700))
    ]).then(()=>requestAnimationFrame(arrive));
    /* the work must never stay hidden behind its own entrance — if no frame
       comes (tab opened in the background, anything throws), show it plain */
    setTimeout(()=>stage.classList.remove('arriving'),3000);
  }

  function arrive(){
    if(!stage.classList.contains('arriving'))return;   // failsafe already showed it
    const s=stage.getBoundingClientRect();
    const cx=s.left+s.width/2, cy=Math.min(s.top+s.height/2, innerHeight/2);
    const rects=cards.map(c=>c.getBoundingClientRect());
    /* order by distance from the centre: the grid opens outward */
    const dist=rects.map(r=>Math.hypot(r.left+r.width/2-cx, r.top+r.height/2-cy));
    const maxD=Math.max(...dist)||1;
    stage.classList.remove('arriving');
    cards.forEach((c,i)=>{
      const r=rects[i];
      const dx=cx-(r.left+r.width/2), dy=cy-(r.top+r.height/2);
      /* a little turn on the way out, alternating, so it reads as thrown
         rather than slid */
      const rot=(i%2?1:-1)*(6+8*(dist[i]/maxD));
      c.animate([
        {transform:'translate('+dx+'px,'+dy+'px) scale(.25) rotate('+rot+'deg)',opacity:0},
        {opacity:1,offset:.35},
        {transform:'none',opacity:1}
      ],{
        duration:900,
        delay:80+dist[i]/maxD*520,
        easing:'cubic-bezier(.16,1,.3,1)',   // fast out, long settle
        fill:'backwards'
      });
    });
  }

  /* ---------- open: the thumbnail grows into the cover ---------- */
  let opening=false;
  cards.forEach(c=>{
    /* warm the cover image so the grow has the full picture to land on */
    const warm=()=>{if(!c.dataset.warm){c.dataset.warm='1';new Image().src=c.dataset.hero;}};
    c.addEventListener('pointerenter',warm); c.addEventListener('focus',warm);
    c.addEventListener('click',e=>{
      if(still||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button!==0)return;  // native behaviour
      e.preventDefault(); open(c);
    });
  });

  function open(c){
    if(opening)return; opening=true;
    const img=c.querySelector('img');
    const r=img.getBoundingClientRect();
    const cover=document.createElement('div');
    cover.className='o-cover'; cover.setAttribute('aria-hidden','true');
    const a=new Image(); a.src=img.currentSrc||img.src; a.alt='';
    const b=new Image(); b.alt=''; b.className='hi';
    cover.append(a,b);
    Object.assign(cover.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
    document.body.appendChild(cover);
    document.body.classList.add('opening');
    let grown=false, loaded=false;
    const go=()=>{ if(grown&&loaded)location.href=c.href; };
    b.onload=()=>{b.classList.add('on');loaded=true;go();};
    b.onerror=()=>{loaded=true;go();};
    b.src=c.dataset.hero||a.src;
    setTimeout(()=>{loaded=true;go();},1400);   // slow network: go with the thumb
    cover.getBoundingClientRect();              // commit the start rect before growing
    Object.assign(cover.style,{left:'0px',top:'0px',width:'100%',height:'100%'});
    setTimeout(()=>{grown=true;go();},720);
  }
  /* back button restores this page from bfcache mid-open — undo it */
  addEventListener('pageshow',e=>{
    if(!e.persisted)return;
    document.querySelectorAll('.o-cover').forEach(x=>x.remove());
    document.body.classList.remove('opening'); opening=false;
  });
})();
