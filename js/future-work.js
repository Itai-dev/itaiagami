/* FUTURE / WORK: the work index as a field of glass cards.
   Loaded on work.html just BEFORE js/site.js (classic script, not deferred):
   1. the cards ("grid") become the default view for first-time visitors.
      site.js owns the filters and views and reads localStorage 'view', so
      the default is seeded here, before site.js runs; a stored choice wins.
   2. the card under a fine pointer turns toward it (--rx/--ry), its glass
      catches the light (--mx/--my) and the image shifts behind the pane
      (--px/--py). CSS does the drawing; nothing runs for touch or for
      reduced motion, and the page is complete without this file. */
(function(){
  try{ if(!localStorage.getItem('view')) localStorage.setItem('view','grid'); }catch(e){}

  const list=document.getElementById('indexList'); if(!list) return;
  if(!matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const MAX=7;                                     // degrees of tilt at the edge
  const PROPS=['--rx','--ry','--mx','--my','--px','--py'];
  let cur=null, ev=null, raf=0;
  const reset=el=>{ el.classList.remove('is-tilt'); PROPS.forEach(p=>el.style.removeProperty(p)); };
  const paint=()=>{
    raf=0; if(!cur||!ev) return;
    const r=cur.getBoundingClientRect();
    const x=Math.min(1,Math.max(0,(ev.clientX-r.left)/r.width));
    const y=Math.min(1,Math.max(0,(ev.clientY-r.top)/r.height));
    const s=cur.style, grid=list.classList.contains('grid');
    s.setProperty('--mx',(x*100).toFixed(1)+'%');
    s.setProperty('--my',(y*100).toFixed(1)+'%');
    if(!grid) return;                              // list rows only take the light
    s.setProperty('--ry',((x-.5)*2*MAX).toFixed(2)+'deg');
    s.setProperty('--rx',((.5-y)*2*MAX*.8).toFixed(2)+'deg');
    s.setProperty('--px',((x-.5)*2).toFixed(3));
    s.setProperty('--py',((y-.5)*2).toFixed(3));
  };
  list.addEventListener('pointermove',e=>{
    const a=e.target.closest('.prow>a');
    if(a!==cur){ if(cur) reset(cur); cur=a; if(cur) cur.classList.add('is-tilt'); }
    ev=e; if(cur&&!raf) raf=requestAnimationFrame(paint);
  },{passive:true});
  list.addEventListener('pointerleave',()=>{ if(cur) reset(cur); cur=null; });
})();
