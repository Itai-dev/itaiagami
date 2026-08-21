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
  var inNotes = location.pathname.indexOf('/notes/') > -1;
  var hdr = ''
  +'<div class="grain" aria-hidden="true"></div>'
  +'<header class="site" id="siteHeader"><div class="hwrap">'
  +'<a href="../index.html" class="brand" aria-label="Itai Agami — home"><span class="dot" aria-hidden="true"></span> Itai&nbsp;Agami</a>'
  +'<nav class="primary" aria-label="Primary">'
  +'<a href="../work.html"'+(inNotes?'':' class="active"')+'>Work</a>'
  +'<a href="../notes.html"'+(inNotes?' class="active"':'')+'>Notes</a>'
  +'<a href="../about.html">About</a>'
  +'<a href="../contact.html">Contact</a>'
  +'<button id="themeToggle" class="toggle" aria-label="Toggle light or dark theme" title="Toggle theme"><span aria-hidden="true">◐</span></button>'
  +'</nav>'
  +'<button class="menu-btn" id="menuBtn" aria-expanded="false" aria-controls="mobileMenu">Menu</button>'
  +'</div></header>'
  +'<nav class="mobile-menu" id="mobileMenu" aria-label="Mobile">'
  +'<a href="../work.html">Work</a>'
  +'<a href="../notes.html">Notes</a>'
  +'<a href="../about.html">About</a>'
  +'<a href="../contact.html">Contact</a>'
  +'<div class="mm-foot"><button id="themeToggleM" class="toggle" style="align-self:flex-start" aria-label="Toggle theme"><span aria-hidden="true">◐</span> <span class="tlm">Light</span></button>'
  +'<span>Tel Aviv, IL — Worldwide</span></div>'
  +'</nav>';
  var ftr = ''
  +'<footer class="site"><div class="wrap"><div class="grid">'
  +'<div class="col"><h4>Menu</h4><a href="../work.html">Work</a><a href="../notes.html">Notes</a><a href="../about.html">About</a><a href="../contact.html">Contact</a></div>'
  +'<div class="col"><h4>Connect</h4><a href="mailto:itaiagami@gmail.com">Email</a><a href="https://www.linkedin.com/in/itai-agami-237353189/" target="_blank" rel="noopener">LinkedIn</a></div>'
  +'<div class="col"><h4>Studio</h4><a href="../about.html">Tel Aviv, IL</a><a href="../about.html">Working worldwide</a></div>'
  +'</div><div class="base">'
  +'<span>© 2026 Itai Agami. All rights reserved.</span>'
  +'<span>Independent Creative Director</span>'
  +'</div></div></footer>';
  document.body.insertAdjacentHTML('afterbegin', hdr);
  document.body.insertAdjacentHTML('beforeend', ftr);
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

/* ---------- mobile menu ---------- */
(function(){
  const btn=document.getElementById('menuBtn');
  const menu=document.getElementById('mobileMenu');
  if(!btn||!menu)return;
  function set(open){
    menu.classList.toggle('open',open);
    btn.setAttribute('aria-expanded',String(open));
    btn.textContent=open?'Close':'Menu';
    document.body.classList.toggle('locked',open);
  }
  btn.addEventListener('click',()=>set(!menu.classList.contains('open')));
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>set(false)));
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

  /* Composes the finished enquiry as an email the visitor sends themselves.
     Used when the server cannot send — nothing they typed is ever lost. */
  function mailtoHref(d){
    const body=[
      'Name: '+(d.name||''),
      'Email: '+(d.email||''),
      'Organisation: '+(d.org||'—'),
      'Budget: '+(d.budget||'—'),
      'Timeline: '+(d.timeline||'—'),
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
