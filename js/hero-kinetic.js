/* ============================================================
   HERO — kinetic type
   Two independent pieces, no dependencies, no external assets.

   1) SPLIT — every character of the headline becomes its own
      span, so each letter can pulse its own size and colour.
      The animation itself is CSS (see .ltr in css/site.css);
      this only builds the spans and hands out the stagger.

   2) FALL — letters and symbols spill out of the centre of the
      hero, drop to the floor, settle, hold and fade. Canvas 2D,
      drawn behind the copy so glyphs appear from under the
      headline.

   Everything worth changing in the fall lives in CFG. Neither
   piece runs under prefers-reduced-motion.
   ============================================================ */

/* ---------- 1. split the headline into letters ---------- */
(function(){
  const h1 = document.querySelector('.hero h1');
  if(!h1) return;

  /* Which accent each letter travels to. --fg entries are letters that only
     change size, which keeps the colour from turning into confetti. */
  const ACCENT = ['var(--fg)','var(--k1)','var(--fg)','var(--k2)','var(--fg)',
                  'var(--k3)','var(--fg)','var(--k4)','var(--fg)','var(--k1)'];

  /* Per-letter spans make some screen readers spell the heading out, so the
     whole line goes on the element as a label before anything is split. */
  h1.setAttribute('aria-label', h1.textContent.replace(/\s+/g,' ').trim());

  let i = 0;
  function split(node){
    for(const n of Array.from(node.childNodes)){
      if(n.nodeType === 1){ split(n); continue; }       /* keep <em> and friends */
      if(n.nodeType !== 3) continue;
      const frag = document.createDocumentFragment();
      /* split on whitespace but keep it: real spaces stay real text nodes, so
         the line still wraps and justifies the way the browser intends */
      for(const part of n.nodeValue.split(/(\s+)/)){
        if(!part) continue;
        if(/^\s+$/.test(part)){ frag.appendChild(document.createTextNode(part)); continue; }
        const wd = document.createElement('span');
        wd.className = 'wd';                             /* nowrap: letters are
                                                            inline-block, and a
                                                            word must not break */
        for(const ch of part){
          const s = document.createElement('span');
          s.className = 'ltr';
          s.textContent = ch;
          s.style.setProperty('--i', i);
          s.style.setProperty('--c', ACCENT[i % ACCENT.length]);
          i++;
          wd.appendChild(s);
        }
        frag.appendChild(wd);
      }
      node.replaceChild(frag, n);
    }
  }

  h1.querySelectorAll('.reveal-line > span').forEach(split);
  h1.classList.add('lettered');
})();


