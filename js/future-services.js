/* FUTURE / SERVICES: panels that turn toward the pointer.
   Loaded (deferred) on services.html and services/*.html. CSS draws
   everything; this only writes custom properties:
   - on an offer panel, capability tile or case card under the pointer:
     --rx/--ry (tilt), --mx/--my (where the glass catches the light),
     --px/--py (the image shifting behind the pane);
   - on the offer group and the CTA: --lx/--ly, a soft light that follows.
   Fine pointers only, nothing for reduced motion; the pages are complete
   without it. */
(function(){
  if(!matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const pct=v=>(v*100).toFixed(1)+'%';
  const rel=(el,e)=>{
    const r=el.getBoundingClientRect();
    return [Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),Math.min(1,Math.max(0,(e.clientY-r.top)/r.height))];
  };

  /* tilt: one listener per group, one card live at a time, one write per frame */
  function tilt(group,sel,max){
    const PROPS=['--rx','--ry','--mx','--my','--px','--py'];
    let cur=null,ev=null,raf=0;
    const reset=el=>{el.classList.remove('is-tilt');PROPS.forEach(p=>el.style.removeProperty(p));};
    const paint=()=>{
      raf=0; if(!cur||!ev) return;
      const [x,y]=rel(cur,ev), s=cur.style;
      s.setProperty('--mx',pct(x)); s.setProperty('--my',pct(y));
      s.setProperty('--ry',((x-.5)*2*max).toFixed(2)+'deg');
      s.setProperty('--rx',((.5-y)*2*max*.8).toFixed(2)+'deg');
      s.setProperty('--px',((x-.5)*2).toFixed(3)); s.setProperty('--py',((y-.5)*2).toFixed(3));
    };
    group.addEventListener('pointermove',e=>{
      const el=e.target.closest(sel);
      if(el!==cur){ if(cur) reset(cur); cur=el&&group.contains(el)?el:null; if(cur) cur.classList.add('is-tilt'); }
      ev=e; if(cur&&!raf) raf=requestAnimationFrame(paint);
    },{passive:true});
    group.addEventListener('pointerleave',()=>{ if(cur) reset(cur); cur=null; });
  }

  /* light: a group-wide glow that follows the pointer */
  function light(el){
    let ev=null,raf=0;
    const paint=()=>{ raf=0; const [x,y]=rel(el,ev); el.style.setProperty('--lx',pct(x)); el.style.setProperty('--ly',pct(y)); };
    el.addEventListener('pointermove',e=>{ ev=e; if(!raf) raf=requestAnimationFrame(paint); },{passive:true});
    el.addEventListener('pointerleave',()=>{ el.style.removeProperty('--lx'); el.style.removeProperty('--ly'); });
  }

  const wide=matchMedia('(min-width:1001px)');
  document.querySelectorAll('.caps.three').forEach(g=>{ light(g); if(wide.matches) tilt(g,'.cap',4); });
  document.querySelectorAll('.svc-list').forEach(g=>tilt(g,'a',4));
  document.querySelectorAll('.svc-cases').forEach(g=>tilt(g,'a',7));
  document.querySelectorAll('.band').forEach(light);
})();
