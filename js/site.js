/* ============================================================
   ITAI AGAMI — shared behavior (v1.3 multi-page)
   ============================================================ */

/* ---------- Vercel Web Analytics (privacy-friendly, no cookies) ---------- */
(function(){
  window.va = window.va || function(){ (window.vaq = window.vaq || []).push(arguments); };
  var s = document.createElement('script');
  s.defer = true; s.src = '/_vercel/insights/script.js';
  document.head.appendChild(s);
})();

/* ---------- shared chrome for sub-pages (case studies) ----------
   Pages with <body data-chrome="sub"> get header/menu/footer injected
   here so the static files stay small. Paths are ../ relative. */
(function(){
  if(!document.body || document.body.dataset.chrome!=='sub') return;
  /* which top-level section this sub-page belongs to — drives the nav highlight */
  var sec = location.pathname.indexOf('/notes/') > -1 ? 'notes'
          : location.pathname.indexOf('/services/') > -1 ? 'services'
          : 'work';
  var on = function(name){ return sec===name ? ' class="active"' : ''; };
  var hdr = ''
  +'<div class="grain" aria-hidden="true"></div>'
  +'<header class="site" id="siteHeader"><div class="hwrap">'
  +'<a href="../index.html" class="brand" aria-label="Itai Agami — home">Itai&nbsp;Agami</a>'
  +'<nav class="primary" aria-label="Primary">'
  +'<a href="../work.html"'+on('work')+'>Work</a>'
  +'<a href="../services.html"'+on('services')+'>Services</a>'
  +'<a href="../notes.html"'+on('notes')+'>Notes</a>'
  +'<a href="../about.html">About</a>'
  +'<a href="../contact.html">Contact</a>'
  +'<button id="themeToggle" class="toggle" aria-label="Toggle light or dark theme" title="Toggle theme"><span aria-hidden="true">◐</span></button>'
  +'</nav>'
  +'<button class="menu-btn" id="menuBtn" aria-expanded="false" aria-controls="mobileMenu">Menu</button>'
  +'</div></header>'
  +'<nav class="mobile-menu" id="mobileMenu" aria-label="Mobile">'
  +'<a href="../work.html">Work</a>'
  +'<a href="../services.html">Services</a>'
  +'<a href="../notes.html">Notes</a>'
  +'<a href="../about.html">About</a>'
  +'<a href="../contact.html">Contact</a>'
  +'<div class="mm-foot"><button id="themeToggleM" class="toggle" style="align-self:flex-start" aria-label="Toggle theme"><span aria-hidden="true">◐</span> <span class="tlm">Light</span></button>'
  +'<span>Tel Aviv, IL — Worldwide</span></div>'
  +'</nav>';
  var ftr = ''
  +'<footer class="site"><div class="wrap"><div class="grid">'
  +'<div class="col"><h4>Menu</h4><a href="../work.html">Work</a><a href="../services.html">Services</a><a href="../notes.html">Notes</a><a href="../about.html">About</a><a href="../contact.html">Contact</a></div>'
  +'<div class="col"><h4>Connect</h4><a href="mailto:itaiagami@gmail.com">Email</a><a href="https://www.linkedin.com/in/itai-agami-237353189/" target="_blank" rel="noopener">LinkedIn</a><a href="/assets/docs/Itai_Agami_CV.pdf" target="_blank" rel="noopener">CV</a></div>'
  +'<div class="col"><h4>Studio</h4><a href="../about.html">Tel Aviv, IL</a><a href="../about.html">Working worldwide</a></div>'
  +'</div><div class="base">'
  +'<span>© 2026 Itai Agami. All rights reserved.</span>'
  +'<span>Creative Director &amp; Designer</span>'
  +'</div></div></footer>';
  document.body.insertAdjacentHTML('afterbegin', hdr);
  document.body.insertAdjacentHTML('beforeend', ftr);
})();

/* ---------- first-touch attribution (session only, no cookies) ----------
   Records how this visit started — campaign parameters, the page they landed
   on and the external referrer — so an enquiry can say where it came from.
   First touch wins: later internal navigation never overwrites it. Nothing
   leaves the browser unless the visitor sends the contact form. */
