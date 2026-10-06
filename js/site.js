/* ============================================================
   ITAI AGAMI — shared behavior (v1.3 multi-page)
   ============================================================ */

/* ---------- ANALYTICS CONFIG — paste your real IDs here ----------
   Both tools stay switched off until a real ID replaces the placeholder,
   and even then load only after the visitor accepts analytics.
   See docs/measurement-setup.md for the full setup checklist. */
const GA_MEASUREMENT_ID   = 'G-NTJQ076FLS';   /* GA4 → Admin → Data streams → Web → Measurement ID */
const CLARITY_PROJECT_ID  = 'ysfwugh67l';     /* Clarity → Settings → Overview → Project ID */
/* true logs every analytics event to the console. Also switchable per browser
   without a deploy: add ?analytics_debug=1 to any URL (?analytics_debug=0 turns it off). */
const ANALYTICS_DEBUG     = false;

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
  /* the chrome is now written into each page's HTML so crawlers that don't run JS see the
     site navigation; this injection only remains as a fallback for pages without it */
  if(document.getElementById('siteHeader')) return;
  /* which top-level section this sub-page belongs to — drives the nav highlight */
  var sec = location.pathname.indexOf('/notes/') > -1 ? 'notes'
          : location.pathname.indexOf('/services/') > -1 ? 'services'
          : 'work';
  var on = function(name){ return sec===name ? ' class="active"' : ''; };
  var hdr = ''
  +'<div class="grain" aria-hidden="true"></div>'
  +'<header class="site" id="siteHeader"><div class="hwrap">'
  +'<a href="../index.html" class="brand" aria-label="Itai Agami, home">Itai&nbsp;Agami</a>'
  +'<nav class="primary" aria-label="Primary">'
  +'<a href="../work.html"'+on('work')+'>Work</a>'
  +'<a href="../services.html"'+on('services')+'>Services</a>'
  +'<a href="../notes.html"'+on('notes')+'>Notes</a>'
  +'<a href="../about.html">About</a>'
  +'<a href="../contact.html">Contact</a>'
  +'<button id="themeToggle" class="toggle" aria-label="Toggle light or dark theme" title="Toggle theme"><span aria-hidden="true">◐</span></button>'
  +'</nav>'
  +'<a class="btn solid nav-cta" href="https://calendar.app.google/qAYhVo928FsVE6PP7" data-booking="header" target="_blank" rel="noopener">Book a call <span class="arw" aria-hidden="true">↗</span></a>'
  +'<button class="menu-btn" id="menuBtn" aria-expanded="false" aria-controls="mobileMenu">Menu</button>'
  +'</div></header>'
  +'<nav class="mobile-menu" id="mobileMenu" aria-label="Mobile">'
  +'<a href="../work.html">Work</a>'
  +'<a href="../services.html">Services</a>'
  +'<a href="../notes.html">Notes</a>'
  +'<a href="../about.html">About</a>'
  +'<a href="../contact.html">Contact</a>'
  +'<div class="mm-foot"><button id="themeToggleM" class="toggle" style="align-self:flex-start" aria-label="Toggle theme"><span aria-hidden="true">◐</span> <span class="tlm">Light</span></button>'
  +'<span>Tel Aviv, IL · Worldwide</span></div>'
  +'</nav>';
  var ftr = ''
  +'<footer class="site"><div class="wrap"><div class="grid">'
  +'<div class="col"><h4>Menu</h4><a href="../work.html">Work</a><a href="../services.html">Services</a><a href="../notes.html">Notes</a><a href="../about.html">About</a><a href="../contact.html">Contact</a></div>'
  +'<div class="col"><h4>Connect</h4><a href="mailto:itaiagami@gmail.com">Email</a><a href="https://www.linkedin.com/in/itai-agami-237353189/" target="_blank" rel="noopener">LinkedIn</a><a href="/assets/docs/Itai_Agami_CV.pdf" target="_blank" rel="noopener">CV</a></div>'
  +'<div class="col"><h4>Studio</h4><a href="../about.html">Tel Aviv, IL</a><a href="../about.html">Working worldwide</a></div>'
  +'</div><div class="base">'
  +'<span>© 2026 Itai Agami. All rights reserved.</span>'
  +'<span class="legal"><a href="../privacy.html">Privacy</a><button type="button" data-consent-open>Privacy settings</button></span>'
  +'<span>Independent Creative Director</span>'
  +'</div></div></footer>';
  document.body.insertAdjacentHTML('afterbegin', hdr);
  document.body.insertAdjacentHTML('beforeend', ftr);
})();

