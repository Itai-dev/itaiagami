/* ============================================================
   HERO — kinetic headline
   Every character of the headline becomes its own span, so each
   letter can answer the cursor by itself. The reaction is CSS
   (see .ltr in css/site.css); this only builds the spans and
   hands each one the accent colour it travels to.
   ============================================================ */
(function(){
  const h1 = document.querySelector('.hero h1');
  if(!h1) return;

  /* Which accent a letter goes to when the pointer is on it. The --fg entries
     are letters that only change size, which keeps a swept line from reading
     as confetti. Change the mix here, or the colours themselves in :root. */
  const ACCENT = ['var(--fg)','var(--k1)','var(--fg)','var(--k2)','var(--fg)',
                  'var(--k3)','var(--fg)','var(--k4)','var(--fg)','var(--k1)'];

  /* Per-letter spans make some screen readers spell a heading out, so the
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
          s.style.setProperty('--c', ACCENT[i++ % ACCENT.length]);
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