const ATTR_KEY = 'ia-attr';
function readAttribution(){
  try{ return JSON.parse(sessionStorage.getItem(ATTR_KEY) || 'null'); }catch(e){ return null; }
}
(function(){
  let store;
  try{ store = sessionStorage; }catch(e){ return; }           /* private mode / blocked */
  if(readAttribution()) return;
  const q = new URLSearchParams(location.search);
  const ref = document.referrer || '';
  let external = ref;
  try{ if(ref && new URL(ref).host === location.host) external = ''; }catch(e){}
  try{
    store.setItem(ATTR_KEY, JSON.stringify({
      utm_source:   q.get('utm_source')   || '',
      utm_medium:   q.get('utm_medium')   || '',
      utm_campaign: q.get('utm_campaign') || '',
      landing_page: location.pathname + location.search,
      referrer:     external
    }));
  }catch(e){}
})();

/* ---------- engagement floor by region ----------
   These are deliberate minimums per market, not conversions of one number:
   ₪30,000 converted reads as production money to a US or European buyer, so
   each market gets a floor that reads as a floor there.

   ₪30,000 is what sits in the HTML, so search engines and AI assistants that
   do not run JavaScript always read a real figure. Everything below only
   changes what a human visitor sees.

   TO CHANGE A NUMBER: edit this table and the matching one in api/enquiry.js.
   The band strings must stay identical in both files or a genuine submission
   is rejected as invalid — same rule the timeline options already follow. */
const MARKETS = {
  ILS: { floor:'₪30,000', bands:['₪30,000 – ₪60,000', '₪60,000 – ₪120,000', '₪120,000+'] },
  USD: { floor:'$10,000', bands:['$10,000 – $20,000', '$20,000 – $40,000', '$40,000+'] },
  EUR: { floor:'€10,000', bands:['€10,000 – €20,000', '€20,000 – €40,000', '€40,000+'] },
  GBP: { floor:'£8,000',  bands:['£8,000 – £16,000',  '£16,000 – £32,000',  '£32,000+'] }
};

(function(){
  const floors = document.querySelectorAll('[data-floor]');
  const bands  = document.querySelectorAll('[data-band]');
  if(!floors.length && !bands.length) return;

  const BY_COUNTRY = { IL:'ILS', GB:'GBP', US:'USD', CA:'USD' };
  const EUROPE = ('AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK '
    + 'SI ES SE IS NO CH LI AD MC SM VA AL BA ME MK RS MD UA').split(' ');

  function currencyFor(cc){
    if(!cc) return '';
    if(BY_COUNTRY[cc]) return BY_COUNTRY[cc];
    if(EUROPE.indexOf(cc) > -1) return 'EUR';
    return 'USD';                                   /* everywhere else — the international default */
  }

  /* An instant first guess so the figure is right before the page paints;
     the IP lookup below is authoritative and corrects it if they disagree. */
  function guessFromTimeZone(){
    let tz = '';
    try{ tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; }catch(e){}
    if(!tz) return '';
    if(tz === 'Asia/Jerusalem' || tz === 'Asia/Tel_Aviv') return 'ILS';
    if(tz === 'Europe/London') return 'GBP';
    if(tz.indexOf('Europe/') === 0) return 'EUR';
    if(tz.indexOf('America/') === 0) return 'USD';
    return '';
  }

  function apply(cur){
    const m = MARKETS[cur]; if(!m) return;
    floors.forEach(el => { el.textContent = m.floor; });
    /* options carry no value attribute, so setting the text sets the value too */
    bands.forEach(el => { const i = +el.dataset.band; if(m.bands[i]) el.textContent = m.bands[i]; });
    document.documentElement.dataset.currency = cur;
  }

  const KEY = 'ia-cur';

  /* ?cur=USD forces a market — for previewing and for testing the form */
  const forced = (new URLSearchParams(location.search).get('cur') || '').toUpperCase();
  if(MARKETS[forced]){ apply(forced); return; }

  let cached = null; try{ cached = sessionStorage.getItem(KEY); }catch(e){}
  if(MARKETS[cached]){ apply(cached); return; }      /* settled earlier this visit — no flicker */

  apply(guessFromTimeZone());

  fetch('/api/geo', { headers:{ Accept:'application/json' } })
    .then(r => r.ok ? r.json() : null)
    .then(d => {
      if(!d) return;                                 /* endpoint missing (local preview) — leave it */
      const cur = currencyFor(d.country) || 'USD';   /* reached us, but country unknown */
      try{ sessionStorage.setItem(KEY, cur); }catch(e){}
      apply(cur);
    })
    .catch(()=>{});                                  /* offline or blocked — the ₪ default stands */
})();

