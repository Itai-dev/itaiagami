/* ============================================================
   /nadlan — a short questionnaire for real-estate developers.
   One question a screen, then a brief built from the answers, then
   a meeting. The questions and the brief live in js/nadlan-config.js,
   which the server reads too.
   ============================================================ */
(() => {
  'use strict';
  const N = window.NADLAN, CFG = N.CONFIG, STEPS = N.STEPS;
  const TOTAL = STEPS.length + 1;                 /* five questions and the contact step */
  const KEY = 'ia-nadlan';
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if(cls) n.className = cls; if(text != null) n.textContent = text; return n; };

  /* ---------- state: memory first, sessionStorage so a refresh keeps it ---------- */
  let state = { step: 0, answers: {}, contact: {}, done: false, attr: null };
  try{
    const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if(saved && typeof saved === 'object') state = Object.assign(state, saved);
  }catch(e){}
  const save = () => { try{ sessionStorage.setItem(KEY, JSON.stringify(state)); }catch(e){} };

  /* ---------- where the visit came from: kept from the first page load ---------- */
  if(!state.attr){
    const q = new URLSearchParams(location.search), a = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'].forEach(k => { a[k] = (q.get(k) || '').slice(0, 300); });
    a.referrer = (document.referrer || '').slice(0, 300);
    a.landing_page = (location.pathname + location.search).slice(0, 300);
    state.attr = a;
    save();
  }

  /* ---------- analytics ----------
     Vercel Web Analytics (no cookies) gets every event. GA4 gets them only
     if the visitor already accepted analytics on the main site (the same
     'ia-consent' choice js/site.js keeps); nothing from Google loads otherwise.
     Every event is also pushed to dataLayer, so a tag manager added later
     picks them up. Answers and contact details are never passed in. */
  const GA_ID = 'G-NTJQ076FLS';                   /* the site's GA4 stream, as in js/site.js */
  window.va = window.va || function(){ (window.vaq = window.vaq || []).push(arguments); };
  window.dataLayer = window.dataLayer || [];
  (() => {
    const s = document.createElement('script'); s.defer = true; s.src = '/_vercel/insights/script.js'; document.head.appendChild(s);
    let ok = false;
    try{ const c = JSON.parse(localStorage.getItem('ia-consent') || 'null'); ok = !!c && c.analytics === 'granted'; }catch(e){}
    if(!ok) return;
    window.gtag = function(){ window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' });
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
    const g = document.createElement('script'); g.async = true; g.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID; document.head.appendChild(g);
  })();
  const sent = new Set();
  function track(name, once){
    if(once){ if(sent.has(name)) return; sent.add(name); }
    const p = { page_path: location.pathname, utm_source: state.attr.utm_source || '', utm_campaign: state.attr.utm_campaign || '' };
    try{ window.va('event', { name, data: p }); }catch(e){}
    window.dataLayer.push(Object.assign({ event: name }, p));
    if(window.gtag) window.gtag('event', name, p);
  }

  /* ---------- WhatsApp: a way out on every screen ---------- */
  const waOn = /^\d{9,15}$/.test(CFG.WHATSAPP_NUMBER);
  const waUrl = text => 'https://wa.me/' + CFG.WHATSAPP_NUMBER + '?text=' + encodeURIComponent(text);
  function waLink(text, label){
    const a = el('a', 'wa', label || 'וואטסאפ');
    a.href = waUrl(text); a.target = '_blank'; a.rel = 'noopener';
    a.addEventListener('click', () => track('whatsapp_click'));
    return a;
  }

  /* ---------- the panel ---------- */
  const panel = $('#panel'), bar = $('#bar'), fill = $('#fill'), label = $('#label'), foot = $('#foot');
  let dir = 1;

  function show(node){
    panel.replaceChildren(node);
    if(!calm) node.animate(
      [{ opacity: 0, transform: 'translateX(' + (-18 * dir) + 'px)' }, { opacity: 1, transform: 'none' }],
      { duration: 260, easing: 'cubic-bezier(.2,.7,.2,1)' });
    const h = $('h1, h2', node); if(h){ h.tabIndex = -1; h.focus({ preventScroll: true }); }
    window.scrollTo(0, 0);
  }
  function progress(n){
    bar.hidden = !n;
    if(!n) return;
    fill.style.width = (n / TOTAL * 100) + '%';
    label.textContent = 'שלב ' + n + ' מתוך ' + TOTAL;
    bar.setAttribute('aria-valuenow', String(n));
  }
  function go(n, back){
    dir = back ? -1 : 1;
    state.step = n; save();
    render();
  }
  const backBtn = () => { const b = el('button', 'back', 'הקודם'); b.type = 'button'; b.addEventListener('click', () => go(state.step - 1, true)); return b; };

  function render(){
    foot.replaceChildren();
    if(state.done) return result();
    const n = state.step;
    if(waOn) foot.appendChild(waLink('שלום, הגעתי מהשאלון למשווקי נדל"ן ואשמח לדבר.', 'מעדיפים וואטסאפ?'));
    if(n <= 0) return intro();
    if(n <= STEPS.length) return question(n);
    return contact();
  }

  /* 0 — intro */
  function intro(){
    progress(0);
    const s = el('section', 'screen intro');
    s.append(el('h1', '', '5 שאלות קצרות, ותקבלו תוכנית השקה לפרויקט'), el('p', 'sub', 'לוקח פחות מדקה. בסוף מתאמים שיחה.'));
    const b = el('button', 'btn', 'מתחילים'); b.type = 'button';
    b.addEventListener('click', () => { track('quiz_start'); go(1); });
    s.appendChild(b);
    show(s);
  }

  /* 1–5 — one question */
  function question(n){
    const step = STEPS[n - 1];
    progress(n);
    track('quiz_step_' + n, true);
    const s = el('section', 'screen');
    const h = el('h2', '', step.q); h.id = 'q';
    s.appendChild(h);
    const list = el('div', 'opts'); list.setAttribute('role', step.multi ? 'group' : 'radiogroup'); list.setAttribute('aria-labelledby', 'q');
    const chosen = () => step.multi ? (state.answers[step.id] || []) : state.answers[step.id];
    let next = null;
    const paint = () => {
      list.querySelectorAll('button').forEach(b => {
        const on = step.multi ? chosen().includes(b.dataset.v) : chosen() === b.dataset.v;
        b.classList.toggle('on', on);
        b.setAttribute(step.multi ? 'aria-pressed' : 'aria-checked', String(on));
      });
      if(next) next.disabled = !chosen().length;
    };
    step.options.forEach(o => {
      const b = el('button', 'opt', N.show(o)); b.type = 'button'; b.dataset.v = o;
      if(!step.multi) b.setAttribute('role', 'radio');
      b.addEventListener('click', () => {
        if(step.multi){
          let cur = chosen().slice();
          if(o === N.NOTHING) cur = cur.includes(o) ? [] : [o];          /* "nothing yet" stands alone */
          else { cur = cur.filter(x => x !== N.NOTHING); cur = cur.includes(o) ? cur.filter(x => x !== o) : cur.concat(o); }
          state.answers[step.id] = cur; save(); paint();
        }else{
          state.answers[step.id] = o; save(); paint();
          setTimeout(() => go(n + 1), calm ? 0 : 180);                   /* a beat to see the choice land */
        }
      });
      list.appendChild(b);
    });
    s.appendChild(list);
    const nav = el('div', 'nav');
    if(step.multi){
      s.insertBefore(el('p', 'hint', 'אפשר לבחור כמה תשובות'), list);
      next = el('button', 'btn', 'המשך'); next.type = 'button';
      next.addEventListener('click', () => go(n + 1));
      nav.appendChild(next);
    }
    nav.appendChild(backBtn());
    s.appendChild(nav);
    paint();
    show(s);
  }

  /* 6 — contact details */
  const FIELDS = [
    { id: 'name', label: 'שם מלא', req: true, type: 'text', auto: 'name', ok: v => v.trim().length >= 2 },
    { id: 'company', label: 'שם החברה', req: true, type: 'text', auto: 'organization', ok: v => v.trim().length >= 2 },
    { id: 'phone', label: 'טלפון', req: true, type: 'tel', auto: 'tel', mode: 'tel', ltr: true, ok: v => !!N.phone(v), err: 'מספר טלפון ישראלי, למשל 052-1234567' },
    { id: 'email', label: 'אימייל', req: false, type: 'email', auto: 'email', mode: 'email', ltr: true, ok: v => !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()), err: 'כתובת אימייל לא תקינה' },
    { id: 'city', label: 'עיר הפרויקט', req: false, type: 'text', auto: 'address-level2', ok: () => true }
  ];
  function contact(){
    progress(TOTAL);
    track('quiz_step_' + TOTAL, true);
    const c = state.contact;
    const s = el('section', 'screen');
    s.appendChild(el('h2', '', 'לאן לשלוח את התוכנית?'));
    const form = el('form', 'form'); form.noValidate = true;
    const inputs = {};
    FIELDS.forEach(f => {
      const w = el('label', 'field');
      const t = el('span', 'lab', f.label); if(!f.req) t.appendChild(el('i', '', ' (לא חובה)'));
      const i = el('input'); i.type = f.type; i.name = f.id; i.autocomplete = f.auto; i.value = c[f.id] || '';
      if(f.mode) i.inputMode = f.mode;
      if(f.ltr) i.dir = 'ltr';
      if(f.req) i.required = true;
      const e = el('span', 'err'); e.id = 'e-' + f.id; i.setAttribute('aria-describedby', e.id);
      i.addEventListener('input', () => { c[f.id] = i.value; save(); w.classList.remove('bad'); e.textContent = ''; check(); });
      /* a moment later, so the message appearing cannot move the thing being tapped */
      i.addEventListener('blur', () => setTimeout(() => { if(i.value && !f.ok(i.value)){ w.classList.add('bad'); e.textContent = f.err || ''; } }, 200));
      w.append(t, i, e); form.appendChild(w); inputs[f.id] = i;
    });
    /* honeypot: off screen, out of the tab order, never filled by a person */
    const hp = el('div', 'hp'); hp.setAttribute('aria-hidden', 'true');
    const hpi = el('input'); hpi.type = 'text'; hpi.name = 'website'; hpi.tabIndex = -1; hpi.autocomplete = 'off';
    hp.appendChild(hpi); form.appendChild(hp);

    const cw = el('label', 'consent');
    const cb = el('input'); cb.type = 'checkbox'; cb.checked = !!c.consent; cb.required = true;
    cb.addEventListener('change', () => { c.consent = cb.checked; save(); check(); });
    cw.append(cb, el('span', '', 'אני מאשר/ת שיצרו איתי קשר בנוגע לפנייה'));
    form.appendChild(cw);

    const msg = el('p', 'msg'); msg.setAttribute('role', 'alert');
    const nav = el('div', 'nav');
    const send = el('button', 'btn', 'לקבלת התוכנית'); send.type = 'submit';
    nav.append(send, backBtn());
    form.append(msg, nav);
    const valid = () => FIELDS.every(f => (f.req ? !!inputs[f.id].value.trim() : true) && f.ok(inputs[f.id].value)) && cb.checked;
    const check = () => { send.disabled = !valid(); };

    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      if(!valid() || send.disabled) return;
      send.disabled = true; send.textContent = 'שולחים…'; msg.textContent = '';
      const body = Object.assign({}, state.answers, state.attr, {
        name: inputs.name.value, company: inputs.company.value, phone: inputs.phone.value,
        email: inputs.email.value, city: inputs.city.value, consent: true, website: hpi.value
      });
      let ok = false, error = '';
      try{
        const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 20000);
        const r = await fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
        clearTimeout(t);
        const j = await r.json().catch(() => ({}));
        ok = r.ok && j.ok === true; error = j.error || '';
      }catch(e){}
      if(ok){
        track('quiz_submit');
        state.done = true; save();
        dir = 1; render();
        return;
      }
      send.textContent = 'לקבלת התוכנית'; check();
      msg.textContent = (error || 'לא הצלחנו לשלוח כרגע.') + ' התשובות שלכם נשמרו, אפשר לנסות שוב.';
      if(waOn){ msg.append(' ', waLink(summary(), 'או לשלוח בוואטסאפ')); }
    });
    s.appendChild(form);
    check();
    show(s);
  }

  /* ---------- the brief ---------- */
  const answersNow = () => Object.assign({ city: (state.contact.city || '').trim() }, state.answers);
  const summary = () => 'שלום, מילאתי את השאלון למשווקי נדל"ן.\n\n' + N.brief(answersNow()).text;

  function result(){
    progress(0);
    const b = N.brief(answersNow());
    const s = el('section', 'screen result');
    s.appendChild(el('h1', '', 'הבריף של הפרויקט שלכם'));
    const card = el('div', 'card');
    const dl = el('dl');
    b.rows.forEach(r => { const d = el('div'); d.append(el('dt', '', r[0]), el('dd', '', N.show(r[1]))); dl.appendChild(d); });
    card.appendChild(dl);
    card.appendChild(el('h2', '', 'מה חסר להשקה'));
    const ul = el('ul');
    (b.missing.length ? b.missing : ['הבסיס קיים. נבדוק יחד מה לחדד לפני ההשקה.']).forEach(m => ul.appendChild(el('li', '', m)));
    card.appendChild(ul);
    s.appendChild(card);

    const url = String(CFG.SCHEDULER_URL || '');
    if(/^https:\/\/\S+$/.test(url)){
      const open = el('button', 'btn', 'תיאום שיחת היכרות של 20 דקות'); open.type = 'button';
      const slot = el('div', 'cal'); slot.id = 'cal'; slot.hidden = true;
      open.addEventListener('click', () => { open.hidden = true; slot.hidden = false; scheduler(url, slot); slot.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' }); });
      s.append(open, slot);
    }else{
      s.appendChild(el('p', 'confirm', 'קיבלנו. נחזור אליכם תוך יום עסקים.'));
    }
    if(waOn){ const w = el('p', 'alt'); w.appendChild(waLink(summary(), 'לשלוח את הבריף בוואטסאפ')); s.appendChild(w); }
    show(s);
  }

  /* The scheduler, embedded. A completed booking fires meeting_booked. */
  function scheduler(url, slot){
    const booked = () => track('meeting_booked', true);
    let u; try{ u = new URL(url); }catch(e){ return; }
    const fallback = () => {
      const fr = el('iframe'); fr.title = 'תיאום שיחה'; fr.loading = 'lazy';
      const e = new URL(url); if(/calendly\.com$/.test(e.hostname)){ e.searchParams.set('embed_domain', location.hostname); e.searchParams.set('embed_type', 'Inline'); }
      fr.src = e.toString();
      slot.replaceChildren(fr);
    };
    if(/(^|\.)cal\.com$/.test(u.hostname)){
      /* Cal.com's own inline embed, as on the contact page (js/site.js) */
      (function(C, A, L){ let p = function(a, ar){ a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function(){ let cal = C.Cal; let ar = arguments;
        if(!cal.loaded){ cal.ns = {}; cal.q = cal.q || []; const sc = d.createElement('script'); sc.src = A; sc.onerror = fallback; d.head.appendChild(sc); cal.loaded = true; }
        if(ar[0] === L){ const api = function(){ p(api, arguments); }; const ns = ar[1]; api.q = api.q || [];
          if(typeof ns === 'string'){ cal.ns[ns] = cal.ns[ns] || api; p(cal.ns[ns], ar); p(cal, ['initNamespace', ns]); } else p(cal, ar); return; }
        p(cal, ar); }; })(window, 'https://app.cal.com/embed/embed.js', 'init');
      window.Cal('init', 'nadlan', { origin: 'https://cal.com' });
      window.Cal.ns.nadlan('inline', { elementOrSelector: '#cal', calLink: u.pathname.replace(/^\/+|\/+$/g, ''),
        config: { layout: 'month_view', name: (state.contact.name || '').trim(), email: (state.contact.email || '').trim() } });
      window.Cal.ns.nadlan('ui', { hideEventTypeDetails: false, layout: 'month_view' });
      window.Cal.ns.nadlan('on', { action: 'bookingSuccessful', callback: booked });
      return;
    }
    fallback();
    /* Calendly announces a booking to the page that embeds it */
    window.addEventListener('message', e => {
      if(/calendly\.com$/.test(new URL(e.origin).hostname) && e.data && e.data.event === 'calendly.event_scheduled') booked();
    });
  }

  render();
})();