/* ---------- first-touch attribution (no cookies) ----------
   Records how this visit started — campaign parameters, the page they landed
   on and the external referrer — so an enquiry can say where it came from.
   First touch wins: later internal navigation never overwrites it. Nothing
   leaves the browser unless the visitor sends the contact form.

   Scope: the tab session (sessionStorage). Only if the visitor accepts
   analytics is a non-direct first touch also kept for ATTR_DAYS in
   localStorage, so someone who found the site via ChatGPT and comes back
   direct a week later to enquire is still credited to ChatGPT. Rejecting
   analytics deletes that copy. GA4's own attribution is not touched. */
const ATTR_KEY = 'ia-attr', ATTR_KEEP_KEY = 'ia-attr-keep', PATH_KEY = 'ia-path';
const ATTR_DAYS = 30;
function readAttribution(){
  try{ return JSON.parse(sessionStorage.getItem(ATTR_KEY) || 'null'); }catch(e){ return null; }
}
function readPagePath(){
  try{ return JSON.parse(sessionStorage.getItem(PATH_KEY) || '[]'); }catch(e){ return []; }
}
/* Readable channel for a utm_source value or a referrer URL. Order matters:
   gemini.google.com must be caught before google.* */
function classifySource(utmSource, referrer){
  const RULES = [
    [/chatgpt|openai/, 'ChatGPT'],
    [/perplexity/, 'Perplexity'],
    [/gemini/, 'Gemini'],
    [/claude/, 'Claude'],
    [/copilot/, 'Copilot'],
    [/(^|\.)google(\.|$)/, 'Google'],
    [/(^|\.)bing(\.|$)/, 'Bing'],
    [/linkedin|(^|\.)lnkd\.in$/, 'LinkedIn'],
    [/instagram|^ig$/, 'Instagram'],
    [/facebook|^fb$/, 'Facebook'],
    [/behance/, 'Behance']
  ];
  const match = s => { for(const [re, label] of RULES) if(re.test(s)) return label; return ''; };
  const u = String(utmSource || '').toLowerCase().trim();
  let host = '';
  try{ if(referrer) host = new URL(referrer).hostname.replace(/^www\./, ''); }catch(e){}
  if(u) return match(u) || 'Campaign: ' + utmSource;
  if(host) return match(host) || 'Referral: ' + host;
  return 'Direct';
}
(function(){
  let store;
  try{ store = sessionStorage; }catch(e){ return; }           /* private mode / blocked */
  /* pages seen this session, in order — paths only, capped */
  try{
    const path = readPagePath(), here = location.pathname;
    if(path[path.length - 1] !== here){ path.push(here); store.setItem(PATH_KEY, JSON.stringify(path.slice(-25))); }
  }catch(e){}
  if(readAttribution()) return;
  const q = new URLSearchParams(location.search);
  const ref = document.referrer || '';
  let external = ref;
  try{ if(ref && new URL(ref).host === location.host) external = ''; }catch(e){}
  let touch = {
    source:       classifySource(q.get('utm_source'), external),
    utm_source:   q.get('utm_source')   || '',
    utm_medium:   q.get('utm_medium')   || '',
    utm_campaign: q.get('utm_campaign') || '',
    utm_content:  q.get('utm_content')  || '',
    utm_term:     q.get('utm_term')     || '',
    landing_page: location.pathname + location.search,
    referrer:     external,
    first_seen:   new Date().toISOString().slice(0, 10)
  };
  /* a direct return visit inherits the kept first touch, if still in window */
  if(touch.source === 'Direct'){
    try{
      const kept = JSON.parse(localStorage.getItem(ATTR_KEEP_KEY) || 'null');
      if(kept && Date.now() - kept.ts < ATTR_DAYS * 864e5) touch = kept.touch;
    }catch(e){}
  }
  try{ store.setItem(ATTR_KEY, JSON.stringify(touch)); }catch(e){}
})();

/* ---------- consent + analytics (GA4, Microsoft Clarity) ----------
   Nothing from Google or Microsoft is requested until the visitor presses
   "Accept analytics". "Reject" means neither script is ever fetched. The
   choice is kept for CONSENT_DAYS, then asked again, and can be changed any
   time from "Privacy settings" in the footer.

   Google Consent Mode v2 (basic): consent defaults to denied for everything
   and only analytics_storage is granted after acceptance. The site runs no
   ads, so the three ad signals stay denied permanently.

   Events from anywhere in this file go through Analytics.track(name, params).
   Before a choice is made they are held for this page and sent if the visitor
   accepts; on reject they are dropped. Form contents are never passed in. */