/* ---------- theme (dark default, light optional, persisted) ---------- */
(function(){
  const root=document.documentElement;
  let saved=null; try{saved=localStorage.getItem('theme')}catch(e){}
  function apply(t){
    if(t==='light')root.setAttribute('data-theme','light');else root.removeAttribute('data-theme');
    document.querySelectorAll('.tlm').forEach(el=>el.textContent=(t==='light')?'Dark':'Light');
  }
  apply(saved==='light'?'light':'dark');
  function toggle(){
    const next=root.getAttribute('data-theme')==='light'?'dark':'light';
    apply(next); try{localStorage.setItem('theme',next)}catch(e){}
  }
  addEventListener('DOMContentLoaded',()=>{
    apply(root.getAttribute('data-theme')==='light'?'light':'dark');
    const t=document.getElementById('themeToggle'); if(t)t.addEventListener('click',toggle);
    const tm=document.getElementById('themeToggleM'); if(tm)tm.addEventListener('click',toggle);
  });
})();

/* ---------- header scrolled state ---------- */
const _hdr=document.getElementById('siteHeader');
if(_hdr){addEventListener('scroll',()=>{_hdr.classList.toggle('scrolled',scrollY>20);},{passive:true});}

/* ---------- mobile menu (gooey) ----------
   The links spring out of the Menu pill as liquid blobs that merge while they
   travel — the liquid-gooey idea (MIT, Jakub Antalik — https://libraries.dev/gooey):
   the blobs live in one SVG-filtered layer (blur + alpha contrast), the labels
   ride an unfiltered layer on top with the same transforms, so text stays crisp. */
