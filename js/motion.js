/* ============================================================
   Motion system: GSAP + ScrollTrigger, with Lenis as the one
   smooth-scroll engine. Loaded on every page after js/site.js.

   Rules this file keeps:
   - Nothing is hidden in CSS. Every "from" state is set here, so with
     JavaScript off, or with reduced motion, the page is simply complete.
   - Reduced motion returns before anything is created: no smooth
     scrolling, no scrubbed timelines, final states only.
   - Each reveal runs once and clears its inline styles when it lands,
     so hover, focus and theme styles in css/site.css stay in charge.
   - Split headings keep an unsplit copy for assistive technology; the
     animated words are aria-hidden. Links are never split.
   ============================================================ */
(function(){
  'use strict';
  var root=document.documentElement;
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gsap=window.gsap, ScrollTrigger=window.ScrollTrigger;
  if(reduce||!gsap||!ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ease:'expo.out',duration:.9});
  root.classList.add('gs');

  var $=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s));};
  var cleanups=[];

  /* ---------- Lenis: the site's only smooth-scroll engine ---------- */
  var lenis=null, tick=null;
  if(window.Lenis){
    lenis=new window.Lenis({autoRaf:false,anchors:true,lerp:.115,wheelMultiplier:1});
    root.classList.add('lenis-on');
    lenis.on('scroll',ScrollTrigger.update);
    tick=function(t){lenis.raf(t*1000);};
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    window.siteScroll=lenis;
    /* the mobile menu locks the page (body.locked, js/site.js) */
    var lock=new MutationObserver(function(){
      if(document.body.classList.contains('locked'))lenis.stop(); else lenis.start();
    });
    lock.observe(document.body,{attributes:true,attributeFilter:['class']});
    cleanups.push(function(){lock.disconnect();});
  }

  /* ---------- measurements: refresh after fonts, media and layout changes ---------- */
  var refreshT=0;
  var refresh=function(){clearTimeout(refreshT);refreshT=setTimeout(function(){if(lenis)lenis.resize();ScrollTrigger.refresh();},120);};
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(refresh);
  addEventListener('load',refresh);
  if('ResizeObserver' in window){
    var lastH=0, ro=new ResizeObserver(function(){
      var h=document.body.scrollHeight; if(Math.abs(h-lastH)>2){lastH=h;refresh();}
    });
    ro.observe(document.body);
    cleanups.push(function(){ro.disconnect();});
  }

  /* ---------- split text into masked words ----------
     <h2>Selected work</h2> becomes
     <h2><span class="vh">Selected work</span><span aria-hidden="true">[words]</span></h2>
     Inline elements (em, strong, the hero's full stop) move as one unit. */
  function split(el){
    if(!el||el.dataset.split||el.querySelector('a,button,input'))return [];
    var label=el.textContent.replace(/\s+/g,' ').trim(); if(!label)return [];
    var box=document.createElement('span'); box.setAttribute('aria-hidden','true'); box.className='split-box';
    var words=[];
    var wrap=function(node){
      var w=document.createElement('span'); w.className='w';
      var i=document.createElement('span'); i.className='wi'; i.appendChild(node);
      w.appendChild(i); words.push(i); return w;
    };
    Array.prototype.slice.call(el.childNodes).forEach(function(c){
      if(c.nodeType===3){
        c.textContent.split(/(\s+)/).forEach(function(p){
          if(!p)return;
          box.appendChild(p.trim()?wrap(document.createTextNode(p)):document.createTextNode(' '));
        });
      }else if(c.nodeType===1){
        box.appendChild(c.tagName==='BR'?c:wrap(c));
      }
    });
    var name=document.createElement('span'); name.className='vh'; name.textContent=label;
    el.textContent=''; el.appendChild(name); el.appendChild(box);
    el.dataset.split='1';
    return words;
  }

  var once=function(trigger,start){return {trigger:trigger,start:start||'top 88%',once:true};};
  var clear=function(){gsap.set(this.targets(),{clearProps:'transform,opacity,visibility,clipPath,willChange'});};

  /* ---------- headings rise word by word ---------- */
  var HEADS='.sec-head h1,.sec-head h2,.c-open h1,.svc-open h1,.article h1,.article-head h1,.band h2,.c-cta .t,.c-gal-title';
  $(HEADS).forEach(function(h){
    if(h.closest('.hero'))return;
    var words=split(h); if(!words.length)return;
    gsap.from(words,{yPercent:112,duration:1,stagger:{each:.05,from:'start'},scrollTrigger:once(h,'top 90%'),onComplete:clear});
  });

  /* ---------- a statement that lights up as it is read ---------- */
  $('[data-lit]').forEach(function(p){
    var words=split(p); if(!words.length)return;
    gsap.fromTo(words,{opacity:.16},{opacity:1,ease:'none',stagger:.08,duration:.3,
      scrollTrigger:{trigger:p,start:'top 82%',end:'bottom 52%',scrub:true}});
  });

  /* ---------- supporting copy and groups follow their heading ---------- */
  var rise=function(targets,trigger,opts){
    if(!targets.length)return;
    gsap.from(targets,Object.assign({y:22,autoAlpha:0,duration:.8,ease:'power3.out',stagger:.06,
      scrollTrigger:once(trigger||targets[0]),onComplete:clear},opts||{}));
  };
  $('.c-meta,.caps,.svc-cases,.c-sites,.notes-list,.fit-side,.c-story,.svc-body,footer.site .grid').forEach(function(g){
    rise(Array.prototype.slice.call(g.children),g);
  });
  $('.c-open .oneline,.c-open .crumb,.c-contrib,.svc-open .oneline,.work-intro,.caps-note,.band > p,.band .cta,.c-cta .d,.c-cta .cta,.c-credits,.c-service,.c-next,.article .dek,.sec-head .count').forEach(function(el){
    rise([el],el,{delay:.12});
  });
  /* long lists arrive in batches as they scroll in, not all at once */
  var rows=$('.index-list > *');
  if(rows.length){
    gsap.set(rows,{autoAlpha:0,y:18});
    ScrollTrigger.batch(rows,{start:'top 94%',once:true,onEnter:function(b){
      gsap.to(b,{autoAlpha:1,y:0,duration:.7,ease:'power3.out',stagger:.045,overwrite:true,onComplete:clear});
    }});
  }

  /* ---------- media ----------
     Home selection: the plate opens from its lower edge while the image
     settles, then the image drifts a few percent against the scroll.
     Case studies and notes: a plain rise. */
  $('.swork').forEach(function(card){
    var media=card.querySelector('.media'), img=media&&media.querySelector('img'); if(!media)return;
    var tl=gsap.timeline({scrollTrigger:once(card,'top 84%')});
    tl.from(media,{clipPath:'inset(100% 0% 0% 0%)',duration:1.2,ease:'expo.inOut',onComplete:clear});
    rise(Array.prototype.slice.call(card.querySelectorAll('.info > *')),card,{scrollTrigger:once(card,'top 70%'),delay:.25});
    if(img){
      /* parallax: the image is 14% taller than its plate (css) and slides inside it */
      gsap.fromTo(img,{yPercent:-6},{yPercent:6,ease:'none',
        scrollTrigger:{trigger:media,start:'top bottom',end:'bottom top',scrub:true}});
    }
  });
  $('.c-hero,.c-film--lead,.c-hero-reel').forEach(function(m){
    gsap.from(m,{y:40,autoAlpha:0,scale:.985,duration:1.1,delay:.15,scrollTrigger:once(m,'top 96%'),onComplete:clear});
  });
  $('.c-gallery figure,.a-video,.about-photo,.article figure').forEach(function(m){
    gsap.from(m,{y:32,autoAlpha:0,duration:.9,ease:'power3.out',scrollTrigger:once(m,'top 92%'),onComplete:clear});
  });

  /* ---------- home hero: one composed opening ----------
     The header and the two calls to action are never hidden, so the page
     is usable from the first frame. The headline rises, the plate opens,
     and js/hero-plate.js is told when to draw (plate:intro). */
  var hero=document.querySelector('.hero');
  if(hero){
    var h1=hero.querySelector('h1'), words=split(h1);
    var plate=hero.querySelector('.feature'), panel=hero.querySelector('.feature-panel');
    var tl=gsap.timeline({paused:true,defaults:{ease:'expo.out'}});
    if(words.length)tl.from(words,{yPercent:115,duration:1.15,stagger:.09},0);
    tl.from($('.eyebrow > *',hero),{y:10,autoAlpha:0,duration:.7,stagger:.06,onComplete:clear},.1);
    var sub=hero.querySelector('.sub'); if(sub)tl.from(sub,{y:18,autoAlpha:0,duration:.9,onComplete:clear},.45);
    if(panel){
      tl.from(panel,{clipPath:'inset(0% 0% 100% 0%)',duration:1.25,ease:'expo.inOut',onComplete:clear},.2);
      tl.add(function(){dispatchEvent(new CustomEvent('plate:intro'));},.55);
      tl.from($('.fp-index li,.fp-now',plate),{y:14,autoAlpha:0,duration:.7,stagger:.05,onComplete:clear},1);
    }
    tl.eventCallback('onComplete',function(){if(words.length)gsap.set(words,{clearProps:'transform'});});
    var held=root.classList.contains('intro-on'), played=false;
    var play=function(){if(played)return;played=true;held=false;tl.play();};
    if(held){addEventListener('intro:done',play,{once:true});setTimeout(play,14000);}
    else play();
    /* leaving the hero: the headline and the plate part at different speeds */
    if(matchMedia('(min-width:901px)').matches&&h1&&panel){
      var st={trigger:hero,start:'top top',end:'bottom top',scrub:true};
      gsap.to(h1,{yPercent:-14,ease:'none',scrollTrigger:st});
      gsap.to(panel,{yPercent:5,ease:'none',scrollTrigger:st});
    }
  }

  /* ---------- nothing loops while it is off screen ---------- */
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){e.target.classList.toggle('off-screen',!e.isIntersecting);});});
    $('.clients-strip,.marquee').forEach(function(el){io.observe(el);});
    cleanups.push(function(){io.disconnect();});
  }

  /* ---------- cleanup ----------
     A page kept in the back/forward cache is frozen as it is and resumes
     intact; a page that is really going away releases everything. */
  addEventListener('pagehide',function(e){
    if(e.persisted)return;
    clearTimeout(refreshT);
    ScrollTrigger.getAll().forEach(function(t){t.kill();});
    gsap.globalTimeline.clear();
    if(tick)gsap.ticker.remove(tick);
    if(lenis){lenis.destroy();window.siteScroll=null;}
    cleanups.forEach(function(fn){fn();});
  });
})();