const Analytics = (function(){
  const CONSENT_KEY = 'ia-consent', CONSENT_DAYS = 365;
  const GA_ON = /^G-[A-Z0-9]{4,}$/.test(GA_MEASUREMENT_ID) && GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX';
  const CL_ON = /^[a-z0-9]{6,}$/i.test(CLARITY_PROJECT_ID) && CLARITY_PROJECT_ID !== 'XXXXXXXXXX';

  let debug = ANALYTICS_DEBUG;
  try{
    const q = new URLSearchParams(location.search).get('analytics_debug');
    if(q === '1') localStorage.setItem('ia-debug', '1');
    if(q === '0') localStorage.removeItem('ia-debug');
    if(localStorage.getItem('ia-debug') === '1') debug = true;
  }catch(e){}
  const log = (...a) => { if(debug) console.log('%c[analytics]', 'color:#F25C05;font-weight:600', ...a); };

  function readConsent(){
    try{
      const c = JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null');
      if(c && (c.analytics === 'granted' || c.analytics === 'denied') && Date.now() - c.ts < CONSENT_DAYS * 864e5) return c.analytics;
    }catch(e){}
    return null;
  }
  function saveConsent(v){
    try{ localStorage.setItem(CONSENT_KEY, JSON.stringify({ analytics:v, ts:Date.now() })); }catch(e){}
  }

  /* first touch kept beyond the session only with consent — see attribution above */
  function keepTouch(){
    try{
      const a = readAttribution();
      if(!a || a.source === 'Direct' || localStorage.getItem(ATTR_KEEP_KEY)) return;
      localStorage.setItem(ATTR_KEEP_KEY, JSON.stringify({ ts:Date.now(), touch:a }));
    }catch(e){}
  }
  function forgetTouch(){ try{ localStorage.removeItem(ATTR_KEEP_KEY); }catch(e){} }

  let loaded = false;
  const held = [];
  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }

  function load(){
    if(loaded) return;
    loaded = true;
    keepTouch();
    const a = readAttribution() || {};
    log('consent: granted', GA_ON ? 'GA4 ' + GA_MEASUREMENT_ID : 'GA4 not configured', '·',
        CL_ON ? 'Clarity ' + CLARITY_PROJECT_ID : 'Clarity not configured');
    log('page_view', { page_path:location.pathname, page_title:document.title, lead_source:a.source || '' });

    if(GA_ON){
      window.gtag = gtag;
      gtag('consent', 'default', { ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied', analytics_storage:'denied' });
      gtag('consent', 'update', { analytics_storage:'granted' });
      gtag('js', new Date());
      /* page_view is sent by config on every page load — each page is a real document here */
      gtag('config', GA_MEASUREMENT_ID, Object.assign(
        { allow_google_signals:false, allow_ad_personalization_signals:false },
        debug ? { debug_mode:true } : {}));     /* any debug_mode value turns DebugView on, so only set it when wanted */
      const s = document.createElement('script');
      s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
      document.head.appendChild(s);
    }
    if(CL_ON){
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, 'clarity', 'script', CLARITY_PROJECT_ID);
      window.clarity('consentv2', { ad_Storage:'denied', analytics_Storage:'granted' });
      if(a.source) window.clarity('set', 'lead_source', a.source);
      if(a.landing_page) window.clarity('set', 'landing_page', a.landing_page.split('?')[0]);
    }
    held.splice(0).forEach(([n, p]) => { log(n, p, '— sent after consent'); send(n, p); });
  }

  function send(name, params){
    if(GA_ON && window.gtag) window.gtag('event', name, params);
    if(CL_ON && window.clarity) window.clarity('event', name);
  }

  function track(name, params){
    params = params || {};
    const c = readConsent();
    if(c === 'denied'){ log(name, params, '— not sent (analytics rejected)'); return; }
    if(!loaded){ held.push([name, params]); log(name, params, '— held until consent'); return; }
    log(name, params, GA_ON || CL_ON ? '' : '— no IDs configured, not sent');
    send(name, params);
  }

  /* expire the first-party cookies GA4 and Clarity set, on every domain form they could use */
  function clearCookies(){
    const host = location.hostname, parts = host.split('.');
    const domains = ['', host, '.' + host];
    if(parts.length > 2) domains.push('.' + parts.slice(-2).join('.'));
    document.cookie.split(';').forEach(c => {
      const n = c.split('=')[0].trim();
      if(!/^(_ga|_gid|_gat|_clck|_clsk|CLID)/.test(n)) return;
      domains.forEach(d => { document.cookie = n + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : ''); });
    });
  }

  function choose(v){
    const was = readConsent();
    saveConsent(v);
    hideBanner();
    if(v === 'granted'){ load(); return; }
    held.length = 0;
    forgetTouch();
    log('consent: denied — GA4 and Clarity will not load');
    if(was === 'granted' || loaded){
      /* already running on this page: switch both off, remove their cookies,
         and reload so no analytics code stays in memory */
      if(GA_ON){ window['ga-disable-' + GA_MEASUREMENT_ID] = true; gtag('consent', 'update', { analytics_storage:'denied' }); }
      if(CL_ON && window.clarity) window.clarity('consent', false);
      clearCookies();
      if(loaded) location.reload();
    }
  }

  /* ---- banner ---- */
  let banner = null;
  function hideBanner(){ if(banner){ banner.hidden = true; } }
  function showBanner(){
    if(!banner){
      const priv = location.pathname.split('/').length > 2 ? '../privacy.html' : 'privacy.html';
      banner = document.createElement('div');
      banner.className = 'consent';
      banner.setAttribute('role', 'region');
      banner.setAttribute('aria-label', 'Analytics preferences');
      banner.innerHTML = '<p>May I use Google Analytics and Microsoft Clarity to see how this site is found and used? '
        + 'Nothing loads unless you accept. <a href="' + priv + '">Privacy</a></p>'
        + '<div class="consent-actions">'
        + '<button type="button" class="btn" data-consent="denied">Reject</button>'
        + '<button type="button" class="btn" data-consent="granted">Accept analytics</button>'
        + '</div>';
      banner.addEventListener('click', e => {
        const b = e.target.closest('[data-consent]'); if(b) choose(b.dataset.consent);
      });
      document.body.appendChild(banner);
    }
    const c = readConsent();
    banner.querySelectorAll('[data-consent]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.consent === c)));
    banner.hidden = false;
  }

  document.addEventListener('click', e => {
    if(e.target.closest('[data-consent-open]')){ e.preventDefault(); showBanner(); banner.querySelector('[data-consent]').focus(); }
  });

  const c = readConsent();
  if(c === 'granted') load();
  else if(c === 'denied') log('consent: denied — GA4 and Clarity not loaded');
  else showBanner();

  return { track, debug: () => debug };
})();