(function(){
  const btn=document.getElementById('menuBtn');
  const menu=document.getElementById('mobileMenu');
  const hdr=document.getElementById('siteHeader');
  if(!btn||!menu||!hdr)return;
  const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const NS='http://www.w3.org/2000/svg';

  // goo filter: blur 6, contrast 18 — the library's defaults
  const svg=document.createElementNS(NS,'svg');
  svg.setAttribute('width','0');svg.setAttribute('height','0');svg.setAttribute('aria-hidden','true');
  svg.style.position='absolute';
  svg.innerHTML='<filter id="mm-goo" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">'
    +'<feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b"/>'
    +'<feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"/></filter>';
  document.body.appendChild(svg);

  // the menu now drops from the header, so it lives inside it
  const items=[...menu.querySelectorAll(':scope > a')];
  const tm=menu.querySelector('#themeToggleM');
  if(tm){tm.removeAttribute('style');items.push(tm);}
  const foot=menu.querySelector('.mm-foot'); if(foot)foot.remove();
  menu.innerHTML='';
  const goo=document.createElement('div'); goo.className='mm-goo'; goo.setAttribute('aria-hidden','true');
  const origin=document.createElement('span'); origin.className='mm-blob'; goo.appendChild(origin);
  const blobs=items.map(el=>{
    el.classList.add('mm-item'); menu.appendChild(el);
    const b=document.createElement('span'); b.className='mm-blob'; goo.appendChild(b); return b;
  });
  menu.prepend(goo);
  hdr.appendChild(menu);
  // solid page-colour backdrop under the pills; sits just below the header
  const scrim=document.createElement('div'); scrim.className='mm-scrim'; scrim.setAttribute('aria-hidden','true');
  document.body.appendChild(scrim);

  // one spring per item, bouncy preset: stiffness 320, damping 17
  const K=320,D=17,GAP=14,STAGGER=.04;
  const st=items.map(()=>({x:0,v:0}));
  let open=false,t0=0,last=0,raf=0,geo=null;

  function measure(){
    const h=hdr.getBoundingClientRect(), b=btn.getBoundingClientRect();
    const right=h.right-b.right, top=b.top-h.top;
    origin.style.cssText='width:'+b.width+'px;height:'+b.height+'px;right:'+right+'px;top:'+top+'px';
    let y=b.height+GAP;
    geo=items.map((el,i)=>{
      const w=el.offsetWidth, hh=el.offsetHeight;
      const g={w,h:hh,dy:y+(hh-b.height)/2,s:Math.min(1,b.width/w,b.height/hh)};
      el.style.right=blobs[i].style.right=right+'px';
      el.style.top=blobs[i].style.top=(top+(b.height-hh)/2)+'px';
      blobs[i].style.width=w+'px'; blobs[i].style.height=hh+'px';
      y+=hh+GAP; return g;
    });
    // the filter only renders inside the goo layer's box, so size it to the whole stack
    goo.style.width=(right+Math.max(b.width,...geo.map(g=>g.w))+24)+'px';
    goo.style.height=(top+y+24)+'px';
  }
  function paint(){
    items.forEach((el,i)=>{
      const p=st[i].x, g=geo[i], s=g.s+(1-g.s)*Math.max(0,Math.min(1,p));
      const tf='translateY('+(g.dy*p).toFixed(2)+'px) scale('+s.toFixed(3)+')';
      el.style.transform=blobs[i].style.transform=tf;
      el.style.opacity=Math.max(0,Math.min(1,(p-.55)/.4)).toFixed(3);
    });
  }
  function tick(now){
    const t=(now-t0)/1000, dt=Math.min(.032,Math.max(0,(now-last)/1000)); last=now; let busy=false;
    st.forEach((s,i)=>{
      const n=open?i:items.length-1-i;
      if(t<n*STAGGER){busy=true;return;}
      const target=open?1:0;
      for(let k=0;k<4;k++){const a=-K*(s.x-target)-D*s.v; s.v+=a*dt/4; s.x+=s.v*dt/4;}
      if(Math.abs(s.x-target)>.001||Math.abs(s.v)>.01)busy=true; else{s.x=target;s.v=0;}
    });
    paint();
    if(busy)raf=requestAnimationFrame(tick);
    else if(!open)menu.classList.remove('shown');
  }
  function set(o){
    if(o===open)return;
    open=o;
    btn.setAttribute('aria-expanded',String(o));
    btn.textContent=o?'Close':'Menu';
    menu.classList.toggle('open',o);
    scrim.classList.toggle('open',o);
    document.body.classList.toggle('locked',o);
    if(o){measure();menu.classList.add('shown');}
    cancelAnimationFrame(raf);
    if(reduced){st.forEach(s=>{s.x=o?1:0;s.v=0;});paint();if(!o)menu.classList.remove('shown');}
    else{t0=last=performance.now();raf=requestAnimationFrame(tick);}
    if(o)items[0].focus({preventScroll:true});else if(menu.contains(document.activeElement))btn.focus();
  }
  btn.addEventListener('click',()=>set(!open));
  addEventListener('keydown',e=>{if(e.key==='Escape'&&open)set(false);});
  document.addEventListener('click',e=>{if(open&&!menu.contains(e.target)&&!btn.contains(e.target))set(false);});
  addEventListener('resize',()=>{if(open)set(false);});
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>set(false)));
})();

/* ---------- border beam on primary CTAs (styles in site.css) ---------- */
document.querySelectorAll('.btn.solid').forEach(b=>{
  b.setAttribute('data-beam','cta'); b.setAttribute('data-active','');
  const bloom=document.createElement('span'); bloom.setAttribute('data-beam-bloom',''); bloom.setAttribute('aria-hidden','true');
  b.appendChild(bloom);
});

/* ---------- thinking orb, hero (home) ----------
   thinking-orbs engine (MIT, Jakub Antalik — https://libraries.dev/orbs).
   Cycles through the nine states every few seconds with a crossfade;
   a tap or click jumps to the next one. Uses the 64px tunings, drawn at
   the size of the hero layer. */
