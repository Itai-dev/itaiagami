/* ============================================================
   Home — the work as a field of thumbnails you fly through.

   The markup is a plain list of links (#field .o-card): that is what
   search engines, screen readers and anyone without JS get, a flat grid.
   This file only adds .is-3d and scatters those same links through depth,
   so there is one list of work, not a 3D copy of it.

   CSS 3D rather than WebGL: the cards stay real <a><img> elements —
   focusable, crawlable, sharp at any DPR — and 17 transformed images
   cost nothing next to a three.js bundle.

   Opening a project does not cut away: the thumbnail stays where it is
   and grows into the full-bleed cover, then the case study loads and a
   cross-document view transition settles that cover into the page's own
   hero (.c-hero carries the same view-transition-name, see site.css).
   ============================================================ */
(function(){
  const stage=document.getElementById('field'); if(!stage)return;
  const world=stage.querySelector('.o-ring');
  const cards=[...stage.querySelectorAll('.o-card')];
  const hudIdx=document.getElementById('hudIdx');
  const hudName=document.getElementById('hudName');
  const hudCat=document.getElementById('hudCat');
  const n=cards.length; if(!n||!world)return;

  /* Reduced motion keeps the flat grid: flying through space is exactly
     what that setting asks us not to do. */
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  stage.classList.add('is-3d');

  const P=1000;            // perspective distance, px
  const D=2600;            // depth of the field; cards live in [-D, NEAR)
  const NEAR=220;          // past this they have gone behind the viewer
  const L=D+NEAR;
  const FOCUS=-420;        // where a card is brought to by keys / focus
  const mod=(a,m)=>((a%m)+m)%m;

  /* Placement is deterministic, not Math.random: the same card sits in
     the same place on every visit. Golden-angle spiral keeps neighbours in
     depth far apart on screen and leaves the centre — the flight path —
     mostly clear, so a near card never parks over everything else. */
  const base=cards.map((c,i)=>{
    const a=i*2.39996+.6;
    const r=.42+.5*((i*.61803)%1);
    return {nx:Math.cos(a)*r, ny:Math.sin(a)*r*.8, z:-(i/n)*L};
  });
  let W=0, SX=0, SY=0;
  function layout(){
    const vw=stage.clientWidth, vh=stage.clientHeight;
    W=Math.round(Math.max(130,Math.min(vw*.19,vh*.34,300)));
    /* spread is set at mid-depth, so the field fills the frame there and
       cards drift out past the edges as they come close */
    const k=(P+D*.35)/P;
    SX=vw*.5*k; SY=vh*.5*k;
    stage.style.setProperty('--cw',W+'px');
    stage.style.setProperty('--persp',P+'px');
  }
  layout();
  addEventListener('resize',layout,{passive:true});

  let cam=0, vel=0, target=null;          // travel along z
  let panX=0, panXT=0;                     // horizontal drag
  let tiltX=0, tiltY=0, tiltXT=0, tiltYT=0;
  let dragging=false, lastX=0, lastY=0, lastT=0, moved=0, idleAt=0, opening=false;
  const DRIFT=38;                          // px/sec while nobody touches it
  const now=()=>performance.now();
  const touchIdle=()=>{idleAt=now()+3000;};
  const depth=i=>mod(base[i].z+cam+D,L)-D;

  /* pointer: vertical drag travels, horizontal drag pans, hover tilts */
  stage.addEventListener('pointerdown',e=>{
    if(e.button!==0||opening)return;
    dragging=true; moved=0; lastX=e.clientX; lastY=e.clientY; lastT=now(); vel=0; target=null;
    touchIdle();
  });
  stage.addEventListener('pointermove',e=>{
    const r=stage.getBoundingClientRect();
    tiltYT=((e.clientX-r.left)/r.width-.5)*7;
    tiltXT=((e.clientY-r.top)/r.height-.5)*-5;
    if(!dragging)return;
    const dx=e.clientX-lastX, dy=e.clientY-lastY, t=now(), dt=Math.max(t-lastT,1);
    moved+=Math.abs(dx)+Math.abs(dy);
    /* capture only once it is clearly a drag: capturing on pointerdown
       retargets the click to the stage and a plain tap never opens a card */
    if(moved>6&&!stage.hasPointerCapture(e.pointerId)){
      stage.setPointerCapture(e.pointerId); stage.classList.add('dragging');
    }
    const dz=-dy*3.2;
    cam+=dz; vel=dz/dt*1000*.5;
    panXT=Math.max(-SX*.5,Math.min(SX*.5,panXT-dx*1.4));
    lastX=e.clientX; lastY=e.clientY; lastT=t; touchIdle();
  });
  const end=e=>{
    if(!dragging)return;
    dragging=false; stage.classList.remove('dragging');
    try{stage.releasePointerCapture(e.pointerId);}catch(_){}
  };
  stage.addEventListener('pointerup',end);
  stage.addEventListener('pointercancel',end);
  stage.addEventListener('pointerleave',()=>{tiltXT=0;tiltYT=0;});

  /* wheel / trackpad — the home page does not scroll, so the wheel is free */
  stage.addEventListener('wheel',e=>{
    e.preventDefault(); if(opening)return;
    vel+=-e.deltaY*1.6; panXT=Math.max(-SX*.5,Math.min(SX*.5,panXT+e.deltaX*1.2));
    target=null; touchIdle();
  },{passive:false});

  /* keys: fly to the next card further in / back out */
  function goTo(i){ target=cam+(FOCUS-depth(i)); vel=0; panXT=base[i].nx*SX*.55; touchIdle(); }
  function stepTo(dir){
    let best=-1, bd=Infinity;
    for(let i=0;i<n;i++){
      const d=(FOCUS-40*dir)-depth(i);     // how far to travel to bring i to FOCUS
      const want=dir>0?d>0:d<0;
      if(want&&Math.abs(d)<bd){bd=Math.abs(d);best=i;}
    }
    if(best>-1)goTo(best);
  }
  addEventListener('keydown',e=>{
    if(opening)return;
    if(e.key==='ArrowUp'||e.key==='ArrowRight'){stepTo(1);e.preventDefault();}
    if(e.key==='ArrowDown'||e.key==='ArrowLeft'){stepTo(-1);e.preventDefault();}
  });
  cards.forEach((c,i)=>c.addEventListener('focus',()=>goTo(i)));

  /* the HUD names what you are pointing at; with nothing pointed at, the
     nearest card in clear view */
  let hover=-1;
  cards.forEach((c,i)=>{
    c.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')hover=i;});
    c.addEventListener('pointerleave',()=>{if(hover===i)hover=-1;});
    /* warm the cover image so the grow has the full picture to land on */
    const warm=()=>{if(!c.dataset.warm){c.dataset.warm='1';new Image().src=c.dataset.hero;}};
    c.addEventListener('pointerenter',warm); c.addEventListener('focus',warm);
  });
  let shown=-1;
  function hud(i){
    if(i===shown||i<0)return; shown=i;
    const c=cards[i];
    cards.forEach((x,j)=>x.classList.toggle('front',j===i));
    if(hudIdx)hudIdx.textContent=String(i+1).padStart(2,'0')+' / '+String(n).padStart(2,'0');
    if(hudName){hudName.textContent=c.dataset.name;hudName.href=c.getAttribute('href');}
    if(hudCat)hudCat.textContent=c.dataset.cat;
  }

  /* ---------- open: the thumbnail grows into the cover ---------- */
  stage.addEventListener('click',e=>{
    /* the drag distance belongs to this one click only — left standing, it
       would swallow the next keyboard Enter, which has no pointerdown */
    const wasDrag=moved>6; moved=0;
    if(wasDrag){e.preventDefault();e.stopPropagation();return;}
    const c=e.target.closest('.o-card'); if(!c)return;
    if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;          // new tab etc. stay native
    e.preventDefault(); open(c);
  },true);

  function open(c){
    if(opening)return; opening=true; vel=0; target=null;
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
    cover.classList.add('full');
    Object.assign(cover.style,{left:'0px',top:'0px',width:'100%',height:'100%'});
    setTimeout(()=>{grown=true;go();},720);
  }
  /* back button restores this page from bfcache mid-open — undo it */
  addEventListener('pageshow',e=>{
    if(!e.persisted)return;
    document.querySelectorAll('.o-cover').forEach(x=>x.remove());
    document.body.classList.remove('opening'); opening=false; moved=0;
  });

  let last=0;
  function frame(t){
    const dt=last?Math.min((t-last)/1000,.05):0; last=t;
    if(!dragging&&!opening){
      if(target!==null){
        cam+=(target-cam)*Math.min(dt*5,1);
        if(Math.abs(target-cam)<.5){cam=target;target=null;}
      }else{
        cam+=vel*dt; vel*=Math.pow(.05,dt);
        if(Math.abs(vel)<8&&now()>idleAt&&hover<0){vel=0;cam+=DRIFT*dt;}
      }
    }
    panX+=(panXT-panX)*Math.min(dt*4,1);
    tiltX+=(tiltXT-tiltX)*Math.min(dt*3,1);
    tiltY+=(tiltYT-tiltY)*Math.min(dt*3,1);
    world.style.transform='rotateX('+tiltX.toFixed(2)+'deg) rotateY('+tiltY.toFixed(2)+'deg) translateX('+(-panX).toFixed(1)+'px)';

    let near=-1, nz=-Infinity;
    for(let i=0;i<n;i++){
      const z=depth(i), b=base[i];
      /* fade in out of the far fog, fade out just before passing the viewer */
      const fin=Math.min(1,(z+D)/500);
      const fout=Math.min(1,Math.max(0,(NEAR*.4-z)/(NEAR*1.4)));
      const o=Math.max(0,Math.min(fin,fout));
      const c=cards[i];
      c.style.transform='translate3d('+(b.nx*SX).toFixed(1)+'px,'+(b.ny*SY).toFixed(1)+'px,'+z.toFixed(1)+'px)';
      c.style.opacity=o.toFixed(3);
      c.style.visibility=o<.02?'hidden':'';
      c.classList.toggle('far',z<-D*.55);
      if(o>.9&&z>nz){nz=z;near=i;}
    }
    if(!opening)hud(hover>-1?hover:near);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
