/* Homepage cloud. Every still from data/projects.json floats as a card in 3D and
   re-forms into a sphere, heart, smiley, star or grid. Drag to spin, scroll to
   zoom, hover for the project, click to bring a card forward.
   If WebGL or the data is unavailable nothing changes: the regular homepage stays. */
import * as THREE from 'three';

const root = document.getElementById('cloud');
const ACCENTS = ['#2979ff', '#ff2fae', '#ffd400', '#00c853', '#ff6d00', '#7c4dff', '#00b8d4', '#e53935', '#26262b'];
const SHAPES = ['sphere', 'heart', 'smiley', 'star', 'grid'];
const FILTERS = [
  { id: 'all', label: 'all', test: () => true },
  { id: 'brand', label: 'brand', test: p => p.cat === 'Brand' },
  { id: 'culture', label: 'culture', test: p => p.cat === 'Culture' },
  { id: 'tech', label: 'tech', test: p => p.cat === 'Technology' },
];
const SHAPE_CARD = { sphere: 1, heart: .72, smiley: .6, star: .62, grid: 1 };
const SHAPE_NOISE = { sphere: 0, heart: .2, smiley: .12, star: .12, grid: 0 };
const FRAME = 0x26262b;
const FOV = 40;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
  catch { return false; }
}

if (root && webglOK()) start().catch(err => { console.warn('cloud: falling back to the regular homepage', err); teardown(); });

function teardown() {
  document.documentElement.classList.remove('cloud-on');
  for (const el of document.querySelectorAll('[data-cloud-inert]')) { el.inert = false; el.removeAttribute('data-cloud-inert'); }
}

