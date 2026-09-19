/* ============================================================
   HERO — kinetic headline
   Every character of the headline becomes its own span. The
   cursor then drives a neighbourhood rather than a single
   letter: letters within RADIUS of the one under the pointer
   swell, take an accent colour and scramble into symbols, all
   falling off with distance.

   Vertically the falloff is one row wide, so a pointer sitting
   in the middle of a line moves that line alone and a pointer
   between two lines moves both, at half strength each.

   Swapping a glyph would normally reflow the line, so every
   letter's width is locked to its own measurement while the
   pointer is inside, and released when it leaves.

   Size and colour are CSS, driven by the --s this sets on each
   letter. Nothing runs without a fine pointer, or under
   prefers-reduced-motion.
   ============================================================ */
(function(){
  const h1 = document.querySelector('.hero h1');
  if(!h1) return;

  /* ---------- 1. split into letters ---------- */

  /* Which accent a letter travels to. The --fg entries are letters that only
     change size, which keeps a swept line from reading as confetti. Change the
     mix here, or the colours themselves in :root. */
  const ACCENT = ['var(--fg)','var(--k1)','var(--fg)','var(--k2)','var(--fg)',
                  'var(--k3)','var(--fg)','var(--k4)','var(--fg)','var(--k1)'];

  /* Per-letter spans make some screen readers spell a heading out, and while
     the pointer is on it the letters are not even the right ones — so the real
     line goes on the element as a label before anything is split. */
  h1.setAttribute('aria-label', h1.textContent.replace(/\s+/g,' ').trim());

  let n = 0;
  function split(node){
    for(const node2 of Array.from(node.childNodes)){
      if(node2.nodeType === 1){ split(node2); continue; }   /* keep <em> and friends */
      if(node2.nodeType !== 3) continue;
      const frag = document.createDocumentFragment();
      /* split on whitespace but keep it: real spaces stay real text nodes, so
         the line still wraps and justifies the way the browser intends */
      for(const part of node2.nodeValue.split(/(\s+)/)){
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
          s.dataset.ch = ch;                             /* what it really is */
          s.style.setProperty('--c', ACCENT[n++ % ACCENT.length]);
          wd.appendChild(s);
        }
        frag.appendChild(wd);
      }
      node.replaceChild(frag, node2);
    }
  }

  h1.querySelectorAll('.reveal-line > span').forEach(split);
  h1.classList.add('lettered');


  /* ---------- 2. the cursor neighbourhood ---------- */

  if(matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  if(!matchMedia('(hover:hover) and (pointer:fine)').matches) return;

  const CFG = {
    radius:   4,    /* letters either side of the one under the pointer */
    rowReach: .95,  /* vertical falloff, in row heights — under 1 keeps a row
                       to itself in its middle and shares at the boundary */
    edge:     90,   /* px past the end of a line before it stops answering */
    swap:     .18,  /* strength at which a letter becomes a symbol */
    rollMs:   70    /* how often a scrambled letter picks a new symbol */
  };

  /* ASCII plus the Latin-1 marks, so every symbol is one Inter already has */
  const SYMS = '!@#$%^&*()[]{}<>/\\|~+=?;:§¶«»°¬±¤×÷';
  const sym = () => SYMS[(Math.random()*SYMS.length)|0];

  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const rows = [];
  let raf = 0, live = false, px = 0, py = 0, rolled = 0;

  /* Lock every letter to its own width, then note where they all are. Done in
     one pass on entry: nothing is locked while the pointer is away, so a
     resize or a font swap is never measured against stale numbers. */
  function lockAndMeasure(){
    rows.length = 0;
    const all = Array.from(h1.querySelectorAll('.ltr'));
    for(const el of all){ el.textContent = el.dataset.ch; el.style.width = ''; }
    for(const el of all){ el.style.width = el.getBoundingClientRect().width.toFixed(3) + 'px'; }
    for(const line of h1.querySelectorAll('.reveal-line')){
      const ls = Array.from(line.querySelectorAll('.ltr'));
      if(!ls.length) continue;
      const box = line.getBoundingClientRect();
      rows.push({
        ls,
        cx: ls.map(el => { const b = el.getBoundingClientRect(); return b.left + b.width/2; }),
        cy: box.top + box.height/2,
        h:  box.height || 1
      });
    }
  }

  function release(){
    for(const el of h1.querySelectorAll('.ltr')){
      el.style.width = '';
      el.style.removeProperty('--s');
      el.textContent = el.dataset.ch;
      el._s = 0; el._sw = false;
    }
    rows.length = 0;
  }

  function set(el, s){
    if(s < .02) s = 0;
    if(el._s === s) return;
    el._s = s;
    el.style.setProperty('--s', s.toFixed(3));
    const want = s > CFG.swap;
    if(want !== el._sw){
      el._sw = want;
      el.textContent = want ? sym() : el.dataset.ch;
    }
  }

  function frame(now){
    raf = live ? requestAnimationFrame(frame) : 0;

    const roll = now - rolled > CFG.rollMs;
    if(roll) rolled = now;

    for(const row of rows){
      /* one row wide: dead centre of a line is that line alone, the gap
         between two lines is both of them at about half */
      const rw = clamp01(1 - Math.abs(py - row.cy) / (row.h * CFG.rowReach));
      if(!rw){ for(const el of row.ls) set(el, 0); continue; }

      /* the letter the pointer is nearest, and how far outside the line it is */
      let near = 0, nd = Infinity;
      for(let i = 0; i < row.cx.length; i++){
        const d = Math.abs(px - row.cx[i]);
        if(d < nd){ nd = d; near = i; }
      }
      const inside = clamp01(1 - Math.max(0, nd - 30) / CFG.edge);
      if(!inside){ for(const el of row.ls) set(el, 0); continue; }

      for(let i = 0; i < row.ls.length; i++){
        const el = row.ls[i];
        const hw = clamp01(1 - Math.abs(i - near) / (CFG.radius + .5));
        set(el, rw * hw * inside);
        if(roll && el._sw) el.textContent = sym();
      }
    }
  }

  h1.addEventListener('pointerenter', e => {
    px = e.clientX; py = e.clientY;
    lockAndMeasure();
    live = true;
    if(!raf) raf = requestAnimationFrame(frame);
  });
  h1.addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; }, {passive:true});
  h1.addEventListener('pointerleave', () => { live = false; release(); });
  /* scrolling or resizing under a held pointer would leave the cached
     geometry behind, so stand down and let the next entry re-measure */
  addEventListener('scroll', () => { if(live){ live = false; release(); } }, {passive:true});
  addEventListener('resize', () => { if(live){ live = false; release(); } }, {passive:true});
})();