/* ---------- analytics events ----------
   page_view comes from the GA4 config above. Everything here is a deliberate,
   low-volume signal on the path to an enquiry — no scroll or hover tracking. */
(function(){
  const path = location.pathname;

  /* project_view — every case study lives under /work/ */
  if(/^\/work\/[^/]+/.test(path)){
    const h = document.querySelector('.c-open h1');
    Analytics.track('project_view', {
      project_name: (h ? h.textContent : document.title.split(/ [|:] /)[0]).trim(),
      page_path: path,
      page_title: document.title
    });
  }

  /* contact_view — once, when the contact section is actually on screen */
  const contact = document.getElementById('contact');
  if(contact){
    const fire = () => { const a = readAttribution() || {};
      Analytics.track('contact_view', { page_path:path, lead_source:a.source || '' }); };
    if('IntersectionObserver' in window){
      const io = new IntersectionObserver(es => { if(es.some(e => e.isIntersecting)){ io.disconnect(); fire(); } });
      io.observe(contact);
    }else fire();
  }

  /* contact_form_start — first interaction only, not every field */
  const form = document.getElementById('enquiryForm');
  if(form){
    let started = false;
    const start = () => {
      if(started) return; started = true;
      Analytics.track('contact_form_start', { form_id:'enquiry', page_path:path });
    };
    form.addEventListener('focusin', start);
    form.addEventListener('input', start);
  }

  /* external_link_click and portfolio_cta_click — one delegated listener */
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]'); if(!a || a.hasAttribute('data-booking')) return;
    let url; try{ url = new URL(a.href, location.href); }catch(err){ return; }
    const text = (a.textContent || '').replace(/\s+/g, ' ').replace(/→/g, '').trim().slice(0, 80);
    const where = a.closest('header.site') ? 'header' : a.closest('.mobile-menu') ? 'menu'
                : a.closest('footer.site') ? 'footer' : 'content';

    if(url.protocol === 'mailto:' || url.protocol === 'tel:'){
      Analytics.track('external_link_click', { link_type: url.protocol === 'mailto:' ? 'email' : 'phone',
        link_url: url.protocol, link_text: url.protocol === 'mailto:' ? 'email' : 'phone', link_location:where });
      return;
    }
    if(!/^https?:$/.test(url.protocol)) return;
    if(url.host !== location.host){
      const h = url.hostname.replace(/^www\./, '');
      const type = /linkedin/.test(h) ? 'linkedin' : /instagram/.test(h) ? 'instagram'
                 : /behance/.test(h) ? 'behance' : /vimeo/.test(h) ? 'vimeo'
                 : /wa\.me|whatsapp/.test(h) ? 'whatsapp' : 'other';
      Analytics.track('external_link_click', { link_type:type, link_domain:h,
        link_url: type === 'whatsapp' ? url.origin : url.origin + url.pathname,   /* no phone numbers */
        link_text: type === 'whatsapp' ? 'WhatsApp' : text, link_location:where });
      return;
    }
    if(/\/contact\.html$/.test(url.pathname) && !/\/contact\.html$/.test(path)){
      Analytics.track('portfolio_cta_click', { cta_text:text, cta_location:where, page_path:path });
    }
  });
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

