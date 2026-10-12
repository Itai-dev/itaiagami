/* ============================================================
   HOME: the side and the mosaic (index.html only; styles in css/home.css)

   - reveal:  each piece opens upward and settles as it reaches the screen
   - depth:   while scrolling, small pieces drift faster than large ones and
              the picture moves a little inside its frame, so the mosaic
              reads in layers
   - cursor:  over the work, a small "View" disc trails the pointer

   Nothing here is needed to see or use the page: without it the work is
   simply there. All of it is off for reduced motion.
   ============================================================ */
(function(){
  const items=[...document.querySelectorAll('.hf-item')]; if(!items.length) return;
  const root=document.documentElement;
  const still=matchMedia('(prefers-reduced-motion: reduce)');
  const wide=matchMedia('(min-width: 1024px)');
  const fine=matchMedia('(hover: hover) and (pointer: fine)');
  const media=items.map(i=>i.querySelector('.hf-media'));
  const imgs=items.map(i=>i.querySelector('.hf-media img'));
  if(still.matches) return;
  root.classList.add('hf-live');
  items.slice(0,2).forEach(i=>i.classList.add('seen'));

  /* reveal */
  if('IntersectionObserver' in window){
    const io=new IntersectionObserver(es=>es.forEach(e=>{
      if(e.isIntersecting){ e.target.classList.add('seen'); io.unobserve(e.target); }
    }),{rootMargin:'0px 0px -8% 0px'});
    items.forEach(i=>io.observe(i));
  }else items.forEach(i=>i.classList.add('seen'));

  /* depth: small pieces (1st and 4th of every four) travel further. Drift is
     measured from where each piece sits with the page at the top, so the
     first screen is exactly the designed layout and motion starts on scroll. */
  const reach=items.map((_,i)=>(i%4===0||i%4===3)?64:18);
  const dy=items.map(()=>0);
  let base=null, ticking=false;
  const clamp=v=>Math.max(-1,Math.min(1,v));
  function measure(){
    const vh=innerHeight, mid=vh/2;
    base=items.map((it,i)=>{ const r=it.getBoundingClientRect();
      return clamp((r.top+scrollY-dy[i]+r.height/2-mid)/vh); });
  }
  function frame(){
    ticking=false;
    if(!base) measure();
    const vh=innerHeight, mid=vh/2, on=wide.matches;
    items.forEach((it,i)=>{
      const r=it.getBoundingClientRect();
      if(r.bottom<-vh*.3||r.top>vh*1.3) return;
      const p=clamp((r.top-dy[i]+r.height/2-mid)/vh);      /* layout position, without our own drift */
      dy[i]=on?(p-base[i])*reach[i]:0;
      it.style.setProperty('--dy',dy[i].toFixed(1)+'px');
      imgs[i].style.setProperty('--pr',(on?clamp((p-base[i])/2):0).toFixed(3));
      imgs[i].style.setProperty('--ps',(on?1+Math.abs(p)*.04:1).toFixed(4));
    });
  }
  const queue=()=>{ if(!ticking){ ticking=true; requestAnimationFrame(frame); } };
  addEventListener('scroll',queue,{passive:true});
  addEventListener('resize',()=>{ base=null; queue(); });
  frame();

  /* cursor: eases toward the pointer, so it trails rather than sticks */
  const cur=document.querySelector('.hf-cursor');
  if(cur&&fine.matches){
    root.classList.add('hf-cursor-on');
    let x=-200,y=-200,tx=-200,ty=-200,raf=0;
    const step=()=>{
      x+=(tx-x)*.2; y+=(ty-y)*.2;
      cur.style.setProperty('--cx',x.toFixed(1)+'px'); cur.style.setProperty('--cy',y.toFixed(1)+'px');
      raf=(Math.abs(tx-x)+Math.abs(ty-y)>.3)?requestAnimationFrame(step):0;
    };
    media.forEach(m=>{
      m.addEventListener('pointerenter',e=>{ if(x<-100){ x=e.clientX; y=e.clientY; } cur.classList.add('show'); });
      m.addEventListener('pointerleave',()=>cur.classList.remove('show'));
    });
    addEventListener('pointermove',e=>{ tx=e.clientX; ty=e.clientY; if(!raf) raf=requestAnimationFrame(step); },{passive:true});
    /* the page moves under a still pointer: check what is under it now */
    addEventListener('scroll',()=>{
      const el=document.elementFromPoint(tx,ty);
      cur.classList.toggle('show',!!(el&&el.closest('.hf-media')));
    },{passive:true});
  }
})();
