/* ============================================================
   cx-kit: shared pieces for the bespoke case-study pages (cx-*.js).
   Each case page imports what it needs:

     import { THREE, makeStage, runWhileVisible, turnToFace, scrollProgress,
              pointer, roundedBox, canvasTexture, muxTexture, imageTexture,
              calm } from './cx-kit.js';

   Rules every scene follows (the kit does most of it):
   - Progressive enhancement: the page's poster image stays until the first
     frame is drawn; without WebGL it stays for good.
   - Reduced motion: no autoplay, drift or tilt; one still frame, and only
     direct interaction (a click, a key) animates briefly.
   - Renders only while on screen and while the tab is visible.
   ============================================================ */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.186.1/+esm';
export { THREE };

export const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = !!(navigator.connection && navigator.connection.saveData);

/* A renderer inside a stage element (.cx-stage). Returns null without WebGL. */
export function makeStage(stage, { shadows = true, exposure = 1.05, alpha = true } = {}) {
  if (!stage) return null;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha, powerPreference: 'high-performance' });
  } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  if (shadows) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; /* soft edges come from light.shadow.radius */ }
  renderer.domElement.className = 'cx-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  const sizeHooks = [];
  const resize = () => {
    const w = stage.clientWidth || 1, h = stage.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    sizeHooks.forEach((f) => f(w, h));
  };
  new ResizeObserver(resize).observe(stage);
  resize();
  let shown = false;
  /* call after the first render: swaps the poster for the live canvas */
  const reveal = () => {
    if (shown) return; shown = true;
    stage.appendChild(renderer.domElement);
    stage.classList.add('live');
  };
  return { renderer, scene, camera, reveal, onResize: (f) => { sizeHooks.push(f); resize(); } };
}

/* Calls frame(t, dt) every animation frame while `el` is on screen and the
   tab is visible. With reduced motion it draws once, then again only for
   `wake()` (call it from a click or key handler) for ~1.2 s. */
export function runWhileVisible(el, frame) {
  /* elapsed time pauses while the scene is off screen (THREE.Clock is deprecated) */
  let elapsed = 0, last = 0;
  const clock = { getDelta() { const now = performance.now() / 1000; const d = last ? now - last : 0; last = now; elapsed += Math.min(d, 0.25); return d; }, get elapsedTime() { return elapsed; } };
  let inView = true, running = false, wakeUntil = 0;
  const loop = () => {
    if (running) return;
    running = true;
    const tick = () => {
      if (!inView || document.hidden) { running = false; last = 0; return; }
      const dt = Math.min(clock.getDelta(), 0.05);
      frame(clock.elapsedTime, dt);
      if (calm && performance.now() > wakeUntil) { running = false; last = 0; return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  new IntersectionObserver((es) => { inView = es[0].isIntersecting; if (inView) loop(); }).observe(el);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(); });
  loop();
  return { wake: () => { wakeUntil = performance.now() + 1200; loop(); }, isInView: () => inView };
}

/* Adds .in to elements as they scroll into view (CSS does the turning). */
export function turnToFace(selector = '.cx-turn', opts = {}) {
  const els = document.querySelectorAll(selector);
  if (!('IntersectionObserver' in window) || calm) { els.forEach((e) => e.classList.add('in')); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: opts.threshold ?? 0.25, rootMargin: opts.rootMargin ?? '0px 0px -10% 0px' });
  els.forEach((e) => io.observe(e));
}

/* 0 when `el`'s top is at the top of the viewport, 1 when it has scrolled
   one full height past it. `through: true` gives 0..1 across the whole
   time the element crosses the viewport instead. */
export function scrollProgress(el, { through = false } = {}) {
  let v = 0;
  const update = () => {
    const r = el.getBoundingClientRect();
    v = through
      ? Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + r.height)))
      : Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
  };
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();
  return () => v;
}