/* ---------- theme (paper default, dark optional, persisted) ----------
   Pages ship <html data-theme="light"> so the paper ground paints first;
   a saved 'dark' choice removes it. */
(function(){
  const root=document.documentElement;
  let saved=null; try{saved=localStorage.getItem('theme')}catch(e){}
  function apply(t){
    if(t==='light')root.setAttribute('data-theme','light');else root.removeAttribute('data-theme');
    document.querySelectorAll('.tlm').forEach(el=>el.textContent=(t==='light')?'Dark':'Light');
  }
  apply(saved==='dark'?'dark':'light');
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
  // the open menu covers the header, so it carries its own close button
  const close=document.createElement('button');
  close.type='button';close.className='mm-close';close.textContent='Close';
  close.setAttribute('aria-label','Close menu');
  menu.prepend(close);
  function set(open){
    menu.classList.toggle('open',open);
    btn.setAttribute('aria-expanded',String(open));
    btn.textContent=open?'Close':'Menu';
    document.body.classList.toggle('locked',open);
    if(open)close.focus();else if(menu.contains(document.activeElement))btn.focus();
  }
  btn.addEventListener('click',()=>set(!menu.classList.contains('open')));
  close.addEventListener('click',()=>set(false));
  addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.classList.contains('open'))set(false);});
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>set(false)));
})();

/* ---------- border beam on primary CTAs (styles in site.css) ---------- */
document.querySelectorAll('.btn.solid').forEach(b=>{
  b.setAttribute('data-beam','cta'); b.setAttribute('data-active','');
  const bloom=document.createElement('span'); bloom.setAttribute('data-beam-bloom',''); bloom.setAttribute('aria-hidden','true');
  b.appendChild(bloom);
});

/* ---------- Hairline figures (home hero, services) ----------
   Hairline engine (@lucasmarkes/hairline, js/vendor/hairline-kernel.js).
   Each figure, js/hairline-<name>.js, loads as a module and calls
   window.hairline() once; this mounts it into the element marked
   data-hairline-host="<name>". Figures sleep offscreen and land at once
   under reduced motion on their own.

   A figure inside a link (the services list) or a [data-hairline-row]
   (the home services grid) also answers the whole row:
   moving across the row scrubs the pointer across the figure, leaving the
   row lets it go. */
(function(){
  const HL=window.HL;
  if(!HL||!document.querySelector('[data-hairline-host]'))return;
  window.hairline=fig=>{
    const host=document.querySelector('[data-hairline-host="'+fig.name+'"]');
    if(!host||host.firstChild)return;
    HL.inject(document);
    const stage=document.createElement('div');
    stage.setAttribute('data-hairline',fig.name);
    host.appendChild(stage);
    const svg=HL.mk('svg',{viewBox:'0 0 400 320','aria-hidden':'true'},stage);
    let text='';
    const read={get textContent(){return text;},set textContent(v){text=v==null?'':String(v);}};
    fig.mount({stage,svg,read},fig.range[1]);
    requestAnimationFrame(()=>host.classList.add('ready'));

    const row=host.closest('a,[data-hairline-row]');
    if(!row)return;
    const send=(type,x,y)=>stage.dispatchEvent(new PointerEvent(type,{pointerType:'mouse',pointerId:1,clientX:x,clientY:y}));
    row.addEventListener('pointermove',e=>{
      if(e.pointerType!=='mouse'||stage.contains(e.target))return;
      const r=row.getBoundingClientRect(), s=stage.getBoundingClientRect();
      const f=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width));
      send('pointermove',s.left+s.width*(.2+.6*f),s.top+s.height*.5);
    });
    row.addEventListener('pointerleave',e=>{ if(e.pointerType==='mouse')send('pointerleave',0,0); });
  };
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

