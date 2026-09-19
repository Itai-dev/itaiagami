/* ============================================================
   SCRAMBLE — type that answers the cursor
   Every character of a wired element becomes its own span. The
   cursor then drives a neighbourhood rather than a single
   letter: letters within RADIUS of the one under the pointer
   swell, take an accent colour and become a symbol, all falling
   off with distance.

   Wired onto the headline, the wordmark and each nav link. The
   headline has three rows to tell apart; the rest are one row
   each, which is the only difference between them.

   Vertically the falloff is one row wide, so a pointer sitting
   in the middle of a line moves that line alone and a pointer
   between two lines moves both, at half strength each.

   A letter picks its symbol once, when it enters the
   neighbourhood, and keeps it until it leaves. Nothing churns.

   Nothing overlaps either: a symbol is free to be wider than the
   letter it replaced, and the scale is paid for with margin, so
   a growing letter pushes its neighbours aside rather than
   growing over them.

   Size, colour and that margin are CSS, driven by the --s this
   sets on each letter. Nothing runs without a fine pointer, or
   under prefers-reduced-motion.
   ============================================================ */
(function(){

/* ---------- one wired element ---------- */
function scramble(el, opt){
  const rowsOf = opt.rows ? () => Array.from(el.querySelectorAll(opt.rows)) : () => [el];
  const RADIUS = opt.radius || 4;

  /* Which accent a letter travels to. The --scr-base entries are letters that
     only change size, which keeps a swept line from reading as confetti — and
     it has to be the element's own resting colour rather than the page's, or a
     dark link inside a pale frame would travel to white and land on grey. */
  const BASE = 'var(--scr-base,var(--fg))';
  const ACCENT = [BASE,'var(--k1)',BASE,'var(--k2)',BASE,
                  'var(--k3)',BASE,'var(--k4)',BASE,'var(--k1)'];

  /* Per-letter spans make some screen readers spell a heading out, and while
     the pointer is on it the letters are not even the right ones — so the real
     line goes on the element as a label before anything is split. */
  /* the link or heading keeps its real text as its accessible name, which
     matters more here than usual: under the pointer the letters on screen are
     not the ones it says */
  if(!el.getAttribute('aria-label'))
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g,' ').trim());

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

  rowsOf().forEach(r => split(opt.rows ? r.firstElementChild || r : r));
  el.classList.add('scr');


  /* ---------- 2. the cursor neighbourhood ---------- */

  /* The split above stands on its own — it is what puts the real line on the
     element as a label — so it happens either way. Only the reacting stops. */
  if(matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  if(!matchMedia('(hover:hover) and (pointer:fine)').matches) return;

  const CFG = {
    radius:   RADIUS, /* letters either side of the one under the pointer */
    rowReach: .95,    /* vertical falloff, in row heights — under 1 keeps a row
                         to itself in its middle and shares at the boundary */
    edge:     opt.edge || 90,  /* px past the end of a line before it stops */
    swap:     .09     /* strength at which a letter becomes a symbol */
  };

  /* ASCII plus the Latin-1 marks, so every symbol is one Inter already has */
  const SYMS = '!@#$%^&*()[]{}<>/\\|~+=?;:§¶«»°¬±¤×÷';
  const sym = () => SYMS[(Math.random()*SYMS.length)|0];

  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const rows = [];
  const SYMW = {};                 /* every symbol's own width, filled by measure() */
  let raf = 0, live = false, px = 0, py = 0;

  /* Note every letter's resting width — the margin that keeps a grown letter
     off its neighbours is a share of it — and where they all sit. Measured on
     entry, with transitions off so a quick re-entry reads the resting layout
     and not the tail of the last one.

     The positions are deliberately the resting ones. Letters move once the
     push starts, and steering by where they have moved to would just make
     them chase the pointer. */
  function measure(){
    rows.length = 0;
    const all = Array.from(el.querySelectorAll('.ltr'));
    el.classList.add('measuring');
    for(const el of all){
      el.textContent = el.dataset.ch;
      el.style.removeProperty('--s');
      el.style.removeProperty('--w');
      el._s = 0; el._sw = false;
    }

    /* Every symbol gets measured too, out of flow and in the same pass. A
       swap can then set the right width without reading the layout back, and
       the margin is budgeted against the glyph actually on screen rather than
       the letter it replaced — which is what keeps a wide symbol from sitting
       over its neighbours. */
    const probe = document.createElement('span');
    probe.className = 'wd probe';
    probe.setAttribute('aria-hidden','true');
    const cells = SYMS.split('').map(ch => {
      const c = document.createElement('span');
      c.className = 'ltr'; c.textContent = ch;
      probe.appendChild(c); return c;
    });
    el.appendChild(probe);

    void el.offsetWidth;                                   /* one flush for all of it */

    cells.forEach((c, i) => { SYMW[SYMS[i]] = c.getBoundingClientRect().width; });
    probe.remove();
    for(const el of all){
      el._w0 = el.getBoundingClientRect().width;
      el.style.setProperty('--w', el._w0.toFixed(2) + 'px');
    }
    for(const line of rowsOf()){
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
    el.classList.remove('measuring');
  }

  function release(){
    for(const l of el.querySelectorAll('.ltr')){
      l.style.removeProperty('--w');
      l.style.removeProperty('--s');
      l.textContent = l.dataset.ch;
      l._s = 0; l._sw = false;
    }
    rows.length = 0;
  }

  function set(l, s){
    if(s < .02) s = 0;
    if(l._s === s) return;
    l._s = s;
    l.style.setProperty('--s', s.toFixed(3));
    /* one symbol per visit: chosen as the letter enters the neighbourhood and
       kept until it leaves, so the line settles instead of churning. --w moves
       with it, so the space the letter asks for is the space it now needs. */
    const want = s > CFG.swap;
    if(want !== l._sw){
      l._sw = want;
      const ch = want ? sym() : l.dataset.ch;
      l.textContent = ch;
      l.style.setProperty('--w', ((want ? SYMW[ch] : l._w0) || l._w0).toFixed(2) + 'px');
    }
  }

  function frame(){
    raf = live ? requestAnimationFrame(frame) : 0;

    for(const row of rows){
      /* one row wide: dead centre of a line is that line alone, the gap
         between two lines is both of them at about half */
      const rw = clamp01(1 - Math.abs(py - row.cy) / (row.h * CFG.rowReach));
      if(!rw){ for(const l of row.ls) set(l, 0); continue; }

      /* the letter the pointer is nearest, and how far outside the line it is */
      let near = 0, nd = Infinity;
      for(let i = 0; i < row.cx.length; i++){
        const d = Math.abs(px - row.cx[i]);
        if(d < nd){ nd = d; near = i; }
      }
      const inside = clamp01(1 - Math.max(0, nd - 30) / CFG.edge);
      if(!inside){ for(const l of row.ls) set(l, 0); continue; }

      for(let i = 0; i < row.ls.length; i++){
        const hw = clamp01(1 - Math.abs(i - near) / (CFG.radius + .5));
        set(row.ls[i], rw * hw * inside);
      }
    }
  }

  el.addEventListener('pointerenter', e => {
    px = e.clientX; py = e.clientY;
    measure();
    live = true;
    if(!raf) raf = requestAnimationFrame(frame);
  });
  el.addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; }, {passive:true});
  el.addEventListener('pointerleave', () => { live = false; release(); });
  /* scrolling or resizing under a held pointer would leave the cached
     geometry behind, so stand down and let the next entry re-measure */
  addEventListener('scroll', () => { if(live){ live = false; release(); } }, {passive:true});
  addEventListener('resize', () => { if(live){ live = false; release(); } }, {passive:true});
}


/* ---------- wire it up ---------- */
const h1 = document.querySelector('.hero h1');
if(h1) scramble(h1, { rows: '.reveal-line', radius: 4 });

/* The wordmark and the nav answer too, on a tighter radius: a nav item is a
   short word, and four letters either side would take the whole of it at once
   however far away the pointer was. */
const brand = document.querySelector('.brand');
if(brand) scramble(brand, { radius: 3, edge: 40 });

document.querySelectorAll('nav.primary a').forEach(a => scramble(a, { radius: 3, edge: 30 }));
})();
