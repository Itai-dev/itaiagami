/* ============================================================
   Partner TV: the opening scene, and a page that changes channel.
   The wordmark is pressed into the ground in soft relief, as in the IDs.
   Three energies play on it, one at a time:
     1 · Relief: the light rakes across the wordmark from wherever the
         pointer is, and a row of thin sheets ripples behind it.
     2 · Play:   glossy amber shapes drop and tumble over it; the pointer
         pushes them around.
     3 · End frame: the ground goes dark, a line of light runs in and the
         wordmark lights up in blue neon.
   Tap the scene, use ← → (or 1 2 3) or the remote to change channel. The
   whole page re-tunes with it, and further down it re-tunes to each look
   as it scrolls past.

   Progressive enhancement: the poster stays without WebGL (the remote
   still re-colours the page). Reduced motion: no drops, ripples or
   drifting light; a channel change still redraws the scene once.
   ============================================================ */
import { THREE, makeStage, runWhileVisible, turnToFace, pointer, roundedBox, distanceToFit, calm } from './cx-kit.js';

const body = document.body;
const stageEl = document.getElementById('ptvStage');
const remote = document.getElementById('ptvRemote');
const osd = document.getElementById('ptvOsd');
const staticEl = document.getElementById('ptvStatic');
const hint = document.getElementById('ptvHint');
const NAMES = ['Relief', 'Play', 'End frame'];

let heroCh = 0;          // the channel the visitor picked
let scene3d = null;      // set once the scene is running

turnToFace('.ptv-look');

/* ---------- static between channels: a small tile of noise ---------- */
if (staticEl) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), img = x.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  x.putImageData(img, 0, 0);
  staticEl.style.backgroundImage = `url(${c.toDataURL()})`;
}

/* ---------- the page's channel: the visitor's pick, or the look scrolling past ---------- */
const looks = [...document.querySelectorAll('.ptv-look')];
function tunePage() {
  let ch = heroCh;
  for (const l of looks) if (l.getBoundingClientRect().top < innerHeight * 0.55) ch = +l.dataset.ch;
  if (body.dataset.ch !== String(ch)) body.dataset.ch = ch;
}
let queued = false;
addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; tunePage(); }); } }, { passive: true });
tunePage();

function setChannel(i, { announce = true } = {}) {
  i = ((i % 3) + 3) % 3;
  heroCh = i;
  tunePage();
  remote && remote.querySelectorAll('[data-ch]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.ch === i)));
  if (osd) {
    osd.querySelector('.ptv-osd-n').textContent = '0' + (i + 1);
    osd.querySelector('.ptv-osd-l').textContent = NAMES[i];
    if (announce && !calm) { osd.classList.remove('flash'); void osd.offsetWidth; osd.classList.add('flash'); }
  }
  if (announce && staticEl && !calm) { staticEl.classList.remove('on'); void staticEl.offsetWidth; staticEl.classList.add('on'); }
  if (hint) hint.classList.add('done');
  scene3d && scene3d.tune(i);
}

if (remote) {
  remote.hidden = false;
  remote.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.step) setChannel(heroCh + +b.dataset.step);
    else setChannel(+b.dataset.ch);
  });
}

let heroInView = true;
if (stageEl) new IntersectionObserver((es) => { heroInView = es[0].isIntersecting; }).observe(stageEl);
addEventListener('keydown', (e) => {
  if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || !heroInView) return;
  const a = document.activeElement || {};
  if (/input|textarea|select/i.test(a.tagName || '') || a.isContentEditable) return;
  if (e.key === 'ArrowRight') setChannel(heroCh + 1);
  else if (e.key === 'ArrowLeft') setChannel(heroCh - 1);
  else if (e.key === '1' || e.key === '2' || e.key === '3') setChannel(+e.key - 1);
});

if (stageEl) start();