/* ---------- scroll reveals ----------
   Reveals start just before a block enters the screen, so content is already
   arriving as it scrolls in rather than waiting on an empty space. */
(function(){
  const els=[...document.querySelectorAll('.obs')]; if(!els.length)return;
  function check(){
    els.forEach(el=>{
      if(el.classList.contains('in'))return;
      const r=el.getBoundingClientRect();
      if(r.top<innerHeight*1.1&&r.bottom>0)el.classList.add('in');
    });
  }
  const io=new IntersectionObserver(es=>{
    es.forEach(en=>{if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target);}});
  },{threshold:0,rootMargin:'0px 0px 10% 0px'});
  els.forEach(el=>io.observe(el));
  check();
  addEventListener('scroll',check,{passive:true});
  addEventListener('load',check);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
})();

/* ---------- selected work: fetch images once the page has loaded ----------
   They stay loading="lazy" so the first paint is not slowed, but as soon as the
   page is idle they are requested anyway. Safari's lazy-load window is small,
   so without this the images arrive late on iPhone and pop in while scrolling. */
(function(){
  const imgs=[...document.querySelectorAll('.swork img[loading="lazy"]')]; if(!imgs.length)return;
  const warm=()=>imgs.forEach(img=>{ img.loading='eager'; });
  const idle=window.requestIdleCallback||(fn=>setTimeout(fn,200));
  if(document.readyState==='complete') idle(warm); else addEventListener('load',()=>idle(warm),{once:true});
})();

/* ---------- enquiry form + intro-call booking (contact page) ----------
   The form is the primary path; booking is the quieter second one. Values
   come from js/contact-config.js. Nothing here depends on analytics consent:
   every tracking call is wrapped so it can never stop a submission. */
