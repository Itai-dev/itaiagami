/* /3d-test: the homepage as a walk through a dark exhibition of the work.

   The page itself is ordinary HTML: chapters (<section data-chapter>) holding
   the projects (<article data-slug>), with their names, disciplines, years,
   descriptions and links. That HTML is the content; this file only adds a
   scene behind it. Scrolling the page moves the camera; where the camera is,
   is decided by which chapter is on screen. If WebGL is missing, the visitor
   prefers reduced motion, or anything here throws, the page stays what it is
   underneath: a plain, readable portfolio (html.no3d).

   Rendering is on demand: a frame is drawn only when the camera moved, a
   texture arrived, something is easing, or a video is playing. */
import { CatmullRomCurve3, FogExp2, PerspectiveCamera, Raycaster, Scene, Vector2, Vector3, WebGLRenderer } from 'three';
import { DESKTOP, MOBILE } from './layout.js';
import { World } from './world.js';

const html = document.documentElement;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const debug = new URLSearchParams(location.search).has('debug');

function fallback(reason) {
  console.warn('[3d-test] static page:', reason);
  html.classList.remove('has3d', 'gl-ready');
  html.classList.add('no3d');
}

const isMobile = () => innerWidth < 760 || (innerWidth < 1024 && innerHeight > innerWidth * 1.2);