(function(){
  const host=document.getElementById('heroSystem'), O=window.ThinkingOrbs;
  if(!host||!O)return;
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  const STATES=['connecting','searching','weaving','working','shaping','composing','solving','listening','breathing'];
  const HOLD=4200, FADE=900;
  const c=document.createElement('canvas'); host.appendChild(c);
  const ctx=c.getContext('2d'); if(!ctx)return;
  const make=st=>{const r=O.resolvePreset(st,64); return {fn:O.MODE_FRAMES[r.mode],speed:r.speed,opts:r.opts};};
  let idx=0, cur=make(STATES[0]), prev=null, switchedAt=performance.now();
  let size=0,dpr=1;
  const fit=()=>{
    const r=host.getBoundingClientRect();
    size=Math.round(Math.min(r.width,r.height)*(r.width>r.height*1.6?1.2:.9)); // short mobile strip: the orb spans ~80% of the canvas, so overdraw dpr=Math.min(2,devicePixelRatio||1);
    c.width=c.height=Math.round(size*dpr); c.style.width=c.style.height=size+'px';
  };
  const next=()=>{prev=cur; idx=(idx+1)%STATES.length; cur=make(STATES[idx]); switchedAt=performance.now();};
  const layer=(o,t,alpha,scale,dark)=>{
    if(alpha<=0)return;
    const h=size/2;
    ctx.setTransform(dpr*scale,0,0,dpr*scale,dpr*h*(1-scale),dpr*h*(1-scale));
    ctx.globalAlpha=alpha;
    O.paintFrame(ctx,o.fn(size,t*o.speed,o.opts),dark);
  };
  const draw=now=>{
    if(!size)return;
    if(now-switchedAt>HOLD+FADE)next();
    const k=Math.min(1,(now-switchedAt)/FADE), e=k*k*(3-2*k), t=now/1000;
    const dark=document.documentElement.getAttribute('data-theme')!=='light';
    ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha=1; ctx.clearRect(0,0,c.width,c.height);
    if(prev&&k<1)layer(prev,t,1-e,1-.08*e,dark);
    layer(cur,t,prev?e:1,prev?.92+.08*e:1,dark);
    if(k>=1)prev=null;
  };
  c.addEventListener('click',next);
  fit(); new ResizeObserver(fit).observe(host);
  let raf=0,run=false,seen=false;
  const loop=now=>{draw(now); if(run)raf=requestAnimationFrame(loop);};
  const start=()=>{if(!run&&seen&&!document.hidden){run=true;switchedAt=performance.now()-(prev?0:FADE);raf=requestAnimationFrame(loop);}};
  const stop=()=>{run=false;cancelAnimationFrame(raf);};
  new IntersectionObserver(([e])=>{seen=e.isIntersecting;seen?start():stop();}).observe(host);
  document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
  requestAnimationFrame(()=>host.classList.add('ready'));
})();

/* ---------- hero reveal (home) ---------- */
(function(){
  const h=document.querySelector('.hero'); if(!h)return;
  const go=()=>h.classList.add('revealed');
  requestAnimationFrame(()=>requestAnimationFrame(go));
  addEventListener('load',go);
  setTimeout(go,120);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)go();});
})();

/* ---------- scroll reveals ---------- */
(function(){
  const els=[...document.querySelectorAll('.obs')]; if(!els.length)return;
  function check(){
    els.forEach(el=>{
      if(el.classList.contains('in'))return;
      const r=el.getBoundingClientRect();
      if(r.top<innerHeight*0.92&&r.bottom>0)el.classList.add('in');
    });
  }
  const io=new IntersectionObserver(es=>{
    es.forEach(en=>{if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target);}});
  },{threshold:0,rootMargin:'0px 0px -8% 0px'});
  els.forEach(el=>io.observe(el));
  check();
  addEventListener('scroll',check,{passive:true});
  addEventListener('load',check);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
})();