(function(){
  const C=window.CONTACT_CONFIG||{};
  const EMAIL=C.CONTACT_EMAIL||'itaiagami@gmail.com';
  const PHONE=String(C.PHONE_NUMBER||'').trim();
  const DIGITS=PHONE.replace(/\D/g,'');
  const BOOKING=(typeof C.bookingEnabled==='function'&&C.bookingEnabled())?C.BOOKING_URL:'';
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const track=(n,p)=>{ try{ Analytics.track(n,p); }catch(e){} };
  const MAIL='<a href="mailto:'+esc(EMAIL)+'">'+esc(EMAIL)+'</a>';
  const TEL=DIGITS?'<a href="tel:+'+DIGITS+'">'+esc(PHONE)+'</a>':'';

  /* attribution for analytics — channel and campaign only, no personal data */
  function attributionParams(){
    const a=readAttribution()||{};
    let ref=''; try{ if(a.referrer) ref=new URL(a.referrer).hostname; }catch(e){}
    return { source:a.source||'', referrer:ref, utm_source:a.utm_source||'', utm_medium:a.utm_medium||'',
             utm_campaign:a.utm_campaign||'', landing_page:(a.landing_page||'').split('?')[0] };
  }

  /* booking links stay hidden until a real BOOKING_URL is configured */
  function wireBooking(root){
    root.querySelectorAll('[data-booking]').forEach(a=>{
      if(!BOOKING){ a.hidden=true; return; }
      a.href=BOOKING; a.target='_blank'; a.rel='noopener'; a.hidden=false;
    });
  }
  wireBooking(document);
  document.addEventListener('click',e=>{
    const a=e.target.closest&&e.target.closest('[data-booking]'); if(!a||!BOOKING)return;
    /* context = where the link sits: contact, after_submission, or the page's own label (home, services…) */
    const ctx=a.dataset.booking||'contact';
    const p=Object.assign({ page_path:location.pathname, booking_context:ctx },attributionParams());
    track('book_call_click',p);
    if(ctx==='contact'||ctx==='after_submission') track(ctx==='contact'?'book_call_click_from_contact':'book_call_click_after_submission',p);
  });

  /* optional direct line — only when a phone number is configured */
  const direct=document.getElementById('directContact');
  if(direct&&DIGITS){
    direct.innerHTML='Prefer to talk directly? Call or WhatsApp me: '+TEL
      +' · <a href="https://wa.me/'+DIGITS+'" target="_blank" rel="noopener">WhatsApp</a>';
    direct.hidden=false;
  }

  const form=document.getElementById('enquiryForm'); if(!form)return;
  const status=document.getElementById('formStatus');
  const btn=form.querySelector('button[type="submit"]');
  const label=btn.innerHTML;

  /* the contact page's Hairline figure (js/hairline-tray.js) writes one line on its
     card per filled field, and drops the card into its tray once sent */
  const PROGRESS=['name','email','org','type','project'];
  const progress=()=>document.dispatchEvent(new CustomEvent('enquiry:progress',{detail:{
    filled:PROGRESS.filter(n=>{const el=form.elements[n]; return el&&String(el.value||'').trim()!=='';}).length }}));
  form.addEventListener('input',progress); form.addEventListener('change',progress);

  /* contact tabs: "Book a call" (default) and "Send a brief" (the form) */
  const tabs=[...document.querySelectorAll('.c-tabs [role="tab"]')];
  function selectTab(id,focus){
    tabs.forEach(t=>{
      const on=t.id===id;
      t.setAttribute('aria-selected',on); t.tabIndex=on?0:-1;
      const panel=document.getElementById(t.getAttribute('aria-controls')); if(panel) panel.hidden=!on;
      if(on&&focus) t.focus();
    });
  }
  tabs.forEach((t,i)=>{
    t.addEventListener('click',()=>selectTab(t.id));
    t.addEventListener('keydown',e=>{
      if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft') return;
      const n=tabs[(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length]; selectTab(n.id,true);
    });
  });
  /* arriving with #brief (e.g. "Send a brief" links) opens the form */
  if(tabs.length&&(location.hash==='#brief'||location.hash==='#enquiryForm')) selectTab('tab-brief');

  /* "Start a project" — bring the form into view and put the cursor in it */
  document.querySelectorAll('[data-start-project]').forEach(a=>a.addEventListener('click',e=>{
    e.preventDefault(); if(tabs.length) selectTab('tab-brief');
    const smooth=!matchMedia('(prefers-reduced-motion: reduce)').matches;
    form.scrollIntoView({behavior:smooth?'smooth':'auto',block:'start'});
    const first=form.querySelector('input:not([type=hidden]):not([tabindex="-1"])');
    if(first) setTimeout(()=>first.focus({preventScroll:true}),smooth?450:0);
  }));

  /* carry the visit's origin into the enquiry — see first-touch attribution above.
     Run again on submit so the page list includes everything seen up to then. */
  function fillAttribution(){
    const a=readAttribution()||{};
    const vals={'f-lead-source':a.source,'f-utm-source':a.utm_source,'f-utm-medium':a.utm_medium,
                'f-utm-campaign':a.utm_campaign,'f-utm-content':a.utm_content,'f-utm-term':a.utm_term,
                'f-landing':a.landing_page,'f-referrer':a.referrer,'f-pages':readPagePath().join(', ')};
    for(const id in vals){ const el=document.getElementById(id); if(el)el.value=vals[id]||''; }
  }
  fillAttribution();

  /* The finished enquiry as an email the visitor sends themselves — offered
     whenever the server could not take it, so nothing they typed is lost. */
  function mailtoHref(d){
    const body=[
      'Name: '+(d.name||''),
      'Email: '+(d.email||''),
      'Organisation: '+(d.org||'-'),
      'Project type: '+(d.type||'-'),
      'Budget: '+(d.budget||'-'),
      'Timeline: '+(d.timeline||'-'),
      'Found via: '+(d.source||'-'),
      '','Project:',(d.project||''),
      '','--','Source: '+(d.lead_source||'-'),
      'Landing page: '+(d.landing_page||'-'),
      'Pages viewed: '+(d.pages_viewed||'-'),
      'UTM campaign: '+(d.utm_campaign||'none')
    ].join('\n');
    return 'mailto:'+EMAIL
      +'?subject='+encodeURIComponent('New enquiry - '+(d.name||'')+(d.type?' - '+d.type:''))
      +'&body='+encodeURIComponent(body);
  }

  /* Only reached after the server confirmed it holds the enquiry. */
  function showSuccess(){
    const done=document.createElement('div');
    done.className='f-success'; done.tabIndex=-1;
    done.innerHTML='<h2>Thanks, I got it.</h2>'
      +'<p>I’ll get back to you shortly.</p>'
      +(BOOKING?'<div class="f-book"><p>Want to skip the email back-and-forth? Book a 20 min intro call.</p>'
        +'<a class="btn solid" data-booking="after_submission">Book a call <span class="arw" aria-hidden="true">↗</span></a></div>':'')
      ;
    form.replaceWith(done);
    /* bring the Hairline tray into the confirmation, where the reader is looking
       (on phones it is otherwise hidden), then drop the card into it */
    const fig=document.querySelector('.c-fig');
    if(fig){ done.prepend(fig); fig.classList.add('in-success'); }
    document.dispatchEvent(new CustomEvent('enquiry:sent'));
    wireBooking(done);
    done.focus({preventScroll:true});
    const top=done.getBoundingClientRect().top;
    if(top<80||top>innerHeight*.6) done.scrollIntoView({block:'center'});
  }

  /* kind: validation | rate_limit | server | network | timeout */
  function showError(kind,msg,data,code){
    status.className='f-status err';
    if(kind==='validation'||kind==='rate_limit'){
      status.innerHTML=esc(msg)+(kind==='rate_limit'?' Or email me directly at '+MAIL+'.'
        :' If it keeps failing, email me directly at '+MAIL+'.');
      btn.innerHTML=label;
    }else{
      status.innerHTML='Something went wrong, and your message has not been sent yet. '
        +'Try again, or <a href="'+mailtoHref(data)+'">send it from your email app</a>. '
        +'You can also email me directly at '+MAIL+(TEL?', or call / WhatsApp '+TEL:'')+'.';
      btn.innerHTML='Try again <span class="arw" aria-hidden="true">→</span>';
    }
    btn.disabled=false;
    track('contact_form_error',{ form_id:'enquiry', error_type:kind, http_status:code||0, page_path:location.pathname });
  }

  let sending=false;
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(sending)return;
    if(!form.reportValidity())return;                       /* native messages, our styling */
    fillAttribution();
    const data=Object.fromEntries(new FormData(form).entries());
    sending=true; btn.disabled=true; btn.textContent='Sending…'; form.setAttribute('aria-busy','true');
    status.className='f-status'; status.textContent='';

    const ctl=new AbortController();
    const timer=setTimeout(()=>ctl.abort(),25000);          /* never leave them on "Sending…" */
    let r, j={};
    try{
      r=await fetch('/api/enquiry',{ method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify(data), signal:ctl.signal });
      j=await r.json().catch(()=>({}));
    }catch(err){
      r=null;
    }finally{
      clearTimeout(timer); sending=false; form.removeAttribute('aria-busy');
    }

    if(!r) return showError(ctl.signal.aborted?'timeout':'network','',data,0);
    if(r.ok&&j.ok===true){
      /* the main conversion — form choices and attribution only, never what they typed */
      track('contact_form_submit',Object.assign({
        form_id:'enquiry', project_type:data.type||'', budget:data.budget||'', timeline:data.timeline||'',
        self_reported_source:data.source||'', pages_viewed_count:readPagePath().length
      },attributionParams(),{ lead_source:data.lead_source||'' }));
      showSuccess();
      return;
    }
    if(r.status===429) return showError('rate_limit',j.error||'Too many messages just now. Please try again shortly.',data,429);
    if(r.status>=400&&r.status<500&&j.error&&!j.fallback) return showError('validation',j.error,data,r.status);
    showError('server','',data,r.status);
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

/* ---------- scrubbed statement ----------
   [data-scrub] paragraphs light up word by word as they cross the viewport.
   Plain text only; skipped entirely for reduced motion. */
(function(){
  const els=[...document.querySelectorAll('[data-scrub]')];
  if(!els.length||matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const words=[];
  els.forEach(el=>{
    const parts=el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label',el.textContent.trim());
    el.innerHTML=parts.map(w=>'<span class="sw" aria-hidden="true">'+w.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))+'</span>').join(' ');
    el.classList.add('scrubbing');
    words.push([...el.querySelectorAll('.sw')]);
  });
  let ticking=false;
  function paint(){
    ticking=false;
    const vh=innerHeight;
    els.forEach((el,i)=>{
      const r=el.getBoundingClientRect();
      /* 0 when the block's top reaches 85% of the viewport, 1 when its bottom reaches 45% */
      const p=Math.min(1,Math.max(0,(vh*.85-r.top)/((vh*.85-vh*.45)+r.height)));
      const lit=Math.round(p*words[i].length);
      words[i].forEach((w,j)=>w.classList.toggle('lit',j<lit));
    });
  }
  addEventListener('scroll',()=>{ if(!ticking){ticking=true;requestAnimationFrame(paint);} },{passive:true});
  addEventListener('resize',paint);
  paint();
})();