/* ---------- 2. letters and symbols falling from the centre ---------- */
(function(){
  const host = document.getElementById('heroFall');
  if(!host) return;
  if(matchMedia('(prefers-reduced-motion:reduce)').matches) return;

  const small = matchMedia('(max-width:700px)').matches;

  const CFG = {
    glyphs:   'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/\\*+-=<>()[]{}#&%!?@~^·—',
    max:      small ? 32 : 64,   /* glyphs alive at once */
    spawnMs:  small ? 150 : 110, /* ms between spawns */
    size:     small ? [12,34] : [13,58],  /* px */
    burstX:   210,   /* px/s — how wide they scatter leaving the centre */
    burstY:   150,   /* px/s — the lift before gravity wins */
    gravity:  520,   /* px/s² — low, so the fall reads rather than flicks past */
    spin:     2.6,   /* rad/s — max tumble */
    bounce:   .28,   /* energy kept on the one bounce */
    hold:     1500,  /* ms a landed glyph sits before fading */
    fade:     800,   /* ms to fade out */
    rise:     380,   /* ms to fade in, so nothing pops in mid-headline */
    alpha:    .85,   /* opacity while falling */
    accent:   .28    /* share of glyphs drawn in an accent colour */
  };

  const cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden','true');
  host.appendChild(cv);
  const ctx = cv.getContext('2d', { alpha:true });

  /* ---------- theme colours, read from the site's own CSS vars ---------- */
  let PALETTE = [[236,236,236]];
  const hex = v => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec((v||'').trim());
    return m ? [parseInt(m[1],16),parseInt(m[2],16),parseInt(m[3],16)] : null;
  };
  function readTheme(){
    const cs = getComputedStyle(document.documentElement);
    const fg = hex(cs.getPropertyValue('--fg')) || [236,236,236];
    const ks = ['--k1','--k2','--k3','--k4'].map(k => hex(cs.getPropertyValue(k))).filter(Boolean);
    PALETTE = { fg, accents: ks.length ? ks : [fg] };
  }
  readTheme();
  new MutationObserver(readTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  const rgba = (c,a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')';

  /* ---------- sizing ---------- */
  let w = 0, h = 0;
  function measure(){
    const r = host.getBoundingClientRect();
    w = r.width; h = r.height;
    if(!w || !h) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(w*dpr); cv.height = Math.round(h*dpr);
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  }
  measure();
  addEventListener('resize', measure, {passive:true});

  /* ---------- the pool ---------- */
  const rand = (a,b) => a + Math.random()*(b-a);
  const pool = [];

  function spawn(){
    let g = pool.find(p => !p.live);
    if(!g){ if(pool.length >= CFG.max) return; g = {}; pool.push(g); }
    const useAccent = Math.random() < CFG.accent;
    g.live  = true;
    g.ch    = CFG.glyphs[(Math.random()*CFG.glyphs.length)|0];
    g.size  = rand(CFG.size[0], CFG.size[1]);
    g.col   = useAccent ? PALETTE.accents[(Math.random()*PALETTE.accents.length)|0] : PALETTE.fg;
    g.x     = w*.5 + rand(-w*.04, w*.04);
    g.y     = h*.47 + rand(-18, 18);
    g.vx    = rand(-CFG.burstX, CFG.burstX);
    g.vy    = rand(-CFG.burstY, CFG.burstY*.2);
    g.rot   = rand(-.5,.5);
    g.vrot  = rand(-CFG.spin, CFG.spin);
    g.rest  = 0;      /* timestamp it landed, 0 while falling */
    g.born  = performance.now();
    g.bounced = false;
  }

  /* ---------- loop ---------- */
  let raf = 0, last = 0, since = 0, running = false, revealed = false;

  function frame(now){
    const dt = last ? Math.min((now - last)/1000, .05) : .016;   /* clamp after a tab switch */
    last = now;

    since += dt*1000;
    while(since >= CFG.spawnMs){ since -= CFG.spawnMs; spawn(); }

    ctx.clearRect(0,0,w,h);

    for(const g of pool){
      if(!g.live) continue;

      /* glyphs are drawn from their middle, so the floor sits a little higher
         for a big one — otherwise the tall ones land half off the page */
      const floor = h - 10 - g.size*.38;

      if(!g.rest){
        g.vy += CFG.gravity*dt;
        g.x  += g.vx*dt;
        g.y  += g.vy*dt;
        g.rot += g.vrot*dt;

        if(g.y >= floor){
          g.y = floor;
          if(!g.bounced && g.vy > 260){          /* one bounce, then it settles */
            g.bounced = true;
            g.vy = -g.vy*CFG.bounce;
            g.vx *= .55; g.vrot *= .4;
          }else{
            g.rest = now; g.vy = 0; g.vx = 0; g.vrot = 0;
          }
        }
        /* gone sideways past the edge — recycle rather than fall forever */
        if(g.x < -80 || g.x > w + 80){ g.live = false; continue; }
      }

      let a = CFG.alpha * Math.min(1, (now - g.born)/CFG.rise);
      if(g.rest){
        const age = now - g.rest - CFG.hold;
        if(age > 0){
          if(age >= CFG.fade){ g.live = false; continue; }
          a *= 1 - age/CFG.fade;
        }
      }

      ctx.save();
      ctx.translate(g.x, g.y);
      if(g.rot) ctx.rotate(g.rot);
      ctx.font = '500 ' + g.size.toFixed(1) + 'px "Inter", system-ui, sans-serif';
      ctx.fillStyle = rgba(g.col, a);
      ctx.fillText(g.ch, 0, 0);
      ctx.restore();
    }

    if(!revealed){ revealed = true; host.classList.add('ready'); }
    raf = requestAnimationFrame(frame);
  }

  function start(){ if(running) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
  function stop(){ running = false; cancelAnimationFrame(raf); }

  /* only burn frames while the hero is actually on screen */
  new IntersectionObserver(es => {
    es.forEach(e => e.isIntersecting && !document.hidden ? start() : stop());
  }, {threshold:0}).observe(host);
  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });

  /* wait for Inter so the first glyphs are not drawn in a fallback face */
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
})();
