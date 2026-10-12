/* ============================================================
   HOME: the side and the mosaic (index.html only; styles in css/home.css)

   - writing: all text writes itself in, letter by letter, when it appears
   - opening: once per session the name writes itself across the whole
              screen (turned on its side on a tall screen), holds, then
              shrinks into its corner; the side writes in after it
              (Figma artboards 24 → 27)
   - square:  every piece waits as one black square at the centre of its
              frame; when it reaches the middle of the screen the square
              splits into four corner marks that open out with the picture,
              the title writes in centred, then the marks go and the title
              slides into place
   - depth:   while scrolling, small pieces drift faster than large ones and
              the picture moves a little inside its frame
   - cursor:  over the work, a small "View" disc trails the pointer

   Nothing here is needed to see or use the page: without it the work is
   simply there. All of it is off for reduced motion (index.html never sets
   .hf-type or .hf-intro then).
   ============================================================ */
(function(){
  const items=[...document.querySelectorAll('.hf-item')]; if(!items.length) return;
  const root=document.documentElement;
  const still=matchMedia('(prefers-reduced-motion: reduce)');
  const wide=matchMedia('(min-width: 1024px)');
  const fine=matchMedia('(hover: hover) and (pointer: fine)');
  const media=items.map(i=>i.querySelector('.hf-media'));
  const imgs=items.map(i=>i.querySelector('.hf-media img'));
  if(still.matches){ root.classList.remove('hf-type','hf-intro'); return; }
  root.classList.add('hf-live');

  /* ---------- writing ----------
     Each letter becomes a span that turns visible in turn (hidden letters
     keep their space, so nothing reflows). Once written, the plain text
     nodes go back exactly as they were. */
  const writers=new Set();
  function write(el,perChar,done){
    if(!el||el.classList.contains('typing')||el.classList.contains('typed')){ if(done) done(); return; }
    const groups=[], chars=[];
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
    const nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      if(!node.nodeValue.trim()) return;
      const frag=document.createDocumentFragment(), spans=[];
      for(const c of node.nodeValue){ const s=document.createElement('span'); s.className='hf-ch'; s.textContent=c; frag.appendChild(s); spans.push(s); if(c.trim()) chars.push(s); else s.classList.add('on'); }
      groups.push({node,spans}); node.replaceWith(frag);
    });
    el.classList.add('typing');
    let i=0, timer=0;
    const w={ finish(){
      clearTimeout(timer); writers.delete(w);
      groups.forEach(g=>{ g.spans[0].before(g.node); g.spans.forEach(s=>s.remove()); });
      el.classList.remove('typing'); el.classList.add('typed'); if(done) done();
    }};
    writers.add(w);
    (function tick(){
      if(i>=chars.length){ w.finish(); return; }
      chars[i++].classList.add('on');
      timer=setTimeout(tick,perChar);
    })();
    return w;
  }
  const side=[...document.querySelectorAll('.hf-about, .hf-nav a, .hf-contact a')];
  function writeSide(){
    write(side[0],12);                                        /* the about line */
    side.slice(1).forEach((el,k)=>setTimeout(()=>write(el,34),260+k*120));
  }
  /* everything else writes itself in when it scrolls into view */
  const later=[...document.querySelectorAll('.hf-all a, .hf-label, .hf-foot li, .hf-foot p > *')];
  function writeLater(){
    if(!('IntersectionObserver' in window)){ later.forEach(el=>write(el,0)); return; }
    const io=new IntersectionObserver(es=>es.forEach(e=>{
      if(e.isIntersecting){ write(e.target,24); io.unobserve(e.target); }
    }),{rootMargin:'0px 0px -6% 0px'});
    later.forEach(el=>io.observe(el));
  }

  /* ---------- one square per piece (decorative), laid over the frame ---------- */
  items.forEach(it=>{
    const m=document.createElement('span'); m.className='hf-marks'; m.setAttribute('aria-hidden','true');
    m.innerHTML='<i></i><i></i><i></i><i></i>';
    it.querySelector('.hf-media').after(m);
  });

  /* square → corners → picture → title. The title starts centred under the
     picture (the text's own width, not the heading box), writes itself in,
     then slides left. */
  const state=items.map(()=>0);                      /* 0 hidden · 1 waiting · 2 opening/open */
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
      setTimeout(()=>{ it.classList.add('o'); setTimeout(()=>write(t,38),280); },lead);
      setTimeout(()=>it.classList.add('d'),lead+1500);
    },delay||0);
  }

  /* which pieces are waiting, and which have reached the middle of the screen */
  let running=false;
  function check(){
    if(!running) return;
    const vh=innerHeight, line=vh*.6;
    const atEnd=innerHeight+scrollY>=document.documentElement.scrollHeight-4;
    let n=0;
    items.forEach((it,i)=>{
      if(state[i]===2) return;
      const r=media[i].getBoundingClientRect();
      if(r.top<vh&&r.bottom>0&&!state[i]){ state[i]=1; it.classList.add('w'); requestAnimationFrame(()=>{ it.dataset.waited='1'; }); }
      if(r.top+r.height/2<=line||(atEnd&&r.top<vh)) open(i,(n++)*160);
    });
  }

  /* ---------- depth ----------
     Small pieces (1st and 4th of every four) travel further. Drift is
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

  /* the side and the work, once the name is in place */
  let begun=false;
  function begin(){
    if(begun) return; begun=true;
    root.classList.remove('hf-intro');
    writeSide(); writeLater();
    setTimeout(()=>{ running=true; queue(); },380);
  }

  /* ---------- the opening ---------- */
  const name=document.querySelector('.hf-name');
  function opening(){
    /* the name's own spot, then the transform that blows it up to fill the
       screen: across it on a wide screen, down it (turned 90°) on a tall one */
    /* measure the text itself: on a phone the heading box spans the full width */
    const box=name.getBoundingClientRect(), rg=document.createRange(); rg.selectNodeContents(name);
    const tr=rg.getBoundingClientRect();
    const r={left:box.left,top:box.top,width:tr.width,height:box.height}, vw=root.clientWidth, vh=innerHeight;
    const tall=vh>vw*1.15;
    let tx,ty,rot,sc;
    /* wide: across the full width, centred a little above the middle (artboard 25);
       tall: turned 90° and running 92% of the height, centred (the iPhone frames) */
    if(tall){ sc=(vh*.916)/r.width; rot=90; tx=(vw+r.height*sc)/2-r.left; ty=(vh-r.width*sc)/2-r.top; }
    else    { sc=(vw*.986)/r.width; rot=0; tx=-r.left; ty=vh*.454-r.height*sc/2-r.top; }
    const big=`translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) rotate(${rot}deg) scale(${sc.toFixed(3)})`;
    const small='translate(0px,0px) rotate(0deg) scale(1)';
    name.style.transform=big;
    const timers=[], at=(ms,fn)=>timers.push(setTimeout(fn,ms));
    function land(){
      name.classList.add('land');
      requestAnimationFrame(()=>{ name.style.transform=small; });
      at(1150,finish);
    }
    function finish(){
      timers.forEach(clearTimeout);
      ['wheel','touchstart','keydown','pointerdown'].forEach(t=>removeEventListener(t,skip));
      name.classList.remove('land'); name.style.transform='';
      if(!name.classList.contains('typed')) name.classList.add('typed');
      begin();
    }
    function skip(){ writers.forEach(w=>w.finish()); finish(); }
    at(250,()=>write(name,105,()=>at(450,land)));
    ['wheel','touchstart','pointerdown'].forEach(t=>addEventListener(t,skip,{passive:true}));
    addEventListener('keydown',skip);
  }
  if(root.classList.contains('hf-intro')&&name){
    /* measure with the real font: the fallback has different widths */
    const fonts=document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve();
    Promise.race([fonts,new Promise(r=>setTimeout(r,1200))]).then(opening);
  }else{
    write(name,55);
    setTimeout(begin,200);
  }
  root.classList.add('hf-ready');
  frame();

  /* ---------- cursor: eases toward the pointer, so it trails rather than sticks ---------- */
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