async function start() {
  const projects = await fetch('/data/projects.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });

  /* ---------- items: one card per unique still, grouped by project ---------- */
  const items = [];
  const seen = new Set();
  projects.forEach((p, pi) => {
    const accent = ACCENTS[pi % ACCENTS.length];
    const srcs = [p.thumb, p.hero, ...(p.gallery || []).map(g => g.src)].filter(Boolean);
    for (const src of srcs) {
      if (seen.has(src)) continue;
      seen.add(src);
      items.push({ src, project: p, accent });
    }
  });
  // shuffle so neighbours in a shape come from different projects
  for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
  items.forEach((it, i) => { it.seed = i; });

  /* ---------- DOM ---------- */
  root.innerHTML = `
    <div class="cl" data-mode="cloud">
      <div class="cl-stage" aria-hidden="true"></div>
      <svg class="cl-mark" viewBox="0 0 64 44" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6.5 6.2c.4 9.8.1 21.4-.6 31.6"/>
        <path d="M2.4 37.6c2.6.5 6 .4 8.4-.3"/>
        <path d="M3.2 6.6c2.2-.6 5.6-.7 7.6-.2"/>
        <path d="M19.5 38.4C24 27 29.2 14.8 33.1 5.6c4 10.4 8.4 21.4 13 32.4"/>
        <path d="M24.6 25.8c5.7-.9 11.6-1 16.6-.3"/>
      </svg>
      <div class="cl-overlay" data-mode="cloud">
        <div class="cl-bbox"></div>
        <span class="cl-chip cl-label"></span>
        ${'<span class="cl-chip cl-ambient"></span>'.repeat(5)}
      </div>
      <div class="cl-fade"></div>
      <div class="cl-caption" aria-live="polite">
        <div class="cl-meta"></div>
        <p></p>
        <a class="cl-open" href="#">view case study</a>
      </div>
      <button class="cl-step prev cl-ctl" type="button" aria-label="Previous image">${arrow('l')}</button>
      <button class="cl-step next cl-ctl" type="button" aria-label="Next image">${arrow('r')}</button>
      <div class="cl-shapes cl-in cl-ctl">
        <button class="cl-arrow" type="button" aria-label="Previous shape">${arrow('l')}</button>
        <button class="cl-shape" type="button" aria-label="Change shape"><span>sphere</span></button>
        <button class="cl-arrow" type="button" aria-label="Next shape">${arrow('r')}</button>
      </div>
      <div class="cl-filters cl-ctl" role="group" aria-label="Filter work">
        ${FILTERS.map((f, i) => `<button class="cl-in" type="button" data-filter="${f.id}" aria-pressed="${i === 0}">${f.label}</button>`).join('')}
      </div>
      <button class="cl-about-btn cl-in cl-ctl" type="button" aria-expanded="false" aria-controls="cl-about"><span class="cl-letters"></span></button>
      <section class="cl-about" id="cl-about" aria-label="About Itai Agami">
        <div class="cl-about-inner">
          <p>itai agami — independent creative director in tel aviv, working with brands and teams internationally.</p>
          <p>companies bring me something they need to launch or change: a product, a brand, a campaign, a place. i define the creative direction and carry it across brand, campaign, content and digital experience.</p>
          <p class="dim">before going independent: natural intelligence, elements, shortcut playground. media design at shenkar, with honors.</p>
          <p class="dim">everything floating behind this text is real work — ${projects.length} projects, ${items.length} images.</p>
          <p class="links"><a href="/work.html">all work</a><a href="/services.html">services</a><a href="/notes.html">notes</a><a href="/contact.html">contact</a><a href="mailto:itaiagami@gmail.com">email</a><a href="https://www.linkedin.com/in/itai-agami-237353189/" target="_blank" rel="noopener">linkedin</a><a href="/assets/docs/Itai_Agami_CV.pdf" target="_blank" rel="noopener">cv</a></p>
        </div>
      </section>
      <div class="cl-sr" aria-live="polite"></div>
    </div>`;

  const $ = s => root.querySelector(s);
  const ui = $('.cl');
  const stage = $('.cl-stage');
  const overlay = $('.cl-overlay');
  const bbox = $('.cl-bbox');
  const label = $('.cl-label');
  const ambientEls = [...root.querySelectorAll('.cl-ambient')];
  const caption = $('.cl-caption');
  const live = $('.cl-sr');
  const shapeBtn = $('.cl-shape');
  const aboutBtn = $('.cl-about-btn');
  const [prevShapeBtn, , nextShapeBtn] = root.querySelectorAll('.cl-shapes button');

  // show the cloud before measuring anything; the regular page goes inert underneath
  document.documentElement.classList.add('cloud-on');
  for (const el of document.body.children) {
    if (el === root || el.tagName === 'SCRIPT' || el.classList.contains('consent')) continue;
    el.inert = true; el.setAttribute('data-cloud-inert', '');
  }

  /* ---------- three ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, .1, 200);
  const halfTan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const plane = new THREE.PlaneGeometry(1, 1);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const pickables = [];

  const placeholder = new THREE.Color('#cfcfcf');
  items.forEach((it, i) => {
    it.mat = new THREE.MeshBasicMaterial({ color: placeholder.clone(), transparent: true, opacity: 1 });
    it.frameMat = new THREE.MeshBasicMaterial({ color: FRAME, transparent: true, opacity: 1 });
    it.mesh = new THREE.Mesh(plane, it.mat);
    it.frame = new THREE.Mesh(plane, it.frameMat);
    it.frame.position.z = -.002;
    it.group = new THREE.Group();
    it.group.add(it.frame, it.mesh);
    it.mesh.userData.index = i;
    scene.add(it.group);
    pickables.push(it.mesh);
    it.aspect = 16 / 9;
    it.on = true;
    it.vis = 0;               // animated visibility 0..1
    it.pos = new THREE.Vector3((Math.random() - .5) * .4, (Math.random() - .5) * .4, (Math.random() - .5) * .4);
    it.target = new THREE.Vector3();
    it.scale = 0;
    it.hover = 0;
    it.delay = reduceMotion ? 0 : 120 + Math.random() * 900;
  });

  // small textures for the cloud; the full image is loaded only when a card is focused
  const loadQueue = [...items];
  let loading = 0;
  function pump() {
    while (loading < 6 && loadQueue.length) {
      const it = loadQueue.shift();
      loading++;
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        const w = Math.min(512, img.naturalWidth);
        const h = Math.round(w * img.naturalHeight / img.naturalWidth);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = Math.min(4, maxAniso);
        it.small = tex;
        it.mat.map = tex;
        it.mat.color.set(0xffffff);
        it.mat.needsUpdate = true;
        it.aspect = img.naturalWidth / img.naturalHeight;
        loading--; pump();
      };
      img.onerror = () => { loading--; pump(); };
      img.src = it.src;
    }
  }
  pump();

  function loadFull(it) {
    if (it.full || it.fullLoading) return;
    it.fullLoading = true;
    new THREE.TextureLoader().load(it.src, tex => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAniso;
      it.full = tex;
      it.fullLoading = false;
      if (focused === it) { it.mat.map = tex; it.mat.needsUpdate = true; }
      else dropFull(it);
    }, undefined, () => { it.fullLoading = false; });
  }
  function dropFull(it) {
    if (!it.full) return;
    if (it.mat.map === it.full) { it.mat.map = it.small || null; it.mat.needsUpdate = true; }
    it.full.dispose();
    it.full = null;
  }

  /* ---------- state ---------- */
  let shape = 'sphere';
  let filter = FILTERS[0];
  let mode = 'cloud';           // cloud | focus | about
  let hovered = null;
  let focused = null;
  let W = 1, H = 1;
  let rotY = .6, velY = 0, tiltX = 0, velX = 0;
  let zoom = 1;
  let shapeBlend = 0;           // 0 = free spinning (sphere), 1 = flat shape facing camera
  let aboutBlend = 0;
  let lastInteract = 0;
  const startTime = performance.now();

  /* ---------- layouts ---------- */
  const PHI = (1 + Math.sqrt(5)) / 2;
  const frac = x => x - Math.floor(x);
  // deterministic per-item noise in [-1, 1]
  const hash = n => frac(Math.sin(n * 127.1 + 311.7) * 43758.5453) * 2 - 1;

  function layout() {
    const vis = items.filter(it => it.on);
    const n = vis.length;
    const aspect = W / H;
    vis.forEach((it, i) => {
      const t = n <= 1 ? .5 : i / (n - 1);
      const v = it.target;
      if (shape === 'sphere') {
        const y = 1 - 2 * ((i + .5) / n);
        const r = Math.sqrt(1 - y * y);
        const a = i * 2 * Math.PI / PHI / PHI;
        const R = sphereRadius(n);
        v.set(Math.cos(a) * r * R, y * R * .92, Math.sin(a) * r * R);
      } else if (shape === 'heart') {
        const a = frac(i / PHI) * Math.PI * 2;
        const fill = Math.pow(frac(i * .7548776662 + .31), .4);
        const x = 16 * Math.pow(Math.sin(a), 3);
        const yy = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
        v.set(x * fill * .29, (yy * fill + 2.6 * (1 - fill)) * .29 + .3, hash(i) * .9);
      } else if (shape === 'smiley') {
        const ringN = Math.round(n * .58), eyeN = Math.max(2, Math.round(n * .09));
        const R = 4.2;
        if (i < ringN) {
          const a = (i / ringN) * Math.PI * 2;
          const rr = R + hash(i) * .35;
          v.set(Math.cos(a) * rr, Math.sin(a) * rr, hash(i + 9) * .5);
        } else if (i < ringN + eyeN * 2) {
          const k = i - ringN, side = k < eyeN ? -1 : 1, e = k % eyeN;
          const a = frac(e / PHI) * Math.PI * 2, rr = Math.sqrt((e + .5) / eyeN) * .55;
          v.set(side * 1.45 + Math.cos(a) * rr, 1.25 + Math.sin(a) * rr * 1.5, hash(i) * .4);
        } else {
          const m = n - ringN - eyeN * 2, k = i - ringN - eyeN * 2;
          const a = Math.PI * (1.18 + .64 * (m <= 1 ? .5 : k / (m - 1)));
          v.set(Math.cos(a) * 2.5, Math.sin(a) * 2.5 + .15, hash(i) * .4);
        }
      } else if (shape === 'star') {
        // walk the perimeter of a five-pointed star, then pull some cards inward to fill it
        const pts = 10, outer = 4.6, inner = 1.9;
        const u = frac(i / PHI + .123) * pts;
        const k = Math.floor(u), f = u - k;
        const p = j => { const a = Math.PI / 2 + j * Math.PI / 5; const r = j % 2 ? inner : outer; return [Math.cos(a) * r, Math.sin(a) * r]; };
        const [x0, y0] = p(k), [x1, y1] = p((k + 1) % pts);
        const fill = i % 3 === 0 ? .35 + .55 * frac(i * .618) : 1;
        v.set((x0 + (x1 - x0) * f) * fill, (y0 + (y1 - y0) * f) * fill - .25, hash(i) * .5);
      } else {
        // grid fills the visible frustum at z = 0
        const viewH = 2 * halfTan * cameraDistance() * .78;
        const viewW = viewH * aspect * (aspect < .8 ? 1.12 : 1.02);
        const cols = Math.max(2, Math.round(Math.sqrt(n * viewW / viewH * 1.25)));
        const rows = Math.ceil(n / cols);
        const cw = viewW / cols, ch = Math.min(viewH / rows, cw * .82);
        const c = i % cols, r = Math.floor(i / cols);
        v.set((c - (cols - 1) / 2) * cw, ((rows - 1) / 2 - r) * ch + (aspect < .8 ? ch * .3 : 0), 0);
        it.cell = [cw * .88, ch * .88];
      }
      const noise = SHAPE_NOISE[shape];
      if (noise) v.add(new THREE.Vector3(hash(i + 1) * noise, hash(i + 2) * noise, hash(i + 3) * noise));
      it.order = i;
    });
  }

  function sphereRadius(n) { return 2.6 + Math.sqrt(n) * .2; }
  function cameraDistance() {
    const aspect = W / H;
    const fit = 5.6 / halfTan;                      // fits a ~5.6 unit radius vertically
    const fitW = 4.3 / (halfTan * aspect);          // and horizontally on narrow screens
    return Math.max(fit, fitW);
  }

  function resize() {
    W = stage.clientWidth || innerWidth; H = stage.clientHeight || innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    layout();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  /* ---------- controls ---------- */
  function setShape(next, dir) {
    if (next === shape) return;
    const span = shapeBtn.querySelector('span:last-child');
    const fresh = document.createElement('span');
    fresh.textContent = next;
    fresh.className = dir > 0 ? 'out-r' : 'out-l';
    shapeBtn.appendChild(fresh);
    requestAnimationFrame(() => requestAnimationFrame(() => fresh.className = ''));
    span.className = dir > 0 ? 'out-l' : 'out-r';
    setTimeout(() => span.remove(), 450);
    shape = next;
    if (mode === 'focus') unfocus();
    layout();
    say(`shape: ${next}`);
  }
  const stepShape = dir => setShape(SHAPES[(SHAPES.indexOf(shape) + dir + SHAPES.length) % SHAPES.length], dir);
  prevShapeBtn.addEventListener('click', () => stepShape(-1));
  nextShapeBtn.addEventListener('click', () => stepShape(1));
  shapeBtn.addEventListener('click', () => stepShape(1));

  for (const b of root.querySelectorAll('[data-filter]')) {
    b.addEventListener('click', () => {
      filter = FILTERS.find(f => f.id === b.dataset.filter);
      for (const o of root.querySelectorAll('[data-filter]')) o.setAttribute('aria-pressed', String(o === b));
      for (const it of items) it.on = filter.test(it.project);
      if (focused && !focused.on) unfocus();
      layout();
      say(`${filter.label}: ${items.filter(it => it.on).length} images`);
    });
  }

  function setLetters(text) {
    const wrap = aboutBtn.querySelector('.cl-letters');
    const old = [...wrap.children];
    old.forEach((s, i) => { s.style.transitionDelay = `${i * 14}ms`; s.classList.add('out'); });
    setTimeout(() => {
      wrap.innerHTML = [...text].map(ch => `<span class="out">${ch}</span>`).join('');
      [...wrap.children].forEach((s, i) => { s.style.transitionDelay = `${i * 22}ms`; });
      requestAnimationFrame(() => requestAnimationFrame(() => [...wrap.children].forEach(s => s.classList.remove('out'))));
    }, old.length ? 200 : 0);
  }
  setLetters('about me');

  function setMode(m) {
    mode = m;
    ui.dataset.mode = m;
    overlay.dataset.mode = m === 'focus' ? 'focus' : hovered ? 'card' : 'cloud';
  }
  function openAbout(open) {
    if (open === (mode === 'about')) return;
    if (open && focused) unfocus();
    setMode(open ? 'about' : 'cloud');
    aboutBtn.setAttribute('aria-expanded', String(open));
    setLetters(open ? 'close' : 'about me');
    if (open) setHover(null);
  }
  aboutBtn.addEventListener('click', () => openAbout(mode !== 'about'));

  function focusItem(it) {
    if (!it) return;
    if (focused && focused !== it) dropFull(focused);
    focused = it;
    setHover(null);
    setMode('focus');
    loadFull(it);
    const p = it.project;
    caption.querySelector('.cl-meta').textContent = [p.client, p.cat].filter(Boolean).join(' · ');
    caption.querySelector('p').textContent = p.oneline || p.name;
    const open = caption.querySelector('.cl-open');
    open.href = `/work/${p.slug}.html`;
    open.textContent = `${p.name.toLowerCase()} — view case study`;
    lastInteract = performance.now();
  }
  function unfocus() {
    if (!focused) return;
    const it = focused;
    focused = null;
    setTimeout(() => { if (focused !== it) dropFull(it); }, 600);
    setMode('cloud');
  }
  function stepFocus(dir) {
    const vis = items.filter(it => it.on).sort((a, b) => a.order - b.order);
    if (!vis.length) return;
    const i = focused ? vis.indexOf(focused) : -1;
    focusItem(vis[(i + dir + vis.length) % vis.length]);
  }
  $('.cl-step.prev').addEventListener('click', () => stepFocus(-1));
  $('.cl-step.next').addEventListener('click', () => stepFocus(1));

  addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input,textarea,select')) return;
    if (e.key === 'Escape') { if (mode === 'about') openAbout(false); else unfocus(); }
    else if (mode === 'focus' && e.key === 'ArrowRight') stepFocus(1);
    else if (mode === 'focus' && e.key === 'ArrowLeft') stepFocus(-1);
    else if (mode === 'focus' && e.key === 'Enter' && document.activeElement === document.body) location.href = caption.querySelector('.cl-open').href;
  });

  /* ---------- pointer: drag to spin, click to focus ---------- */
  const ndc = new THREE.Vector2(-9, -9);
  const ray = new THREE.Raycaster();
  let drag = null;
  let pointerIn = false;

  stage.addEventListener('pointerdown', e => {
    drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now(), moved: 0, id: e.pointerId };
    stage.setPointerCapture(e.pointerId);
    velY = 0; velX = 0;
  });
  stage.addEventListener('pointermove', e => {
    pointerIn = true;
    ndc.set(e.clientX / W * 2 - 1, -(e.clientY / H) * 2 + 1);
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.lx, dy = e.clientY - drag.ly;
    drag.lx = e.clientX; drag.ly = e.clientY;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.moved > 6 && mode !== 'about') {
      stage.classList.add('is-drag');
      const k = 4.2 / Math.max(W, 1);
      velY = dx * k; rotY += dx * k;
      if (shape === 'sphere') { velX = dy * k * .6; tiltX = THREE.MathUtils.clamp(tiltX + dy * k * .6, -.7, .7); }
      lastInteract = performance.now();
    }
  });
  stage.addEventListener('pointerleave', () => { pointerIn = false; ndc.set(-9, -9); });
  stage.addEventListener('pointerup', e => {
    if (!drag || drag.id !== e.pointerId) return;
    stage.classList.remove('is-drag');
    const click = drag.moved < 8;
    drag = null;
    if (!click) return;
    if (e.pointerType !== 'mouse') ndc.set(e.clientX / W * 2 - 1, -(e.clientY / H) * 2 + 1);
    const hit = pick();
    if (mode === 'about') return;
    if (hit && hit !== focused) focusItem(hit);
    else if (!hit) unfocus();
  });
  stage.addEventListener('wheel', e => {
    e.preventDefault();
    if (mode === 'about') return;
    zoom = THREE.MathUtils.clamp(zoom * Math.exp(e.deltaY * .0012), .45, 1.6);
    lastInteract = performance.now();
  }, { passive: false });

  function pick() {
    ray.setFromCamera(ndc, camera);
    for (const h of ray.intersectObjects(pickables, false)) {
      const it = items[h.object.userData.index];
      if (it.on && it.vis > .5 && (mode !== 'focus' || it === focused || it.scale > .1)) return it;
    }
    return null;
  }

  function setHover(it) {
    if (it === hovered) return;
    hovered = it;
    stage.classList.toggle('is-hover', !!it);
    if (mode !== 'focus') overlay.dataset.mode = it ? 'card' : 'cloud';
  }

  function say(text) { live.textContent = text; }

  /* ---------- ambient chips: project names surface on random cards ---------- */
  const ambient = ambientEls.map(el => ({ el, it: null, until: 0 }));
  let nextAmbient = 0;

  /* ---------- frame loop ---------- */
  const tmp = new THREE.Vector3();
  const euler = new THREE.Euler();
  const q = new THREE.Quaternion();
  const bounds = { x0: 0, y0: 0, x1: 0, y1: 0 };
  let lastPick = 0;
  let readyShown = false;

  function project(v) {
    tmp.copy(v).project(camera);
    return [(tmp.x + 1) / 2 * W, (1 - tmp.y) / 2 * H, tmp.z];
  }

  let lastNow = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const t = (now - startTime) / 1000;
    // easing is tuned at 60fps; scale it so slow devices settle in the same time
    const f = Math.min(4, Math.max(.25, (now - lastNow) / 16.67));
    lastNow = now;
    const k = a => 1 - Math.pow(1 - a, f);
    const flat = shape !== 'sphere';

    // rotation: free spin on the sphere, settle face-on for the flat shapes
    shapeBlend += ((flat ? 1 : 0) - shapeBlend) * k(.06);
    aboutBlend += ((mode === 'about' ? 1 : 0) - aboutBlend) * k(.09);
    const idle = now - lastInteract > 2500;
    if (!drag) {
      rotY += velY * f; velY *= Math.pow(.94, f);
      tiltX += velX * f; velX *= Math.pow(.9, f);
      if (!reduceMotion && mode !== 'focus') rotY += (.0016 * (1 - shapeBlend) + .0005 * aboutBlend) * f;
      if (shapeBlend > .01) { const home = Math.round(rotY / (Math.PI * 2)) * Math.PI * 2; rotY += (home - rotY) * k(.08 * shapeBlend); }
      if (idle || flat) tiltX *= Math.pow(.97, f);
    }
    const sway = flat && shape !== 'grid' && !reduceMotion ? Math.sin(t * .35) * .15 * shapeBlend : 0;
    euler.set(tiltX, rotY + sway, 0, 'YXZ');
    q.setFromEuler(euler);

    // camera distance: shape fit × user zoom, pushed back while the about text is up
    const dist = cameraDistance() * zoom * (1 + aboutBlend * 1.1);
    camera.position.z += (dist - camera.position.z) * k(.1);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    // hover picking (throttled)
    if (pointerIn && !drag && mode === 'cloud' && now - lastPick > 45) { lastPick = now; setHover(pick()); }
    else if (mode !== 'cloud' && hovered) setHover(null);

    const focusH = Math.min(H * .56, 520, Math.min(W * .8, 620) / (focused ? focused.aspect : 1));
    const focusDepth = camera.position.z - 6;           // world height for focused card at that depth
    const focusWorldH = 2 * halfTan * 6 * (focusH / H);
    const cardBase = shape === 'grid' ? 1 : .95 * SHAPE_CARD[shape];

    bounds.x0 = Infinity; bounds.y0 = Infinity; bounds.x1 = -Infinity; bounds.y1 = -Infinity;
    let onCount = 0;

    for (const it of items) {
      const appear = now - startTime > it.delay;
      const wantVis = it.on && appear ? 1 : 0;
      it.vis += (wantVis - it.vis) * k(wantVis ? .07 : .12);
      it.hover += ((it === hovered ? 1 : 0) - it.hover) * k(.18);

      let target = tmp.copy(it.target).applyQuaternion(q);
      let size;
      if (it === focused) {
        target.set(0, H < 700 && W < 640 ? .55 : .35, focusDepth);
        size = focusWorldH;
      } else {
        size = (shape === 'grid' && it.cell ? Math.min(it.cell[0] / it.aspect, it.cell[1]) : cardBase) * (1 + it.hover * .22);
        if (aboutBlend > .001) target.multiplyScalar(1 + aboutBlend * .25);
      }
      const ease = it === focused ? .14 : .075;
      it.pos.lerp(target, k(ease));
      it.scale += (size * it.vis - it.scale) * k(.16);

      const g = it.group;
      g.position.copy(it.pos);
      g.quaternion.copy(camera.quaternion);
      const w = it.scale * it.aspect, h = it.scale;
      it.mesh.scale.set(w, h, 1);
      const fw = shape === 'grid' || it === focused ? .012 : .02;
      it.frame.scale.set(w + fw * 2 * Math.max(.6, it.scale), h + fw * 2 * Math.max(.6, it.scale), 1);
      g.visible = it.scale > .004;

      // fade the rest of the cloud behind a focused card or the about text
      const dim = focused ? (it === focused ? 1 : .14) : 1 - aboutBlend * .93;
      it.mat.opacity += (dim - it.mat.opacity) * k(.12);
      it.frameMat.opacity = it.mat.opacity;
      it.group.renderOrder = it === focused ? 10 : 0;

      if (it.on && it.vis > .5 && g.visible) {
        onCount++;
        const [x, y] = project(it.pos);
        const r = (it.scale * 1.1) / (camera.position.z - it.pos.z) / halfTan * H / 2;
        bounds.x0 = Math.min(bounds.x0, x - r * it.aspect / 2); bounds.x1 = Math.max(bounds.x1, x + r * it.aspect / 2);
        bounds.y0 = Math.min(bounds.y0, y - r / 2); bounds.y1 = Math.max(bounds.y1, y + r / 2);
      }
    }

    updateOverlay(now, onCount);
    renderer.render(scene, camera);

    if (!readyShown && now - startTime > 500) {
      readyShown = true;
      ui.classList.add('is-ready');
      overlay.style.opacity = '1';
    }
  }

  function cardRect(it) {
    const [x, y] = project(it.pos);
    const ph = it.scale / (camera.position.z - it.pos.z) / halfTan * H / 2;
    const pw = ph * it.aspect;
    return { x: x - pw / 2, y: y - ph / 2, w: pw, h: ph };
  }

  function updateOverlay(now, onCount) {
    overlay.style.opacity = mode === 'about' ? '0' : '1';
    let r, text, color;
    if (focused) {
      r = cardRect(focused); text = focused.project.name.toLowerCase(); color = focused.accent;
    } else if (hovered) {
      r = cardRect(hovered); text = `${hovered.project.name.toLowerCase()} · ${hovered.project.cat.toLowerCase()}`; color = hovered.accent;
    } else if (onCount) {
      const pad = 10;
      r = { x: bounds.x0 - pad, y: bounds.y0 - pad, w: bounds.x1 - bounds.x0 + pad * 2, h: bounds.y1 - bounds.y0 + pad * 2 };
      text = `itai agami’s ${filter.label} · ${onCount}`; color = '';
    }
    if (r) {
      bbox.style.transform = `translate3d(${r.x}px,${r.y}px,0)`;
      bbox.style.width = `${Math.max(0, r.w)}px`;
      bbox.style.height = `${Math.max(0, r.h)}px`;
      bbox.style.setProperty('--cl-box', color || '');
      bbox.style.opacity = focused ? '0' : '1';
      label.textContent = text;
      label.style.background = color || '';
      label.style.color = color && isLight(color) ? '#000' : '#fff';
      label.style.transform = `translate3d(${r.x - 1}px,${r.y - 19}px,0)`;
    }

    // ambient project names on front-facing cards, only in the idle cloud
    if (!reduceMotion && mode === 'cloud' && !hovered && now > nextAmbient) {
      nextAmbient = now + 2200 + Math.random() * 1400;
      const slot = ambient.find(a => !a.it) || ambient.reduce((a, b) => (a.until < b.until ? a : b));
      const front = items.filter(it => it.on && it.vis > .9 && it.pos.z > 1 && !ambient.some(a => a.it === it));
      if (front.length) {
        const it = front[Math.floor(Math.random() * front.length)];
        slot.it = it; slot.until = now + 2600;
        slot.el.textContent = it.project.name.toLowerCase();
        slot.el.style.background = it.accent;
        slot.el.style.color = isLight(it.accent) ? '#000' : '#fff';
        slot.el.classList.add('on');
      }
    }
    for (const a of ambient) {
      if (!a.it) continue;
      if (now > a.until || !a.it.on || mode !== 'cloud') { a.el.classList.remove('on'); if (now > a.until + 300 || mode !== 'cloud') a.it = null; continue; }
      const rr = cardRect(a.it);
      a.el.style.transform = `translate3d(${rr.x}px,${rr.y + rr.h + 2}px,0)`;
    }
  }

  function isLight(hex) {
    const n = parseInt(hex.slice(1), 16);
    return .299 * (n >> 16 & 255) + .587 * (n >> 8 & 255) + .114 * (n & 255) > 150;
  }

  /* ---------- go ---------- */
  camera.position.z = cameraDistance() * 1.25;
  requestAnimationFrame(frame);
}

function arrow(dir) {
  const d = dir === 'l' ? 'M10 3 5 8l5 5' : 'M6 3l5 5-5 5';
  return `<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
}
