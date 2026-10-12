/* ============================================================
   HOME: the side and the mosaic (index.html only; styles in css/home.css)

   - square:  every piece waits as one black square at the centre of its
              frame; when it reaches the middle of the screen the square
              splits into four corner marks that open out with the picture,
              then the marks go and the title slides into place
   - opening: on the first visit of a session the first piece does this on
              its own while the about line settles (Figma artboards 11 → 10 → 9)
   - depth:   while scrolling, small pieces drift faster than large ones and
              the picture moves a little inside its frame
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
  if(still.matches){ root.classList.remove('hf-intro'); return; }
  root.classList.add('hf-live');

  /* one square per piece (decorative), laid over the frame */
  items.forEach(it=>{
    const m=document.createElement('span'); m.className='hf-marks'; m.setAttribute('aria-hidden','true');
    m.innerHTML='<i></i><i></i><i></i><i></i>';
    it.querySelector('.hf-media').after(m);
  });

  /* square → corners → picture → title. The title starts centred under the
     picture (the text's own width, not the heading box) and slides left. */
  const state=items.map(()=>0);                      /* 0 hidden · 1 waiting · 2 opening/open */
  function wait(i){ if(state[i]) return; state[i]=1; items[i].classList.add('w'); }
  function open(i,delay){
    if(state[i]===2) return; state[i]=2;
    const it=items[i];
    setTimeout(()=>{
      it.classList.add('w');
      const t=it.querySelector('.hf-title');
      if(t){ const rg=document.createRange(); rg.selectNodeContents(t);
        t.style.setProperty('--lx',((media[i].getBoundingClientRect().width-rg.getBoundingClientRect().width)/2)+'px'); }
      /* a square that has not been seen yet shows for a beat before it opens */
      const lead=it.dataset.waited?0:350;
      setTimeout(()=>it.classList.add('o'),lead);
      setTimeout(()=>it.classList.add('d'),lead+1400);
    },delay||0);
  }

  /* which pieces are waiting, and which have reached the middle of the screen */
  let running=!root.classList.contains('hf-intro');
  function check(){
    if(!running) return;
    const vh=innerHeight, line=vh*.6;
    const atEnd=innerHeight+scrollY>=document.documentElement.scrollHeight-4;
    let n=0;
    items.forEach((it,i)=>{
      if(state[i]===2) return;
      const r=media[i].getBoundingClientRect();
      if(r.top<vh&&r.bottom>0){ if(!state[i]){ wait(i); requestAnimationFrame(()=>{ it.dataset.waited='1'; }); } }
      if(r.top+r.height/2<=line||(atEnd&&r.top<vh)) open(i,(n++)*160);
    });
  }

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
    check();
  }
  const queue=()=>{ if(!ticking){ ticking=true; requestAnimationFrame(frame); } };
  addEventListener('scroll',queue,{passive:true});
  addEventListener('resize',()=>{ base=null; queue(); });

  /* the opening: the first piece opens from its square, then the rest follows */
  if(root.classList.contains('hf-intro')){
    const timers=[];
    const at=(ms,fn)=>timers.push(setTimeout(fn,ms));
    function end(){
      timers.forEach(clearTimeout);
      ['wheel','touchstart','keydown','pointerdown'].forEach(t=>removeEventListener(t,skip));
      if(state[0]!==2){ state[0]=2; items[0].classList.add('w','o','d'); }
      root.classList.add('hf-go');
      root.classList.remove('hf-intro');
      running=true; queue();
    }
    function skip(){ end(); }
    at(350,()=>{ state[0]=1; items[0].classList.add('w'); });
    at(1100,()=>{ items[0].dataset.waited='1'; open(0); root.classList.add('hf-go'); });
    at(3300,end);
    ['wheel','touchstart','pointerdown'].forEach(t=>addEventListener(t,skip,{passive:true}));
    addEventListener('keydown',skip);
  }
  frame();
  /* a first look before any scroll: give the squares on screen a beat, then open what is high enough */
  if(running) setTimeout(queue,300);

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