/* ---------- enquiry form (contact page) ---------- */
(function(){
  const form=document.getElementById('enquiryForm'); if(!form)return;
  const status=document.getElementById('formStatus');
  const btn=form.querySelector('button[type="submit"]');
  const MAIL='<a href="mailto:itaiagami@gmail.com">itaiagami@gmail.com</a>';

  /* carry the visit's origin into the enquiry — see first-touch attribution above */
  (function(){
    const a=readAttribution(); if(!a)return;
    const map={utm_source:'f-utm-source',utm_medium:'f-utm-medium',utm_campaign:'f-utm-campaign',
               landing_page:'f-landing',referrer:'f-referrer'};
    for(const k in map){ const el=document.getElementById(map[k]); if(el)el.value=a[k]||''; }
  })();

  /* Composes the finished enquiry as an email the visitor sends themselves.
     Used when the server cannot send — nothing they typed is ever lost. */
  function mailtoHref(d){
    const body=[
      'Name: '+(d.name||''),
      'Email: '+(d.email||''),
      'Organisation: '+(d.org||'—'),
      'Project type: '+(d.type||'—'),
      'Budget: '+(d.budget||'—'),
      'Timeline: '+(d.timeline||'—'),
      'Found via: '+(d.source||'—'),
      '','Project:',(d.project||'')
    ].join('\n');
    return 'mailto:itaiagami@gmail.com'
      +'?subject='+encodeURIComponent('Project enquiry — '+(d.name||''))
      +'&body='+encodeURIComponent(body);
  }
  function handoff(d){
    const actions=form.querySelector('.f-actions');
    actions.innerHTML='<a class="btn solid" href="'+mailtoHref(d)+'">'
      +'Send from your email app <span class="arw" aria-hidden="true">→</span></a>'
      +'<p class="f-status">Your answers are ready and addressed — this opens them '
      +'in your mail app so you can hit send.</p>';
  }

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!form.reportValidity())return;                       /* native messages, our styling */
    const data=Object.fromEntries(new FormData(form).entries());
    const label=btn.innerHTML;
    btn.disabled=true; btn.textContent='Sending…';
    status.className='f-status'; status.textContent='';
    let j={};
    try{
      const r=await fetch('/api/enquiry',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)
      });
      j=await r.json().catch(()=>({}));
      if(r.ok&&j.ok){
        form.innerHTML='<p class="f-done">Thank you — this is with me now. '
          +'I read every enquiry myself and will come back to you within two working days.<br><br>'
          +'If it is urgent, '+MAIL+'.</p>';
        return;
      }
      if(j.fallback||r.status>=500){ handoff(data); return; }
      throw new Error(j.error||'Something went wrong.');
    }catch(err){
      if(!j||!j.error){ handoff(data); return; }            /* offline or blocked — still no dead end */
      status.className='f-status err';
      status.textContent=err.message+' You can also email itaiagami@gmail.com directly.';
      btn.disabled=false; btn.innerHTML=label;
    }
  });
})();

