/* ============================================================
   Showcase (home): motion and the in-page project viewer.
   - Titles rise letter by letter, frames wipe open as they scroll in,
     images drift inside their frames.
   - Clicking a project expands its frame into a full-screen viewer
     (GSAP Flip) with the project's images; the link still goes to the
     case study when JS is off or a modifier key is held.
   Reduced motion: no animation at all, the viewer just appears.
   ============================================================ */
(function(){
  const dataEl=document.getElementById('scData'); if(!dataEl)return;
  const data=JSON.parse(dataEl.textContent);
  const bySlug={}; data.forEach((d,i)=>{d.i=i;bySlug[d.slug]=d;});
  const root=document.documentElement;
  const viewer=document.getElementById('viewer');
  const info=document.getElementById('info');
  const G=window.gsap;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motion=!!(G&&window.ScrollTrigger)&&!reduce;
  if(G)G.registerPlugin(...[window.ScrollTrigger,window.Flip,window.SplitText].filter(Boolean));
  const EASE='expo.out';
  /* reveal from an offset to an explicit resting state (never read back from the page) */
  const reveal=(t,from,to)=>G.fromTo(t,Object.assign({opacity:0},from),Object.assign({opacity:1,x:0,y:0,duration:.9,ease:EASE,clearProps:'opacity,transform'},to));
  const pad=n=>String(n).padStart(2,'0');
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  /* letters rise out of a mask; returns the tween (or null) */
  function rise(el,opts){
    if(!motion||!window.SplitText||!el)return null;
    const s=SplitText.create(el,{type:'words,chars',mask:'chars'});
    return G.from(s.chars,Object.assign({yPercent:115,duration:1.1,ease:EASE,stagger:.03,onComplete:()=>s.revert()},opts));
  }

  /* ---------- intro + gallery motion ---------- */
  if(motion){
    rise(document.querySelector('.sc-title'),{delay:.1});
    reveal('.sc-sub span, .sc-top',{y:10},{delay:.55,stagger:.08});
    document.querySelectorAll('.sc-item').forEach(item=>{
      const frame=item.querySelector('.sc-frame'), img=frame.querySelector('img'), cap=item.querySelector('.sc-cap');
      G.fromTo(frame,{clipPath:'inset(100% 0% 0% 0%)'},{clipPath:'inset(0% 0% 0% 0%)',duration:1.4,ease:EASE,
        scrollTrigger:{trigger:item,start:'top 92%',once:true}});
      G.fromTo(img,{scale:1.16,yPercent:-5},{yPercent:5,ease:'none',
        scrollTrigger:{trigger:frame,start:'top bottom',end:'bottom top',scrub:true}});
      reveal(cap.children,{y:14},{stagger:.06,scrollTrigger:{trigger:item,start:'top 85%',once:true}});
    });
    reveal('.sc-more-link > *',{y:30},{duration:1,stagger:.08,scrollTrigger:{trigger:'.sc-more',start:'top 85%',once:true}});
    /* the bar steps aside while scrolling down through the work, returns on the way up */
    const top=document.querySelector('.sc-top');
    ScrollTrigger.create({start:0,end:'max',onUpdate:self=>{
      const hide=self.direction===1&&self.scroll()>innerHeight*.5;
      G.to(top,{yPercent:hide?-110:0,duration:hide?.35:.6,ease:hide?'power2.out':EASE,overwrite:'auto'});
    }});
    /* fonts change the title's width; re-measure once they land */
    if(document.fonts)document.fonts.ready.then(()=>ScrollTrigger.refresh());
  }

  /* ---------- cursor label ---------- */
  const cur=document.querySelector('.sc-cursor');
  let showCur=()=>{}, hideCur=()=>{};
  if(G&&cur&&matchMedia('(hover:hover) and (pointer:fine)').matches){
    G.set(cur,{xPercent:-50,yPercent:-50,x:innerWidth/2,y:innerHeight/2,scale:0});
    const d=reduce?.01:.5;
    const xTo=G.quickTo(cur,'x',{duration:d,ease:EASE}), yTo=G.quickTo(cur,'y',{duration:d,ease:EASE});
    addEventListener('pointermove',e=>{xTo(e.clientX);yTo(e.clientY);},{passive:true});
    showCur=()=>G.to(cur,{scale:1,duration:reduce?0:.4,ease:EASE,overwrite:'auto'});
    hideCur=()=>G.to(cur,{scale:0,duration:reduce?0:.25,ease:'power2.out',overwrite:'auto'});
    document.querySelectorAll('.sc-link').forEach(a=>{
      a.addEventListener('pointerenter',showCur);
      a.addEventListener('pointerleave',hideCur);
    });
  }

  /* ---------- modal helpers: focus trap + scroll lock ---------- */
  let trapEl=null, lastFocus=null;
  function lock(el){
    lastFocus=document.activeElement; trapEl=el;
    el.hidden=false; root.classList.add('sc-lock'); hideCur();
    const c=el.querySelector('[data-close]'); if(c)c.focus({preventScroll:true});
  }
  function unlock(el){
    el.hidden=true; trapEl=null; root.classList.remove('sc-lock');
    if(lastFocus&&lastFocus.focus)lastFocus.focus({preventScroll:true});
  }
  addEventListener('keydown',e=>{
    if(!trapEl)return;
    if(e.key==='Escape'){e.preventDefault(); trapEl===viewer?closeViewer():closeInfo(); return;}
    if(e.key!=='Tab')return;
    const f=[...trapEl.querySelectorAll('a[href],button:not([disabled])')].filter(x=>x.offsetParent!==null);
    if(!f.length)return;
    const first=f[0], last=f[f.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  });

  /* ---------- project viewer ---------- */
  let current=null, pushed=false, triggers=[];
  const fig=(g,cls)=>'<figure class="'+cls+'" style="aspect-ratio:'+g.w+'/'+g.h+'"><img src="'+esc(g.src)+'" width="'+g.w+'" height="'+g.h+'" alt="'+esc(g.alt)+'" loading="lazy" decoding="async"></figure>';
  function render(d){
    const next=data[(d.i+1)%data.length];
    viewer.innerHTML=
      '<div class="v-bar"><span class="v-count">'+pad(d.i+1)+' / '+pad(data.length)+'</span><button class="sc-close" type="button" data-close>Close</button></div>'
      +'<div class="v-head"><h2 class="v-title" id="vTitle">'+esc(d.name)+'</h2>'
      +'<p class="v-meta">'+(d.client&&d.client!==d.name?'<span>'+esc(d.client)+'</span>':'')+'<span>'+esc(d.disciplines)+'</span></p>'
      +'<p class="v-line">'+esc(d.line)+'</p></div>'
      +'<figure class="v-hero" data-flip-id="p-'+esc(d.slug)+'" style="aspect-ratio:'+d.hero.w+'/'+d.hero.h+'"><img src="'+esc(d.hero.src)+'" width="'+d.hero.w+'" height="'+d.hero.h+'" alt="'+esc(d.hero.alt)+'" decoding="async"></figure>'
      +'<div class="v-grid">'+d.gallery.map(g=>fig(g,g.half?'v-half':'v-full')).join('')+'</div>'
      +'<div class="v-foot"><a class="v-case" href="'+esc(d.href)+'">Case study →</a>'
      +'<a class="v-next" href="work/'+esc(next.slug)+'.html" data-next="'+esc(next.slug)+'"><span class="v-next-l">Next</span><span class="v-next-n">'+esc(next.name)+'</span></a></div>';
    viewer.scrollTop=0;
  }
  function animateIn(){
    triggers.forEach(t=>t.kill()); triggers=[];
    if(!motion)return;
    rise(viewer.querySelector('.v-title'),{delay:.15,stagger:.02});
    reveal(viewer.querySelectorAll('.v-meta span, .v-line, .v-bar > *'),{y:12},{duration:.8,delay:.35,stagger:.05});
    viewer.querySelectorAll('.v-grid figure').forEach(f=>{
      const tw=reveal(f,{y:60},{duration:1.1,scrollTrigger:{trigger:f,scroller:viewer,start:'top 95%',once:true}});
      triggers.push(tw.scrollTrigger);
    });
  }
  function openViewer(slug,fromFrame,push){
    const d=bySlug[slug]; if(!d)return false;
    const state=(motion&&window.Flip&&fromFrame)?Flip.getState(fromFrame):null;
    render(d); current=slug;
    if(push){history.pushState({sc:slug},'','#'+slug); pushed=true;}
    lock(viewer);
    if(state){
      G.fromTo(viewer,{backgroundColor:'rgba(0,0,0,0)'},{backgroundColor:getComputedStyle(document.body).backgroundColor,duration:.5,ease:'power2.out',clearProps:'backgroundColor'});
      Flip.from(state,{targets:viewer.querySelector('.v-hero'),duration:1,ease:'expo.inOut',absolute:true,zIndex:3});
    }else if(motion){
      G.fromTo(viewer,{opacity:0},{opacity:1,duration:.35,ease:'power2.out',clearProps:'opacity'});
    }
    animateIn();
    return true;
  }
  function closeViewer(fromPop){
    if(!current)return;
    if(pushed&&!fromPop){pushed=false; history.back(); return;}  /* popstate finishes the close */
    const slug=current; current=null; pushed=false;
    const done=()=>{
      triggers.forEach(t=>t.kill()); triggers=[];
      unlock(viewer); viewer.innerHTML=''; if(G)G.set(viewer,{clearProps:'opacity'});
      const item=document.querySelector('.sc-item[data-slug="'+slug+'"]');
      if(item){const r=item.getBoundingClientRect(); if(r.bottom<0||r.top>innerHeight)item.scrollIntoView({block:'center'});}
      if(motion)ScrollTrigger.refresh();
    };
    if(motion)G.to(viewer,{opacity:0,duration:.35,ease:'power2.out',onComplete:done}); else done();
  }
  function goNext(slug){
    const d=bySlug[slug]; if(!d)return;
    const swap=()=>{render(d); current=slug; history.replaceState({sc:slug},'','#'+slug); viewer.querySelector('[data-close]').focus({preventScroll:true}); animateIn();};
    if(motion)G.to(viewer,{opacity:0,duration:.3,ease:'power2.out',onComplete:()=>{swap();G.to(viewer,{opacity:1,duration:.3,ease:'power2.out',clearProps:'opacity'});}});
    else swap();
  }

  document.querySelector('.sc-gallery').addEventListener('click',e=>{
    const a=e.target.closest('a[data-open]');
    if(!a||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button!==0)return;
    if(openViewer(a.dataset.open,a.closest('.sc-item').querySelector('.sc-frame'),true))e.preventDefault();
  });
  viewer.addEventListener('click',e=>{
    if(e.target.closest('[data-close]')){closeViewer();return;}
    const n=e.target.closest('a[data-next]');
    if(n&&!(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)){e.preventDefault();goNext(n.dataset.next);}
  });
  addEventListener('popstate',()=>{
    const slug=location.hash.slice(1);
    if(bySlug[slug]){ if(current!==slug){ if(current){render(bySlug[slug]);current=slug;animateIn();} else openViewer(slug,null,false);} }
    else closeViewer(true);
  });
  /* deep link: /#channel-13 opens that project */
  if(bySlug[location.hash.slice(1)])openViewer(location.hash.slice(1),null,false);

  /* ---------- info ---------- */
  function openInfo(){
    lock(info);
    if(motion)reveal(info.querySelectorAll('.sc-info-lead, .sc-info-list > div'),{y:24},{stagger:.07});
  }
  function closeInfo(){
    const done=()=>{unlock(info); if(G)G.set(info,{clearProps:'opacity'});};
    if(motion)G.to(info,{opacity:0,duration:.3,ease:'power2.out',onComplete:done}); else done();
  }
  document.querySelectorAll('[data-info]').forEach(a=>a.addEventListener('click',e=>{
    if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    e.preventDefault(); openInfo();
  }));
  info.addEventListener('click',e=>{if(e.target.closest('[data-close]'))closeInfo();});
  /* the archive page links here as /#info */
  if(location.hash==='#info'){history.replaceState(null,'',location.pathname+location.search);openInfo();}
})();
