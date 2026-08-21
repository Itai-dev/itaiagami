/* ============================================================
   HERO — "System"
   Loose parts that become a whole. A field of disconnected nodes
   drifts in the hero; wherever attention lands, the pieces find
   each other and a structure draws itself in. Move away and it
   loosens again. Canvas 2D, no dependencies, no external assets.

   Everything worth changing lives in CFG.
   ============================================================ */
(function(){
  const host = document.getElementById('heroSystem');
  if(!host) return;
  if(matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  if(!matchMedia('(min-width:901px) and (hover:hover) and (pointer:fine)').matches) return;

  const CFG = {
    nodes:      34,    /* how many parts */
    minGap:     .085,  /* min spacing at layout time (fraction of box) */
    linkDist:   180,   /* px — how close two nodes must be to be linkable */
    reach:      320,   /* px — radius of influence around the cursor */
    drift:      11,    /* px — idle wander amplitude */
    dot:        1.7,   /* px — node radius, dormant */
    dotHot:     3.1,   /* px — node radius, connected */
    dotAlpha:   .26,   /* dormant node opacity */
    dotAlphaHot:.95,   /* connected node opacity */
    lineAlpha:  .6,    /* strongest edge opacity */
    lineWidth:  1.1,
    ease:       .17,   /* how fast a node forms/loosens (0–1 per frame) */
    sweepEvery: 8000,  /* ms — idle pass, so the idea reads without a cursor */
    sweepPower: .65,   /* idle pass strength vs. cursor (0–1) */
    accent:     true   /* mark the most-connected node in --mark */
  };

  const cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden','true');
  host.appendChild(cv);
  const ctx = cv.getContext('2d', { alpha:true });

  /* ---------- theme colours, read from the site's own CSS vars ---------- */
  let FG=[0,0,0], MARK=[242,92,5];
  const hex = v => {
    v = (v||'').trim();
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(v);
    return m ? [parseInt(m[1],16),parseInt(m[2],16),parseInt(m[3],16)] : null;
  };
  function readTheme(){
    const cs = getComputedStyle(document.documentElement);
    FG   = hex(cs.getPropertyValue('--fg'))   || FG;
    MARK = hex(cs.getPropertyValue('--mark')) || MARK;
  }
  readTheme();
  new MutationObserver(readTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  const rgba = (c,a) => 'rgba('+c[0]+','+c[1]+','+c[2]+','+a.toFixed(3)+')';
  const mix = (a,b,t) => { t = t<0?0:t>1?1:t; return [
    Math.round(a[0]+(b[0]-a[0])*t), Math.round(a[1]+(b[1]-a[1])*t), Math.round(a[2]+(b[2]-a[2])*t)]; };

  /* ---------- layout: fixed seed, so the composition is designed, not random ---------- */
  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  const rnd = mulberry32(20260725);
  const nodes = [];
  for(let i=0, guard=0; i<CFG.nodes && guard<4000; guard++){
    const nx = .08 + rnd()*.84, ny = .06 + rnd()*.88;
    let ok = true;
    for(const n of nodes){ if(Math.hypot(n.nx-nx, n.ny-ny) < CFG.minGap){ ok = false; break; } }
    if(!ok) continue;
    nodes.push({
      nx, ny, x:0, y:0, hot:0, deg:0,
      /* two slow, incommensurate periods per node = wander that never repeats visibly */
      p1: rnd()*6.283, p2: rnd()*6.283,
      s1: 12000 + rnd()*9000, s2: 17000 + rnd()*11000
    });
    i++;
  }

  /* ---------- sizing ---------- */
  let w=0, h=0, rect=null, pairs=[];
  function measure(){
    rect = host.getBoundingClientRect();
    w = rect.width; h = rect.height;
    if(!w || !h) return;
    const dpr = Math.min(devicePixelRatio||1, 2);
    cv.width = Math.round(w*dpr); cv.height = Math.round(h*dpr);
    cv.style.width = w+'px'; cv.style.height = h+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    for(const n of nodes){ n.x = n.nx*w; n.y = n.ny*h; }
    /* precompute which pairs could ever link, with margin for drift */
    const lim = CFG.linkDist + CFG.drift*2;
    pairs = [];
    for(let i=0;i<nodes.length;i++)
      for(let j=i+1;j<nodes.length;j++)
        if(Math.hypot(nodes[i].x-nodes[j].x, nodes[i].y-nodes[j].y) < lim) pairs.push([i,j]);
  }
  measure();
  addEventListener('resize', measure, {passive:true});
  addEventListener('scroll', () => { rect = host.getBoundingClientRect(); }, {passive:true});

  /* ---------- pointer (the layer itself is pointer-events:none, so listen globally) ---------- */
  let px=-9999, py=-9999, presence=0, presenceTo=0;
  addEventListener('pointermove', e => {
    if(!rect) return;
    px = e.clientX - rect.left; py = e.clientY - rect.top;
    presenceTo = 1;
  }, {passive:true});
  addEventListener('pointerout', e => { if(!e.relatedTarget) presenceTo = 0; }, {passive:true});
  document.addEventListener('visibilitychange', () => { if(document.hidden) presenceTo = 0; });

  const smooth = t => t*t*(3-2*t);
  const falloff = (dx,dy,r) => {
    const d = Math.hypot(dx,dy);
    return d >= r ? 0 : smooth(1 - d/r);
  };

  /* ---------- loop ---------- */
  let raf = 0, t0 = 0, running = false, revealed = false;

  function frame(now){
    if(!t0) t0 = now;
    const t = now - t0;
    presence += (presenceTo - presence) * .06;

    /* the idle pass: a soft band crossing the field when no one is pointing at it */
    const sp = (t % CFG.sweepEvery) / CFG.sweepEvery;
    const sweepX = (-.15 + sp*1.3) * w;
    const sweepEnv = Math.sin(Math.PI*sp);
    const sweepAmt = CFG.sweepPower * sweepEnv * sweepEnv * (1 - presence);

    ctx.clearRect(0,0,w,h);

    for(const n of nodes){
      n.x = n.nx*w + Math.sin(t/n.s1*6.283 + n.p1) * CFG.drift;
      n.y = n.ny*h + Math.cos(t/n.s2*6.283 + n.p2) * CFG.drift;
      const byPointer = presence * falloff(n.x-px, n.y-py, CFG.reach);
      const bySweep   = sweepAmt * falloff(n.x-sweepX, 0, CFG.reach*1.15);
      const target    = Math.min(1, Math.max(byPointer, bySweep));
      n.hot += (target - n.hot) * CFG.ease;
      n.deg = 0;
    }

    /* edges first, so nodes sit on top of their own connections */
    ctx.lineWidth = CFG.lineWidth;
    for(const [i,j] of pairs){
      const a = nodes[i], b = nodes[j];
      const link = Math.min(a.hot, b.hot);
      if(link < .04) continue;
      const d = Math.hypot(a.x-b.x, a.y-b.y);
      if(d >= CFG.linkDist) continue;
      const alpha = link * CFG.lineAlpha * smooth(1 - d/CFG.linkDist);
      if(alpha < .004) continue;
      a.deg++; b.deg++;
      ctx.strokeStyle = rgba(FG, alpha);
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    }

    /* the accent marks whichever node is holding the most of the structure
       together — chosen before drawing so it is tinted, not overpainted */
    let hub = null;
    if(CFG.accent)
      for(const n of nodes)
        if(n.deg >= 3 && n.hot > .55 && (!hub || n.hot*n.deg > hub.hot*hub.deg)) hub = n;

    for(const n of nodes){
      const r = CFG.dot + (CFG.dotHot - CFG.dot) * n.hot;
      const col = n === hub ? mix(FG, MARK, (n.hot-.55)/.45) : FG;
      ctx.fillStyle = rgba(col, CFG.dotAlpha + (CFG.dotAlphaHot - CFG.dotAlpha) * n.hot);
      ctx.beginPath(); ctx.arc(n.x, n.y, n === hub ? r*1.15 : r, 0, 6.283); ctx.fill();
    }

    if(!revealed){ revealed = true; host.classList.add('ready'); }
    raf = requestAnimationFrame(frame);
  }

  function start(){ if(running) return; running = true; t0 = 0; raf = requestAnimationFrame(frame); }
  function stop(){ running = false; cancelAnimationFrame(raf); }

  /* only burn frames while the hero is actually on screen */
  new IntersectionObserver(es => {
    es.forEach(e => e.isIntersecting && !document.hidden ? start() : stop());
  }, {threshold:0}).observe(host);
  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });
})();
