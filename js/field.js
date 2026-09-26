/* ============================================================
   Home — the work as a school of thumbnails.

   The markup is a plain list of links (#field .o-card): that is what
   search engines, screen readers and anyone without JS get, a flat grid.
   This file only adds .is-3d and sets those same links swimming, so there
   is one list of work, not a 3D copy of it.

   How the school works: every card has a slot on a loose 3D orbit around
   the centre of the screen, and the whole orbit turns (θ). Each card
   swims toward its slot on a spring of its own stiffness, keeps a little
   distance from its neighbours, and banks into its turn — so when you
   scroll or drag, the group turns together but not in lockstep, like
   fish. Nothing is random at runtime: slots are seeded, so the school
   looks the same on every visit.

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

  /* Reduced motion keeps the flat grid: a swimming school is exactly
     what that setting asks us not to do. */
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  stage.classList.add('is-3d');

  const TAU=Math.PI*2;
  const P=1200;                          // perspective distance, px
  /* seeded slots: golden-angle phases spread the school evenly round the
     orbit; radius, height and speed vary per card so it never reads as a
     ring */
  const fish=cards.map((c,i)=>{
    const h=(i*.61803)%1, g=(i*.41421)%1;
    return {
      phase:i*2.39996,
      r:.55+.45*h,                       // share of the school radius
      y:(g-.5)*1.5,                      // share of the school height
      k:.82+.36*((i*.7549)%1),           // own speed round the orbit
      stiff:10+9*g, damp:5+2*h,          // how tightly it follows its slot
      wob:TAU*h,                         // phase of its idle bob
      p:{x:0,y:0,z:0}, v:{x:0,y:0,z:0},  // where it actually is
      released:false, born:0
    };
  });

  let W=0, R=0, H=0;
  function layout(){
    const vw=stage.clientWidth, vh=stage.clientHeight;
    W=Math.round(Math.max(120,Math.min(vw*.15,vh*.24,240)));
    R=Math.min(vw*.36,vh*.7,W*3);        // radius of the school
    H=Math.min(vh*.26,W*1.2);            // its height
    stage.style.setProperty('--cw',W+'px');
    stage.style.setProperty('--persp',P+'px');
  }
  layout();
  addEventListener('resize',layout,{passive:true});

  let theta=0, spin=2.6;                 // orbit angle (rad) and its speed; starts
                                         // fast so the school swirls in on load
  let tiltX=-10, tiltXT=-10, tiltY=0, tiltYT=0;
  let dragging=false, lastX=0, lastY=0, lastT=0, moved=0, idleAt=0, opening=false;
  let target=null;                       // θ to glide to (keys / focus)
  const DRIFT=.14;                       // rad/sec while nobody touches it
  const now=()=>performance.now();
  const touchIdle=()=>{idleAt=now()+2500;};
  /* past ~2.5 rad/s the slots outrun the springs and the school collapses
     into a column instead of turning */
  const clampSpin=s=>Math.max(-2.5,Math.min(2.5,s));

  /* ---------- steering ---------- */
  stage.addEventListener('pointerdown',e=>{
    if(e.button!==0||opening)return;
    dragging=true; moved=0; lastX=e.clientX; lastY=e.clientY; lastT=now(); target=null;
    touchIdle();
  });
  stage.addEventListener('pointermove',e=>{
    const r=stage.getBoundingClientRect();
    tiltYT=((e.clientX-r.left)/r.width-.5)*10;
    if(!dragging)return;
    const dx=e.clientX-lastX, dy=e.clientY-lastY, t=now(), dt=Math.max(t-lastT,1);
    moved+=Math.abs(dx)+Math.abs(dy);
    /* capture only once it is clearly a drag: capturing on pointerdown
       retargets the click to the stage and a plain tap never opens a card */
    if(moved>6&&!stage.hasPointerCapture(e.pointerId)){
      stage.setPointerCapture(e.pointerId); stage.classList.add('dragging');
    }
    const d=dx/R*1.1;                    // sideways: turn the school
    theta+=d; spin=clampSpin(d/dt*1000*.7);
    tiltXT=Math.max(-40,Math.min(25,tiltXT-dy*.25));   // up/down: it dives or climbs
    lastX=e.clientX; lastY=e.clientY; lastT=t; touchIdle();
  });
  const end=e=>{
    if(!dragging)return;
    dragging=false; stage.classList.remove('dragging');
    try{stage.releasePointerCapture(e.pointerId);}catch(_){}
  };
  stage.addEventListener('pointerup',end);
  stage.addEventListener('pointercancel',end);
  stage.addEventListener('pointerleave',()=>{tiltYT=0;});

  /* wheel / trackpad — the home page does not scroll, so the wheel is free */
  stage.addEventListener('wheel',e=>{
    e.preventDefault(); if(opening)return;
    spin=clampSpin(spin+(e.deltaY+e.deltaX)*.004); target=null; touchIdle();
  },{passive:false});

  /* bring card i round to the front: its slot angle is θ·k + phase, and
     the front of the orbit is angle 0 (nearest the viewer) */
  function goTo(i){
    const f=fish[i];
    let t=(-f.phase)/f.k;
    const per=TAU/f.k; t+=Math.round((theta-t)/per)*per;
    target=t; spin=0; touchIdle();
  }
  addEventListener('keydown',e=>{
    if(opening)return;
    if(e.key==='ArrowRight'){spin+=1.2;touchIdle();e.preventDefault();}
    if(e.key==='ArrowLeft'){spin-=1.2;touchIdle();e.preventDefault();}
    if(e.key==='ArrowUp'){tiltXT=Math.max(-40,tiltXT-8);e.preventDefault();}
    if(e.key==='ArrowDown'){tiltXT=Math.min(25,tiltXT+8);e.preventDefault();}
  });
  cards.forEach((c,i)=>c.addEventListener('focus',()=>goTo(i)));

  /* the school calms while you point at one of them — a moving target is
     how you miss-click */
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

  /* the project named in the HUD opens the same way as its card — the
     name is just a larger target for the same thing */
  if(hudName)hudName.addEventListener('click',e=>{
    if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    const c=cards.find(x=>x.getAttribute('href')===hudName.getAttribute('href'));
    if(c){e.preventDefault();open(c);}
  });

  function open(c){
    if(opening)return; opening=true; target=null;
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

  /* ---------- entrance: released one by one from the centre ----------
     Waits (briefly) for the thumbnails so they arrive as pictures, not as
     empty boxes. Each card starts as a point at the centre and its spring
     throws it out to its slot; the fast initial spin makes it a swirl. */
  /* the clock starts on the first painted frame, not when the images are
     ready: a tab opened in the background has no frames, and starting the
     clock then would release every card at once when it is first seen */
  let startAt=Infinity, ready=false;
  const imgs=cards.map(c=>c.querySelector('img'));
  Promise.race([
    Promise.all(imgs.map(i=>i.decode?i.decode().catch(()=>{}):null)),
    new Promise(r=>setTimeout(r,900))
  ]).then(()=>{ready=true;});

  /* Coming back (browser Back from a case study, when the page was not
     kept in bfcache) is not a first visit: the entrance was the welcome,
     replaying it on every return is a wait. The school is simply there. */
  const navEntry=(performance.getEntriesByType&&performance.getEntriesByType('navigation')[0])||{};
  if(navEntry.type==='back_forward'){
    spin=DRIFT; ready=true; startAt=0;
    fish.forEach(f=>{
      f.p={x:Math.sin(f.phase)*f.r*R, y:f.y*H, z:Math.cos(f.phase)*f.r*R};
      f.released=true; f.born=-1;
    });
  }

  let last=0, tt=0;
  function frame(t){
    const dt=last?Math.min((t-last)/1000,.04):0; last=t; tt+=dt;

    if(!dragging&&!opening){
      if(target!==null){
        theta+=(target-theta)*Math.min(dt*4,1); spin=0;
        if(Math.abs(target-theta)<.002){theta=target;target=null;}
      }else{
        const calm=hover>-1?0:(now()>idleAt?DRIFT:spin);
        spin+=(calm-spin)*Math.min(dt*(hover>-1?6:1.2),1);
        theta+=spin*dt;
      }
      tiltXT+=(-10-tiltXT)*Math.min(dt*.6,1);          // levels out when let go
    }
    tiltX+=(tiltXT-tiltX)*Math.min(dt*3,1);
    tiltY+=(tiltYT-tiltY)*Math.min(dt*2,1);
    world.style.transform='translateZ('+(-R*.6).toFixed(1)+'px) rotateX('+tiltX.toFixed(2)+'deg) rotateY('+tiltY.toFixed(2)+'deg)';

    if(ready&&startAt===Infinity)startAt=now();
    const since=now()-startAt;
    let near=-1, nz=-Infinity;
    for(let i=0;i<n;i++){
      const f=fish[i], c=cards[i];
      if(!f.released){
        if(since<i*55){c.style.opacity='0';continue;}
        f.released=true; f.born=tt;
      }
      /* the slot this fish is heading for */
      const a=theta*f.k+f.phase;
      const tx=Math.sin(a)*f.r*R;
      const tz=Math.cos(a)*f.r*R;
      const ty=f.y*H+Math.sin(tt*.9+f.wob)*W*.12;
      /* spring toward the slot */
      let ax=(tx-f.p.x)*f.stiff-f.v.x*f.damp;
      let ay=(ty-f.p.y)*f.stiff-f.v.y*f.damp;
      let az=(tz-f.p.z)*f.stiff-f.v.z*f.damp;
      /* keep a little distance from the others */
      const min=W*1.05;
      for(let j=0;j<n;j++){
        if(j===i||!fish[j].released)continue;
        const q=fish[j].p, dx=f.p.x-q.x, dy=(f.p.y-q.y)*1.2, dz=(f.p.z-q.z)*.6;
        const d2=dx*dx+dy*dy+dz*dz;
        if(d2<min*min&&d2>1){const d=Math.sqrt(d2), s=(min-d)/d*14; ax+=dx*s; ay+=dy*s; az+=dz*s*.5;}
      }
      f.v.x+=ax*dt; f.v.y+=ay*dt; f.v.z+=az*dt;
      f.p.x+=f.v.x*dt; f.p.y+=f.v.y*dt; f.p.z+=f.v.z*dt;

      /* bank into the turn: yaw with sideways speed, roll with climb */
      const yaw=Math.max(-35,Math.min(35,f.v.x*.05));
      const roll=Math.max(-12,Math.min(12,-f.v.y*.03));
      const grow=Math.min(1,(tt-f.born)/.5);           // scales up as it leaves the centre
      const s=.2+.8*(1-Math.pow(1-grow,3));
      c.style.transform='translate3d('+f.p.x.toFixed(1)+'px,'+f.p.y.toFixed(1)+'px,'+f.p.z.toFixed(1)+'px) rotateY('+yaw.toFixed(1)+'deg) rotateZ('+roll.toFixed(1)+'deg) scale('+s.toFixed(3)+')';
      /* the far side of the school sinks into the background */
      const depth=(f.p.z/R+1)/2;                       // 0 back … 1 front
      c.style.opacity=(grow*(.6+.4*depth)).toFixed(3);
      c.classList.toggle('far',depth<.35);
      if(f.p.z>nz){nz=f.p.z;near=i;}
    }
    if(!opening)hud(hover>-1?hover:near);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