function boot() {
  const stage = $('.stage'), canvas = $('#gl'), tip = $('.tip');
  const chapters = $$('[data-chapter]');
  const articles = new Map($$('article[data-slug]').map((a) => [a.dataset.slug, a]));

  let mobile = isMobile();
  let mode = mobile ? MOBILE : DESKTOP;

  const renderer = new WebGLRenderer({ canvas, antialias: devicePixelRatio < 1.5, powerPreference: 'high-performance', stencil: false });
  renderer.setClearColor('#050505');
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fallback('context lost'); });

  // pixel ratio: capped, and stepped down while frames run long
  const dprCap = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75);
  let dpr = dprCap;
  renderer.setPixelRatio(dpr);

  const scene = new Scene();
  const camera = new PerspectiveCamera(mode.fov, 1, 0.1, 420);
  let world, posCurve, lookCurve, times = [];

  function build() {
    if (world) world.dispose();
    scene.fog = new FogExp2('#050505', mode.fog);
    camera.fov = mode.fov;
    world = new World(scene, renderer, mode, mobile || (navigator.connection && navigator.connection.saveData) ? 'sm' : 'lg');
    posCurve = new CatmullRomCurve3(mode.keys.map((k) => new Vector3(...k.pos)), false, 'centripetal');
    lookCurve = new CatmullRomCurve3(mode.keys.map((k) => new Vector3(...k.look)), false, 'centripetal');
    measure();
  }

  // where each camera key sits in the page's scroll, from the chapter it belongs to
  function measure() {
    const max = Math.max(1, html.scrollHeight - innerHeight);
    times = mode.keys.map((k) => {
      const s = chapters[k.ch], top = s.getBoundingClientRect().top + scrollY;
      return clamp((top + k.at * s.offsetHeight) / max, 0, 1);
    });
    for (let i = 1; i < times.length; i++) times[i] = Math.max(times[i], times[i - 1] + 1e-4);
  }

  function size() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
  }

  /** Scroll progress (0..1) to a point on the camera path. Each stretch eases in and out, so the camera settles on each composition. */
  function pathAt(p, pos, look) {
    let i = 0;
    while (i < times.length - 2 && p > times[i + 1]) i++;
    const s = clamp((p - times[i]) / (times[i + 1] - times[i]), 0, 1);
    const u = (i + lerp(s, smoother(s), 0.55)) / (times.length - 1);
    posCurve.getPoint(u, pos);
    lookCurve.getPoint(u, look);
  }

  const progress = () => clamp(scrollY / Math.max(1, html.scrollHeight - innerHeight), 0, 1);
  let p = progress();                  // the camera's progress, chasing the scroll
  const ptr = new Vector2(), ptrTo = new Vector2(), ndc = new Vector2(2, 2);
  const pos = new Vector3(), look = new Vector3(), fpos = new Vector3(), flook = new Vector3();
  const right = new Vector3(), up = new Vector3(), last = new Vector3(), lastLook = new Vector3();
  const ray = new Raycaster();
  let hovered = null, focused = null, f = 0, focusScroll = 0, picked = true, dirty = true;

  /* ---------- focus: fly to a screen, open its project ---------- */

  function fitDistance(item) {
    const t = Math.tan((camera.fov * Math.PI) / 360);
    const need = Math.max(item.h / (mobile ? 0.5 : 0.62), item.w / camera.aspect / (mobile ? 0.86 : 0.58));
    return need / 2 / t;
  }

  function focusOn(item) {
    if (!item) return;
    focused = item;
    focusScroll = scrollY;
    fpos.copy(item.center).addScaledVector(item.normal, fitDistance(item));
    flook.copy(item.center);
    // on desktop the screen sits right of centre, clear of the project's text at the bottom left
    // on a phone it sits in the upper third, above the text
    if (!mobile) {
      const side = new Vector3(0, 1, 0).cross(item.normal).normalize().multiplyScalar(-item.w * 0.19);
      fpos.add(side); flook.add(side);
    } else {
      fpos.y -= item.h * 0.34; flook.y -= item.h * 0.34;
    }
    for (const [slug, a] of articles) a.classList.toggle('open', slug === item.slug);
    html.classList.add('focusing');
    tip.classList.remove('on');
    dirty = true;
  }

  function unfocus() {
    if (!focused) return;
    focused = null;
    for (const a of articles.values()) a.classList.remove('open');
    html.classList.remove('focusing');
    dirty = true;
  }

  /* ---------- input ---------- */

  addEventListener('scroll', () => {
    if (focused && Math.abs(scrollY - focusScroll) > 80) unfocus();
    dirty = true;
  }, { passive: true });

  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    ptrTo.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    if (e.target === canvas) { ndc.copy(ptrTo); tip.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 14}px)`; }
    else ndc.set(2, 2);
    picked = false;
  }, { passive: true });
  canvas.addEventListener('pointerleave', () => { ndc.set(2, 2); picked = false; });

  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
    if (e.pointerType !== 'mouse') { ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); pick(); }
    if (hovered && hovered !== focused) focusOn(hovered);
    else unfocus();
    if (e.pointerType !== 'mouse') { ndc.set(2, 2); hovered = null; }
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') unfocus(); });
  $$('.work .close').forEach((b) => b.addEventListener('click', unfocus));
  // keyboard: tabbing onto a project's link flies to it; its link still opens the case study
  for (const [slug, a] of articles) {
    a.addEventListener('focusin', (e) => {
      if (!e.target.matches(':focus-visible') || (focused && focused.slug === slug)) return;
      focusOn(world.items.find((i) => i.slug === slug));
    });
  }

  function pick() {
    picked = true;
    let hit = null;
    if (ndc.x <= 1) {
      ray.setFromCamera(ndc, camera);
      const h = ray.intersectObjects(world.items.map((i) => i.mesh), false)[0];
      hit = h ? h.object.userData.item : null;
    }
    if (hit === hovered) return;
    hovered = hit;
    canvas.style.cursor = hit ? 'pointer' : '';
    for (const [slug, a] of articles) a.classList.toggle('hot', !!hit && slug === hit.slug);
    if (hit) {
      const a = articles.get(hit.slug);
      tip.firstChild.textContent = a.dataset.name;
      tip.lastChild.textContent = a.dataset.meta;
    }
    tip.classList.toggle('on', !!hit && hit !== focused);
    dirty = true;
  }

  /* ---------- chapters: the text that belongs to where the camera is ---------- */

  let chapterOn = -1;
  function chapterAt() {
    const mid = scrollY + innerHeight * 0.5;
    let on = 0;
    chapters.forEach((s, i) => { if (s.getBoundingClientRect().top + scrollY <= mid) on = i; });
    if (on !== chapterOn) { chapterOn = on; chapters.forEach((s, i) => s.classList.toggle('on', i === on)); }
  }

  /* ---------- loop ---------- */

  let then = performance.now(), frames = [], firstFrame = true, hud = null, rendered = 0, fpsT = then, fps = 0, frameMs = 0;
  if (debug) { hud = document.createElement('pre'); hud.className = 'hud'; document.body.appendChild(hud); }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - then) / 1000);
    then = now;

    // the camera chases the scroll with weight: a time constant of ~0.4s, never a spring
    const target = progress();
    p += (target - p) * (1 - Math.exp(-dt * 2.6));
    if (Math.abs(target - p) < 1e-5) p = target;
    ptr.lerp(ptrTo, 1 - Math.exp(-dt * 2.2));
    f += ((focused ? 1 : 0) - f) * (1 - Math.exp(-dt * 2.8));
    if (Math.abs(f - (focused ? 1 : 0)) < 1e-4) f = focused ? 1 : 0;

    pathAt(p, pos, look);
    // restrained parallax: the camera shifts a little with the pointer, the target does not
    camera.position.copy(pos);
    camera.lookAt(look);
    right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    const par = mobile ? 0 : 0.42 * (1 - f * 0.8);
    pos.addScaledVector(right, ptr.x * par).addScaledVector(up, ptr.y * par * 0.55);
    if (f > 0) {
      const e = smoother(clamp(f, 0, 1));
      pos.lerp(fpos, e);
      look.lerp(flook, e);
    }
    camera.position.copy(pos);
    camera.lookAt(look);
    camera.updateMatrixWorld();

    const moved = pos.distanceToSquared(last) > 1e-8 || look.distanceToSquared(lastLook) > 1e-8;
    last.copy(pos); lastLook.copy(look);
    if (moved) { chapterAt(); picked = false; }
    if (!picked) pick();

    const changed = world.update(camera, dt, { hovered, focused });
    if (hud && now - fpsT > 500) {
      fps = Math.round((rendered * 1000) / (now - fpsT)); rendered = 0; fpsT = now;
      const r = renderer.info, s = world.stats;
      hud.textContent = `${mobile ? 'mobile' : 'desktop'}  ${fps} frames/s drawn (0 = idle)\ndpr ${dpr.toFixed(2)}  calls ${r.render.calls}  tris ${r.render.triangles}\ntextures ${r.memory.textures}  full-size ${s.hi}/${s.screens}  videos ${s.videos}\nprogress ${p.toFixed(3)}  frame ${(frameMs).toFixed(1)}ms`;
    }
    if (!(moved || changed || dirty)) return;
    dirty = false;
    const t0 = performance.now();
    renderer.render(scene, camera);
    frameMs = frameMs * 0.9 + (performance.now() - t0) * 0.1;
    rendered++;

    if (firstFrame) {
      firstFrame = false;
      requestAnimationFrame(() => html.classList.add('gl-ready'));
      setTimeout(() => { const ps = $('.poster'); if (ps) ps.remove(); }, 1800);
    }
    adapt(dt);
  }

  // adaptive quality: if frames run long for a second, step the pixel ratio down (never below 1)
  function adapt(dt) {
    if (document.hidden) { frames = []; return; }
    frames.push(dt);
    if (frames.length < 60) return;
    const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
    frames = [];
    if (avg > 1 / 45 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); renderer.setPixelRatio(dpr); size(); }
  }

  let resizeT = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      if (isMobile() !== mobile) { mobile = !mobile; mode = mobile ? MOBILE : DESKTOP; unfocus(); build(); }
      measure(); size();
    }, 120);
  });
  addEventListener('load', measure);

  build();
  size();
  chapterAt();
  // ?debug: a handle for tests, which project screens to page coordinates
  if (debug) window.__3d = {
    screen(i) {
      const it = world.items[i], v = it.center.clone().project(camera);
      return { slug: it.slug, x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, inView: Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && v.z < 1 };
    },
    get count() { return world.items.length; },
    get focused() { return focused && focused.slug; },
    get dims() { return world.items.map((i) => i.slug + ':' + i.dim.toFixed(2) + ':' + i.state); },
  };
  requestAnimationFrame(frame);
}

if (html.classList.contains('has3d')) {
  try { boot(); } catch (e) { fallback(e); }
}