/* Normalised pointer position (-0.5..0.5), frozen at 0 for reduced motion. */
export const pointer = { x: 0, y: 0 };
if (!calm) addEventListener('pointermove', (e) => { pointer.x = e.clientX / innerWidth - 0.5; pointer.y = e.clientY / innerHeight - 0.5; }, { passive: true });

/* A box with softened vertical edges, sitting on y = 0. */
export function roundedBox(w, h, d, r = Math.min(w, d) * 0.12) {
  const s = new THREE.Shape();
  const x = -w / 2, z = -d / 2;
  r = Math.min(r, w / 2, d / 2);
  s.moveTo(x + r, z);
  s.lineTo(x + w - r, z); s.quadraticCurveTo(x + w, z, x + w, z + r);
  s.lineTo(x + w, z + d - r); s.quadraticCurveTo(x + w, z + d, x + w - r, z + d);
  s.lineTo(x + r, z + d); s.quadraticCurveTo(x, z + d, x, z + d - r);
  s.lineTo(x, z + r); s.quadraticCurveTo(x, z, x + r, z);
  const b = Math.min(r * 0.5, h * 0.3);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, h - 2 * b), bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 3, curveSegments: 6 });
  g.rotateX(Math.PI / 2);
  g.translate(0, h - b, 0);
  g.computeVertexNormals();
  return g;
}

/* A texture drawn with the 2D canvas API: draw(ctx, w, h). */
export function canvasTexture(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.redraw = (fn) => { fn(ctx, w, h); tex.needsUpdate = true; };
  return tex;
}

/* An image (same-origin, or any CORS-enabled URL such as image.mux.com) as a texture. */
export function imageTexture(url) {
  const tex = new THREE.TextureLoader().setCrossOrigin('anonymous').load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/* A short muted loop of a Mux film as a texture for a screen in the scene.
   Starts as the film's still at `start`, switches to video once it plays.
   Reduced motion or data saver: the still only. */
let muxModule = null;
export function muxTexture(playbackId, start = 0, end = 8, { width = 1280 } = {}) {
  const still = imageTexture(`https://image.mux.com/${encodeURIComponent(playbackId)}/thumbnail.webp?width=${width}&time=${start}`);
  const holder = { texture: still, video: null };
  if (calm || saveData) return holder;
  const src = `https://stream.mux.com/${encodeURIComponent(playbackId)}.m3u8?asset_start_time=${start}&asset_end_time=${end}`;
  const native = document.createElement('video').canPlayType('application/vnd.apple.mpegurl') !== '';
  const attach = (video) => {
    video.muted = true; video.loop = true; video.playsInline = true; video.crossOrigin = 'anonymous';
    const vt = new THREE.VideoTexture(video);
    vt.colorSpace = THREE.SRGBColorSpace;
    video.addEventListener('playing', () => { holder.texture = vt; holder.onswap && holder.onswap(vt); }, { once: true });
    holder.video = video;
    video.play().catch(() => {});
  };
  if (native) {
    const v = document.createElement('video');
    v.crossOrigin = 'anonymous'; v.src = src;
    attach(v);
  } else {
    muxModule = muxModule || import('https://cdn.jsdelivr.net/npm/@mux/mux-player@3.14.0/dist/mux-player.mjs').catch(() => null);
    muxModule.then(() => customElements.whenDefined('mux-video')).then(() => {
      const mv = document.createElement('mux-video');
      mv.setAttribute('max-resolution', '720p');
      mv.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none';
      mv.muted = true; mv.setAttribute('muted', ''); mv.setAttribute('playsinline', ''); mv.setAttribute('loop', '');
      mv.setAttribute('src', src);
      document.body.appendChild(mv);
      const el = mv.nativeEl || mv;
      attach(el);
    }).catch(() => {});
  }
  return holder;
}

/* Fit a camera distance so that a width `w` (world units) fills `fill` of the view. */
export function distanceToFit(camera, w, fill = 0.9) {
  return (w / fill) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
}
