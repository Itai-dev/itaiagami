/* ============================================================
   WORK: the cloud (work.html only; styles in css/site.css, "the cloud")

   Every case-study image as a small tile, gathered into a shape: a square,
   a ring, a star, a grid. The shapes take turns every few seconds (or with
   ‹ ›); hovering a tile brings that project's tiles forward and names it;
   a click opens the case study. The filters above apply to it.

   Decorative: the cloud is aria-hidden and its tiles are out of the tab
   order, because the list below carries the same links for everyone.
   Tiles come from assets/opt/cloud/cloud.json (tools/make-cloud.mjs).
   ============================================================ */
(function(){
  const box=document.getElementById('workCloud'); if(!box) return;
  const ctl=document.querySelector('.cloud-ctl'), label=ctl&&ctl.querySelector('.cloud-name');
  const list=document.getElementById('indexList');
  const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(still) box.classList.add('still');

  /* small, seeded random numbers, so every visit draws the same shapes */
  const rng=seed=>()=>{ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed);
    t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
  /* each shape returns n points in -1…1; filled shapes by sampling inside them */
  function sample(n,seed,inside){ const r=rng(seed), pts=[]; let guard=0;
    while(pts.length<n&&guard++<n*400){ const x=r()*2-1, y=r()*2-1; if(inside(x,y)) pts.push([x,y]); } return pts; }
  const STAR=(()=>{ const p=[]; for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, rad=i%2?0.42:1; p.push([Math.cos(a)*rad,Math.sin(a)*rad*1.02+0.06]); } return p; })();
  function inPoly(x,y,poly){ let c=false; for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const [xi,yi]=poly[i],[xj,yj]=poly[j]; if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi)) c=!c; } return c; }
  const SHAPES={
    square:n=>sample(n,11,(x,y)=>Math.max(Math.abs(x),Math.abs(y))>=.6),
    ring:  n=>sample(n,23,(x,y)=>{ const d=Math.hypot(x,y); return d<=1&&d>=.6; }),
    star:  n=>sample(n,37,(x,y)=>inPoly(x,y,STAR)),
    grid:  n=>{ const c=Math.ceil(Math.sqrt(n)), pts=[]; for(let i=0;i<n;i++){ const gx=i%c, gy=Math.floor(i/c);
      pts.push([(gx/(c-1))*2-1,(gy/(Math.ceil(n/c)-1))*2-1]); } return pts; }
  };
  const ORDER=['square','ring','star','grid'];
  /* neighbours move together: tiles and points are both taken in order of angle */
  const byAngle=pts=>pts.map((p,i)=>({p,i,a:Math.atan2(p[1],p[0])})).sort((a,b)=>a.a-b.a);

  let tiles=[], items=[], shape=0, timer=0, hovering=false, built=false, seen=false;
  const tag=document.createElement('span'); tag.className='cloud-tag';

  function layout(){
    if(!tiles.length) return;
    const W=box.clientWidth, H=box.clientHeight, name=ORDER[shape];
    const D=Math.min(W*.92,H*.94), wide=name==='grid'?Math.min(W*.84,H*1.7):D;
    const pts=byAngle(SHAPES[name](tiles.length));
    const base=Math.max(30,D*(name==='grid'?.1:.135));
    pts.forEach((q,k)=>{
      const t=tiles[order[k]], [x,y]=q.p;
      t.style.setProperty('--x',(W/2+x*wide/2).toFixed(1)+'px');
      t.style.setProperty('--y',(H/2+y*D/2).toFixed(1)+'px');
      t.style.setProperty('--w',(base*t._k).toFixed(1)+'px');
      t.style.transitionDelay=still?'0s':(k*5)+'ms';
    });
    if(label) label.textContent=name;
  }
  let order=[];
  function go(step){
    shape=(shape+step+ORDER.length)%ORDER.length; layout(); schedule();
  }
  function schedule(){
    clearTimeout(timer); if(still) return;
    timer=setTimeout(()=>{ if(!hovering&&!document.hidden&&seen) go(1); else schedule(); },5200);
  }

  /* filters: tiles of projects the list is hiding step back */
  function filter(){
    if(!list) return;
    const off=new Set([...list.querySelectorAll('.prow.hidden a')].map(a=>a.getAttribute('href')));
    tiles.forEach(t=>t.classList.toggle('off',off.has(t.getAttribute('href'))));
  }

  function build(data){
    items=data; const r=rng(5);
    box.innerHTML='';
    tiles=data.map((d,i)=>{
      const a=document.createElement('a'); a.className='cloud-tile'; a.href='work/'+d.slug+'.html'; a.tabIndex=-1;
      a.dataset.slug=d.slug; a._k=.6+r()*.75;                 /* stable size per tile */
      a.style.setProperty('--ar',(d.w/d.h).toFixed(3)); a.style.zIndex=1+Math.floor(r()*20);
      const img=new Image(); img.src=d.src; img.alt=''; img.decoding='async'; img.loading='lazy';
      a.appendChild(img); box.appendChild(a);
      a.addEventListener('pointerenter',()=>{ hovering=true; box.classList.add('hl');
        tiles.forEach(t=>t.classList.toggle('lit',t.dataset.slug===d.slug));
        tag.textContent=d.name+' · '+d.tag; a.appendChild(tag); });
      a.addEventListener('pointerleave',()=>{ hovering=false; box.classList.remove('hl'); tiles.forEach(t=>t.classList.remove('lit')); tag.remove(); });
      return a;
    });
    /* tiles are dealt round the shape in a mixed order, so projects interleave */
    order=tiles.map((_,i)=>i).sort((a,b)=>((a*37)%tiles.length)-((b*37)%tiles.length));
    box.classList.add('ready');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{ box.classList.add('in'); layout(); schedule(); }));
    filter();
    if(ctl) ctl.hidden=false;
  }

  if(ctl) ctl.addEventListener('click',e=>{ const b=e.target.closest('[data-cloud]'); if(b) go(b.dataset.cloud==='next'?1:-1); });
  if(list) new MutationObserver(filter).observe(list,{subtree:true,attributes:true,attributeFilter:['class']});
  let rz=0; addEventListener('resize',()=>{ clearTimeout(rz); rz=setTimeout(layout,120); });

  /* load the tiles when the cloud is (nearly) on screen; pause the turns when it is not */
  const start=()=>{ if(built) return; built=true;
    fetch('/assets/opt/cloud/cloud.json').then(r=>r.ok?r.json():[]).then(d=>{ if(d.length) build(d); }).catch(()=>{}); };
  if('IntersectionObserver' in window){
    new IntersectionObserver(es=>es.forEach(e=>{ seen=e.isIntersecting; if(seen) start(); }),{rootMargin:'200px 0px'}).observe(box);
  }else{ seen=true; start(); }
})();