/* ---------- work index: filters + views + hover preview ---------- */
(function(){
  const indexList=document.getElementById('indexList'); if(!indexList)return;
  const indexCount=document.getElementById('indexCount');
  const filtersEl=document.getElementById('filters');
  const viewsEl=document.getElementById('views');
  const hoverimg=document.getElementById('hoverimg');
  const hoverimgSrc=document.getElementById('hoverimgSrc');
  const hideHover=()=>{if(hoverimg)hoverimg.classList.remove('show')};

  /* filters */
  const FILTERS=['All','Brand','Technology','Culture','Interactive'];
  let activeFilter='All'; try{activeFilter=localStorage.getItem('filter')||'All'}catch(e){}
  if(!FILTERS.includes(activeFilter))activeFilter='All';
  FILTERS.forEach(f=>{
    const b=document.createElement('button');b.textContent=f;b.dataset.f=f;
    b.setAttribute('aria-pressed',String(f===activeFilter));
    b.addEventListener('click',()=>setFilter(f));
    filtersEl.appendChild(b);
  });
  function setFilter(f){
    activeFilter=f; try{localStorage.setItem('filter',f)}catch(e){}
    filtersEl.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.f===f)));
    let shown=0;
    indexList.querySelectorAll('.prow').forEach(row=>{
      const ok=f==='All'||row.dataset.tags.split(',').includes(f);
      row.classList.toggle('hidden',!ok); if(ok)shown++;
    });
    if(indexCount)indexCount.textContent=(f==='All'?'All work':f)+' · '+shown;
    hideHover();
  }

  /* views */
  let activeView='vertical'; try{activeView=localStorage.getItem('view')||'vertical'}catch(e){}
  const validViews=Array.from(viewsEl.querySelectorAll('button')).map(b=>b.dataset.view);
  if(!validViews.includes(activeView))activeView='vertical';
  function setView(v){
    activeView=v; try{localStorage.setItem('view',v)}catch(e){}
    indexList.className='index-list'+(v==='vertical'?'':' '+v);
    viewsEl.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===v)));
    hideHover();
  }
  viewsEl.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  setView(activeView); setFilter(activeFilter);

  /* hover preview (vertical view, pointer devices) */
  const canHover=matchMedia('(hover:hover) and (pointer:fine)').matches
    && !matchMedia('(prefers-reduced-motion:reduce)').matches;
  if(canHover&&hoverimg){
    indexList.addEventListener('mouseover',e=>{
      const row=e.target.closest('.prow'); if(!row)return;
      if(activeView==='vertical'){hoverimgSrc.src=row.dataset.img;hoverimg.classList.add('show');}
    });
    indexList.addEventListener('mouseout',e=>{if(e.target.closest('.prow'))hideHover();});
    addEventListener('mousemove',e=>{
      hoverimg.style.left=e.clientX+'px';hoverimg.style.top=e.clientY+'px';
      hoverimg.style.setProperty('--hx',e.clientX>innerWidth*0.5?'calc(-100% - 32px)':'32px');
    });
  }
})();

/* Marquee reel.
   The CSS keyframes are the no-JS fallback. When JS is available it takes the
   animation over on a rAF loop, because easing between two speeds is the whole
   point of the hover: swapping animation-duration mid-flight remaps elapsed
   time and the track visibly jumps. Position is kept modulo half the track, so
   the second run always covers the seam.
   Tiles are preload="none" and each video is observed on its own, so only the
   ones actually on screen ever download. */
