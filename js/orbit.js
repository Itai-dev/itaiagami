/* ============================================================
   Home — the work as a ring of thumbnails you turn.

   The markup is a plain list of links (#orbit .o-card), which is what
   search engines, screen readers and anyone without JS get: a flat grid.
   This file only adds .is-3d and places those same links on a cylinder,
   so there is one list of work, not a 3D copy of it.

   CSS 3D rather than WebGL: the cards stay real <a><img> elements —
   focusable, crawlable, sharp at any DPR — and 17 transformed images
   cost nothing next to a three.js bundle.
   ============================================================ */
(function(){
  const stage=document.getElementById('orbit'); if(!stage)return;
  const ring=stage.querySelector('.o-ring');
  const cards=[...stage.querySelectorAll('.o-card')];
  const hudIdx=document.getElementById('hudIdx');
  const hudName=document.getElementById('hudName');
  const hudCat=document.getElementById('hudCat');
  const n=cards.length; if(!n||!ring)return;

  /* Reduced motion keeps the flat grid: a spinning ring is exactly the
     thing that setting asks us not to do. */
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;

  stage.classList.add('is-3d');
  const step=360/n;
  let W=0,R=0;

  function layout(){
    const vw=stage.clientWidth, vh=stage.clientHeight;
    /* sized so the whole ring fits the width on desktop (diameter ≈ 0.95vw)
       and reads as one object; phones get a floor and see the front arc */
    W=Math.round(Math.max(150,Math.min(vw*0.16,vh*0.42,340)));
    const gap=W*0.12;
    R=Math.round(((W+gap)*n)/(2*Math.PI));
    stage.style.setProperty('--cw',W+'px');
    stage.style.setProperty('--persp',Math.round(R*3.2)+'px');
    cards.forEach((c,i)=>{c.style.transform='rotateY('+(i*step)+'deg) translateZ('+R+'px)';});
  }
  layout();
  addEventListener('resize',layout,{passive:true});

  /* angle is in degrees; the ring turns by -angle so card i faces the
     viewer when angle === i*step */
  let angle=0, vel=0, target=null;
  let tiltX=-9, tiltY=0, tiltXT=-9, tiltYT=0;
  let dragging=false, lastX=0, lastT=0, moved=0, idleAt=0;
  const AUTO=4;                       // deg/sec drift while nobody is touching it
  const now=()=>performance.now();
  const touchIdle=()=>{idleAt=now()+3500;};

  const frontIndex=()=>{
    const i=Math.round(angle/step)%n; return (i+n)%n;
  };

  /* pointer drag with inertia */
  stage.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    dragging=true; moved=0; lastX=e.clientX; lastT=now(); vel=0; target=null;
    touchIdle();
  });
  stage.addEventListener('pointermove',e=>{
    const r=stage.getBoundingClientRect();
    tiltYT=((e.clientX-r.left)/r.width-.5)*8;
    tiltXT=-9+((e.clientY-r.top)/r.height-.5)*-8;
    if(!dragging)return;
    const dx=e.clientX-lastX, t=now(), dt=Math.max(t-lastT,1);
    moved+=Math.abs(dx);
    /* capture only once it is clearly a drag: capturing on pointerdown
       retargets the click to the stage and a plain tap never opens a card */
    if(moved>6&&!stage.hasPointerCapture(e.pointerId)){
      stage.setPointerCapture(e.pointerId); stage.classList.add('dragging');
    }
    /* one card width of drag ≈ one step, whatever the screen size */
    const d=-dx/W*step;
    angle+=d; vel=d/dt*1000*.6;
    lastX=e.clientX; lastT=t; touchIdle();
  });
  const end=e=>{
    if(!dragging)return;
    dragging=false; stage.classList.remove('dragging');
    try{stage.releasePointerCapture(e.pointerId);}catch(_){}
  };
  stage.addEventListener('pointerup',end);
  stage.addEventListener('pointercancel',end);
  stage.addEventListener('pointerleave',()=>{tiltXT=-9;tiltYT=0;});

  /* a drag that ends over a card must not open it */
  stage.addEventListener('click',e=>{
    if(moved>6){e.preventDefault();e.stopPropagation();}
  },true);

  /* wheel / trackpad — the home page does not scroll, so the wheel is free */
  stage.addEventListener('wheel',e=>{
    e.preventDefault();
    const d=(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY);
    vel+=d*.9; target=null; touchIdle();
  },{passive:false});

  /* keyboard: arrows step one card; tabbing to a card turns it to the front */
  function goTo(i){ // nearest equivalent angle, so it never spins the long way
    let a=i*step; const k=Math.round((angle-a)/360); a+=k*360;
    target=a; vel=0; touchIdle();
  }
  addEventListener('keydown',e=>{
    if(e.target.closest&&e.target.closest('input,textarea,select'))return;
    if(e.key==='ArrowRight'){goTo(Math.round(angle/step)+1);e.preventDefault();}
    if(e.key==='ArrowLeft'){goTo(Math.round(angle/step)-1);e.preventDefault();}
  });
  cards.forEach((c,i)=>c.addEventListener('focus',()=>goTo(i)));
  /* hold still while someone is reading a card — drifting out from under
     the cursor is how you miss-click */
  let over=false;
  cards.forEach(c=>{
    c.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')over=true;});
    c.addEventListener('pointerleave',()=>{over=false;});
  });

  let shown=-1, last=0;
  function frame(t){
    const dt=last?Math.min((t-last)/1000,.05):0; last=t;
    if(!dragging){
      if(target!==null){
        angle+=(target-angle)*Math.min(dt*7,1);
        if(Math.abs(target-angle)<.02){angle=target;target=null;}
      }else{
        angle+=vel*dt; vel*=Math.pow(.04,dt);        // ~1s glide
        if(Math.abs(vel)<.5&&now()>idleAt&&!over){vel=0;angle+=AUTO*dt;}
      }
    }
    tiltX+=(tiltXT-tiltX)*Math.min(dt*3,1);
    tiltY+=(tiltYT-tiltY)*Math.min(dt*3,1);
    ring.style.transform='translateZ('+(-R)+'px) rotateX('+tiltX.toFixed(2)+'deg) rotateY('+(-angle+tiltY).toFixed(3)+'deg)';

    /* cards facing away fade toward the background instead of being hidden,
       so the ring reads as one object */
    for(let i=0;i<n;i++){
      const rel=((i*step-angle)%360+540)%360-180;       // -180..180, 0 = front
      const f=Math.cos(rel*Math.PI/180);                 // 1 front, -1 back
      cards[i].style.opacity=(.6+.4*f).toFixed(3);
      cards[i].classList.toggle('back',f<0);
    }
    const fi=frontIndex();
    if(fi!==shown){
      shown=fi;
      cards.forEach((c,i)=>c.classList.toggle('front',i===fi));
      const c=cards[fi];
      if(hudIdx)hudIdx.textContent=String(fi+1).padStart(2,'0')+' / '+String(n).padStart(2,'0');
      if(hudName){hudName.textContent=c.dataset.name;hudName.href=c.getAttribute('href');}
      if(hudCat)hudCat.textContent=c.dataset.cat;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
