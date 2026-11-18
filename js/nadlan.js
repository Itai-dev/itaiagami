/* ============================================================
   /nadlan — a short questionnaire for real-estate developers.

   An opening card, one question a screen with a ruler for progress and
   a brief that fills in as you answer, then a finish: the brief is
   stamped and becomes a thank-you document with a calendar under it.

   The questions and the brief rules live in js/nadlan-config.js, which
   the server reads too.
   ============================================================ */
(() => {
  'use strict';
  const N = window.NADLAN, CFG = N.CONFIG, STEPS = N.STEPS;
  const TOTAL = STEPS.length + 1;                 /* five questions and the contact step */
  const KEY = 'ia-nadlan';
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE = 'cubic-bezier(.2,.7,.2,1)', SNAP = 'cubic-bezier(.7,0,.2,1)';
  const $ = (s, r) => (r || document).querySelector(s);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if(cls) n.className = cls; if(text != null) n.textContent = text; return n; };
  const anim = (node, frames, opts) => calm || !node.animate ? null : node.animate(frames, Object.assign({ easing: EASE, fill: 'both' }, opts));
  const wait = ms => new Promise(r => setTimeout(r, calm ? 0 : ms));

  /* ---------- line icons, one per question ---------- */
  const ICONS = {
    brief:    ['M13 6h17l8 8v28H13z', 'M30 6v8h8', 'M18 22h15', 'M18 28h15', 'M18 34h9'],
    type:     ['M6 42h36', 'M14 42V8h20v34', 'M19 14h3', 'M26 14h3', 'M19 21h3', 'M26 21h3', 'M19 28h3', 'M26 28h3', 'M22 42v-6h4v6'],
    units:    ['M8 9h32v32H8z', 'M8 19.7h32', 'M8 30.3h32', 'M18.7 9v32', 'M29.3 9v32'],
    stage:    ['M11 42V7', 'M6 42h11', 'M11 7h30', 'M11 7l7-3', 'M34 7v11', 'M31 18h6v5h-6z', 'M23 42V31h13v11', 'M27 36h5'],
    has:      ['M8 9h6v6H8z', 'M8 20h6v6H8z', 'M8 31h6v6H8z', 'M19 12h21', 'M19 23h21', 'M19 34h14', 'M9.5 22.8l1.8 1.8 3.4-3.8'],
    timeline: ['M8 12h32v28H8z', 'M8 20h32', 'M16 8v8', 'M32 8v8', 'M14 27h4', 'M22 27h4', 'M30 27h4', 'M14 33h4', 'M22 33h4'],
    contact:  ['M6 13h36v24H6z', 'M6 13l18 14 18-14']
  };
  function icon(name, cls){
    const NS = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 48 48'); s.setAttribute('class', 'ico ' + (cls || '')); s.setAttribute('aria-hidden', 'true');
    ICONS[name].forEach(d => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); s.appendChild(p); });
    return s;
  }
  /* draw an icon's strokes in, one after another */
  function draw(svg, delay, ms){
    if(calm) return;
    svg.querySelectorAll('path').forEach((p, i, all) => {
      const len = p.getTotalLength ? p.getTotalLength() : 60;
      p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
      p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
        { duration: ms || 420, delay: (delay || 0) + i * ((ms || 420) / all.length) * .6, easing: EASE, fill: 'forwards' });
    });
  }
  const STEP_ICON = STEPS.map(s => s.id).concat('contact');

  /* and one for every answer, in the order the options are listed */
  Object.assign(ICONS, {
    boutique: ['M8 42h32', 'M14 42V16h20v26', 'M14 16l10-8 10 8', 'M19 22h3', 'M26 22h3', 'M19 29h3', 'M26 29h3', 'M22 42v-6h4v6'],
    tower:    ['M8 42h32', 'M17 42V4h14v38', 'M21 10h2', 'M25 10h2', 'M21 16h2', 'M25 16h2', 'M21 22h2', 'M25 22h2', 'M21 28h2', 'M25 28h2', 'M22 42v-5h4v5'],
    renewal:  ['M6 42h36', 'M9 42V26h12v16', 'M27 42V10h12v32', 'M13 31h4', 'M31 16h4', 'M31 23h4', 'M31 30h4', 'M12 18c2-6 8-9 13-7', 'M22 8l3 3-3 3'],
    villa:    ['M6 42h36', 'M10 42V24', 'M38 42V24', 'M6 26L24 10l18 16', 'M20 42v-9h8v9', 'M31 30h4'],
    other:    ['M24 14v20', 'M14 24h20'],
    u1:       ['M8 40h32', 'M12 40v-8h6v8'],
    u2:       ['M8 40h32', 'M12 40v-8h6v8', 'M21 40V26h6v14'],
    u3:       ['M8 40h32', 'M12 40v-8h6v8', 'M21 40V26h6v14', 'M30 40V18h6v22'],
    u4:       ['M8 40h32', 'M12 40v-8h6v8', 'M21 40V26h6v14', 'M30 40V18h6v22', 'M33 18V9'],
    permitNo: ['M13 6h17l8 8v28H13z', 'M30 6v8h8', 'M18 22h15', 'M18 28h10', 'M28 38l9-9 3 3-9 9h-3z'],
    permit:   ['M13 6h17l8 8v28H13z', 'M30 6v8h8', 'M18 20h15', 'M18 26h10', 'M25 34a5 5 0 1 0 10 0a5 5 0 1 0 -10 0', 'M28 34l1.5 1.5 3-3'],
    selling:  ['M8 20v8h6l14 8V12l-14 8z', 'M14 28l3 10h4l-2-10', 'M34 18c2 2 2 10 0 12', 'M38 15c4 4 4 14 0 18'],
    building: ['M10 42V7', 'M6 42h9', 'M10 7h26', 'M30 7v8', 'M22 42V20h16v22', 'M26 26h3', 'M33 26h1', 'M26 32h3', 'M33 32h1', 'M18 42h24'],
    brand:    ['M8 22V8h14l18 18-14 14z', 'M14 14a2 2 0 1 0 0.1 0'],
    render:   ['M6 10h36v28H6z', 'M6 32l11-11 9 9 5-5 11 11', 'M30 18a3 3 0 1 0 0.1 0'],
    web:      ['M6 9h36v30H6z', 'M6 16h36', 'M10 12.5h1', 'M14 12.5h1', 'M12 22h14', 'M12 27h24', 'M12 32h18'],
    film:     ['M6 12h36v24H6z', 'M21 19v10l8-5z'],
    campaign: ['M8 38l10-10 7 6 15-16', 'M32 18h8v8'],
    nothing:  ['M10 24a14 14 0 1 0 28 0a14 14 0 1 0 -28 0', 'M14 34l20-20'],
    now:      ['M27 4L11 27h12l-3 17 17-24H25z'],
    m13:      ['M8 24a16 16 0 1 0 32 0a16 16 0 1 0 -32 0', 'M24 14v10l6 4'],
    m36:      ['M8 24a16 16 0 1 0 32 0a16 16 0 1 0 -32 0', 'M24 14v10l-7 7'],
    unknown:  ['M17 17a7 7 0 1 1 9 6.7c-1.5.6-2 1.5-2 3.3v2', 'M24 36v1']
  });
  const OPTION_ICONS = {
    type: ['boutique', 'tower', 'renewal', 'villa', 'other'],
    units: ['u1', 'u2', 'u3', 'u4'],
    stage: ['permitNo', 'permit', 'selling', 'building'],
    has: ['brand', 'render', 'web', 'film', 'campaign', 'nothing'],
    timeline: ['now', 'm13', 'm36', 'unknown']
  };

  /* ---------- state: memory first, sessionStorage so a refresh keeps it ---------- */
  let state = { step: 0, answers: {}, contact: {}, done: false, attr: null, no: '' };
  try{
    const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if(saved && typeof saved === 'object') state = Object.assign(state, saved);
  }catch(e){}
  const save = () => { try{ sessionStorage.setItem(KEY, JSON.stringify(state)); }catch(e){} };
  /* a document number for this brief: the date and four random digits */
  if(!state.no){
    const d = new Date();
    state.no = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + String(Math.floor(1000 + Math.random() * 9000));
  }

  /* ---------- where the visit came from: kept from the first page load ---------- */
  if(!state.attr){
    const q = new URLSearchParams(location.search), a = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'].forEach(k => { a[k] = (q.get(k) || '').slice(0, 300); });
    a.referrer = (document.referrer || '').slice(0, 300);
    a.landing_page = (location.pathname + location.search).slice(0, 300);
    state.attr = a;
  }
  save();

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
  function waLink(text, label){
    const a = el('a', 'wa', label || 'וואטסאפ');
    a.href = 'https://wa.me/' + CFG.WHATSAPP_NUMBER + '?text=' + encodeURIComponent(text);
    a.target = '_blank'; a.rel = 'noopener';
    a.addEventListener('click', () => track('whatsapp_click'));
    return a;
  }

  /* ---------- the page's fixed parts ---------- */
  const stage = $('#stage'), dock = $('#dock'), foot = $('#foot');
  let dir = 1;

  /* the ruler: six steps, each a long tick and four short ones, numbered */
  const ruler = el('div', 'ruler'); ruler.setAttribute('role', 'progressbar');
  ruler.setAttribute('aria-valuemin', '1'); ruler.setAttribute('aria-valuemax', String(TOTAL));
  const scale = el('div', 'scale'), nums = el('div', 'nums'), meta = el('div', 'rmeta');
  for(let i = 1; i <= TOTAL; i++){
    const seg = el('div', 'seg'); seg.dataset.n = i;
    for(let t = 0; t < 5; t++) seg.appendChild(el('i', t ? '' : 'major'));
    scale.appendChild(seg);
    nums.appendChild(el('span', '', String(i).padStart(2, '0')));
  }
  const stepLabel = el('span', 'step'), stepNo = el('span', 'mono');
  stepLabel.id = 'steplabel'; ruler.setAttribute('aria-labelledby', 'steplabel');
  meta.append(stepLabel, stepNo);
  ruler.append(nums, scale, meta);

  /* the brief, filling in as you answer: one slot per question */
  const mini = el('div', 'mini');
  const miniHead = el('div', 'mini-head');
  miniHead.append(el('span', '', 'הבריף שלכם'), el('span', 'mono', 'NO. ' + state.no));
  const slots = el('div', 'slots');
  STEPS.forEach(s => { const b = el('span', 'slot'); b.dataset.id = s.id; b.appendChild(icon(s.id)); slots.appendChild(b); });
  mini.append(miniHead, slots, el('span', 'mini-sub', 'מתמלא תוך כדי'));

  const head = el('div', 'qhead'); head.append(ruler, mini);
  function paintHead(n){
    const show = n >= 1 && !state.done;
    if(!show){ head.remove(); return; }
    if(!head.isConnected) stage.before(head);
    stepLabel.textContent = 'שלב ' + n + ' מתוך ' + TOTAL;
    stepNo.textContent = String(n).padStart(2, '0') + ' / ' + String(TOTAL).padStart(2, '0');
    ruler.setAttribute('aria-valuenow', String(n));
    scale.querySelectorAll('.seg').forEach(s => { const k = +s.dataset.n; s.classList.toggle('done', k < n); s.classList.toggle('now', k === n); });
    nums.querySelectorAll('span').forEach((s, i) => s.classList.toggle('now', i + 1 === n));
    slots.querySelectorAll('.slot').forEach(s => {
      const v = state.answers[s.dataset.id], full = Array.isArray(v) ? v.length > 0 : !!v;
      if(full && !s.classList.contains('full')){ s.classList.add('full'); anim(s, [{ transform: 'scale(.7)' }, { transform: 'scale(1.08)' }, { transform: 'none' }], { duration: 320 }); }
      if(!full) s.classList.remove('full');
      s.title = full ? N.show([].concat(v).join(', ')) : '';
    });
  }

  /* ---------- moving between screens ---------- */
  function show(node){
    const old = stage.firstElementChild;
    const enter = () => {
      stage.replaceChildren(node);
      anim(node, [{ opacity: 0, transform: 'translateX(' + (-24 * dir) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 280 });
      const h = $('h1, h2', node); if(h){ h.tabIndex = -1; h.focus({ preventScroll: true }); }
      window.scrollTo(0, 0);
    };
    const out = old && anim(old, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(' + (24 * dir) + 'px)' }], { duration: 140, easing: SNAP });
    if(out) out.finished.then(enter, enter); else enter();
  }
  function go(n, back){
    dir = back ? -1 : 1;
    state.step = n; save();
    render();
  }
  function backBtn(){
    const b = el('button', 'back', 'הקודם'); b.type = 'button';
    b.addEventListener('click', () => go(state.step - 1, true));
    return b;
  }
  /* the action bar at the foot of the screen; stays put on a phone */
  function setDock(items){
    dock.replaceChildren(...items);
    dock.hidden = !items.length;
    document.body.classList.toggle('docked', items.length > 0);
  }

  function render(){
    foot.replaceChildren();
    if(state.done) return result(false);
    const n = state.step;
    paintHead(n);
    if(waOn) foot.appendChild(waLink('שלום, הגעתי מהשאלון למשווקי נדל"ן ואשמח לדבר.', 'מעדיפים וואטסאפ?'));
    if(n <= 0) return intro();
    if(n <= STEPS.length) return question(n);
    return contact();
  }

  /* ---------- 0 — the opening card ---------- */
  function intro(){
    setDock([]);
    const s = el('section', 'screen intro');
    const card = el('div', 'doc opening');
    const top = el('div', 'doc-top');
    top.append(el('span', 'mono', 'ITAI AGAMI'), el('span', 'mono', 'NO. ' + state.no));
    const ico = icon('brief', 'big');
    const t = el('h1');
    ['5 שאלות קצרות,', 'ותקבלו תוכנית', 'השקה לפרויקט'].forEach(line => { const m = el('span', 'line'); m.appendChild(el('span', '', line)); t.appendChild(m); });
    const sub = el('p', 'sub', 'לוקח פחות מדקה. בסוף מתאמים שיחה.');
    const bottom = el('div', 'doc-bottom');
    bottom.append(el('span', 'mono', 'PROJECT LAUNCH BRIEF'), el('span', 'mono', 'REAL ESTATE'));
    card.append(top, ico, t, sub, bottom);
    const b = el('button', 'btn go', 'מתחילים'); b.type = 'button';
    b.addEventListener('click', async () => {
      track('quiz_start');
      b.disabled = true;
      /* the card lifts away, the first question comes in */
      const a = anim(card, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-36px) rotate(-2deg) scale(.94)', opacity: 0 }], { duration: 260, easing: SNAP });
      anim(b, [{ opacity: 1 }, { opacity: 0 }], { duration: 160 });
      if(a) await a.finished;
      go(1);
    });
    s.append(card, b);
    stage.replaceChildren(s);
    /* the opening: the card settles, the icon draws itself, the title rises line by line */
    anim(card, [{ opacity: 0, transform: 'translateY(28px) rotate(1.5deg) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 520 });
    draw(ico, 180, 520);
    t.querySelectorAll('.line > span').forEach((l, i) => anim(l, [{ transform: 'translateY(105%)' }, { transform: 'none' }], { duration: 520, delay: 260 + i * 70 }));
    [sub, top, bottom].forEach((x, i) => anim(x, [{ opacity: 0 }, { opacity: 1 }], { duration: 360, delay: 520 + i * 60 }));
    anim(b, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay: 640 });
  }

  /* ---------- 1–5 — one question a screen ---------- */
  function question(n){
    const step = STEPS[n - 1];
    track('quiz_step_' + n, true);
    const s = el('section', 'screen');
    const ico = icon(STEP_ICON[n - 1], 'q-ico');
    const h = el('h2', '', step.q); h.id = 'q';
    s.append(ico, h);
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
      paintHead(n);
    };
    step.options.forEach((o, i) => {
      const b = el('button', 'opt'); b.type = 'button'; b.dataset.v = o;
      const oi = (OPTION_ICONS[step.id] || [])[i];
      const k = el('span', 'k'); k.appendChild(oi ? icon(oi) : el('span', 'mono', String.fromCharCode(65 + i)));
      b.append(k, el('span', 't', N.show(o)), el('span', 'tick'));
      if(!step.multi) b.setAttribute('role', 'radio');
      b.addEventListener('click', () => {
        if(step.multi){
          let cur = chosen().slice();
          if(o === N.NOTHING) cur = cur.includes(o) ? [] : [o];          /* "nothing yet" stands alone */
          else { cur = cur.filter(x => x !== N.NOTHING); cur = cur.includes(o) ? cur.filter(x => x !== o) : cur.concat(o); }
          state.answers[step.id] = cur; save(); paint();
        }else{
          state.answers[step.id] = o; save(); paint();
          anim(b, [{ transform: 'scale(.985)' }, { transform: 'none' }], { duration: 180 });
          setTimeout(() => go(n + 1), calm ? 0 : 220);                   /* a beat to see the choice land */
        }
      });
      list.appendChild(b);
    });
    if(step.multi) s.appendChild(el('p', 'hint', 'אפשר לבחור כמה תשובות'));
    s.appendChild(list);
    const items = [];
    if(step.multi){
      next = el('button', 'btn', 'המשך'); next.type = 'button';
      next.addEventListener('click', () => go(n + 1));
      items.push(next);
    }
    items.push(backBtn(), el('span', 'dock-note', 'פחות מדקה'));
    setDock(items);
    paint();
    show(s);
    draw(ico, 120, 480);
    list.querySelectorAll('.opt').forEach((b, i) => {
      anim(b, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 120 + i * 40 });
      const k = b.querySelector('.k .ico'); if(k) draw(k, 200 + i * 50, 380);
    });
  }

  /* ---------- 6 — contact details ---------- */
  const FIELDS = [
    { id: 'name', label: 'שם מלא', req: true, type: 'text', auto: 'name', ok: v => v.trim().length >= 2 },
    { id: 'company', label: 'שם החברה', req: true, type: 'text', auto: 'organization', ok: v => v.trim().length >= 2 },
    { id: 'phone', label: 'טלפון', req: true, type: 'tel', auto: 'tel', mode: 'tel', ltr: true, ok: v => !!N.phone(v), err: 'מספר טלפון ישראלי, למשל 052-1234567' },
    { id: 'email', label: 'אימייל', req: false, type: 'email', auto: 'email', mode: 'email', ltr: true, ok: v => !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()), err: 'כתובת אימייל לא תקינה' },
    { id: 'city', label: 'עיר הפרויקט', req: false, type: 'text', auto: 'address-level2', ok: () => true }
  ];
  function contact(){
    track('quiz_step_' + TOTAL, true);
    const c = state.contact;
    const s = el('section', 'screen');
    const ico = icon('contact', 'q-ico');
    s.append(ico, el('h2', '', 'לאן לשלוח את התוכנית?'));
    const form = el('form', 'form'); form.noValidate = true; form.id = 'leadform';
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
    form.appendChild(msg);

    const send = el('button', 'btn', 'לקבלת התוכנית'); send.type = 'submit'; send.setAttribute('form', 'leadform');
    const valid = () => FIELDS.every(f => (f.req ? !!inputs[f.id].value.trim() : true) && f.ok(inputs[f.id].value)) && cb.checked;
    const check = () => { send.disabled = !valid(); };

    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      if(!valid() || send.disabled) return;
      send.disabled = true; send.classList.add('busy'); send.textContent = 'שולחים…'; msg.textContent = '';
      const body = Object.assign({}, state.answers, state.attr, {
        name: inputs.name.value, company: inputs.company.value, phone: inputs.phone.value,
        email: inputs.email.value, city: inputs.city.value, consent: true, website: hpi.value, ref: state.no
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
        result(true);
        return;
      }
      send.classList.remove('busy'); send.textContent = 'לקבלת התוכנית'; check();
      msg.textContent = (error || 'לא הצלחנו לשלוח כרגע.') + ' התשובות שלכם נשמרו, אפשר לנסות שוב.';
      if(waOn) msg.append(' ', waLink(summary(), 'או לשלוח בוואטסאפ'));
    });
    s.appendChild(form);
    setDock([send, backBtn()]);
    check();
    show(s);
    draw(ico, 120, 480);
  }

  /* ---------- the brief ---------- */
  const answersNow = () => Object.assign({ city: (state.contact.city || '').trim() }, state.answers);
  const summary = () => 'שלום, מילאתי את השאלון למשווקי נדל"ן.\n\n' + N.brief(answersNow()).text;
  const today = () => { const d = new Date(); return [d.getDate(), d.getMonth() + 1, d.getFullYear()].map(x => String(x).padStart(2, '0')).join('.'); };

  /* ---------- the finish: the brief is stamped, then becomes a thank-you document ---------- */
  async function result(play){
    head.remove(); setDock([]); foot.replaceChildren();
    const b = N.brief(answersNow());
    const first = (state.contact.name || '').trim().split(/\s+/)[0] || '';
    const s = el('section', 'screen result');

    const doc = el('article', 'doc thanks');
    const top = el('div', 'doc-top');
    top.append(el('span', 'mono', 'PROJECT BRIEF'), el('span', 'mono', 'NO. ' + state.no));
    const greet = el('h1', '', first ? 'תודה, ' + first + '.' : 'תודה.');
    const note = el('p', 'sub', 'הבריף של הפרויקט שלכם נשלח אלינו. נעבור עליו ונחזור אליכם תוך יום עסקים.');
    const dl = el('dl');
    b.rows.forEach(r => { const d = el('div', 'row'); d.append(el('dt', '', r[0]), el('dd', '', N.show(r[1]))); dl.appendChild(d); });
    const mh = el('h2', '', 'מה חסר להשקה');
    const ul = el('ul');
    (b.missing.length ? b.missing : ['הבסיס קיים. נבדוק יחד מה לחדד לפני ההשקה.']).forEach(m => ul.appendChild(el('li', '', m)));
    const sign = el('div', 'doc-bottom');
    sign.append(el('span', 'mono', today()), el('span', 'sig', 'איתי אגמי'));
    const stamp = el('div', 'stamp'); stamp.setAttribute('aria-hidden', 'true');
    stamp.append(el('span', 'mono', 'RECEIVED'), el('b', '', 'התקבל'), el('span', 'mono', state.no));
    doc.append(top, greet, note, dl, mh, ul, sign, stamp);
    s.appendChild(doc);

    const cta = el('div', 'cta');
    const url = String(CFG.SCHEDULER_URL || '');
    if(/^https:\/\/\S+$/.test(url)){
      const open = el('button', 'btn', 'תיאום שיחת היכרות של 20 דקות'); open.type = 'button';
      const slot = el('div', 'cal'); slot.id = 'cal'; slot.hidden = true;
      open.addEventListener('click', () => { open.hidden = true; slot.hidden = false; scheduler(url, slot); slot.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' }); });
      cta.append(open, slot);
    }else{
      cta.appendChild(el('p', 'confirm', 'נחזור אליכם תוך יום עסקים.'));
    }
    if(waOn){ const w = el('p', 'alt'); w.appendChild(waLink(summary(), 'לשלוח את הבריף בוואטסאפ')); cta.appendChild(w); }
    s.appendChild(cta);

    stage.replaceChildren(s);
    window.scrollTo(0, 0);
    const h = greet; h.tabIndex = -1; h.focus({ preventScroll: true });
    if(!play || calm) return;

    /* the document rises, its lines write in, the stamp lands, and only then the next step appears */
    [greet, note, mh, sign].forEach(x => x.style.opacity = 0);
    stamp.style.opacity = 0; cta.style.opacity = 0;
    const rows = [...dl.children, ...ul.children];
    rows.forEach(r => r.style.opacity = 0);
    await anim(doc, [{ opacity: 0, transform: 'translateY(40px) rotate(-1.5deg) scale(.95)' }, { opacity: 1, transform: 'none' }], { duration: 480 }).finished;
    rows.forEach((r, i) => anim(r, [{ opacity: 0, transform: 'translateX(-10px)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: i * 55 }));
    anim(mh, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: b.rows.length * 55 });
    await wait(rows.length * 55 + 200);
    anim(stamp, [
      { opacity: 0, transform: 'rotate(-14deg) scale(2.4)' },
      { opacity: 1, transform: 'rotate(-10deg) scale(.92)', offset: .7 },
      { opacity: 1, transform: 'rotate(-10deg) scale(1)' }], { duration: 380, easing: 'cubic-bezier(.5,0,.75,0)' });
    await wait(270);
    anim(doc, [{ transform: 'none' }, { transform: 'translateY(3px) scale(.995)' }, { transform: 'none' }], { duration: 220 });
    if(navigator.vibrate) try{ navigator.vibrate(12); }catch(e){}
    await wait(260);
    [greet, note, sign].forEach((x, i) => anim(x, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay: i * 80 }));
    anim(cta, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 260 });
    if(waOn) foot.replaceChildren();
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
      let host = ''; try{ host = new URL(e.origin).hostname; }catch(x){}
      if(/calendly\.com$/.test(host) && e.data && e.data.event === 'calendly.event_scheduled') booked();
    });
  }

  render();
})();
