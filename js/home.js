/* ============================================================
   itaiagami.com — the one screen (see css/home.css).
   Reads /api/cms (Sanity) and draws: the strip, the service filters,
   the case study each tile opens into, and the info text.
   No dependencies.
   ============================================================ */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if(cls) n.className = cls; if(text != null) n.textContent = text; return n; };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad = n => String(n).padStart(2, '0');
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const EASE = 'cubic-bezier(.7,0,.2,1)';

  const stage = $('#stage'), strip = $('#strip'), cap = $('#cap'), caseEl = $('#case'), infoEl = $('#info');
  const back = $('.back'), filtersEl = $('.filters'), count = $('#count');

  let data, all = [], list = [], filter = '';
  let pos = 0, target = 0, raf = 0, M = {};
  let view = null;          /* null (the strip) | a case | 'info' */
  let depth = 0;            /* history entries this page pushed */
  let busy = false;

  /* ---------- images ---------- */
  /* a Sanity image or a Mux film frame, at the width asked for */
  const px = (o, w) => o.mux
    ? 'https://image.mux.com/' + o.mux + '/thumbnail.webp?width=' + clamp(Math.round(w), 160, 1920)
    : o.src + '?w=' + Math.round(clamp(w, 160, o.w)) + '&auto=format&q=80';
  /* the width a source needs to cover a box */
  const cover = (o, w, h) => Math.max(w, h * o.w / o.h) * DPR;

  /* ---------- the strip ---------- */
  function measure(){
    const vw = innerWidth, vh = innerHeight, small = vw <= 760;
    const H = Math.round(small ? Math.min(vh * .4, vw * .62 / .75) : Math.min(vh * .42, 560));
    M = { vw, vh, small, H, W: Math.round(H * .75), s0: small ? .44 : .46, gap: small ? 6 : 10 };
    for(const c of all) if(c.el){ c.el.style.width = M.W + 'px'; c.el.style.height = M.H + 'px'; }
  }

  function layout(){
    const n = list.length;
    if(!n) return;
    const xs = [], ws = [], sc = [];
    let x = 0;
    for(let i = 0; i < n; i++){
      const t = clamp(1 - Math.abs(i - pos), 0, 1);
      const e = t * t * (3 - 2 * t);
      sc[i] = M.s0 + (1 - M.s0) * e;
      ws[i] = M.W * sc[i];
      xs[i] = x;
      x += ws[i] + M.gap;
    }
    const total = x - M.gap;
    const i0 = clamp(Math.floor(pos), 0, n - 1), i1 = Math.min(n - 1, i0 + 1), f = pos - i0;
    const c0 = xs[i0] + ws[i0] / 2, c1 = xs[i1] + ws[i1] / 2;
    const centre = c0 + (c1 - c0) * f;
    let off;
    if(total <= M.vw * .8) off = (M.vw - total) / 2;
    else {
      /* the focus drifts from the left third to the right third as you go,
         so neither end leaves the screen empty */
      const t = n > 1 ? pos / (n - 1) : 0;
      const a = M.small ? .5 : .3 + .4 * t;
      off = M.vw * a - centre;
    }
    for(let i = 0; i < n; i++){
      list[i].el.style.transform = 'translate3d(' + (off + xs[i]).toFixed(2) + 'px,-50%,0) scale(' + sc[i].toFixed(4) + ')';
    }

    const near = clamp(Math.round(pos), 0, n - 1);
    if(cap.dataset.i !== String(near) || cap.dataset.f !== filter) say(near);
    const left = clamp(off + xs[near], 16, M.vw - cap.offsetWidth - 16);
    const top = M.vh / 2 - M.H / 2 - 22;
    cap.style.transform = 'translate3d(' + left.toFixed(1) + 'px,' + top.toFixed(1) + 'px,0) translateY(-100%)';
    cap.style.opacity = clamp(1 - Math.abs(pos - near) * 3, 0, 1).toFixed(3);
  }

  function say(i){
    const c = list[i];
    cap.dataset.i = i; cap.dataset.f = filter;
    $('.cap-n', cap).textContent = '(' + pad(i + 1) + ')';
    $('.cap-name', cap).textContent = c.name;
    $('.cap-line', cap).textContent = c.line;
    count.textContent = pad(i + 1) + ' / ' + pad(list.length);
  }

  function tick(){
    raf = 0;
    const d = target - pos;
    pos = calm || Math.abs(d) < .0008 ? target : pos + d * .13;
    layout();
    roll();
    if(pos !== target) raf = requestAnimationFrame(tick);
  }
  const move = () => { if(!raf) raf = requestAnimationFrame(tick); };

  /* ---------- the film on the tile in focus ----------
     When the strip comes to rest on a case that has a film, it plays on the
     tile from its first frame: silent, looping, over the still. It stops as
     soon as the strip moves on or the case opens. Skipped for reduced motion
     and data saver. Mux's <mux-video> streams it, fetched the first time a
     film is needed. */
  const still = calm || (navigator.connection && navigator.connection.saveData);
  let muxLib = null, rolling = null, reel = null;
  function roll(){
    const c = !view && !drag && pos === target ? list[Math.round(pos)] : null;
    const want = c && c.film && !still ? c : null;
    if(want === rolling) return;
    if(reel){ const old = reel; old.classList.remove('on'); if(old.pause) old.pause(); setTimeout(() => old.remove(), 300); reel = null; }
    rolling = want;
    if(!want) return;
    const start = () => {
      if(rolling !== want) return;
      const v = document.createElement('mux-video');
      v.className = 'reel'; v.setAttribute('aria-hidden', 'true'); v.tabIndex = -1;
      v.muted = true; v.loop = true; v.playsInline = true;
      ['muted', 'loop', 'playsinline', 'autoplay'].forEach(k => v.setAttribute(k, ''));
      v.setAttribute('playback-id', want.film); v.setAttribute('max-resolution', '720p');
      v.addEventListener('playing', () => v.classList.add('on'), { once: true });
      want.el.appendChild(v);
      reel = v;
      const p = v.play && v.play(); if(p && p.catch) p.catch(() => {});
    };
    (muxLib || (muxLib = import('https://cdn.jsdelivr.net/npm/@mux/mux-player@3.14.0/dist/mux-player.mjs'))).then(start, () => {});
  }
  const to = t => { target = clamp(t, 0, list.length - 1); move(); };
  const snap = () => to(Math.round(target));

  function build(){
    all = data.cases;
    measure();
    all.forEach((c, i) => {
      const b = el('button', 'tile');
      b.type = 'button';
      b.setAttribute('aria-label', c.name);
      const img = new Image();
      img.alt = ''; img.draggable = false; img.decoding = 'async';
      img.onload = img.onerror = () => setTimeout(() => b.classList.add('in'), calm ? 0 : 40 * Math.min(i, 14));
      img.src = c.src = px(c.thumb, cover(c.thumb, M.W, M.H));
      b.appendChild(img);
      b.addEventListener('focus', () => { if(b.matches(':focus-visible')) to(list.indexOf(c)); });
      c.el = b;
      strip.appendChild(b);
    });
    measure();

    const mk = (id, label) => {
      const b = el('button', '', label);
      b.type = 'button'; b.dataset.id = id;
      b.addEventListener('click', () => { if(view) home(false); setFilter(id); });
      filtersEl.appendChild(b);
    };
    mk('', 'All');
    data.sectors.forEach(s => mk(s.id, s.label));
  }

  function setFilter(id, instant){
    if(!data.sectors.some(s => s.id === id)) id = '';
    const apply = () => {
      filter = id;
      list = id ? all.filter(c => c.sectors.includes(id)) : all.slice();
      for(const c of all) c.el.hidden = !list.includes(c);
      for(const b of filtersEl.children) b.setAttribute('aria-pressed', String(b.dataset.id === id));
      pos = target = 0;
      layout();
      strip.classList.remove('out');
      roll();
    };
    if(id === filter && list.length) return;
    const u = new URL(location.href);
    if(id) u.searchParams.set('s', id); else u.searchParams.delete('s');
    history.replaceState(history.state, '', u);
    if(instant || calm) return apply();
    strip.classList.add('out');
    cap.style.opacity = 0;
    setTimeout(apply, 260);
  }

  /* ---------- moving through the strip ---------- */
  let wheelT = 0;
  stage.addEventListener('wheel', e => {
    e.preventDefault();
    if(view) return;
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    to(target + d * (e.deltaMode ? 30 : 1) / 260);
    clearTimeout(wheelT);
    wheelT = setTimeout(snap, 140);
  }, { passive: false });

  let drag = null, dragged = false;
  stage.addEventListener('pointerdown', e => {
    if(view || (e.pointerType === 'mouse' && e.button)) return;
    drag = { id: e.pointerId, x: e.clientX, t0: target, lx: e.clientX, lt: e.timeStamp, v: 0 };
    dragged = false;
  });
  stage.addEventListener('pointermove', e => {
    if(!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if(!dragged && Math.abs(dx) > 6){ dragged = true; stage.classList.add('dragging'); try{ stage.setPointerCapture(e.pointerId); }catch{} }
    if(!dragged) return;
    const step = M.W * M.s0 + M.gap;
    const dt = e.timeStamp - drag.lt;
    if(dt > 0) drag.v = .7 * drag.v + .3 * ((drag.lx - e.clientX) / step / dt);
    drag.lx = e.clientX; drag.lt = e.timeStamp;
    to(drag.t0 - dx / step);
  });
  const drop = e => {
    if(!drag || e.pointerId !== drag.id) return;
    if(dragged){ stage.classList.remove('dragging'); to(Math.round(target + clamp(drag.v * 160, -1.5, 1.5))); }
    drag = null;
    roll();
  };
  stage.addEventListener('pointerup', drop);
  stage.addEventListener('pointercancel', drop);

  strip.addEventListener('click', e => {
    if(dragged){ dragged = false; return; }
    const b = e.target.closest('.tile');
    if(!b || busy) return;
    const i = list.findIndex(c => c.el === b);
    if(i < 0) return;
    if(Math.abs(pos - i) > .35) to(i);
    else { to(i); go('#' + list[i].slug); }
  });

  addEventListener('keydown', e => {
    if(e.key === 'Escape' && view){ home(true); return; }
    if(view || e.metaKey || e.ctrlKey || e.altKey) return;
    if(e.key === 'ArrowRight' || e.key === 'ArrowDown'){ e.preventDefault(); to(Math.round(target) + 1); }
    else if(e.key === 'ArrowLeft' || e.key === 'ArrowUp'){ e.preventDefault(); to(Math.round(target) - 1); }
    else if(e.key === 'Enter' && !e.target.closest('a,.bar button')){ e.preventDefault(); const c = list[Math.round(target)]; if(c) go('#' + c.slug); }
  });
  addEventListener('resize', () => { measure(); layout(); });

  /* ---------- the case study ---------- */
  function figure(m){
    const f = el('figure', 'm' + (m.half ? ' half' : ''));
    const box = el('div', 'box');
    box.style.aspectRatio = m.w + ' / ' + m.h;
    const width = (M.small || !m.half ? M.vw : M.vw / 2) * DPR;
    const img = new Image();
    img.loading = 'lazy'; img.decoding = 'async'; img.alt = m.alt || m.title || '';
    img.src = px(m, width);
    box.appendChild(img);
    if(m.kind === 'video'){
      const p = el('button', 'play');
      p.type = 'button';
      p.setAttribute('aria-label', 'Play' + (m.title ? ' ' + m.title : ' film'));
      p.appendChild(el('span', '', '(Play)'));
      p.addEventListener('click', () => {
        const fr = el('iframe');
        fr.src = 'https://player.mux.com/' + encodeURIComponent(m.mux) + '?autoplay=true&accent-color=%23111111';
        fr.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
        fr.allowFullscreen = true;
        fr.title = m.title || 'Film';
        box.replaceChildren(fr);
      });
      box.appendChild(p);
    }
    f.appendChild(box);
    if(m.title) f.appendChild(el('figcaption', '', m.title));
    return f;
  }

  function heroMedia(c){
    const d = el('div', 'hero-media');
    const a = new Image(); a.alt = ''; a.src = c.src;
    const b = new Image(); b.alt = c.name; b.className = 'full';
    b.onload = () => b.classList.add('on');
    b.src = px(c.hero, cover(c.hero, M.vw, M.vh * .72));
    d.append(a, b);
    return d;
  }

  function fill(c){
    const i = all.indexOf(c);
    const hero = el('div', 'case-hero');
    const body = el('div', 'case-body');

    const head = el('div', 'case-head');
    const id = el('div', 'c-id');
    id.append(el('span', '', '(' + pad(i + 1) + ')'), el('h2', '', c.name));
    head.append(id, el('p', 'c-line', c.line));
    const meta = el('dl', 'c-meta');
    const row = (k, v) => { if(!v) return; const r = el('div'); r.append(el('dt', '', k), typeof v === 'string' ? el('dd', '', v) : v); meta.appendChild(r); };
    row('Client', c.client !== c.name && c.client);
    row('Role', c.role);
    row('Disciplines', c.disciplines);
    if(c.siteUrl){
      const dd = el('dd'), a = el('a', '', 'Visit site ↗');
      a.href = c.siteUrl; a.target = '_blank'; a.rel = 'noopener';
      dd.appendChild(a); row('Live', dd);
    }
    head.appendChild(meta);
    body.appendChild(head);

    if(c.sections.length){
      const text = el('div', 'case-text'), cols = el('div');
      for(const s of c.sections){ const d = el('section'); d.append(el('h3', '', '(' + s.label + ')'), el('p', '', s.text)); cols.appendChild(d); }
      text.appendChild(cols);
      body.appendChild(text);
    }
    if(c.media.length){
      const media = el('div', 'case-media');
      c.media.forEach(m => media.appendChild(figure(m)));
      body.appendChild(media);
    }
    if(c.credits.length){
      const cr = el('div', 'case-credits'), ul = el('ul');
      c.credits.forEach(t => ul.appendChild(el('li', '', t)));
      cr.append(el('h3', '', '(Credits)'), ul);
      body.appendChild(cr);
    }
    const end = el('div', 'case-end');
    const b = el('button', '', '(Back)'); b.type = 'button';
    b.addEventListener('click', () => home(true));
    const next = all[(i + 1) % all.length];
    const a = el('a', '', 'Next: ' + next.name + ' →'); a.href = '#' + next.slug;
    a.addEventListener('click', e => { e.preventDefault(); go('#' + next.slug, true); });
    end.append(b, a);
    body.appendChild(end);

    caseEl.replaceChildren(hero, body);
    caseEl.scrollTop = 0;
    document.title = c.name + ' | Itai Agami';
    return hero;
  }

  const rect = r => ({ left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  const fly = (node, from, toRect, ms) => node.animate([rect(from), rect(toRect)], { duration: ms, easing: EASE, fill: 'both' });

  function showCase(c, flip){
    /* the strip waits on this case, so closing lands back on its tile */
    if(!list.includes(c)) setFilter('', true);
    pos = target = list.indexOf(c);
    layout();

    const hero = fill(c), media = heroMedia(c);
    caseEl.hidden = false;
    document.body.classList.add('open');
    back.hidden = false;

    if(flip && !calm){
      busy = true;
      const from = c.el.getBoundingClientRect(), dest = hero.getBoundingClientRect();
      media.classList.add('ghost');
      document.body.appendChild(media);
      c.el.style.visibility = 'hidden';
      const an = fly(media, from, dest, 850);
      an.finished.then(() => {
        hero.appendChild(media);
        media.classList.remove('ghost');
        an.cancel();
        busy = false;
      }).catch(() => { busy = false; });
    } else {
      hero.appendChild(media);
      c.el.style.visibility = 'hidden';
    }
    requestAnimationFrame(() => caseEl.classList.add('in'));
  }

  function hideCase(c, flip){
    const media = $('.hero-media', caseEl);
    document.body.classList.remove('open');
    caseEl.classList.remove('in');
    back.hidden = true;
    document.title = TITLE;
    const done = () => { c.el.style.visibility = ''; };
    if(flip && !calm && media && caseEl.scrollTop < 120){
      busy = true;
      const from = media.getBoundingClientRect(), dest = c.el.getBoundingClientRect();
      media.classList.add('ghost');
      document.body.appendChild(media);
      const full = $('.full', media);
      if(full) full.animate([{ opacity: 1 }, { opacity: 1, offset: .5 }, { opacity: 0 }], { duration: 750, fill: 'both' });
      fly(media, from, dest, 750).finished.then(() => { done(); media.remove(); busy = false; });
    } else {
      caseEl.classList.add('swap');
      done();
    }
    setTimeout(() => { if(view === null || view === 'info'){ caseEl.hidden = true; caseEl.replaceChildren(); } caseEl.classList.remove('swap'); }, 360);
  }

  /* ---------- info ---------- */
  function showInfo(){
    const s = data.settings || {};
    const text = el('div', 'info-text');
    [...(s.about || []), [s.offerLine, ...(s.offer || [])].filter(Boolean).join(' ')].filter(Boolean).forEach(t => text.appendChild(el('p', '', t)));
    const links = el('div', 'info-links');
    const link = (label, href, ext) => { if(!href) return; const a = el('a', '', label); a.href = href; if(ext){ a.target = '_blank'; a.rel = 'noopener'; } links.appendChild(a); };
    link('Book a call', s.bookingUrl, true);
    link(s.email, s.email && 'mailto:' + s.email);
    link('LinkedIn ↗', s.linkedin, true);
    link('CV ↗', s.cv, true);
    infoEl.replaceChildren(text, links);
    infoEl.hidden = false;
    document.body.classList.add('info-open');
    back.hidden = false;
    requestAnimationFrame(() => infoEl.classList.add('in'));
  }
  function hideInfo(){
    infoEl.classList.remove('in');
    document.body.classList.remove('info-open');
    back.hidden = true;
    setTimeout(() => { if(view !== 'info') infoEl.hidden = true; }, 360);
  }

  /* ---------- which view the address asks for ---------- */
  const TITLE = document.title;
  function sync(animate){
    const h = decodeURIComponent(location.hash.slice(1));
    const want = h === 'info' ? 'info' : (all.find(c => c.slug === h) || null);
    if(want === view) return;
    const was = view;
    view = want;
    roll();
    if(was === 'info') hideInfo();
    else if(was && want && want !== 'info'){
      /* case to case: swap in place */
      was.el.style.visibility = '';
      caseEl.classList.remove('in');
      caseEl.classList.add('swap');
      setTimeout(() => { caseEl.classList.remove('swap'); if(view === want) showCase(want, false); }, calm ? 0 : 300);
      return;
    }
    else if(was) hideCase(was, animate && !want);
    if(want === 'info') showInfo();
    else if(want) showCase(want, animate && !was);
  }
  function go(hash, replace){
    if(busy) return;
    if(replace) history.replaceState(history.state, '', hash);
    else { history.pushState({ in: true }, '', hash); depth++; }
    sync(true);
  }
  function home(animate){
    if(busy) return;
    if(depth > 0){ depth--; history.back(); return; }   /* popstate does the rest */
    history.replaceState(null, '', location.pathname + location.search);
    sync(animate);
  }
  addEventListener('popstate', () => { busy = false; sync(true); });
  back.addEventListener('click', () => home(true));
  $('.mark').addEventListener('click', e => { e.preventDefault(); if(view) home(true); else { setFilter(''); to(0); } });
  $('#info-btn').addEventListener('click', () => go('#info'));

  /* ---------- start ---------- */
  fetch('/api/cms').then(r => { if(!r.ok) throw 0; return r.json(); }).then(d => {
    data = d;
    if(!d.cases || !d.cases.length) throw 0;
    build();
    const s = d.settings || {};
    const mail = $('#mail'), li = $('#in');
    if(s.email) mail.href = 'mailto:' + s.email; else mail.hidden = true;
    if(s.linkedin) li.href = s.linkedin; else li.hidden = true;
    setFilter(new URLSearchParams(location.search).get('s') || '', true);
    sync(false);
    roll();
  }).catch(e => {
    if(e) console.error(e);
    const n = el('p', 'note', 'The work could not be loaded. ');
    const b = el('button', '', '(Try again)'); b.type = 'button';
    b.addEventListener('click', () => location.reload());
    n.appendChild(b);
    document.body.appendChild(n);
  });
})();
