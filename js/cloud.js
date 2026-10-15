/* Homepage cloud. One card per project from data/projects.json floats in 3D and
   re-forms into a sphere, heart, smiley, star or grid. Drag to spin, scroll to
   zoom, hover for the project, click to open its case study in a pop-up window.
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
// Scene geometry, in world units, matched to the reference layout: cards are 1.8
// on their long side and the camera sits 15 back with a 40° vertical field of view.
// The sphere is sized from the card count so neighbours sit edge to edge.
const CARD = 1.8;
const NEIGHBOUR = 1.15;         // centre-to-centre distance between neighbouring cards
const SPHERE_SQUASH = .92;
const ZOOM_D = 6;               // a clicked card zooms to this distance from the camera
const CAM_Z = 15;
const FOV = 40;
const SHAPE_CARD = { sphere: 1, heart: .7, smiley: .58, star: .6 };
const SHAPE_NOISE = { sphere: 0, heart: .2, smiley: .12, star: .12, grid: 0 };
const FRAME = 0x26262b;
// projects with a local film loop: the card plays it instead of a still
// (Vimeo-hosted films can't be drawn into WebGL; they play when the card opens)
const VIDEO = {
  'natural-intelligence': '/assets/opt/ni-ad-home-options.mp4',
  riddle: '/assets/opt/riddle-logo.mp4',
};
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

  /* ---------- items: one card per project ---------- */
  const items = projects
    .map((p, pi) => ({ src: p.thumb || p.hero, project: p, accent: ACCENTS[pi % ACCENTS.length] }))
    .filter(it => it.src);
  // shuffle so neighbours differ between visits
  for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }

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
        ${'<span class="cl-chip cl-ambient"></span>'.repeat(4)}
      </div>
      <div class="cl-fade"></div>
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
          <p>itai agami. independent creative director, tel aviv.</p>
          <p>i set the creative direction for launches: brand, campaign, digital.</p>
          <p class="dim">before: natural intelligence, elements, shortcut playground.</p>
          <p class="links"><a href="/work.html" data-pop>all work</a><a href="/services.html" data-pop>services</a><a href="/notes.html" data-pop>notes</a><a href="/contact.html" data-pop>contact</a><a href="mailto:itaiagami@gmail.com">email</a><a href="https://www.linkedin.com/in/itai-agami-237353189/" target="_blank" rel="noopener">linkedin</a><a href="/assets/docs/Itai_Agami_CV.pdf" target="_blank" rel="noopener">cv</a></p>
        </div>
      </section>
      <div class="cl-case" role="dialog" aria-modal="true" aria-labelledby="cl-case-title" hidden>
        <div class="cl-case-backdrop"></div>
        <div class="cl-case-win">
          <div class="cl-case-bar">
            <span class="cl-case-dot"></span>
            <span class="cl-case-title" id="cl-case-title"></span>
            <button class="cl-case-close" type="button">close</button>
          </div>
          <iframe class="cl-case-frame" title="Case study" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
        </div>
      </div>
      <div class="cl-sr" aria-live="polite"></div>
    </div>`;

  const $ = s => root.querySelector(s);
  const ui = $('.cl');
  const stage = $('.cl-stage');
  const overlay = $('.cl-overlay');
  const bbox = $('.cl-bbox');
  const label = $('.cl-label');
  const ambientEls = [...root.querySelectorAll('.cl-ambient')];
  const live = $('.cl-sr');
  const shapeBtn = $('.cl-shape');
  const aboutBtn = $('.cl-about-btn');
  const caseEl = $('.cl-case');
  const caseWin = $('.cl-case-win');
  const caseFrame = $('.cl-case-frame');
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

  items.forEach((it, i) => {
    it.mat = new THREE.MeshBasicMaterial({ color: '#cfcfcf', transparent: true, opacity: 1 });
    it.frameMat = new THREE.MeshBasicMaterial({ color: FRAME, transparent: true, opacity: 1 });
    it.mesh = new THREE.Mesh(plane, it.mat);
    it.frame = new THREE.Mesh(plane, it.frameMat);
    it.frame.position.z = -.006;
    it.group = new THREE.Group();
    it.group.add(it.frame, it.mesh);
    it.mesh.userData.index = i;
    scene.add(it.group);
    pickables.push(it.mesh);
    it.aspect = 16 / 9;
    it.on = true;
    it.vis = 0;
    it.pos = new THREE.Vector3((Math.random() - .5) * .4, (Math.random() - .5) * .4, (Math.random() - .5) * .4);
    it.target = new THREE.Vector3();
    it.size = 0;               // animated long-side length in world units
    it.hover = 0;
    it.near = 0;               // pointer proximity 0..1
    it.sx = -1e4; it.sy = -1e4; // last screen position
    it.seed = i;
    it.delay = reduceMotion ? 0 : 150 + Math.random() * 1100;
  });

  // a project with a film loop plays it on its card
  function attachVideo(it, src) {
    const v = document.createElement('video');
    v.src = src;
    v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
    v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.addEventListener('loadeddata', () => {
      const tex = new THREE.VideoTexture(v);
      tex.colorSpace = THREE.SRGBColorSpace;
      it.mat.map = tex;
      it.mat.color.set(0xffffff);
      it.mat.needsUpdate = true;
      it.aspect = v.videoWidth / v.videoHeight || it.aspect;
      it.video = v;
      layout();
    }, { once: true });
    v.play().catch(() => {});
  }

  // textures are capped at 1024px; with one card per project that stays light
  items.forEach(it => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const w = Math.min(1024, img.naturalWidth);
      const h = Math.round(w * img.naturalHeight / img.naturalWidth);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Math.min(8, maxAniso);
      if (it.video) return;      // the film already took over
      it.mat.map = tex;
      it.mat.color.set(0xffffff);
      it.mat.needsUpdate = true;
      it.aspect = img.naturalWidth / img.naturalHeight;
      layout();
    };
    img.src = it.src;
    if (VIDEO[it.project.slug] && !reduceMotion) attachVideo(it, VIDEO[it.project.slug]);
  });

  // card width/height for a long side of `len`
  const dims = (it, len) => it.aspect >= 1 ? [len, len / it.aspect] : [len * it.aspect, len];

  /* ---------- state ---------- */
  let shape = 'sphere';
  let filter = FILTERS[0];
  let mode = 'cloud';           // cloud | about | case
  let hovered = null;
  let opened = false;
  let zoomed = null;            // the card that grows into the pop-up
  let px = -1e4, py = -1e4;     // pointer in screen px
  let W = 1, H = 1;
  let rotY = .6, velY = 0, tiltX = 0, velX = 0;
  let zoom = 1;
  let shapeBlend = 0;           // 0 = free spinning (sphere), 1 = flat shape facing camera
  let aboutBlend = 0;
  let caseBlend = 0;
  let zoomBlend = 0;
  let gridScroll = 0, gridScrollMax = 0;
  let lastInteract = 0;
  const startTime = performance.now();

  /* ---------- layouts ---------- */
  const PHI = (1 + Math.sqrt(5)) / 2;
  const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
  const frac = x => x - Math.floor(x);
  const hash = n => frac(Math.sin(n * 127.1 + 311.7) * 43758.5453) * 2 - 1;

  function baseCamZ() {
    const aspect = W / H;
    return Math.max(CAM_Z, 3.9 / (halfTan * aspect));
  }

  function layout() {
    const vis = items.filter(it => it.on);
    const n = vis.length;
    const aspect = W / H;
    const halfH = halfTan * baseCamZ();

    if (shape === 'grid') {
      // masonry columns across 92% of the view width, 8% of a column as the gap
      const viewW = halfH * aspect * 1.84;
      const cols = Math.max(2, Math.round(viewW / 1.7));
      const colW = viewW / cols, cardW = colW * .92, gap = colW * .08;
      const heights = new Array(cols).fill(0);
      for (const it of vis) {
        const h = cardW / it.aspect;
        const c = heights.indexOf(Math.min(...heights));
        it.grid = { x: (c - (cols - 1) / 2) * colW, top: heights[c], h, w: cardW };
        heights[c] += h + gap;
      }
      const total = Math.max(...heights) - gap;
      const top = Math.min(halfH * .8, total / 2 + (aspect < .8 ? halfH * .07 : 0));
      gridScrollMax = Math.max(0, total - halfH * 1.55);
      gridScroll = Math.min(gridScroll, gridScrollMax);
      for (const it of vis) it.target.set(it.grid.x, top - it.grid.top - it.grid.h / 2, 0);
      return;
    }

    // shapes grow with the number of cards so the spacing stays the same
    const R = Math.max(.7, NEIGHBOUR * Math.sqrt(n) / 1.9);
    const flatScale = THREE.MathUtils.clamp(Math.sqrt(n / 62), .42, 1);
    vis.forEach((it, i) => {
      const v = it.target;
      if (shape === 'sphere') {
        const y = 1 - 2 * (n <= 1 ? .5 : i / (n - 1));
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const a = i * GOLDEN_ANGLE;
        v.set(Math.cos(a) * r * R, y * R * SPHERE_SQUASH, Math.sin(a) * r * R);
      } else if (shape === 'heart') {
        const a = frac(i / PHI) * Math.PI * 2;
        const fill = Math.pow(frac(i * .7548776662 + .31), .4) * .45 + .55;
        const x = 16 * Math.pow(Math.sin(a), 3);
        const yy = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
        v.set(x * fill * .29, (yy * fill + 2.6 * (1 - fill)) * .29 + .3, hash(i) * .9);
      } else if (shape === 'smiley') {
        const eyeN = Math.max(1, Math.round(n * .09));
        const mouthN = Math.max(3, Math.round(n * .26));
        const ringN = Math.max(1, n - eyeN * 2 - mouthN);
        const R = 4.2;
        if (i < ringN) {
          const a = (i / ringN) * Math.PI * 2 + Math.PI / 2;
          v.set(Math.cos(a) * R, Math.sin(a) * R, hash(i + 9) * .4);
        } else if (i < ringN + eyeN * 2) {
          const k = i - ringN, side = k < eyeN ? -1 : 1, e = k % eyeN;
          v.set(side * 1.45 + (eyeN > 1 ? (e - (eyeN - 1) / 2) * .5 : 0), 1.3, hash(i) * .3);
        } else {
          const k = i - ringN - eyeN * 2;
          const a = Math.PI * (1.2 + .6 * (mouthN <= 1 ? .5 : k / (mouthN - 1)));
          v.set(Math.cos(a) * 2.5, Math.sin(a) * 2.5 + .15, hash(i) * .3);
        }
      } else {
        // star: walk the outline of a five-pointed star, evenly spaced
        const pts = 10, outer = 4.6, inner = 1.9;
        const p = j => { const a = Math.PI / 2 + j * Math.PI / 5; const r = j % 2 ? inner : outer; return [Math.cos(a) * r, Math.sin(a) * r]; };
        const u = (i / n) * pts;
        const k = Math.floor(u), f = u - k;
        const [x0, y0] = p(k), [x1, y1] = p((k + 1) % pts);
        v.set(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f - .25, hash(i) * .4);
      }
      if (shape !== 'sphere') v.multiplyScalar(flatScale);
      const noise = SHAPE_NOISE[shape] * flatScale;
      if (noise) v.add(new THREE.Vector3(hash(i + 1) * noise, hash(i + 2) * noise, hash(i + 3) * noise));
    });
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
    gridScroll = 0;
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
      layout();
      say(`${filter.label}: ${items.filter(it => it.on).length} projects`);
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
    if (m !== 'cloud') setHover(null);
  }
  function openAbout(open) {
    if (open === (mode === 'about')) return;
    if (open && opened) closeCase();
    setMode(open ? 'about' : 'cloud');
    aboutBtn.setAttribute('aria-expanded', String(open));
    setLetters(open ? 'close' : 'about me');
  }
  aboutBtn.addEventListener('click', () => openAbout(mode !== 'about'));

  /* ---------- pop-up: a card zooms in, the case study opens on top of it ---------- */
  let returnFocus = null;
  let openedAt = 0;
  let winTimer = 0;
  function openWindow(url, title, accent, it) {
    opened = true;
    openedAt = performance.now();
    zoomed = it || null;
    $('.cl-case-title').textContent = title;
    $('.cl-case-dot').style.background = accent || '#fff';
    caseFrame.src = url;
    returnFocus = document.activeElement;
    caseEl.hidden = false;
    setMode('case');
    clearTimeout(winTimer);
    // let the card fill the screen first, then reveal the page over it
    winTimer = setTimeout(() => caseEl.classList.add('open'), it && !reduceMotion ? 520 : 30);
    $('.cl-case-close').focus({ preventScroll: true });
    say(`${title} opened`);
  }
  const openCase = it => openWindow(`/work/${it.project.slug}.html`, it.project.name.toLowerCase(), it.accent, it);
  function closeCase() {
    if (!opened) return;
    opened = false;
    clearTimeout(winTimer);
    caseEl.classList.remove('open');
    // the page fades, then the card zooms back out to its place
    setTimeout(() => { if (!opened) { zoomed = null; setMode('cloud'); } }, reduceMotion ? 0 : 260);
    setTimeout(() => { if (!opened) { caseEl.hidden = true; caseFrame.src = 'about:blank'; } }, 420);
    if (returnFocus && returnFocus.focus) returnFocus.focus({ preventScroll: true });
  }
  // inside the window show only the content; internal links stay in the window,
  // external ones open a new tab, and a link home just closes the window
  caseFrame.addEventListener('load', () => {
    try {
      const doc = caseFrame.contentDocument;
      if (!doc || !doc.head || doc.location.href === 'about:blank') return;
      const style = doc.createElement('style');
      style.textContent = 'header.site,footer.site,.mobile-menu,.consent,.grain,.crumb,.c-next,.c-service,.c-contrib,.c-film .note,.c-film .l,figcaption{display:none!important}body{padding-top:0!important}';
      doc.head.appendChild(style);
      if (!rebuildCase(doc)) condense(doc);
      const t = (doc.title || '').split('|')[0].trim().toLowerCase();
      if (t) $('.cl-case-title').textContent = t;
      doc.addEventListener('keydown', e => { if (e.key === 'Escape') closeCase(); });
      doc.addEventListener('click', e => {
        const a = e.target.closest && e.target.closest('a[href]');
        if (!a) return;
        const u = new URL(a.getAttribute('href'), doc.baseURI);
        if (u.origin !== location.origin) { a.target = '_blank'; a.rel = 'noopener'; return; }
        if (u.pathname === '/' || u.pathname === '/index.html') { e.preventDefault(); closeCase(); return; }
        if (a.target === '_top' || a.target === '_parent') a.target = '_self';
      });
    } catch { /* cross-origin: leave the page as is */ }
  });
  // keep only the first sentence of long, plain paragraphs
  function condense(doc) {
    const main = doc.querySelector('main');
    if (!main) return;
    for (const el of main.querySelectorAll('p, .sb, .oneline, li, .body, .sub')) {
      if (el.children.length) continue;
      const text = el.textContent.trim();
      if (text.length < 110) continue;
      const m = text.match(/^(.{20,}?[.!?])(\s|$)/);
      if (m && m[1].length < text.length) el.textContent = m[1];
    }
  }
  // Case studies are re-laid out inside the window: one plain paragraph on top,
  // then the film and every image together in a single tight mosaic.
  // Pages without a film get the project's Vimeo film from the data.
  const vimeoBySlug = Object.fromEntries(projects.filter(p => p.vimeo).map(p => [p.slug, p.vimeo]));
  const firstSentence = t => { const m = t.match(/^(.{20,}?[.!?])(\s|$)/); return m ? m[1] : t; };
  const textOf = el => (el ? el.textContent : '').replace(/\s+/g, ' ').trim();

  function findFilm(doc, slug) {
    const firstVideo = doc.querySelector('main video');
    let film = doc.querySelector('.c-film--lead') || doc.querySelector('.c-film') ||
      (firstVideo && (firstVideo.closest('figure, .fm') || firstVideo));
    if (!film && vimeoBySlug[slug]) {
      film = doc.createElement('div');
      film.className = 'c-film';
      film.innerHTML = `<div class="frame"><iframe src="https://player.vimeo.com/video/${vimeoBySlug[slug]}?title=0&byline=0&portrait=0&dnt=1" title="Film" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
    }
    return film;
  }
  function startFilm(film) {
    const play = film.querySelector('.c-play');
    if (play) play.click();
    for (const f of film.querySelectorAll('iframe[src*="player.vimeo.com"]')) {
      if (/[?&]autoplay=1/.test(f.src)) continue;
      f.allow = 'autoplay; fullscreen; picture-in-picture';
      f.src += (f.src.includes('?') ? '&' : '?') + 'autoplay=1';
    }
    const v = film.matches('video') ? film : film.querySelector('video');
    if (v) { v.muted = true; v.preload = 'auto'; v.play().catch(() => {}); }
  }

  function rebuildCase(doc) {
    const m = doc.location.pathname.match(/^\/work\/([a-z0-9-]+)\.html$/);
    const wrap = doc.querySelector('.cwrap');
    if (!m || !wrap) return false;

    // the text: one paragraph from the one-liner, the idea and the outcome
    const title = textOf(wrap.querySelector('.c-open h1'));
    const story = [...wrap.querySelectorAll('.c-story .sb')].map(textOf);
    const para = [textOf(wrap.querySelector('.oneline')), story[1], story[3]]
      .filter(Boolean).map(firstSentence).filter((t, i) => i === 0 || t.length <= 150).join(' ');
    const meta = [...wrap.querySelectorAll('.c-meta .m .v')].slice(0, 2).map(textOf).join(' · ');

    // the media: film first, then every image and video once, in page order
    const film = findFilm(doc, m[1]);
    const seen = new Set();
    const media = [];
    for (const el of wrap.querySelectorAll('img, video')) {
      if (film && film.contains(el)) continue;
      if (el.closest('.c-next, .c-service, .c-open, .c-play')) continue;
      const src = el.getAttribute('src');
      if (!src || seen.has(src)) continue;
      seen.add(src);
      media.push(el);
    }

    const box = doc.createElement('div');
    box.className = 'clc';
    box.innerHTML = '<p class="clc-text"><strong></strong> <span></span></p><p class="clc-meta"></p><div class="clc-media"></div>';
    box.querySelector('strong').textContent = title;
    box.querySelector('.clc-text span').textContent = para;
    box.querySelector('.clc-meta').textContent = meta;
    const grid = box.querySelector('.clc-media');
    if (film) { film.classList.add('clc-film'); grid.appendChild(film); }
    for (const el of media) {
      const cell = doc.createElement('div');
      cell.className = 'clc-m';
      el.removeAttribute('loading');
      if (el.tagName === 'VIDEO') {
        el.muted = true; el.loop = true; el.playsInline = true; el.autoplay = true; el.preload = 'auto';
        el.removeAttribute('controls');
      }
      cell.appendChild(el);
      grid.appendChild(cell);
    }
    wrap.replaceChildren(box);

    const style = doc.createElement('style');
    style.textContent = `
      main,.cwrap{padding-top:0!important;margin-top:0!important}
      .clc{padding:28px 0 64px}
      .clc-text{max-width:62ch;margin:0 0 6px}
      .clc-text strong{font-weight:600}
      .clc-meta{margin:0 0 24px;opacity:.55}
      .clc-media{columns:2;column-gap:6px}
      .clc-media>*{break-inside:avoid;margin:0 0 6px!important;opacity:1!important;transform:none!important;filter:none!important}
      .clc-media .clc-film{column-span:all}
      .clc-m img,.clc-m video{display:block;width:100%;height:auto;border-radius:0;max-height:none}
      @media (max-width:640px){.clc-media{columns:1}}`;
    doc.head.appendChild(style);

    for (const v of grid.querySelectorAll('video')) v.play().catch(() => {});
    if (film) startFilm(film);
    return true;
  }

  for (const a of root.querySelectorAll('[data-pop]')) {
    a.addEventListener('click', e => {
      e.preventDefault();
      openAbout(false);
      openWindow(a.getAttribute('href'), a.textContent, '', null);
    });
  }
  $('.cl-case-close').addEventListener('click', closeCase);
  // a tap's follow-up click lands on the backdrop that just appeared under the finger
  $('.cl-case-backdrop').addEventListener('click', () => { if (performance.now() - openedAt > 450) closeCase(); });
  caseEl.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    // keep keyboard focus inside the dialog
    const f = [...caseEl.querySelectorAll('a,button,iframe')];
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  });

  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (mode === 'case') closeCase();
    else if (mode === 'about') openAbout(false);
  });

  /* ---------- pointer: drag to spin, click to open ---------- */
  const ndc = new THREE.Vector2(-9, -9);
  const ray = new THREE.Raycaster();
  let drag = null;
  let pointerIn = false;

  stage.addEventListener('pointerdown', e => {
    drag = { lx: e.clientX, ly: e.clientY, moved: 0, id: e.pointerId };
    stage.setPointerCapture(e.pointerId);
    velY = 0; velX = 0;
  });
  stage.addEventListener('pointermove', e => {
    pointerIn = true;
    px = e.clientX; py = e.clientY;
    ndc.set(e.clientX / W * 2 - 1, -(e.clientY / H) * 2 + 1);
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.lx, dy = e.clientY - drag.ly;
    drag.lx = e.clientX; drag.ly = e.clientY;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.moved > 6 && mode === 'cloud') {
      stage.classList.add('is-drag');
      if (shape === 'grid') {
        gridScroll = THREE.MathUtils.clamp(gridScroll + dy * (2 * halfTan * camera.position.z / H), 0, gridScrollMax);
      } else {
        const k = 4.2 / Math.max(W, 1);
        velY = dx * k; rotY += dx * k;
        if (shape === 'sphere') { velX = dy * k * .6; tiltX = THREE.MathUtils.clamp(tiltX + dy * k * .6, -.7, .7); }
      }
      lastInteract = performance.now();
    }
  });
  stage.addEventListener('pointerleave', () => { pointerIn = false; px = py = -1e4; ndc.set(-9, -9); });
  stage.addEventListener('pointerup', e => {
    if (!drag || drag.id !== e.pointerId) return;
    stage.classList.remove('is-drag');
    const click = drag.moved < 8;
    drag = null;
    if (!click || mode !== 'cloud') return;
    if (e.pointerType !== 'mouse') ndc.set(e.clientX / W * 2 - 1, -(e.clientY / H) * 2 + 1);
    const hit = pick();
    if (hit) openCase(hit);
  });
  stage.addEventListener('wheel', e => {
    e.preventDefault();
    if (mode !== 'cloud') return;
    if (shape === 'grid') gridScroll = THREE.MathUtils.clamp(gridScroll + e.deltaY * .01, 0, gridScrollMax);
    else zoom = THREE.MathUtils.clamp(zoom * Math.exp(e.deltaY * .0012), .45, 1.6);
    lastInteract = performance.now();
  }, { passive: false });

  function pick() {
    ray.setFromCamera(ndc, camera);
    for (const h of ray.intersectObjects(pickables, false)) {
      const it = items[h.object.userData.index];
      if (it.on && it.vis > .5) return it;
    }
    return null;
  }

  function setHover(it) {
    if (it === hovered) return;
    hovered = it;
    stage.classList.toggle('is-hover', !!it);
    overlay.dataset.mode = it ? 'card' : 'cloud';
  }

  function say(text) { live.textContent = text; }

  /* ---------- ambient chips: project names surface on random cards ---------- */
  const ambient = ambientEls.map(el => ({ el, it: null, until: 0 }));
  let nextAmbient = 0;

  /* ---------- frame loop ---------- */
  const tmp = new THREE.Vector3();
  const target = new THREE.Vector3();
  const euler = new THREE.Euler();
  const q = new THREE.Quaternion();
  const bounds = { x0: 0, y0: 0, x1: 0, y1: 0 };
  let lastPick = 0;
  let readyShown = false;
  let lastNow = performance.now();

  function project(v) {
    tmp.copy(v).project(camera);
    return [(tmp.x + 1) / 2 * W, (1 - tmp.y) / 2 * H];
  }
  function pxPerUnit(z) { return H / (2 * halfTan * Math.max(.1, camera.position.z - z)); }
  // the pop-up window's size on screen, and the card length that covers it at ZOOM_D
  const winSize = () => (W <= 640 ? [W - 16, H - 96] : [Math.min(1120, W - 60), H - 110]);
  function zoomLen(it) {
    const [ww, wh] = winSize();
    const u = 2 * halfTan * ZOOM_D / H;
    return it.aspect >= 1 ? Math.max(ww * u, wh * u * it.aspect) : Math.max(ww * u / it.aspect, wh * u);
  }
  function cardRect(it) {
    const [x, y] = project(it.pos);
    const [w, h] = dims(it, it.size);
    const k = pxPerUnit(it.pos.z);
    return { x: x - w * k / 2, y: y - h * k / 2, w: w * k, h: h * k };
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const t = (now - startTime) / 1000;
    // easing is tuned at 60fps; scale it so slow devices settle in the same time
    const f = Math.min(4, Math.max(.25, (now - lastNow) / 16.67));
    lastNow = now;
    const k = a => 1 - Math.pow(1 - a, f);
    const flat = shape !== 'sphere';

    shapeBlend += ((flat ? 1 : 0) - shapeBlend) * k(.06);
    aboutBlend += ((mode === 'about' ? 1 : 0) - aboutBlend) * k(.09);
    caseBlend += ((mode === 'case' ? 1 : 0) - caseBlend) * k(.12);
    zoomBlend += ((zoomed ? 1 : 0) - zoomBlend) * k(.12);
    // the whole cloud breathes slowly
    const breathe = reduceMotion ? 1 : 1 + Math.sin(t * 1.15) * .022;
    const idle = now - lastInteract > 2500;
    if (!drag) {
      rotY += velY * f; velY *= Math.pow(.94, f);
      tiltX += velX * f; velX *= Math.pow(.9, f);
      if (!reduceMotion) rotY += (.0016 * (1 - shapeBlend) * (1 - caseBlend) + .0005 * aboutBlend) * f;
      if (shapeBlend > .01) { const home = Math.round(rotY / (Math.PI * 2)) * Math.PI * 2; rotY += (home - rotY) * k(.08 * shapeBlend); }
      if (idle || flat) tiltX *= Math.pow(.97, f);
    }
    const sway = flat && shape !== 'grid' && !reduceMotion ? Math.sin(t * .35) * .15 * shapeBlend : 0;
    euler.set(tiltX, rotY + sway, 0, 'YXZ');
    q.setFromEuler(euler);

    const dist = baseCamZ() * (shape === 'grid' ? 1 : zoom) * (1 + aboutBlend * 1.1);
    camera.position.z += (dist - camera.position.z) * k(.1);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    if (pointerIn && !drag && mode === 'cloud' && now - lastPick > 45) { lastPick = now; setHover(pick()); }

    bounds.x0 = Infinity; bounds.y0 = Infinity; bounds.x1 = -Infinity; bounds.y1 = -Infinity;
    let onCount = 0;

    for (const it of items) {
      const appear = now - startTime > it.delay;
      const wantVis = it.on && appear ? 1 : 0;
      it.vis += (wantVis - it.vis) * k(wantVis ? .07 : .12);
      it.hover += ((it === hovered ? 1 : 0) - it.hover) * k(.18);

      target.copy(it.target);
      if (shape !== 'grid') target.multiplyScalar(breathe);
      if (!reduceMotion) {
        target.x += Math.sin(t * .7 + it.seed * 1.7) * .045;
        target.y += Math.cos(t * .6 + it.seed * 2.3) * .045;
      }
      if (shape === 'grid') target.y += gridScroll;
      else target.applyQuaternion(q);
      // step back for the about text; recoil from a card that is zooming in
      const spread = 1 + aboutBlend * .25 + (it === zoomed ? 0 : zoomBlend * .45);
      if (spread > 1.001) target.multiplyScalar(spread);
      // cards near the pointer lean toward the viewer
      const d2 = (it.sx - px) ** 2 + (it.sy - py) ** 2;
      const near = mode === 'cloud' && pointerIn && !reduceMotion ? Math.exp(-d2 / (2 * 130 * 130)) : 0;
      it.near += (near - it.near) * k(.1);
      target.z += it.near * .6;

      let len = shape === 'grid' && it.grid ? Math.max(it.grid.w, it.grid.h) : CARD * SHAPE_CARD[shape];
      len *= 1 + it.hover * .18 + it.near * .08;
      if (it === zoomed) { target.set(0, 0, camera.position.z - ZOOM_D); len = zoomLen(it); }
      it.pos.lerp(target, k(it === zoomed ? .13 : .075));
      it.size += (len * it.vis - it.size) * k(it === zoomed ? .13 : .16);

      const g = it.group;
      g.position.copy(it.pos);
      g.quaternion.copy(camera.quaternion);
      const [w, h] = dims(it, it.size);
      it.mesh.scale.set(w, h, 1);
      const fw = .007 * 2 * Math.min(1, it.size / CARD);
      it.frame.scale.set(w + fw, h + fw, 1);
      g.visible = it.size > .004;

      const dim = it === zoomed ? 1 : (1 - aboutBlend * .93) * (1 - caseBlend * .7);
      it.mat.opacity += (dim - it.mat.opacity) * k(.12);
      it.frameMat.opacity = it.mat.opacity;

      it.group.renderOrder = it === zoomed ? 10 : 0;
      [it.sx, it.sy] = project(it.pos);
      if (it.on && it.vis > .5 && g.visible && it !== zoomed) {
        onCount++;
        const r = cardRect(it);
        bounds.x0 = Math.min(bounds.x0, r.x); bounds.x1 = Math.max(bounds.x1, r.x + r.w);
        bounds.y0 = Math.min(bounds.y0, r.y); bounds.y1 = Math.max(bounds.y1, r.y + r.h);
      }
    }

    updateOverlay(now, onCount);
    renderer.render(scene, camera);

    if (!readyShown && now - startTime > 500) {
      readyShown = true;
      ui.classList.add('is-ready');
    }
  }

  function updateOverlay(now, onCount) {
    overlay.style.opacity = mode === 'cloud' && readyShown ? '1' : '0';
    let r, text, color = '';
    if (hovered) {
      r = cardRect(hovered); text = `${hovered.project.name.toLowerCase()} · ${hovered.project.cat.toLowerCase()}`; color = hovered.accent;
    } else if (onCount) {
      const pad = 10;
      r = { x: bounds.x0 - pad, y: bounds.y0 - pad, w: bounds.x1 - bounds.x0 + pad * 2, h: bounds.y1 - bounds.y0 + pad * 2 };
      text = `itai agami’s ${filter.label} · ${onCount}`;
    }
    if (r) {
      bbox.style.transform = `translate3d(${r.x}px,${r.y}px,0)`;
      bbox.style.width = `${Math.max(0, r.w)}px`;
      bbox.style.height = `${Math.max(0, r.h)}px`;
      bbox.style.setProperty('--cl-box', color);
      label.textContent = text;
      label.style.background = color;
      label.style.color = color && isLight(color) ? '#000' : '#fff';
      label.style.transform = `translate3d(${r.x - 1}px,${r.y - 19}px,0)`;
    }

    // ambient project names on front-facing cards, only in the idle cloud
    if (!reduceMotion && mode === 'cloud' && !hovered && now > nextAmbient) {
      nextAmbient = now + 2200 + Math.random() * 1400;
      const slot = ambient.find(a => !a.it) || ambient.reduce((a, b) => (a.until < b.until ? a : b));
      const front = items.filter(it => it.on && it.vis > .9 && (shape !== 'sphere' || it.pos.z > 1) && !ambient.some(a => a.it === it));
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

  camera.position.z = baseCamZ() * 1.25;
  requestAnimationFrame(frame);
}

function arrow(dir) {
  const d = dir === 'l' ? 'M10 3 5 8l5 5' : 'M6 3l5 5-5 5';
  return `<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
}
