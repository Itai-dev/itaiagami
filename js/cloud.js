/* Homepage cloud. One card per project (from Sanity, or data/projects.json) floats in 3D and
   re-forms into a sphere, heart, smiley, star or grid. Drag to spin, scroll to
   zoom, hover for the project, click to open its case study in a pop-up window.
   If WebGL or the data is unavailable nothing changes: the regular homepage stays. */
import * as THREE from 'three';
import { loadContent, sized } from './cms.js';

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
  const { projects, settings } = await loadContent();
  // what a project is: video, image or site (older entries are inferred)
  const muxId = p => (p.mux && p.mux.playbackId) || null;
  const kind = p => p.type || (muxId(p) || p.vimeo ? 'video' : 'image');
  // name and category are optional in the CMS
  const tagOf = p => [p.name || 'untitled', p.cat].filter(Boolean).join(' · ').toLowerCase();
  // card image: a video's first frame (so the card hands over to the playing
  // video without a cut), else the card image, the image or the hero; without
  // any of them the card shows the project name
  const cardImage = p => {
    if (muxId(p) && kind(p) !== 'image') return `https://image.mux.com/${encodeURIComponent(muxId(p))}/thumbnail.webp?time=0&width=1024`;
    const src = p.thumb || p.image || p.hero;
    return src ? sized(src, 1024) : null;
  };
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const aboutLines = settings && Array.isArray(settings.about) && settings.about.length ? settings.about : [
    'itai agami. independent creative director, tel aviv.',
    'i set the creative direction for launches: brand, campaign, digital.',
    'before: natural intelligence, elements, shortcut playground.',
  ];
  const email = (settings && settings.email) || 'itaiagami@gmail.com';
  const linkedin = (settings && settings.linkedin) || 'https://www.linkedin.com/in/itai-agami-237353189/';
  const cv = (settings && settings.cv) || '/assets/docs/Itai_Agami_CV.pdf';
  // the one offer: a line under the mark, and the "work with me" panel
  const offerLine = (settings && settings.offerLine) || 'creative direction and launch sites for startups. weeks, not months.';
  const offerLines = settings && Array.isArray(settings.offer) && settings.offer.length ? settings.offer : [
    'one sprint, one lead: the idea, the identity and the launch site, start to finish.',
    'two to four weeks. fixed scope, fixed price.',
    'from $10,000.',
  ];
  const booking = (settings && settings.bookingUrl) || 'https://calendar.app.google/qAYhVo928FsVE6PP7';

  /* ---------- items: one card per project; a group's projects stay together ---------- */
  const units = [];
  const byGroup = new Map();
  for (const p of projects) {
    const id = p.group && p.group.id;
    if (id && byGroup.has(id)) { byGroup.get(id).push(p); continue; }
    const unit = [p];
    if (id) byGroup.set(id, unit);
    units.push(unit);
  }
  for (const u of units) u.sort((a, b) => (a.groupOrder ?? 999) - (b.groupOrder ?? 999));
  // shuffle the groups so neighbours differ between visits
  for (let i = units.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [units[i], units[j]] = [units[j], units[i]]; }
  const items = units.flatMap((u, ui) => {
    // the projects of a group share one colour
    const members = u.map((p, k) => ({ src: cardImage(p), project: p, accent: ACCENTS[ui % ACCENTS.length], unit: ui, k }));
    for (const m of members) m.members = members;
    return members;
  });

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
      <p class="cl-offer-line cl-in">${esc(offerLine)}</p>
      <div class="cl-overlay" data-mode="cloud">
        <div class="cl-bbox"></div>
        <span class="cl-chip cl-label"></span>
        ${'<span class="cl-chip cl-ambient"></span>'.repeat(4)}
      </div>
      <div class="cl-play"></div>
      <span class="cl-chip cl-focus-tag" aria-hidden="true"></span>
      <button class="cl-chip cl-focus-min" type="button" aria-label="Minimise"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 1.5V6H1.5M10 1.5V6h4.5M6 14.5V10H1.5M10 14.5V10h4.5"/></svg></button>
      <a class="cl-chip cl-focus-site" target="_blank" rel="noopener">visit site ↗</a>
      <span class="cl-chip cl-focus-nav" role="group" aria-label="Media"><button type="button" class="cl-focus-prev" aria-label="Previous">←</button><span class="cl-focus-count" aria-live="polite"></span><button type="button" class="cl-focus-next" aria-label="Next">→</button></span>
      <p class="cl-chip cl-focus-info"></p>
      <div class="cl-fade"></div>
      <div class="cl-shapes cl-in cl-ctl">
        <button class="cl-arrow" type="button" aria-label="Previous shape">${arrow('l')}</button>
        <button class="cl-shape" type="button" aria-label="Change shape"><span>sphere</span></button>
        <button class="cl-arrow" type="button" aria-label="Next shape">${arrow('r')}</button>
      </div>
      <div class="cl-filters cl-ctl" role="group" aria-label="Filter work">
        ${FILTERS.map((f, i) => `<button class="cl-in" type="button" data-filter="${f.id}" aria-pressed="${i === 0}">${f.label}</button>`).join('')}
      </div>
      <div class="cl-top">
        <button class="cl-offer-btn cl-in cl-ctl" type="button" aria-expanded="false" aria-controls="cl-offer"><span class="cl-letters"></span></button>
        <button class="cl-about-btn cl-in cl-ctl" type="button" aria-expanded="false" aria-controls="cl-about"><span class="cl-letters"></span></button>
      </div>
      <section class="cl-about" id="cl-offer" aria-label="Work with Itai Agami">
        <div class="cl-about-inner">
          ${offerLines.map(l => `<p>${esc(l)}</p>`).join('')}
          <p class="links"><a href="${esc(booking)}" target="_blank" rel="noopener">book a call ↗</a><a href="/contact.html" data-pop>send a brief</a><a href="mailto:${esc(email)}">email</a></p>
        </div>
      </section>
      <section class="cl-about" id="cl-about" aria-label="About Itai Agami">
        <div class="cl-about-inner">
          ${aboutLines.map((l, i) => `<p${i === aboutLines.length - 1 && i > 1 ? ' class="dim"' : ''}>${esc(l)}</p>`).join('')}
          <p class="links"><a href="/notes.html" data-pop>notes</a><a href="mailto:${esc(email)}">email</a><a href="${esc(linkedin)}" target="_blank" rel="noopener">linkedin</a><a href="${esc(cv)}" target="_blank" rel="noopener">cv</a></p>
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
          <iframe class="cl-case-frame" title="Page" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
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
  const offerBtn = $('.cl-offer-btn');
  const caseEl = $('.cl-case');
  const caseWin = $('.cl-case-win');
  const caseFrame = $('.cl-case-frame');
  const playEl = $('.cl-play');
  const focusTag = $('.cl-focus-tag');
  const focusMin = $('.cl-focus-min');
  const focusNav = $('.cl-focus-nav');
  const focusCount = $('.cl-focus-count');
  const focusInfo = $('.cl-focus-info');
  const focusSite = $('.cl-focus-site');
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
    v.crossOrigin = 'anonymous';
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

  // a card with nothing to show: the project name on its colour
  function nameCard(it) {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 640;
    const g = c.getContext('2d');
    g.fillStyle = it.accent;
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = isLight(it.accent) ? '#000' : '#fff';
    g.font = '500 56px "IBM Plex Mono", ui-monospace, monospace';
    g.textBaseline = 'top';
    const words = String(it.project.name || 'untitled').toLowerCase().split(/\s+/);
    let line = '', y = 56;
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (g.measureText(next).width > c.width - 112 && line) { g.fillText(line, 56, y); line = w; y += 70; }
      else line = next;
    }
    g.fillText(line, 56, y);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    it.mat.map = tex;
    it.mat.color.set(0xffffff);
    it.mat.needsUpdate = true;
    it.aspect = c.width / c.height;
  }

  // textures are capped at 1024px; with one card per project that stays light
  items.forEach(it => {
    if (!it.src) {
      if (document.fonts && document.fonts.load) document.fonts.load('500 56px "IBM Plex Mono"').finally(() => { nameCard(it); layout(); });
      else nameCard(it);
      if (it.project.loop && !reduceMotion) attachVideo(it, it.project.loop);
      return;
    }
    const img = new Image();
    img.decoding = 'async';
    img.crossOrigin = 'anonymous';
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
    if (it.project.loop && !reduceMotion) attachVideo(it, it.project.loop);
  });

  // card width/height for a long side of `len`
  const dims = (it, len) => it.aspect >= 1 ? [len, len / it.aspect] : [len * it.aspect, len];

  /* ---------- state ---------- */
  let shape = 'sphere';
  let filter = FILTERS[0];
  let mode = 'cloud';           // cloud | about | offer | case | focus
  let hovered = null;
  let opened = false;
  let zoomed = null;            // the card that grows into the pop-up
  let zoomRect = null;          // screen rect the focused card grows into
  let px = -1e4, py = -1e4;     // pointer in screen px
  let W = 1, H = 1;
  let rotY = .6, velY = 0, tiltX = 0, velX = 0;
  let zoom = 1;
  let shapeBlend = 0;           // 0 = free spinning (sphere), 1 = flat shape facing camera
  let aboutBlend = 0;
  let caseBlend = 0;
  let zoomBlend = 0;
  let gridScroll = 0, gridScrollMax = 0;
  // on a tall (phone) screen the shapes stretch to fill its height and the
  // cards grow, so the cloud uses the whole screen instead of a square in the middle
  let stretchX = 1, stretchY = 1, cardBoost = 1;
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
      // a group takes neighbouring columns at the same height, side by side
      const runs = [];
      for (const it of vis) {
        const last = runs[runs.length - 1];
        if (last && last[0].unit === it.unit && last.length < cols) last.push(it); else runs.push([it]);
      }
      for (const run of runs) {
        let c0 = 0, best = Infinity;
        for (let c = 0; c + run.length <= cols; c++) {
          const top = Math.max(...heights.slice(c, c + run.length));
          if (top < best - 1e-6) { best = top; c0 = c; }
        }
        run.forEach((it, k) => {
          const c = c0 + k, h = cardW / it.aspect;
          it.grid = { x: (c - (cols - 1) / 2) * colW, top: best, h, w: cardW };
          heights[c] = best + h + gap;
        });
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
    // each group takes one point of the shape and its cards sit side by side there
    const groups = [];
    for (const it of vis) {
      const last = groups[groups.length - 1];
      if (last && last[0].unit === it.unit) last.push(it); else groups.push([it]);
    }
    const nu = groups.length;
    const v = new THREE.Vector3(), east = new THREE.Vector3();
    groups.forEach((members, i) => {
      shapePoint(i, nu, v);
      const m = members.length;
      if (shape === 'sphere') {
        // step along the sphere's latitude, staying on its surface
        east.set(v.z, 0, -v.x);
        if (east.lengthSq() < 1e-4) east.set(1, 0, 0);
        east.normalize();
      } else east.set(1, 0, 0);
      const step = shape === 'sphere' ? NEIGHBOUR * 1.15 : CARD * SHAPE_CARD[shape] * 1.04;
      members.forEach((it, k) => {
        it.target.copy(v).addScaledVector(east, (k - (m - 1) / 2) * step);
        if (shape === 'sphere' && m > 1) {
          const y = it.target.y;
          it.target.y = 0;
          it.target.setLength(Math.sqrt(Math.max(0, R * R - (y / SPHERE_SQUASH) ** 2)) || it.target.length());
          it.target.y = y;
        }
      });
    });

    function shapePoint(i, n, v) {
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
    }

    const tall = aspect < .8;
    cardBoost = tall ? 1.25 : 1;
    const maxX = Math.max(.5, ...vis.map(it => Math.abs(it.target.x)));
    const maxY = Math.max(.5, ...vis.map(it => Math.abs(it.target.y)));
    // leave room for the header above, the controls below and a margin at the sides
    const half = CARD * SHAPE_CARD[shape] * cardBoost / 2;
    const roomX = halfH * aspect * .94 - half, roomY = halfH * .74 - half;
    if (!tall) stretchX = stretchY = 1;
    else if (shape === 'sphere') { stretchX = 1; stretchY = THREE.MathUtils.clamp(roomY / maxY, 1, 3); }
    else {
      // flat shapes keep their form: grow evenly to the screen width, stretch only a little
      stretchX = THREE.MathUtils.clamp(Math.min(roomX / maxX, roomY / maxY), 1, 1.8);
      stretchY = THREE.MathUtils.clamp(roomY / maxY, stretchX, stretchX * 1.3);
    }
  }

  function resize() {
    W = stage.clientWidth || innerWidth; H = stage.clientHeight || innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    layout();
    if (mode === 'focus') placeFocus();
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

  function setLetters(btn, text) {
    if (btn.dataset.text === text) return;
    btn.dataset.text = text;
    const wrap = btn.querySelector('.cl-letters');
    const old = [...wrap.children];
    old.forEach((s, i) => { s.style.transitionDelay = `${i * 14}ms`; s.classList.add('out'); });
    setTimeout(() => {
      wrap.innerHTML = [...text].map(ch => `<span class="out">${ch}</span>`).join('');
      [...wrap.children].forEach((s, i) => { s.style.transitionDelay = `${i * 22}ms`; });
      requestAnimationFrame(() => requestAnimationFrame(() => [...wrap.children].forEach(s => s.classList.remove('out'))));
    }, old.length ? 200 : 0);
  }
  setLetters(aboutBtn, 'about me');
  setLetters(offerBtn, 'work with me');

  function setMode(m) {
    mode = m;
    ui.dataset.mode = m;
    if (m !== 'cloud') setHover(null);
  }
  // the two text panels: 'about', 'offer', or null to close
  const panelOpen = () => mode === 'about' || mode === 'offer';
  function openPanel(name) {
    if (name === (panelOpen() ? mode : null)) return;
    if (name && opened) closeCase();
    if (name && mode === 'focus') closeFocus();
    setMode(name || 'cloud');
    aboutBtn.setAttribute('aria-expanded', String(name === 'about'));
    offerBtn.setAttribute('aria-expanded', String(name === 'offer'));
    setLetters(aboutBtn, name === 'about' ? 'close' : 'about me');
    setLetters(offerBtn, name === 'offer' ? 'close' : 'work with me');
    setUrl(name ? { panel: name } : {});
  }
  aboutBtn.addEventListener('click', () => openPanel(mode === 'about' ? null : 'about'));
  offerBtn.addEventListener('click', () => openPanel(mode === 'offer' ? null : 'offer'));

  // an open project or panel has its own address (/?p=slug, /?panel=offer), so it can be shared
  function setUrl(params) {
    const u = new URL(location.href);
    u.searchParams.delete('p');
    u.searchParams.delete('panel');
    for (const [key, val] of Object.entries(params)) if (val) u.searchParams.set(key, val);
    if (u.href !== location.href) history.replaceState(history.state, '', u);
  }
  function openFromUrl() {
    const q = new URLSearchParams(location.search);
    const slug = q.get('p'), panel = q.get('panel');
    const it = slug && items.find(x => x.project.slug === slug);
    if (it) openFocus(it);
    else if (panel === 'about' || panel === 'offer') openPanel(panel);
    else setUrl({});
  }

  /* ---------- pop-up: a card zooms in, the case study opens on top of it ---------- */
  let returnFocus = null;
  let openedAt = 0;
  let winTimer = 0;
  // the window is only for pages linked from the about panel
  function openWindow(url, title, accent) {
    opened = true;
    openedAt = performance.now();
    $('.cl-case-title').textContent = title;
    $('.cl-case-dot').style.background = accent || '#fff';
    caseFrame.src = url;
    returnFocus = document.activeElement;
    caseEl.hidden = false;
    setMode('case');
    clearTimeout(winTimer);
    winTimer = setTimeout(() => caseEl.classList.add('open'), 30);
    $('.cl-case-close').focus({ preventScroll: true });
    say(`${title} opened`);
  }
  function closeCase() {
    if (!opened) return;
    opened = false;
    clearTimeout(winTimer);
    caseEl.classList.remove('open');
    setTimeout(() => { if (!opened) setMode('cloud'); }, reduceMotion ? 0 : 260);
    setTimeout(() => { if (!opened) { caseEl.hidden = true; caseFrame.src = 'about:blank'; } }, 420);
    if (returnFocus && returnFocus.focus) returnFocus.focus({ preventScroll: true });
  }

  // try with sound (the click still counts as the user's gesture), else muted
  function playFilm(player) {
    if (!player) return;
    customElements.whenDefined('mux-player').then(() => {
      const p = player.play && player.play();
      if (p && p.catch) p.catch(() => { player.muted = true; player.play().catch(() => {}); });
    });
  }

  // Mux's player is a web component, loaded the first time a film is shown
  let muxLoading = null;
  function loadMuxPlayer() {
    if (muxLoading || customElements.get('mux-player')) return;
    muxLoading = import('https://cdn.jsdelivr.net/npm/@mux/mux-player@3.14.0/dist/mux-player.mjs').catch(err => console.warn('mux player failed to load', err));
  }

  /* ---------- focus: the clicked card scales up and plays its film; only its tag stays ---------- */
  let focusTimer = 0;
  let focusMedia = [];
  let focusIndex = 0;
  let focusShown = null;        // the project whose tags are showing
  let focusLines = [], focusMore = [], focusExpanded = false;   // its text, and the rest behind "…"
  // everything a project can show when opened, in order: a live site, then its
  // videos and images (images first for an image project). Arrows step through them.
  function mediaOf(p, site) {
    const type = kind(p);
    const videos = [
      ...(muxId(p) ? [{ mux: muxId(p) }] : p.vimeo && type !== 'site' ? [{ vimeo: p.vimeo }] : []),
      ...(p.moreMux || []).filter(m => m && m.playbackId).map(m => ({ mux: m.playbackId })),
    ];
    const images = [p.image, ...(p.moreImages || [])].filter(Boolean).map(img => ({ img }));
    const list = type === 'image' ? [...images, ...videos] : [...videos, ...images];
    if (site && p.siteEmbed) list.unshift({ site });
    // nothing to show but a card image: show that
    if (!list.length && (p.thumb || p.hero)) list.push({ img: p.thumb || p.hero });
    return list;
  }
  function mediaHtml(m, p) {
    if (m.site) return `<iframe src="${esc(m.site)}" title="${esc(p.name)} site" loading="eager" referrerpolicy="no-referrer-when-downgrade" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox" allow="fullscreen; autoplay"></iframe>`;
    if (m.img) return `<img src="${esc(sized(m.img, 2000))}" alt="${esc(p.name || '')}">`;
    if (m.mux) {
      loadMuxPlayer();
      return `<mux-player playback-id="${esc(m.mux)}" stream-type="on-demand" thumbnail-time="0" accent-color="#26262b" primary-color="#ffffff" title="${esc(p.name)}" metadata-video-title="${esc(p.name)}"></mux-player>`;
    }
    if (m.vimeo) return `<iframe src="https://player.vimeo.com/video/${encodeURIComponent(m.vimeo)}?autoplay=1&title=0&byline=0&portrait=0&dnt=1" title="${esc(p.name)} film" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    return '';
  }
  function showMedia(play) {
    const m = focusMedia[focusIndex];
    if (m && m.project !== focusShown) {
      showProject(m.project);
      placeFocus();
      if (play) say(m.project.name || 'untitled');
    }
    playEl.innerHTML = m ? mediaHtml(m, m.project) : '';
    focusCount.textContent = `${focusIndex + 1}/${focusMedia.length}`;
    // warm up the next image so stepping feels instant
    const next = focusMedia[(focusIndex + 1) % focusMedia.length];
    if (next && next.img) new Image().src = sized(next.img, 2000);
    if (play) playFilm(playEl.querySelector('mux-player'));
  }
  function stepMedia(dir) {
    if (mode !== 'focus' || focusMedia.length < 2) return;
    focusIndex = (focusIndex + dir + focusMedia.length) % focusMedia.length;
    showMedia(true);
    playEl.classList.toggle('on', !!playEl.firstElementChild);
  }
  $('.cl-focus-prev').addEventListener('click', () => stepMedia(-1));
  $('.cl-focus-next').addEventListener('click', () => stepMedia(1));
  function focusRectFor(it) {
    const small = W <= 640;
    // leave room above for the tags and below for the text
    const maxW = W - (small ? 32 : 160), maxH = H - (small ? 260 : 250);
    let w = maxW, h = w / it.aspect;
    if (h > maxH) { h = maxH; w = h * it.aspect; }
    return { cx: W / 2, cy: H / 2 - (small ? 30 : 20), w, h };
  }
  function placeFocus() {
    if (!zoomed) return;
    const r = zoomRect = focusRectFor(zoomed);
    const left = r.cx - r.w / 2, top = r.cy - r.h / 2;
    Object.assign(playEl.style, { left: `${left}px`, top: `${top}px`, width: `${r.w}px`, height: `${r.h}px` });
    focusTag.style.transform = `translate3d(${left - 1}px,${top - focusTag.offsetHeight}px,0)`;
    // the minimise button sits right after the title tag, same height
    focusMin.style.height = `${focusTag.offsetHeight}px`;
    focusMin.style.transform = `translate3d(${left - 1 + focusTag.offsetWidth + 1}px,${top - focusTag.offsetHeight}px,0)`;
    let x = left - 1 + focusTag.offsetWidth + focusMin.offsetWidth + 2;
    for (const el of [focusSite, focusNav]) {
      if (el.hidden) continue;
      el.style.height = `${focusTag.offsetHeight}px`;
      el.style.transform = `translate3d(${x}px,${top - focusTag.offsetHeight}px,0)`;
      x += el.offsetWidth + 1;
    }
    focusInfo.style.maxWidth = `${Math.round(r.w) + 2}px`;
    // the opened text stays under the film, a few lines tall, and scrolls with a fade
    const below = H - (top + r.h) - 64;   // clear of the shape and filter controls
    focusInfo.style.maxHeight = focusExpanded ? `${Math.round(Math.max(below, 76))}px` : '';
    const lift = Math.max(0, focusInfo.offsetHeight - below);
    fadeInfo();
    focusInfo.style.transform = `translate3d(${left - 1}px,${top + r.h - (focusExpanded ? lift : 0)}px,0)`;
  }
  const siteOf = p => /^https?:\/\//i.test(p.siteUrl || '') ? p.siteUrl : '';
  // the tags for one project: its title, its text and its site link
  function showProject(p) {
    focusShown = p;
    focusTag.textContent = tagOf(p);
    setUrl({ p: p.slug });
    // its own text, else the group's, else the older one-liner and credits
    const own = p.text || (p.group && p.group.text);
    const info = own
      ? [String(own).trim()]
      : [firstSentence(String(p.oneline || '')), [p.client, p.role].filter(Boolean).join(' · ')].filter(Boolean);
    // the rest of the story (the older case study text), behind "…"
    const shown = info.join(' ');
    const rest = [p.oneline, p.idea, p.challenge, p.system, p.result, p.contribution]
      .map(t => String(t || '').trim())
      .map(t => t && shown.includes(firstSentence(t)) ? t.slice(firstSentence(t).length).trim() : t)
      .filter(t => t && !shown.includes(t));
    if (Array.isArray(p.credits) && p.credits.length) rest.push(p.credits.join(' · '));
    focusLines = info;
    focusMore = rest;
    focusExpanded = false;
    renderInfo();
    // an optional link to the live site, opened in a new tab
    const site = siteOf(p);
    focusSite.hidden = !site;
    if (site) focusSite.href = site;
  }
  function renderInfo() {
    const lines = focusExpanded ? [...focusLines, ...focusMore] : focusLines;
    const toggle = focusMore.length
      ? ` <button type="button" class="cl-focus-more" aria-expanded="${focusExpanded}" aria-label="${focusExpanded ? 'Less' : 'More about this project'}">${focusExpanded ? 'less' : '…'}</button>`
      : '';
    const at = focusExpanded ? lines.length - 1 : 0;
    focusInfo.innerHTML = lines.map((line, i) =>
      `<span${i >= focusLines.length ? ' class="more"' : ''}>${esc(line.toLowerCase())}${i === at ? toggle : ''}</span>`).join('');
    focusInfo.hidden = !lines.length;
    focusInfo.scrollTop = 0;
    focusInfo.classList.toggle('is-open', focusExpanded);
  }
  // fade the bottom edge while there is more to scroll to
  function fadeInfo() {
    const more = focusExpanded && focusInfo.scrollTop + focusInfo.clientHeight < focusInfo.scrollHeight - 2;
    focusInfo.classList.toggle('has-more', more);
  }
  focusInfo.addEventListener('scroll', fadeInfo, { passive: true });
  focusInfo.addEventListener('click', e => {
    if (!e.target.closest('.cl-focus-more')) return;
    focusExpanded = !focusExpanded;
    renderInfo();
    placeFocus();
    focusInfo.querySelector('.cl-focus-more').focus({ preventScroll: true });
  });
  function openFocus(it) {
    const p = it.project;
    zoomed = it;
    openedAt = performance.now();
    setMode('focus');
    // title, minimise and text tag share the project's colour
    for (const el of [focusTag, focusMin, focusSite, focusNav, focusInfo]) {
      el.style.background = it.accent;
      el.style.color = isLight(it.accent) ? '#000' : '#fff';
    }
    // every video, image and site of the clicked project's group, in group
    // order; a project with nothing to show still gets a stop for its text
    focusMedia = it.members.flatMap(m => {
      const list = mediaOf(m.project, siteOf(m.project));
      return (list.length ? list : [{}]).map(x => ({ ...x, project: m.project }));
    });
    focusIndex = Math.max(0, focusMedia.findIndex(x => x.project === p));
    focusShown = null;
    focusNav.hidden = focusMedia.length < 2;
    showMedia(false);
    clearTimeout(focusTimer);
    // let the card scale up first, then lay the playing film exactly over it
    focusTimer = setTimeout(() => {
      for (const el of [focusTag, focusMin, focusSite, focusNav, focusInfo]) el.classList.add('on');
      focusMin.focus({ preventScroll: true });
      if (!playEl.firstElementChild) return;
      playEl.classList.add('on');
      playFilm(playEl.querySelector('mux-player'));
    }, reduceMotion ? 30 : 560);
    say(p.name || 'untitled');
  }
  focusMin.addEventListener('click', () => closeFocus());
  function closeFocus() {
    if (mode !== 'focus') return;
    clearTimeout(focusTimer);
    playEl.classList.remove('on');
    for (const el of [focusTag, focusMin, focusSite, focusNav, focusInfo]) el.classList.remove('on');
    // the film fades, then the card scales back into the cloud
    setTimeout(() => { if (mode !== 'focus') playEl.innerHTML = ''; }, 260);
    zoomed = null;
    zoomRect = null;
    setMode('cloud');
    setUrl({});
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
      openPanel(null);
      openWindow(a.getAttribute('href'), a.textContent, '');
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
    if (mode === 'focus' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { stepMedia(e.key === 'ArrowLeft' ? -1 : 1); return; }
    if (e.key !== 'Escape') return;
    if (mode === 'case') closeCase();
    else if (mode === 'focus') closeFocus();
    else if (panelOpen()) openPanel(null);
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
    if (!click) return;
    if (mode === 'focus') { closeFocus(); return; }   // a click outside the film closes it
    if (mode !== 'cloud') return;
    if (e.pointerType !== 'mouse') ndc.set(e.clientX / W * 2 - 1, -(e.clientY / H) * 2 + 1);
    const hit = pick();
    if (hit) openFocus(hit);
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
    aboutBlend += ((panelOpen() ? 1 : 0) - aboutBlend) * k(.09);
    caseBlend += ((mode === 'case' || mode === 'focus' ? 1 : 0) - caseBlend) * k(.12);
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
      else { target.applyQuaternion(q); target.x *= stretchX; target.y *= stretchY; }
      // step back for the about text; recoil from a card that is zooming in
      const spread = 1 + aboutBlend * .25 + (it === zoomed ? 0 : zoomBlend * .45);
      if (spread > 1.001) target.multiplyScalar(spread);
      // cards near the pointer lean toward the viewer
      const d2 = (it.sx - px) ** 2 + (it.sy - py) ** 2;
      const near = mode === 'cloud' && pointerIn && !reduceMotion ? Math.exp(-d2 / (2 * 130 * 130)) : 0;
      it.near += (near - it.near) * k(.1);
      target.z += it.near * .6;

      let len = shape === 'grid' && it.grid ? Math.max(it.grid.w, it.grid.h) : CARD * SHAPE_CARD[shape] * cardBoost;
      len *= 1 + it.hover * .18 + it.near * .08;
      if (it === zoomed) {
        if (zoomRect) {
          // land exactly on the film slot: screen px → world units at ZOOM_D
          const u = 2 * halfTan * ZOOM_D / H;
          target.set((zoomRect.cx - W / 2) * u, (H / 2 - zoomRect.cy) * u, camera.position.z - ZOOM_D);
          len = (it.aspect >= 1 ? zoomRect.w : zoomRect.h) * u;
        } else {
          target.set(0, 0, camera.position.z - ZOOM_D);
          len = zoomLen(it);
        }
      }
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
      openFromUrl();
    }
  }

  function updateOverlay(now, onCount) {
    overlay.style.opacity = mode === 'cloud' && readyShown ? '1' : '0';
    let r, text, color = '';
    if (hovered) {
      r = cardRect(hovered); text = tagOf(hovered.project); color = hovered.accent;
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
        slot.el.textContent = (it.project.name || 'untitled').toLowerCase();
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
