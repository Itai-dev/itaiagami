/* Lab: a bento of live pieces. Clicking a tile (or Enter/Space on it) opens it
   in place: a placeholder holds its cell, the tile goes position:fixed at its
   own rect, then grows to the viewport; closing runs the same flip back.
   The piece keeps running throughout, since the element itself is moved,
   not copied. Esc, the close button or the backdrop closes it. */
(function(){
  const grid=document.querySelector('.lab-grid'); if(!grid)return;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let open=null, ph=null, back=null, closeBtn=null, lastFocus=null;

  const place=(el,r)=>{el.style.left=r.left+'px';el.style.top=r.top+'px';el.style.width=r.width+'px';el.style.height=r.height+'px';};
  const target=()=>{const m=innerWidth<=760?12:24;return {left:m,top:m,width:innerWidth-2*m,height:innerHeight-2*m};};

  function show(tile){
    if(open)return;
    lastFocus=document.activeElement;
    const r=tile.getBoundingClientRect();
    ph=document.createElement('div');
    ph.className=tile.className; ph.style.visibility='hidden'; ph.setAttribute('aria-hidden','true');
    tile.after(ph);
    back=document.createElement('div'); back.className='lab-backdrop'; document.body.appendChild(back);
    back.addEventListener('click',hide);
    tile.style.transition='none'; place(tile,r); tile.classList.add('open');
    document.body.appendChild(tile);
    tile.setAttribute('aria-expanded','true'); tile.setAttribute('role','dialog'); tile.setAttribute('aria-modal','true');
    closeBtn=document.createElement('button'); closeBtn.type='button'; closeBtn.className='btn ghost lab-close'; closeBtn.textContent='Close ✕';
    closeBtn.addEventListener('click',e=>{e.stopPropagation();hide();});
    tile.appendChild(closeBtn);
    const v=tile.querySelector('video'); if(v){v.controls=true;}
    document.documentElement.style.overflow='hidden';
    open=tile;
    void tile.offsetWidth; tile.style.transition='';
    requestAnimationFrame(()=>{place(tile,target());back.classList.add('on');setTimeout(()=>tile.classList.add('shown'),reduce?0:200);closeBtn.focus({preventScroll:true});});
  }

  function hide(){
    if(!open)return;
    const tile=open, r=ph.getBoundingClientRect();
    tile.classList.remove('shown'); back.classList.remove('on');
    place(tile,r);
    const done=()=>{
      tile.classList.remove('open'); tile.removeAttribute('style');
      ph.replaceWith(tile); back.remove(); closeBtn.remove();
      tile.setAttribute('aria-expanded','false'); tile.setAttribute('role','button'); tile.removeAttribute('aria-modal');
      const v=tile.querySelector('video'); if(v){v.controls=false;v.muted=true;}
      document.documentElement.style.overflow='';
      open=ph=back=closeBtn=null;
      if(lastFocus&&lastFocus.focus)lastFocus.focus({preventScroll:true});
    };
    if(reduce)done(); else setTimeout(done,560);
  }

  grid.addEventListener('click',e=>{
    const t=e.target.closest('.lab-tile'); if(!t||e.target.closest('a'))return;
    show(t);
  });
  grid.addEventListener('keydown',e=>{
    const t=e.target.closest('.lab-tile'); if(!t)return;
    if(e.key==='Enter'||e.key===' '){e.preventDefault();show(t);}
  });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape')hide(); });
  addEventListener('resize',()=>{ if(open&&open.classList.contains('shown'))place(open,target()); });

  /* jump cuts: a hard cut to the next frame every ~140–260ms (an uneven beat
     reads as edited, not as a slideshow); a frame with data-hold (the
     original, first) stays that many ms. Only while on screen, never under
     reduced motion. Frames still loading are skipped. */
  document.querySelectorAll('[data-lab-cuts]').forEach(box=>{
    const frames=[...box.querySelectorAll('img')]; if(frames.length<2||reduce)return;
    frames.forEach(f=>{f.loading='eager';});
    let i=0, t=null, live=false;
    const step=()=>{
      let j=i;
      do{ j=(j+1)%frames.length; }while(j!==i&&!(frames[j].complete&&frames[j].naturalWidth));
      if(j!==i){frames[i].classList.remove('on');frames[j].classList.add('on');i=j;}
      t=setTimeout(step,+frames[i].dataset.hold||140+Math.random()*120);
    };
    new IntersectionObserver(es=>es.forEach(e=>{
      if(e.isIntersecting&&!live){live=true;t=setTimeout(step,+frames[i].dataset.hold||200);}
      else if(!e.isIntersecting&&live){live=false;clearTimeout(t);}
    })).observe(box);
  });
})();
