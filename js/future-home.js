/* ============================================================
   future-home: the homepage space (index.html, css/future-home.css).

   Every case study is a floating glass window that carries its thumbnail
   and glows in its brand light (the case page's --cx-accent / --cx-bg,
   copied onto each list item as data-accent / data-bg).
   - Hero: the windows drift in depth behind the type.
   - Scrolling steps through the type: they gather into an arc around you.
   - Gallery (pinned): scroll, drag, swipe, the arrow keys, the buttons or
     the list (the rail) move through them; hover or focus brings one
     forward with its name; a click opens the case study.
   The <ol> of links stays the real, accessible list; without WebGL it is
   the gallery itself (a grid of glass cards).
   One draw call per window plus one for the dust: about 20 in all.
   ============================================================ */
import { THREE, makeStage, runWhileVisible, calm, pointer } from './cx-kit.js';

const root = document.documentElement;
const body = document.body;
const world = document.getElementById('fhWorld');
const stageEl = document.getElementById('fhStage');
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t) => t * t * (3 - 2 * t);
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

/* ---------- the featured screen turns to face you (no WebGL needed) ---------- */
(function featureFace() {
  const panel = document.querySelector('.fh-feature .feature-panel');
  if (!panel || calm) return;
  let ticking = false;
  const upd = () => {
    ticking = false;
    const r = panel.getBoundingClientRect();
    const p = clamp((r.top - innerHeight * 0.2) / (innerHeight * 0.7));
    panel.style.setProperty('--fh-face', p.toFixed(3));
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
  addEventListener('resize', upd);
  upd();
})();

/* ---------- brand light: the more vivid of accent and ground, lifted to glow ---------- */
function hexToHsl(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, c = mx - mn;
  let h = 0;
  if (c) h = mx === r ? ((g - b) / c + 6) % 6 : mx === g ? (b - r) / c + 2 : (r - g) / c + 4;
  return { h: h / 6, s: c ? c / (1 - Math.abs(2 * l - 1)) : 0, l, c };
}
function brandLight(accent, bg) {
  const A = hexToHsl(accent), B = hexToHsl(bg);
  const vivid = (x) => x.c * (0.5 + x.l);
  const p = vivid(A) >= vivid(B) ? A : B;
  const out = new THREE.Color().setHSL(p.h, clamp(p.s, 0.5, 0.95), clamp(p.l, 0.52, 0.68), THREE.SRGBColorSpace);
  return { color: out, css: '#' + out.getHexString(THREE.SRGBColorSpace) };
}

/* ---------- the window: glass slab, inset picture, brand glow, in one quad ---------- */
const VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = /* glsl */`
uniform sampler2D uMap;
uniform float uHasMap, uImgAspect, uMargin, uBezel, uRadius, uRadiusIn, uFocus, uAlpha, uGlow, uTheme, uSheen;
uniform vec2 uSize;
uniform vec3 uLight, uBase;
varying vec2 vUv;
float sdRR(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main(){
  vec2 full = uSize + 2.0 * uMargin;
  vec2 p = (vUv - 0.5) * full;
  vec2 hb = uSize * 0.5;
  float d = sdRR(p, hb, uRadius);
  float aa = fwidth(d) * 1.2;
  float inside = 1.0 - smoothstep(-aa, aa, d);

  /* the picture, inset in the glass, cover-fitted */
  vec2 ib = hb - uBezel;
  float di = sdRR(p, ib, uRadiusIn);
  float inImg = 1.0 - smoothstep(-aa, aa, di);
  vec2 iuv = p / (2.0 * ib) + 0.5;
  float wa = ib.x / ib.y;
  if (wa > uImgAspect) iuv.y = (iuv.y - 0.5) * uImgAspect / wa + 0.5;
  else iuv.x = (iuv.x - 0.5) * wa / uImgAspect + 0.5;
  vec3 pic = texture2D(uMap, iuv).rgb;
  vec3 ph = mix(uBase, uLight, 0.25 + 0.45 * smoothstep(-ib.y, ib.y, p.y));
  pic = mix(ph, pic, uHasMap);
  float vig = smoothstep(1.25, 0.35, length(p / ib));
  pic *= mix(0.86, 1.0, vig);
  vec3 paper = vec3(0.95, 0.945, 0.935);
  pic = mix(pic, mix(pic * 0.5, mix(pic, paper, 0.4), uTheme), (1.0 - uFocus) * 0.7);

  /* glass: tinted by the brand, lit from above, a sheen that follows the pointer */
  float top = smoothstep(-hb.y, hb.y, p.y);
  vec3 glassDark = vec3(0.07, 0.07, 0.09) + uLight * 0.16 + top * 0.06;
  vec3 glassLight = mix(vec3(1.0), uLight, 0.10) - (1.0 - top) * 0.04;
  vec3 glass = mix(glassDark, glassLight, uTheme);
  float rim = 1.0 - smoothstep(0.0, aa * 2.5 + 0.006, abs(d + 0.004));
  float innerRim = 1.0 - smoothstep(0.0, aa * 2.0 + 0.004, abs(di + 0.002));
  vec3 col = mix(glass, pic, inImg);
  float band = exp(-pow((p.x * 0.55 + p.y * 0.85 - uSheen * full.x * 0.5) / (full.y * 0.22), 2.0));
  col += vec3(1.0) * band * mix(0.05, 0.12, uFocus) * inside;
  col += vec3(1.0) * rim * (0.18 + 0.5 * top) * inside;
  col += uLight * innerRim * 0.35 * uFocus;

  /* the light it gives off, beyond its edge */
  float od = max(d, 0.0);
  float g = (exp(-od * 6.0) * 0.5 + exp(-od * 2.2) * 0.2) * uGlow;
  g *= 1.0 - smoothstep(uMargin * 0.45, uMargin * 0.98, od);   /* nothing reaches the edge of the quad */
  float glassA = mix(mix(0.62, 0.8, uTheme), 1.0, inImg);
  float alpha = inside * glassA + (1.0 - inside) * g;
  vec3 outCol = mix(uLight, col, inside);
  gl_FragColor = vec4(outCol, clamp(alpha, 0.0, 1.0) * uAlpha);
  #include <colorspace_fragment>
}`;

/* seeded random, so the constellation is the same on every visit */
function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

function init() {
  const gallery = document.getElementById('work');
  const pin = gallery && gallery.querySelector('.fh-pin');
  const slot = document.getElementById('fhSlot');
  const list = document.getElementById('fhList');
  const cap = document.getElementById('fhCap');
  const go = document.getElementById('fhGo');
  const tag = document.getElementById('fhTag');
  const hero = world && world.querySelector('.hero');
  if (!world || !stageEl || !gallery || !list) { root.classList.remove('fh-gl'); return; }

  const ctx = makeStage(stageEl, { shadows: false, alpha: true });
  if (!ctx) { root.classList.remove('fh-gl'); return; }
  const { renderer, scene, camera } = ctx;
  renderer.toneMapping = THREE.NoToneMapping;

  /* ---------- the work, read from the list ---------- */
  const lis = [...list.querySelectorAll('.fh-item')];
  const N = lis.length;
  const items = lis.map((li, i) => {
    const a = li.querySelector('a');
    const light = brandLight(li.dataset.accent, li.dataset.bg);
    return {
      i, li, a, href: a.getAttribute('href'),
      num: li.querySelector('.fh-num').textContent.trim(),
      name: li.querySelector('.fh-name').textContent.trim(),
      meta: [...li.querySelectorAll('.fh-meta span')].map((s) => s.textContent.trim()),
      desc: (li.querySelector('.fh-desc') || {}).textContent || '',
      role: (li.querySelector('.fh-role') || {}).textContent || '',
      tex: li.dataset.tex, light,
      hover: 0, focus: 0, mix: 0,
    };
  });

  /* ---------- scene ---------- */
  const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  blank.needsUpdate = true;
  const quad = new THREE.PlaneGeometry(1, 1);
  const theme = () => (root.getAttribute('data-theme') === 'light' ? 1 : 0);
  items.forEach((it) => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, toneMapped: false,
      uniforms: {
        uMap: { value: blank }, uHasMap: { value: 0 }, uImgAspect: { value: 16 / 9 },
        uSize: { value: new THREE.Vector2(1.6, 1) }, uMargin: { value: 0.7 }, uBezel: { value: 0.028 }, uRadius: { value: 0.03 }, uRadiusIn: { value: 0.02 },
        uFocus: { value: 0 }, uAlpha: { value: 0 }, uGlow: { value: 0.5 }, uTheme: { value: theme() }, uSheen: { value: 0 },
        uLight: { value: it.light.color.clone() }, uBase: { value: new THREE.Color(it.li.dataset.bg) },
      },
    });
    it.mesh = new THREE.Mesh(quad, mat);
    it.mesh.userData.i = it.i;
    it.u = mat.uniforms;
    scene.add(it.mesh);
  });

  /* dust: depth you can feel, one draw call */
  const dustN = 520, dpos = new Float32Array(dustN * 3), r = rng(7);
  for (let k = 0; k < dustN; k++) {
    const th = r() * Math.PI * 2, ph = Math.acos(2 * r() - 1), rad = 3 + r() * 26;
    dpos[k * 3] = Math.sin(ph) * Math.cos(th) * rad; dpos[k * 3 + 1] = (Math.cos(ph) * rad) * 0.55; dpos[k * 3 + 2] = Math.sin(ph) * Math.sin(th) * rad;
  }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dot = document.createElement('canvas'); dot.width = dot.height = 32;
  { const c = dot.getContext('2d'); const g = c.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 32, 32); }
  const dustMat = new THREE.PointsMaterial({ size: 0.06, map: new THREE.CanvasTexture(dot), transparent: true, depthWrite: false, opacity: 0.55, toneMapped: false });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);
  const paintTheme = () => {
    const t = theme();
    items.forEach((it) => { it.u.uTheme.value = t; });
    dustMat.color.set(t ? '#3a3550' : '#ffffff'); dustMat.opacity = t ? 0.32 : 0.5;
  };
  paintTheme();

  /* ---------- layout: the hero constellation and the arc ---------- */
  const L = { W: 1.6, H: 1, D: 6, step: 0.3, mobile: false, vw: 1, vh: 1, cy: 0.5, run: 1, head: 64 };
  const header = document.getElementById('siteHeader');
  const tanH = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  function layout() {
    const w = stageEl.clientWidth || innerWidth, h = stageEl.clientHeight || innerHeight;
    L.vw = w; L.vh = h; L.mobile = w < 700;
    L.head = (header && header.offsetHeight) || 64;     /* the site header: the name tag stays below it */
    const asp = L.mobile ? 1.0 : 16 / 10;
    L.H = 1; L.W = asp;
    /* the slot is the free space between the heading and the caption */
    const sTop = slot.offsetTop, sH = Math.max(120, slot.offsetHeight), sW = slot.offsetWidth || w;
    L.cy = (sTop + sH / 2);
    const fillH = (sH * (L.mobile ? 0.9 : 0.86)) / h;
    const fillW = (Math.min(sW, w) * (L.mobile ? 0.8 : 0.5)) / w;
    const dH = L.H / (2 * tanH() * fillH);
    const dW = L.W / (2 * tanH() * camera.aspect * fillW);
    L.D = Math.max(dH, dW, 2.2);
    L.step = (L.W * (L.mobile ? 1.12 : 1.16)) / L.D;
    L.run = Math.max(1, gallery.offsetHeight - h);
    /* the site's squared system: a 12px frame (--r-panel) around an 8px picture
       (--r-media), measured on the window when it faces you in the gallery */
    const pxPerUnit = h / (2 * tanH() * L.D);
    const rOut = clamp(12 / pxPerUnit, 0.012, 0.06), rIn = clamp(8 / pxPerUnit, 0.008, 0.04);
    items.forEach((it) => {
      it.u.uSize.value.set(L.W, L.H);
      it.u.uRadius.value = rOut; it.u.uRadiusIn.value = rIn;
      it.mesh.scale.set(L.W + 2 * it.u.uMargin.value, L.H + 2 * it.u.uMargin.value, 1);
    });
    /* constellation: scattered in depth above and around the type */
    const R = rng(11);
    items.forEach((it, k) => {
      let u, v, tries = 0;
      do {
        u = R() * 2.2 - 1.1; v = R() * 2 - 1; tries++;
      } while (tries < 40 && (L.mobile ? v < 0.18 : (u < 0.35 && v < 0.05) || v < -0.55));
      const z = -(L.D * 0.9 + 1.5 + R() * 9);
      const dz = -z;
      it.home = {
        x: u * dz * tanH() * camera.aspect, y: v * dz * tanH() + (L.mobile ? 0.2 : 0), z,
        ry: (R() - 0.5) * 0.9, rx: (R() - 0.5) * 0.3, s: (0.62 + R() * 0.34) * (L.mobile ? 0.8 : 1), a: (0.42 + R() * 0.3) * (L.mobile ? 0.75 : 1), ph: R() * 6.28,
      };
      it.delay = (k % 6) / 6 * 0.3 + R() * 0.12;
    });
  }

  /* ---------- state ---------- */
  let s = calm ? 1 : 0, sT = s;            // hero → gallery
  let scrollOff = 0;                        // offset from the pinned scroll
  let userOff = 0, userT = 0;               // offset from drag, keys, rail
  let off = 0;                              // what is drawn
  let active = -1, hoverI = -1, previewI = -1;
  let dragging = false;
  let lastSO = 0, soT = 0, snapped = true;  /* when scrolling stops, settle on a window */
  const wrap = (x) => ((x % N) + N + N / 2) % N - N / 2;     // into [-N/2, N/2)

  function readScroll() {
    const y = -world.getBoundingClientRect().top;
    const h = L.vh;
    sT = calm ? 1 : ease(clamp(y / (h * 0.92)));
    const b = calm ? 0 : clamp((y - h) / L.run);
    scrollOff = b * (N - 1);
  }
  const magnet = (t) => { const f = t - Math.floor(t); return Math.floor(t) + f - Math.sin(f * Math.PI * 2) / (Math.PI * 2) * 0.86; };

  function goTo(i) {
    const total = scrollOff + userT;
    const base = Math.round(total);
    const k = base + Math.round(wrap(i - base));
    userT += k - total;
    run.wake();
  }
  function step(d) {
    const total = scrollOff + userT;
    userT += Math.round(total) + d - total;
    run.wake();
  }

  /* ---------- caption, rail and the active light ---------- */
  const capI = cap.querySelector('.fh-cap-i'), capK = cap.querySelector('.fh-cap-k'), capT = cap.querySelector('.fh-cap-t'), capD = cap.querySelector('.fh-cap-d'), capR = cap.querySelector('.fh-cap-r');
  function setActive(i) {
    if (i === active) return;
    active = i;
    const it = items[i];
    capI.textContent = it.num; capK.textContent = it.meta.join(' · ');
    capT.textContent = it.name; capD.textContent = it.desc; capR.textContent = it.role;
    go.href = it.href;
    cap.classList.remove('swap'); void cap.offsetWidth; cap.classList.add('swap');
    items.forEach((x) => x.li.classList.toggle('on', x.i === i));
    body.style.setProperty('--fh-light', it.light.css);
    if (list.scrollWidth > list.clientWidth + 2 && s > 0.6) {
      const li = it.li; list.scrollTo({ left: li.offsetLeft - list.clientWidth / 2 + li.offsetWidth / 2, behavior: calm ? 'auto' : 'smooth' });
    }
  }

  /* ---------- input ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let px = -1, py = -1;
  function pick(x, y) {
    const rc = stageEl.getBoundingClientRect();
    ndc.set(((x - rc.left) / rc.width) * 2 - 1, -((y - rc.top) / rc.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(items.filter((it) => it.mesh.visible && it.u.uAlpha.value > 0.3).map((it) => it.mesh), false);
    for (const h of hits) {
      const it = items[h.object.userData.i];
      const m = it.u.uMargin.value, fw = L.W + 2 * m, fh = L.H + 2 * m;
      const lx = (h.uv.x - 0.5) * fw, ly = (h.uv.y - 0.5) * fh;
      if (Math.abs(lx) <= L.W / 2 && Math.abs(ly) <= L.H / 2) return it.i;
    }
    return -1;
  }
  const interactive = () => s > 0.55;
  let downX = 0, downY = 0, downOff = 0, lastX = 0, lastT = 0, vel = 0, moved = 0, downType = 'mouse';
  stageEl.addEventListener('pointerdown', (e) => {
    if (!interactive() || e.button > 0) return;
    dragging = true; moved = 0; downType = e.pointerType;
    downX = lastX = e.clientX; downY = e.clientY; downOff = userT; lastT = performance.now(); vel = 0;
    try { stageEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });
  const pxPerStep = () => L.vw * (L.mobile ? 0.62 : 0.36);
  stageEl.addEventListener('pointermove', (e) => {
    px = e.clientX; py = e.clientY;
    if (dragging) {
      const dx = e.clientX - downX;
      moved = Math.max(moved, Math.abs(dx), Math.abs(e.clientY - downY));
      if (moved > 4) stageEl.classList.add('drag');
      userT = downOff - dx / pxPerStep();
      const now = performance.now(), dt = Math.max(1, now - lastT);
      vel = vel * 0.6 + ((e.clientX - lastX) / dt) * 0.4; lastX = e.clientX; lastT = now;
      run.wake();
    } else if (e.pointerType === 'mouse') run.wake();
  });
  const endDrag = (e, cancel) => {
    if (!dragging) return;
    dragging = false; stageEl.classList.remove('drag');
    if (!cancel && moved < 6) {
      const i = pick(e.clientX, e.clientY);
      if (i >= 0) {
        if (downType !== 'mouse' && i !== active) goTo(i);
        else if (e.metaKey || e.ctrlKey) open(items[i].href, '_blank');
        else location.href = items[i].href;
      }
      return;
    }
    /* a flick carries on, then settles on the nearest window */
    userT -= (vel * 260) / pxPerStep();
    const total = scrollOff + userT; userT += Math.round(total) - total;
    run.wake();
  };
  stageEl.addEventListener('pointerup', (e) => endDrag(e, false));
  stageEl.addEventListener('pointercancel', (e) => endDrag(e, true));
  stageEl.addEventListener('pointerleave', () => { px = py = -1; });
  /* trackpad: a sideways swipe browses, a vertical one keeps scrolling the page */
  let wheelTimer = 0;
  stageEl.addEventListener('wheel', (e) => {
    if (!interactive() || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    userT += e.deltaX / 320;
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => { const t = scrollOff + userT; userT += Math.round(t) - t; run.wake(); }, 140);
    run.wake();
  }, { passive: false });
  /* arrow keys while the gallery is on screen */
  addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    const rc = gallery.getBoundingClientRect();
    if (rc.top > L.vh * 0.5 || rc.bottom < L.vh * 0.5) return;
    e.preventDefault();
    step(e.key === 'ArrowRight' ? 1 : -1);
    if (list.contains(document.activeElement)) items[((Math.round(scrollOff + userT) % N) + N) % N].a.focus({ preventScroll: true });
  });
  document.getElementById('fhCtrl').addEventListener('click', (e) => {
    const b = e.target.closest('[data-step]'); if (b) step(+b.dataset.step);
  });
  /* the list: focus moves the space, hover previews */
  items.forEach((it) => {
    it.a.addEventListener('focus', () => { goTo(it.i); });
    it.a.addEventListener('pointerenter', () => { previewI = it.i; run.wake(); });
    it.a.addEventListener('pointerleave', () => { previewI = -1; run.wake(); });
  });
  new MutationObserver(() => { paintTheme(); run.wake(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- pictures: fetched once the page has loaded ---------- */
  const loader = new THREE.TextureLoader();
  function loadAll() {
    let k = 0;
    const next = () => {
      if (k >= N) return;
      const it = items[k++];
      loader.load(it.tex, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
        it.u.uMap.value = tex; it.u.uImgAspect.value = tex.image.width / tex.image.height;
        it.loaded = true; run.wake(); next();
      }, undefined, () => next());
    };
    next(); next(); next();
  }
  if (document.readyState === 'complete') setTimeout(loadAll, 60);
  else addEventListener('load', () => setTimeout(loadAll, 60), { once: true });

  /* ---------- frame ---------- */
  const tmp = new THREE.Vector3();
  let first = true;
  function frame(t, dt) {
    readScroll();
    const now = performance.now();
    if (scrollOff !== lastSO) { lastSO = scrollOff; soT = now; snapped = false; }
    if (!snapped && !dragging && now - soT > 160) { const tot = scrollOff + userT; userT += Math.round(tot) - tot; snapped = true; }
    const k = calm ? 60 : dragging ? 30 : 6;
    s = calm ? 1 : damp(s, sT, 7, dt || 0.016);
    userOff = damp(userOff, userT, k, dt || 0.016);
    const target = dragging ? scrollOff + userOff : magnet(scrollOff + userOff);
    off = calm ? scrollOff + userT : damp(off, target, dragging ? 40 : 9, dt || 0.016);
    setActive(((Math.round(off) % N) + N) % N);

    if (hero) hero.style.setProperty('--fh-s', s.toFixed(3));
    if (pin) pin.style.setProperty('--fh-ui', clamp((s - 0.55) / 0.4).toFixed(3));

    /* camera: centred on the slot once you are inside, a little parallax */
    const h = L.vh, w = L.vw;
    const oy = (h / 2 - L.cy) * ease(clamp((s - 0.2) / 0.8));
    camera.setViewOffset(w, h, 0, oy, w, h);
    const pxm = pointer.x, pym = pointer.y;
    camera.position.set(pxm * 0.22, -pym * 0.14, 0);
    camera.lookAt(pxm * 0.05, -pym * 0.03, -L.D);

    /* hover */
    hoverI = (!dragging && px >= 0 && interactive()) ? pick(px, py) : -1;
    stageEl.classList.toggle('over', hoverI >= 0);
    const lit = hoverI >= 0 ? hoverI : previewI;

    const sheen = clamp(pointer.x * 1.4 + 0.1, -1, 1);
    items.forEach((it) => {
      const rel = wrap(it.i - off);
      const phi = rel * L.step;
      const near = clamp(1 - Math.abs(rel));
      it.hover = damp(it.hover, it.i === lit ? 1 : 0, 10, dt || 0.016);
      const f = Math.max(near, it.hover * 0.85);
      /* the arc */
      const radius = L.D + (1 - near) * (L.mobile ? 0.7 : 1.0) - it.hover * 0.32 * (1 - near * 0.5) - near * 0.08;
      const bob = calm ? 0 : Math.sin(t * 0.55 + it.i * 1.7) * 0.035;
      const ax = Math.sin(phi) * radius, az = -Math.cos(phi) * radius;
      const ay = bob - (1 - near) * 0.06 + it.hover * 0.04;
      const fade = clamp((1.25 - Math.abs(phi)) / 0.45);
      /* the constellation, drifting */
      const H0 = it.home;
      const dr = calm ? 0 : t * 0.12 + H0.ph;
      const hx = H0.x + Math.sin(dr) * 0.25, hy = H0.y + Math.cos(dr * 0.8) * 0.18, hz = H0.z;
      /* blend, each window on its own beat */
      const m = ease(clamp((s - it.delay) / (1 - 0.42)));
      it.mesh.position.set(hx + (ax - hx) * m, hy + (ay - hy) * m, hz + (az - hz) * m);
      const tiltY = -phi + (calm ? 0 : pointer.x * 0.08 * (0.4 + f));
      const tiltX = calm ? 0 : -pointer.y * 0.06 * (0.4 + f);
      it.mesh.rotation.set(H0.rx * (1 - m) + tiltX * m, (H0.ry + Math.sin(dr * 0.7) * 0.12) * (1 - m) + tiltY * m, 0);
      const sc = H0.s * (1 - m) + (1 + it.hover * 0.04) * m;
      it.mesh.scale.set((L.W + 2 * it.u.uMargin.value) * sc, (L.H + 2 * it.u.uMargin.value) * sc, 1);
      const a = H0.a * (1 - m) + fade * m;
      it.u.uAlpha.value = a;
      it.u.uFocus.value = (1 - m) * 0.55 + f * m;
      it.u.uGlow.value = (0.35 + 0.65 * f) * (1 - m * 0.15) * (it.loaded ? 1 : 0.8);
      it.u.uSheen.value = sheen;
      it.u.uHasMap.value = damp(it.u.uHasMap.value, it.loaded ? 1 : 0, 4, calm ? 1 : (dt || 0.016));
      it.mesh.visible = a > 0.01;
    });
    dust.rotation.y = calm ? 0 : t * 0.01 + off * 0.03;
    dust.position.z = -s * 2;

    /* the name tag on the window that came forward */
    if (lit >= 0 && items[lit].mesh.visible && interactive()) {
      const it = items[lit];
      it.mesh.updateMatrixWorld();
      tmp.set(0, 0.5 * L.H / (L.H + 2 * it.u.uMargin.value), 0).applyMatrix4(it.mesh.matrixWorld).project(camera);
      const tx = (tmp.x * 0.5 + 0.5) * w, ty = (-tmp.y * 0.5 + 0.5) * h - 14;
      if (tag.dataset.i !== String(lit)) {
        tag.dataset.i = lit;
        tag.querySelector('.fh-tag-n').textContent = it.num;
        tag.querySelector('.fh-tag-t').textContent = it.name;
        tag.style.setProperty('--tc', it.light.css);
      }
      tag.style.setProperty('--tx', Math.round(clamp(tx, 120, w - 120)) + 'px');
      tag.style.setProperty('--ty', Math.round(Math.max(ty, L.head + 46)) + 'px');
      tag.classList.add('on');
    } else tag.classList.remove('on');

    renderer.render(scene, camera);
    if (first) { first = false; ctx.reveal(); world.classList.add('live'); root.classList.add('fh-gl'); }
  }

  let run = null;
  ctx.onResize(() => { layout(); if (run) run.wake(); });
  readScroll();
  run = runWhileVisible(stageEl, frame);
  /* reduced motion draws on demand: after scrolling settles, on input, on resize */
  if (calm) {
    let to = 0;
    addEventListener('scroll', () => { clearTimeout(to); to = setTimeout(() => run.wake(), 60); }, { passive: true });
  }
  addEventListener('load', () => { layout(); run.wake(); });
}

try { init(); } catch (e) { root.classList.remove('fh-gl'); console.error(e); }