(function(){
  const marquee=document.querySelector('.marquee');
  if(!marquee)return;
  const track=marquee.querySelector('.track');
  const vids=[...marquee.querySelectorAll('video')];
  const slow=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO='IntersectionObserver' in window;

  if(!slow&&track){
    track.style.animation='none';                 // hand over from CSS keyframes
    let x=0,speed=0,target=0,last=0,visible=true,half=0;
    const measure=()=>{half=track.scrollWidth/2;
      target=half/(innerWidth<900?24:34);};       // match the CSS timings
    measure();
    addEventListener('resize',()=>{measure();},{passive:true});
    let hovering=false;
    marquee.addEventListener('mouseenter',()=>{hovering=true;});
    marquee.addEventListener('mouseleave',()=>{hovering=false;});
    speed=target;
    const frame=t=>{
      const dt=last?Math.min((t-last)/1000,.05):0; last=t;
      if(visible&&half>0){
        const want=hovering?target*.22:target;     // ease down, never fully stop
        speed+=(want-speed)*Math.min(dt*4,1);
        x=(x+speed*dt)%half;
        track.style.transform='translateX('+(-x)+'px)';
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    if(hasIO){
      new IntersectionObserver(es=>{es.forEach(e=>{visible=e.isIntersecting;});})
        .observe(marquee);
    }
  }

  if(!vids.length||slow||!hasIO)return;
  // Play only once playable — calling play() straight after load() lets the
  // load abort the pending play, and the tile never starts.
  const play=v=>{
    if(v.readyState>=3){v.play().catch(()=>{});return;}
    if(!v.dataset.wired){v.dataset.wired='1';v.addEventListener('canplay',()=>{if(v.dataset.on)v.play().catch(()=>{});},{once:true});}
    if(v.preload!=='auto'){v.preload='auto';v.load();}
  };
  const io=new IntersectionObserver(es=>{
    es.forEach(e=>{
      const v=e.target;
      if(e.isIntersecting){v.dataset.on='1';play(v);}
      else{delete v.dataset.on;v.pause();}
    });
  },{rootMargin:'100px'});
  vids.forEach(v=>io.observe(v));
})();

/* ---------- click-to-load film ----------
   .frame[data-vimeo] holds a poster button; the player is only fetched when
   someone asks for it, then starts with sound and Vimeo's own controls. */
(function(){
  const frames=document.querySelectorAll('.frame[data-vimeo]');
  if(!frames.length)return;
  let warmed=false;
  const warm=()=>{
    if(warmed)return;warmed=true;
    ['https://player.vimeo.com','https://i.vimeocdn.com','https://f.vimeocdn.com'].forEach(h=>{
      const l=document.createElement('link');l.rel='preconnect';l.href=h;document.head.appendChild(l);
    });
  };
  frames.forEach(f=>{
    const btn=f.querySelector('.c-play');
    if(!btn)return;
    btn.addEventListener('pointerenter',warm,{once:true});
    btn.addEventListener('focus',warm,{once:true});
    btn.addEventListener('click',()=>{
      const ifr=document.createElement('iframe');
      ifr.src='https://player.vimeo.com/video/'+f.dataset.vimeo+'?autoplay=1&title=0&byline=0&portrait=0&dnt=1';
      ifr.title=f.dataset.title||'Film';
      ifr.allow='autoplay; fullscreen; picture-in-picture';
      ifr.allowFullscreen=true;
      btn.replaceWith(ifr);
      ifr.focus();
    });
  });
})();

/* ---------- motion layer ----------
   One-time reveals only: headings rise word by word, media wipes open,
   lists and cards stagger in. Nothing loops, nothing gates input, and the
   whole layer is skipped for reduced-motion users. Content is never hidden
   without JS: the hidden states only exist on classes added here. */
(function(){
  if(!('IntersectionObserver' in window))return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const root=document.documentElement; root.classList.add('mo');

  // split a heading's text into masked words, keeping inline markup (em, a, strong)
  let n=0;
  function split(node){
    [...node.childNodes].forEach(c=>{
      if(c.nodeType===3){
        const parts=c.textContent.split(/(\s+)/); if(parts.every(p=>!p.trim()))return;
        const f=document.createDocumentFragment();
        parts.forEach(p=>{
          if(!p)return;
          if(!p.trim()){f.appendChild(document.createTextNode(p));return;}
          const w=document.createElement('span');w.className='w';
          const i=document.createElement('span');i.textContent=p;i.style.setProperty('--i',n++);
          w.appendChild(i);f.appendChild(w);
        });
        c.replaceWith(f);
      }else if(c.nodeType===1&&c.tagName!=='BR')split(c);
    });
  }
  const heads=document.querySelectorAll('.sec-head h1,.sec-head h2,.pov h2,.band h2,.c-open h1,.svc-open h1,.article h1,.c-open .oneline,.svc-open .oneline,.article .dek');
  heads.forEach(h=>{n=0;split(h);h.classList.add('split');});

  // stagger indexes for groups
  const idx=(sel)=>document.querySelectorAll(sel).forEach(g=>[...g.children].forEach((c,i)=>c.style.setProperty('--i',i)));
  idx('.c-meta');idx('.caps');idx('.index-list');idx('.svc-cases');idx('.c-sites');idx('.notes-list');
  document.querySelectorAll('.c-gallery figure,.svc-cases,.c-sites,.index-list,.c-meta,.notes-list,.c-contrib,.c-film--lead,.a-video').forEach(el=>el.classList.add('rv'));

  const io=new IntersectionObserver(es=>es.forEach(e=>{
    if(e.isIntersecting){e.target.classList.add('in-view');io.unobserve(e.target);}
  }),{threshold:0.01});
  const els=[...document.querySelectorAll('.split,.rv')];
  els.forEach(el=>io.observe(el));
  // backstop for fast flings and anchor jumps: anything at or above the
  // viewport's bottom edge is revealed, so nothing is ever left hidden
  let ticking=false;
  const sweep=()=>{ticking=false;
    els.forEach(el=>{if(!el.classList.contains('in-view')&&el.getBoundingClientRect().top<innerHeight){el.classList.add('in-view');io.unobserve(el);}});
  };
  addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(sweep);}},{passive:true});
  addEventListener('load',sweep);
})();