async function start() {
  const stage = makeStage(stageEl, { shadows: true, exposure: 1 });
  if (!stage) return;
  const { renderer, scene, camera } = stage;
  renderer.toneMapping = THREE.NeutralToneMapping;
  camera.fov = 34; camera.near = 0.5; camera.far = 120; camera.updateProjectionMatrix();

  /* the three grounds and their light */
  const LOOK = [
    { ground: '#ebb291', sky: '#ffe6d6', under: '#b4694a', hemi: 1.0, key: '#fff0e4', keyI: 3.0, neon: 0 },
    { ground: '#ffb21a', sky: '#fff1c4', under: '#c56d00', hemi: 1.45, key: '#fff6e0', keyI: 2.2, neon: 0 },
    { ground: '#03182b', sky: '#2a5c8a', under: '#000000', hemi: 0.35, key: '#7cc8ff', keyI: 0.25, neon: 1 },
  ];
  const NEON = new THREE.Color('#3fb6ff');

  const groundCol = new THREE.Color(LOOK[0].ground);
  scene.fog = new THREE.Fog(groundCol.clone(), 16, 42);
  const hemi = new THREE.HemisphereLight(LOOK[0].sky, LOOK[0].under, LOOK[0].hemi);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(LOOK[0].key, LOOK[0].keyI);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0005;
  Object.assign(key.shadow.camera, { left: -11, right: 11, top: 9, bottom: -9, near: 1, far: 40 });
  scene.add(key, key.target);
  const glow = new THREE.PointLight(NEON, 0, 14, 1.6);
  glow.position.set(0, 1.4, 0.6);
  scene.add(glow);

  /* ---------- the ground, and the wordmark pressed into it ---------- */
  const groundMat = new THREE.MeshStandardMaterial({ color: groundCol, roughness: 0.88 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  try { await Promise.race([Promise.all([document.fonts.load('600 300px "Inter Tight"'), document.fonts.load('700 300px "Inter Tight"')]), new Promise((r) => setTimeout(r, 1500))]); } catch (e) { /* system font */ }
  const WM = wordmarkMaps();
  const WMW = 12, WMH = WMW * WM.h / WM.w;
  const markMat = new THREE.MeshStandardMaterial({
    color: groundCol, roughness: 0.82, normalMap: WM.normal, normalScale: new THREE.Vector2(3.2, 3.2),
    emissive: NEON, emissiveMap: WM.neon, emissiveIntensity: 0,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const mark = new THREE.Mesh(new THREE.PlaneGeometry(WMW, WMH), markMat);
  mark.rotation.x = -Math.PI / 2;
  mark.position.set(0, 0.003, 0);
  mark.receiveShadow = true;
  scene.add(mark);

  /* the line of light that runs in along the baseline in the end frame */
  const lineMat = new THREE.MeshBasicMaterial({ color: '#9fdcff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false });
  const line = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.05), lineMat);
  line.rotation.x = -Math.PI / 2;
  const lineEnd = new THREE.Vector3(-WMW / 2 + WMW * WM.startU, 0.02, (WM.baseV - 0.5) * WMH);
  scene.add(line);
  const haloMat = new THREE.MeshBasicMaterial({ map: WM.halo, color: NEON, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(WMW, WMH), haloMat);
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.02;
  scene.add(halo);

  /* ---------- relief: a row of thin sheets that ripples ---------- */
  const sheetMat = new THREE.MeshStandardMaterial({ color: groundCol, roughness: 0.7 });
  const sheetGeo = roundedBox(0.035, 0.75, 0.9, 0.015);
  const sheets = [];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(sheetGeo, sheetMat);
    m.position.set(WMW / 2 - 2.6 + i * 0.17, 0, WMH / 2 + 0.9);
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
    sheets.push(m);
  }

  /* ---------- play: glossy shapes that drop and tumble ---------- */
  const amber = new THREE.MeshPhysicalMaterial({ color: '#ffb000', roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, emissive: '#ff8a00', emissiveIntensity: 0.08 });
  const cube = roundedBox(0.9, 0.9, 0.9, 0.2); cube.translate(0, -0.45, 0);
  const sphere = new THREE.SphereGeometry(0.5, 40, 24);
  const torus = new THREE.TorusGeometry(0.4, 0.17, 20, 48);
  const small = roundedBox(0.55, 0.55, 0.55, 0.12); small.translate(0, -0.275, 0);
  const kinds = [[cube, 0.58], [sphere, 0.5], [torus, 0.52], [small, 0.36], [sphere, 0.5], [cube, 0.58], [torus, 0.52], [small, 0.36]];
  const bodies = [];
  for (let i = 0; i < 16; i++) {
    const [g, r] = kinds[i % kinds.length];
    const m = new THREE.Mesh(g, amber);
    m.castShadow = m.receiveShadow = true;
    m.visible = false; m.scale.setScalar(0.001);
    scene.add(m);
    bodies.push({ m, r, p: m.position, v: new THREE.Vector3(), w: new THREE.Vector3(), s: 0 });
  }
  function drop() {
    bodies.forEach((b, i) => {
      const x = (Math.random() - 0.5) * 11, z = (Math.random() - 0.5) * 5;
      if (calm) b.p.set(-5.4 + (i % 8) * 1.55, b.r, i < 8 ? -1.4 : 1.6);
      else b.p.set(x, 4 + i * 0.55 + Math.random(), z);
      b.v.set(0, 0, 0);
      b.w.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
      b.m.quaternion.setFromEuler(new THREE.Euler(Math.random() * 3, Math.random() * 3, Math.random() * 3));
      b.m.visible = true;
    });
  }

  /* ---------- the pointer on the ground ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const pusher = new THREE.Vector3(1e3, 0, 1e3);
  let pushing = false;
  const canvas = renderer.domElement;
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    pushing = !!ray.ray.intersectPlane(floor, pusher);
  }, { passive: true });
  canvas.addEventListener('pointerleave', () => { pushing = false; });
  canvas.addEventListener('click', () => setChannel(heroCh + 1));

  /* ---------- layout ---------- */
  const look = new THREE.Vector3(0.4, 0, 1.6);
  const camDir = new THREE.Vector3(-2.2, 7.6, 8.2).normalize();
  let dist = 12;
  stage.onResize((w, h) => {
    const narrow = w / h < 1;
    look.set(narrow ? 0.2 : 0.9, 0, narrow ? 1.5 : 2.1);
    dist = Math.max(7, distanceToFit(camera, WMW, narrow ? 1.12 : 1.02));
  });

  /* ---------- channel state ---------- */
  let ch = heroCh, since = 0, clock = 0;
  const target = { ground: new THREE.Color(), sky: new THREE.Color(), under: new THREE.Color(), key: new THREE.Color() };
  let neon = 0, sheetsOn = 1;
  function tune(i) {
    if (i === ch) return;
    ch = i; since = clock;
    if (i === 1) drop();
    runner.wake();
  }
  scene3d = { tune };

  /* ---------- motion ---------- */
  const tmp = new THREE.Vector3(), q = new THREE.Quaternion(), axis = new THREE.Vector3();
  let first = true, lastNow = 0;

  function physics(dt) {
    for (const b of bodies) {
      if (!b.m.visible) continue;
      b.v.y -= 22 * dt;
      if (pushing && !calm) {
        tmp.set(b.p.x - pusher.x, 0, b.p.z - pusher.z);
        const d = tmp.length();
        if (d < 1.5 && d > 1e-3) { b.v.addScaledVector(tmp.divideScalar(d), (1.5 - d) * 46 * dt); b.v.y += (1.5 - d) * 10 * dt; }
      }
      b.p.addScaledVector(b.v, dt);
      if (b.p.y < b.r) {
        b.p.y = b.r;
        if (b.v.y < 0) b.v.y = b.v.y < -1.2 ? -b.v.y * 0.42 : 0;
        const f = Math.max(0, 1 - 2.4 * dt);
        b.v.x *= f; b.v.z *= f;
        // rolling: spin follows the travel on the ground
        b.w.lerp(axis.set(b.v.z / b.r, b.w.y * 0.9, -b.v.x / b.r), Math.min(1, 8 * dt));
      }
      if (Math.abs(b.p.x) > 8.5) { b.p.x = Math.sign(b.p.x) * 8.5; b.v.x *= -0.6; }
      if (b.p.z > 4.5 || b.p.z < -4) { b.p.z = Math.min(4.5, Math.max(-4, b.p.z)); b.v.z *= -0.6; }
      const wl = b.w.length();
      if (wl > 1e-4) { q.setFromAxisAngle(axis.copy(b.w).divideScalar(wl), wl * dt); b.m.quaternion.premultiply(q); }
    }
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i]; if (!a.m.visible) continue;
      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j]; if (!b.m.visible) continue;
        tmp.subVectors(a.p, b.p);
        const d = tmp.length(), min = (a.r + b.r) * 0.92;
        if (d < min && d > 1e-4) {
          tmp.divideScalar(d);
          const push = (min - d) / 2;
          a.p.addScaledVector(tmp, push); b.p.addScaledVector(tmp, -push);
          const rel = (a.v.x - b.v.x) * tmp.x + (a.v.y - b.v.y) * tmp.y + (a.v.z - b.v.z) * tmp.z;
          if (rel < 0) { a.v.addScaledVector(tmp, -rel * 0.75); b.v.addScaledVector(tmp, rel * 0.75); }
        }
      }
    }
  }

  function frame(t) {
    const now = performance.now() / 1000;
    let left = lastNow ? Math.min(0.25, now - lastNow) : 1 / 60;
    lastNow = now; clock = t;
    const L = LOOK[ch];
    const k = calm ? 1 : 1 - Math.exp(-left * 4);

    // colours and light drift to the channel's look
    target.ground.set(L.ground); target.sky.set(L.sky); target.under.set(L.under); target.key.set(L.key);
    groundCol.lerp(target.ground, k);
    scene.fog.color.copy(groundCol);
    groundMat.color.copy(groundCol); markMat.color.copy(groundCol); sheetMat.color.copy(groundCol);
    hemi.color.lerp(target.sky, k); hemi.groundColor.lerp(target.under, k);
    hemi.intensity += (L.hemi - hemi.intensity) * k;
    key.color.lerp(target.key, k);
    key.intensity += (L.keyI - key.intensity) * k;
    neon += (L.neon - neon) * (calm ? 1 : 1 - Math.exp(-left * 2.2));
    sheetsOn += ((ch === 0 ? 1 : 0) - sheetsOn) * k;

    // relief: the light rakes across from the pointer's side
    const az = -2.2 + pointer.x * 1.6 + (calm ? 0 : Math.sin(t * 0.25) * 0.25);
    key.position.set(Math.cos(az) * 14, ch === 0 ? 4.2 - pointer.y * 2 : 9, Math.sin(az) * 10 + 4);
    key.target.position.set(0, 0, 0);

    // sheets ripple in a wave, and fold away on other channels
    for (let i = 0; i < sheets.length; i++) {
      const s = sheets[i];
      const wave = calm ? 0 : Math.sin(t * 1.7 - i * 0.42);
      s.rotation.z = (0.25 + wave * 0.35) * sheetsOn - (1 - sheetsOn) * 1.4;
      s.scale.set(1, Math.max(0.001, sheetsOn * (0.75 + 0.25 * (calm ? 1 : Math.sin(t * 1.1 - i * 0.3) * 0.5 + 0.5))), 1);
      s.visible = sheetsOn > 0.01;
    }

    // play: physics in small steps; shapes shrink away on other channels
    while (left > 1e-4) { const dt = Math.min(1 / 60, left); left -= dt; if (!calm) physics(dt); }
    for (const b of bodies) {
      if (!b.m.visible) continue;
      b.s += ((ch === 1 ? 1 : 0) - b.s) * k;
      b.m.scale.setScalar(Math.max(0.001, b.s));
      if (ch !== 1 && b.s < 0.01) b.m.visible = false;
    }

    // end frame: the line runs in, then the wordmark lights
    const age = t - since;
    const run = ch === 2 ? (calm ? 1 : Math.min(1, age / 0.9)) : 0;
    const lineLen = 30 * (1 - Math.pow(1 - run, 3));
    line.scale.x = Math.max(0.001, lineLen);
    line.position.set(lineEnd.x - lineLen / 2, lineEnd.y, lineEnd.z);
    lineMat.opacity = neon * 0.9;
    const lit = ch === 2 ? (calm ? 1 : Math.min(1, Math.max(0, (age - 0.7) / 0.5))) : 0;
    const flicker = calm || lit >= 1 ? 1 : (Math.sin(age * 60) > -0.2 ? 1 : 0.35);
    markMat.emissiveIntensity = neon * lit * 2.4 * flicker;
    haloMat.opacity = neon * lit * 0.55 * flicker;
    glow.intensity = neon * lit * 9;

    // camera: a shallow look across the ground, leaning with the pointer
    tmp.copy(camDir).multiplyScalar(dist).add(look);
    tmp.x += pointer.x * 1.2; tmp.y -= pointer.y * 0.8;
    if (!calm) tmp.x += Math.sin(t * 0.2) * 0.3;
    if (first) camera.position.copy(tmp); else camera.position.lerp(tmp, 0.05);
    camera.lookAt(look);

    renderer.render(scene, camera);
    if (first) { first = false; stage.reveal(); }
  }
  const runner = runWhileVisible(stageEl, frame);
  if (heroCh !== ch) tune(heroCh);

  /* ---------- the wordmark as maps: a normal map for the relief, a neon outline ---------- */
  function wordmarkMaps() {
    const w = 2048, h = 640;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    const size = 300, family = '"Inter Tight", Inter, system-ui, sans-serif';
    const fA = `600 ${size}px ${family}`, fB = `700 ${size}px ${family}`;
    c.font = fA; const wa = c.measureText('Partner').width;
    c.font = fB; const wb = c.measureText('tv').width;
    const gap = size * 0.22, total = wa + gap + wb;
    const scale = Math.min(1, (w * 0.92) / total);
    const x0 = (w - total * scale) / 2, base = h * 0.66;
    const draw = (ctx, mode) => {
      ctx.save(); ctx.translate(x0, base); ctx.scale(scale, scale);
      ctx.textBaseline = 'alphabetic';
      ctx.font = fA; ctx[mode]('Partner', 0, 0);
      ctx.font = fB; ctx[mode]('tv', wa + gap, 0);
      ctx.restore();
    };
    // height: the letters, softened so the relief has rounded shoulders
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff'; draw(c, 'fillText');
    const src = c.getImageData(0, 0, w, h).data;
    let hm = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) hm[i] = src[i * 4] / 255;
    hm = blur(hm, w, h, 7); hm = blur(hm, w, h, 7);
    const out = c.createImageData(w, h), d = out.data, S = 9;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const l = hm[y * w + Math.max(0, x - 1)], r = hm[y * w + Math.min(w - 1, x + 1)];
      const u = hm[Math.max(0, y - 1) * w + x], dn = hm[Math.min(h - 1, y + 1) * w + x];
      let nx = (l - r) * S, ny = (dn - u) * S, nz = 1;   // canvas y runs down, texture v runs up
      const len = Math.hypot(nx, ny, nz); nx /= len; ny /= len; nz /= len;
      d[i * 4] = (nx * 0.5 + 0.5) * 255; d[i * 4 + 1] = (ny * 0.5 + 0.5) * 255; d[i * 4 + 2] = (nz * 0.5 + 0.5) * 255; d[i * 4 + 3] = 255;
    }
    c.putImageData(out, 0, 0);
    const normal = new THREE.CanvasTexture(cv);
    normal.anisotropy = 8;

    // neon: a bright outline of the letters
    const nc = document.createElement('canvas'); nc.width = w; nc.height = h;
    const n = nc.getContext('2d');
    n.fillStyle = '#000'; n.fillRect(0, 0, w, h);
    n.strokeStyle = '#fff'; n.lineJoin = 'round'; n.lineWidth = 7 / scale;
    draw(n, 'strokeText');
    const neonTex = new THREE.CanvasTexture(nc);
    neonTex.colorSpace = THREE.SRGBColorSpace; neonTex.anisotropy = 8;
    // halo: the same outline, blurred wide
    const hc = document.createElement('canvas'); hc.width = w / 4; hc.height = h / 4;
    const hx = hc.getContext('2d');
    hx.drawImage(nc, 0, 0, w / 4, h / 4);
    let hd = hx.getImageData(0, 0, w / 4, h / 4), hf = new Float32Array((w / 4) * (h / 4));
    for (let i = 0; i < hf.length; i++) hf[i] = hd.data[i * 4] / 255;
    hf = blur(blur(hf, w / 4, h / 4, 6), w / 4, h / 4, 6);
    for (let i = 0; i < hf.length; i++) { const v = Math.min(255, hf[i] * 255 * 3.2); hd.data[i * 4] = hd.data[i * 4 + 1] = hd.data[i * 4 + 2] = v; hd.data[i * 4 + 3] = 255; }
    hx.putImageData(hd, 0, 0);
    const haloTex = new THREE.CanvasTexture(hc);
    // where the baseline starts, for the line of light
    return { normal, neon: neonTex, halo: haloTex, w, h, startU: x0 / w, baseV: base / h };
  }
  function blur(a, w, h, r) {
    // a separable box blur
    const t = new Float32Array(a.length), o = new Float32Array(a.length), n = 2 * r + 1;
    for (let y = 0; y < h; y++) {
      let s = 0; const row = y * w;
      for (let x = -r; x <= r; x++) s += a[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        t[row + x] = s / n;
        s += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let y = -r; y <= r; y++) s += t[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        o[y * w + x] = s / n;
        s += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x];
      }
    }
    return o;
  }
}
