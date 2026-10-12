/* ============================================================
   HOME: the frame (index.html only; styles in css/home.css)

   - reveal:   each piece of work opens upward as it reaches the screen
   - focus:    the piece nearest the middle of the screen is full strength,
               the others step back; the fixed counter follows it
   - parallax: the picture drifts a little inside its frame while scrolling
   - cursor:   over the work, a small "View" disc trails the pointer

   Nothing here is needed to see or use the page: without it the work is
   simply there. Reduced motion keeps only the counter.
   ============================================================ */
(function(){
  const items=[...document.querySelectorAll('.hf-item')]; if(!items.length) return;
  const root=document.documentElement;
  const still=matchMedia('(prefers-reduced-motion: reduce)');
  const wide=matchMedia('(min-width: 1024px)');
  const fine=matchMedia('(hover: hover) and (pointer: fine)');
  const media=items.map(i=>i.querySelector('.hf-media'));
  const imgs=items.map(i=>i.querySelector('.hf-media img'));

  if(!still.matches) root.classList.add('hf-live');
  items[0].classList.add('seen','on');

  /* reveal */
  if('IntersectionObserver' in window){
    const io=new IntersectionObserver(es=>es.forEach(e=>{
      if(e.isIntersecting){ e.target.classList.add('seen'); io.unobserve(e.target); }
    }),{rootMargin:'0px 0px -10% 0px'});
    items.forEach(i=>io.observe(i));
  }else items.forEach(i=>i.classList.add('seen'));

  /* counter: the number slides up and out, the next one slides in */
  const count=document.querySelector('.hf-count-n'); const digit=count&&count.firstElementChild;
  let shown=0, swap=0;
  function setCount(n){
    if(!count||n===shown) return; shown=n;
    const text=String(n+1).padStart(2,'0');
    if(still.matches){ digit.textContent=text; return; }
    clearTimeout(swap); count.classList.add('out');
    swap=setTimeout(()=>{
      digit.textContent=text; count.classList.remove('out'); count.classList.add('in-from');
      requestAnimationFrame(()=>requestAnimationFrame(()=>count.classList.remove('in-from')));
    },220);
  }

  /* focus + parallax, one pass per frame while scrolling */
  let ticking=false;
  function frame(){
    ticking=false;
    const vh=innerHeight, mid=vh/2;
    let best=0, bestD=Infinity;
    media.forEach((m,i)=>{
      const r=m.getBoundingClientRect(); const c=r.top+r.height/2; const d=Math.abs(c-mid);
      if(d<bestD){ bestD=d; best=i; }
      if(still.matches||!wide.matches||r.bottom<-vh*.2||r.top>vh*1.2) return;
      const p=Math.max(-1,Math.min(1,(c-mid)/vh));          /* -1 above … 0 centred … 1 below */
      imgs[i].style.setProperty('--py',(p*-28).toFixed(1)+'px');
      imgs[i].style.setProperty('--ps',(1+Math.abs(p)*.05).toFixed(4));
    });
    /* at the very bottom the last piece counts as in focus */
    if(innerHeight+scrollY>=document.documentElement.scrollHeight-4) best=items.length-1;
    items.forEach((it,i)=>it.classList.toggle('on',i===best));
    setCount(best);
  }
  const queue=()=>{ if(!ticking){ ticking=true; requestAnimationFrame(frame); } };
  addEventListener('scroll',queue,{passive:true});
  addEventListener('resize',queue);
  frame();

  /* cursor: eases toward the pointer, so it trails rather than sticks */
  const cur=document.querySelector('.hf-cursor');
  if(cur&&fine.matches&&!still.matches){
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
