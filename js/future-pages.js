/* =====================================================================
   FUTURE PAGES: small behaviours for about, contact, notes, articles,
   404, privacy and developers (styles in css/future-pages.css).
   Runs after js/site.js. Everything here is an enhancement: without it
   the pages are complete and static.
   - light that follows the pointer across glass (.fp-lit)
   - panels that settle forward out of depth as they arrive (.fp-rise)
   - a card that turns to face the pointer ([data-fp-face])
   - the clients constellation on About ([data-fp-field])
   - the reading line in the header pill (.fp-progress)
   - Cal.com embed colours matched to the glass, in both themes
   ===================================================================== */
(function(){
  const root=document.documentElement;
  const calm=matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer=matchMedia('(hover: hover) and (pointer: fine)');

  /* ---------- light on glass ---------- */
  if(finePointer.matches){
    let lit=null;
    addEventListener('pointermove',e=>{
      const el=e.target.closest&&e.target.closest('.fp-lit');
      if(lit&&lit!==el){lit.style.setProperty('--lo','0');}
      lit=el; if(!el)return;
      const r=el.getBoundingClientRect();
      el.style.setProperty('--lx',(e.clientX-r.left)+'px');
      el.style.setProperty('--ly',(e.clientY-r.top)+'px');
      el.style.setProperty('--lo','1');
    },{passive:true});
    document.addEventListener('pointerleave',()=>{if(lit){lit.style.setProperty('--lo','0');lit=null;}});
  }

  /* ---------- arriving out of depth ----------
     Only blocks that start below the fold are hidden, so nothing on the
     first screen ever blinks. Siblings arriving together are staggered. */
  if(!calm.matches&&'IntersectionObserver' in window){
    const els=[...document.querySelectorAll('.fp-rise')].filter(el=>el.getBoundingClientRect().top>innerHeight*.98);
    els.forEach(el=>el.classList.add('fp-pre'));
    let batch=0,batchT=0;
    const show=el=>{
      const now=performance.now(); if(now-batchT>120)batch=0; batchT=now;
      el.style.setProperty('--rd',Math.min(batch++,5)*80+'ms');
      el.classList.remove('fp-pre');
      setTimeout(()=>el.style.removeProperty('--rd'),1400);
    };
    const io=new IntersectionObserver(es=>es.forEach(en=>{
      if(en.isIntersecting){io.unobserve(en.target);show(en.target);}
    }),{rootMargin:'0px 0px -6% 0px'});
    els.forEach(el=>io.observe(el));
    /* backstop: an anchor jump or fast fling never leaves a panel hidden */
    const sweep=()=>els.forEach(el=>{if(el.classList.contains('fp-pre')&&el.getBoundingClientRect().top<innerHeight*.9){io.unobserve(el);show(el);}});
    addEventListener('scroll',()=>requestAnimationFrame(sweep),{passive:true});
    setTimeout(sweep,2500);
  }

  /* ---------- a card that turns to face you ---------- */
  const faces=[...document.querySelectorAll('[data-fp-face]')];
  if(faces.length&&finePointer.matches&&!calm.matches){
    let tx=0,ty=0,cx=0,cy=0,raf=0;
    const tick=()=>{
      cx+=(tx-cx)*.08; cy+=(ty-cy)*.08;
      faces.forEach(f=>{const st=f.style;st.setProperty('--ry',(cx*9).toFixed(2)+'deg');st.setProperty('--rx',(-cy*7).toFixed(2)+'deg');st.setProperty('--tx',cx.toFixed(3));st.setProperty('--ty',cy.toFixed(3));});
      raf=(Math.abs(tx-cx)+Math.abs(ty-cy)>.001)?requestAnimationFrame(tick):0;
    };
    addEventListener('pointermove',e=>{
      tx=e.clientX/innerWidth*2-1; ty=e.clientY/innerHeight*2-1;
      if(!raf)raf=requestAnimationFrame(tick);
    },{passive:true});
  }

  /* ---------- the clients constellation (About) ----------
     Points drift a few pixels and lean with the pointer by depth; a small
     canvas draws the threads between neighbours and a little dust. It only
     runs while the field is on screen, and stands still for reduced motion.
     Under 760px the field becomes a plain wrap of chips and none of this runs. */
  const field=document.querySelector('[data-fp-field]');
  if(field){
    const wide=matchMedia('(min-width: 761px)');
    const canvas=field.querySelector('canvas');
    const ctx=canvas&&canvas.getContext('2d');
    const items=[...field.querySelectorAll('.ab-nodes li')];
    const nodesBox=field.querySelector('.ab-nodes');
    let W=0,H=0,dpr=1,pts=[],links=[],dust=[],px=0,py=0,sx=0,sy=0,visible=false,raf=0,t0=performance.now();
    const isDark=()=>root.getAttribute('data-theme')!=='light';

    function layout(){
      const r=field.getBoundingClientRect(), nb=nodesBox.getBoundingClientRect();
      W=r.width; H=r.height; dpr=Math.min(devicePixelRatio||1,2);
      canvas.width=Math.round(W*dpr); canvas.height=Math.round(H*dpr);
      pts=items.map((li,i)=>{
        const cs=li.style;
        const x=parseFloat(cs.getPropertyValue('--x'))/100*nb.width+(nb.left-r.left);
        const y=parseFloat(cs.getPropertyValue('--y'))/100*nb.height+(nb.top-r.top);
        const z=parseFloat(cs.getPropertyValue('--z'))||.5;
        return {li,x,y,z,ph:i*1.7,sp:.00018+((i*37)%11)*.000014,amp:4+z*6,dx:0,dy:0};
      });
      /* each point links to its two nearest neighbours */
      const seen=new Set(); links=[];
      pts.forEach((p,i)=>{
        pts.map((q,j)=>({j,d:Math.hypot(p.x-q.x,(p.y-q.y)*1.4)})).filter(o=>o.j!==i).sort((a,b)=>a.d-b.d).slice(0,2)
          .forEach(o=>{const k=Math.min(i,o.j)+'-'+Math.max(i,o.j); if(!seen.has(k)){seen.add(k);links.push([i,o.j]);}});
      });
      let s=7; const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
      dust=Array.from({length:46},()=>({x:rnd()*W,y:rnd()*H,z:rnd(),r:.4+rnd()*1.1,ph:rnd()*6.28}));
    }

    function frame(now){
      const t=now-t0, still=calm.matches;
      sx+=(px-sx)*.06; sy+=(py-sy)*.06;
      pts.forEach(p=>{
        const drift=still?0:1;
        p.dx=Math.sin(t*p.sp+p.ph)*p.amp*drift+sx*(6+p.z*22);
        p.dy=Math.cos(t*p.sp*1.3+p.ph)*p.amp*.7*drift+sy*(4+p.z*14);
        p.li.style.transform='translate3d('+p.dx.toFixed(1)+'px,'+p.dy.toFixed(1)+'px,0)';
      });
      ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H);
      const dark=isDark(), c=dark?'255,255,255':'40,30,90';
      dust.forEach(d=>{
        const a=(dark?.18:.22)*(.4+d.z*.6)*(still?1:.75+.25*Math.sin(t*.0008+d.ph));
        ctx.fillStyle='rgba('+c+','+a.toFixed(3)+')';
        ctx.beginPath(); ctx.arc(d.x+sx*d.z*10,d.y+sy*d.z*8,d.r,0,6.283); ctx.fill();
      });
      ctx.lineWidth=1;
      links.forEach(([i,j])=>{
        const a=pts[i],b=pts[j], z=(a.z+b.z)/2;
        const g=ctx.createLinearGradient(a.x+a.dx,a.y+a.dy,b.x+b.dx,b.y+b.dy);
        const al=(dark?.10:.14)+z*(dark?.16:.18);
        g.addColorStop(0,'rgba('+c+','+al.toFixed(3)+')');
        g.addColorStop(.5,dark?'rgba(165,148,255,'+(al*1.1).toFixed(3)+')':'rgba(109,79,242,'+(al*.9).toFixed(3)+')');
        g.addColorStop(1,'rgba('+c+','+al.toFixed(3)+')');
        ctx.strokeStyle=g;
        ctx.beginPath(); ctx.moveTo(a.x+a.dx,a.y+a.dy); ctx.lineTo(b.x+b.dx,b.y+b.dy); ctx.stroke();
      });
      raf=(visible&&!still)?requestAnimationFrame(frame):0;
    }
    const kick=()=>{ if(!raf&&visible&&wide.matches) raf=requestAnimationFrame(frame); };

    if(ctx){
      const start=()=>{ if(!wide.matches){items.forEach(li=>li.style.transform='');return;} layout(); kick(); if(calm.matches) frame(performance.now()); };
      new IntersectionObserver(es=>{visible=es[0].isIntersecting; if(visible)kick();},{rootMargin:'100px'}).observe(field);
      let rt; addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(start,150);});
      wide.addEventListener&&wide.addEventListener('change',start);
      new MutationObserver(()=>{ if(calm.matches&&wide.matches) frame(performance.now()); }).observe(root,{attributes:true,attributeFilter:['data-theme']});
      if(finePointer.matches&&!calm.matches){
        field.addEventListener('pointermove',e=>{const r=field.getBoundingClientRect();px=(e.clientX-r.left)/r.width-.5;py=(e.clientY-r.top)/r.height-.5;kick();},{passive:true});
        field.addEventListener('pointerleave',()=>{px=0;py=0;});
      }
      if(document.readyState==='complete') start(); else addEventListener('load',start);
      start();
    }
  }

  /* ---------- the reading line ----------
     Lives inside the floating header pill. CSS drives it with a scroll
     timeline where supported; elsewhere this keeps --p in step. */
  const prog=document.querySelector('.fp-progress');
  if(prog){
    const hdr=document.getElementById('siteHeader');
    if(hdr){hdr.appendChild(prog);prog.classList.add('in-header');}
    if(!(window.CSS&&CSS.supports&&CSS.supports('animation-timeline','scroll()'))){
      const bar=prog.firstElementChild; let q=0;
      const upd=()=>{q=0;const h=document.documentElement.scrollHeight-innerHeight;bar.style.setProperty('--p',h>0?Math.min(1,scrollY/h).toFixed(4):0);};
      addEventListener('scroll',()=>{if(!q)q=requestAnimationFrame(upd);},{passive:true});
      addEventListener('resize',upd); upd();
    }
  }

  /* ---------- Cal.com: colours of the glass ----------
     js/site.js mounts the inline calendar and passes the theme. Here the
     calendar's surfaces are matched to the panel it sits in, and re-sent
     after site.js's own update whenever the theme flips. */
  const calBox=document.getElementById('calInline');
  if(calBox&&window.Cal&&Cal.ns&&Cal.ns.intro){
    const VARS={
      dark:{'cal-brand':'#f2f1ee','cal-brand-emphasis':'#ffffff','cal-brand-text':'#0b0b10',
        'cal-bg':'#101017','cal-bg-muted':'#101017','cal-bg-subtle':'#1b1b25','cal-bg-emphasis':'#2a2a36',
        'cal-border':'#262631','cal-border-subtle':'#1d1d27','cal-border-booker':'#1d1d27',
        'cal-text':'#e9e8e4','cal-text-emphasis':'#f6f5f2','cal-text-subtle':'#a9a8b3','cal-text-muted':'#8a8995'},
      light:{'cal-brand':'#111114','cal-brand-emphasis':'#000000','cal-brand-text':'#ffffff',
        'cal-bg':'#ffffff','cal-bg-muted':'#ffffff','cal-bg-subtle':'#efeee9','cal-bg-emphasis':'#e4e3dd',
        'cal-border':'#e3e2dc','cal-border-subtle':'#ecebe6','cal-border-booker':'#ecebe6',
        'cal-text':'#1b1b1f','cal-text-emphasis':'#0b0b0e','cal-text-subtle':'#5e5d66','cal-text-muted':'#77767f'}
    };
    const theme=()=>root.getAttribute('data-theme')==='light'?'light':'dark';
    const send=()=>{ try{ Cal.ns.intro('ui',{theme:theme(),layout:'month_view',hideEventTypeDetails:false,cssVarsPerTheme:VARS}); }catch(e){} };
    send();
    /* registered after site.js's observer, so this runs second and wins */
    new MutationObserver(send).observe(root,{attributes:true,attributeFilter:['data-theme']});
  }
})();
