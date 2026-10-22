/* ============================================================
   Museum of Natural History: you, as a figure of light, in the habitat.
   The installation recognised visitors' movement: a visitor turned into
   particles of light inside an illustrated landscape and could push the
   particles around. This page does the same in the browser.

   - Without the camera: a figure made of particles stands in the
     illustrated meadow; the pointer (or a finger) pushes the particles,
     and they drift back to re-form the figure. Butterflies scatter.
   - With the camera (only after the visitor presses "Enable camera"):
     the visitor is separated from their room by an on-device
     segmentation model (MediaPipe, loaded only then), drawn as thousands
     of particles in their own colours over the meadow, mirrored. Their
     movement scatters the particles. If the model can't load, movement
     alone reveals the figure. Nothing is recorded or sent anywhere: the
     frames are read on this device and dropped.
   - The camera stops on "Stop camera", when the wall scrolls out of
     view, and on pagehide.
   - Reduced motion: no idle drift; reactions are gentle.
   ============================================================ */
import { THREE, makeStage, runWhileVisible, turnToFace, pointer, canvasTexture, calm } from './cx-kit.js';

turnToFace('.cx-turn');
setupLoupes();

const stageEl = document.getElementById('nhStage');
const S = makeStage(stageEl, { shadows: false, exposure: 1.0 });
if (S) build(S);

/* ---------- MediaPipe (pinned), loaded only after the visitor opts in ---------- */
const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite';

function build({ renderer, scene, camera, reveal, onResize }) {
  const hint = document.getElementById('nhHint');
  const btn = document.getElementById('nhCamBtn');
  const status = document.getElementById('nhCamStatus');
  const GENTLE = calm ? 0.35 : 1;
  let seed = 3;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  /* ---------- the view: everything is laid out on the z = 0 plane ---------- */
  const D = 10;
  camera.fov = 35; camera.position.set(0, 0, D); camera.lookAt(0, 0, 0);
  let VW = 10, VH = 6, aspect = 1.6;

  /* ---------- the habitat: illustrated layers with a little parallax ---------- */
  const layers = [];
  function layer(z, draw) {
    const tex = canvasTexture(2048, 1152, draw);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
    m.position.z = z; m.renderOrder = z > 1 ? 5 : layers.length; scene.add(m); layers.push(m); return m;
  }
  const INK = '#0b2a3a';
  const blob = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
  const hills = (c, w, h, base, amp, freq, ph, fill, edge) => {
    c.beginPath(); c.moveTo(0, h);
    for (let x = 0; x <= w; x += 16) c.lineTo(x, base - amp * (0.6 * Math.sin(x * freq + ph) + 0.4 * Math.sin(x * freq * 2.3 + ph * 1.7)));
    c.lineTo(w, h); c.closePath(); c.fillStyle = fill; c.fill();
    c.strokeStyle = edge; c.lineWidth = 4; c.stroke();
  };
  function tree(c, x, base, s, canopy, light, blossom) {
    c.strokeStyle = INK; c.lineWidth = 3; c.fillStyle = '#244b52';
    c.beginPath(); c.moveTo(x - 6 * s, base); c.lineTo(x - 3 * s, base - 70 * s); c.lineTo(x + 3 * s, base - 70 * s); c.lineTo(x + 6 * s, base); c.closePath(); c.fill(); c.stroke();
    const puffs = [[0, -110, 46], [-36, -86, 36], [38, -84, 38], [-14, -140, 32], [22, -128, 34]];
    c.fillStyle = canopy;
    for (const [dx, dy, r] of puffs) { blob(c, x + dx * s, base + dy * s, r * s); }
    c.strokeStyle = INK; c.lineWidth = 2.5;
    for (const [dx, dy, r] of puffs) { c.beginPath(); c.arc(x + dx * s, base + dy * s, r * s, Math.PI * 0.9, Math.PI * 2.1); c.stroke(); }
    c.fillStyle = light;
    for (const [dx, dy, r] of puffs) blob(c, x + (dx - r * 0.3) * s, base + (dy - r * 0.35) * s, r * 0.38 * s);
    if (blossom) { c.fillStyle = blossom; for (let i = 0; i < 26; i++) blob(c, x + (rnd() - 0.5) * 140 * s, base - (70 + rnd() * 100) * s, (3 + rnd() * 4) * s); }
  }
  layer(-6, (c, w, h) => {   // sky
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0b3a78'); g.addColorStop(0.45, '#1f7fbf'); g.addColorStop(0.8, '#7fd8d6'); g.addColorStop(1, '#b6efe2');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(230,255,250,.5)'; blob(c, w * 0.78, h * 0.22, 70);
    c.fillStyle = 'rgba(230,255,250,.16)'; blob(c, w * 0.78, h * 0.22, 130);
    c.fillStyle = 'rgba(220,250,250,.28)';
    for (const [x, y, s] of [[0.15, 0.2, 1], [0.42, 0.12, 0.7], [0.6, 0.3, 0.8], [0.9, 0.42, 0.6]]) {
      for (let i = 0; i < 5; i++) blob(c, w * x + (i - 2) * 46 * s, h * y + Math.abs(i - 2) * 10 * s, (40 - Math.abs(i - 2) * 8) * s);
    }
  });
  layer(-3.4, (c, w, h) => {   // far hills and a line of trees
    hills(c, w, h, h * 0.62, 70, 0.004, 1.2, '#1b7096', 'rgba(150,240,240,.5)');
    for (let x = 30; x < w; x += 70 + rnd() * 60) tree(c, x, h * 0.6 + Math.sin(x * 0.004 + 1.2) * 30, 0.45 + rnd() * 0.2, '#1a6a86', '#3aa6b0');
    hills(c, w, h, h * 0.72, 50, 0.006, 3.1, '#1d8a8a', 'rgba(150,240,230,.45)');
  });
  layer(-1.6, (c, w, h) => {   // the meadow's own trees, some in blossom
    hills(c, w, h, h * 0.8, 40, 0.003, 0.4, '#1f9a76', 'rgba(170,250,220,.55)');
    const xs = [120, 380, 640, 980, 1300, 1600, 1900];
    xs.forEach((x, i) => tree(c, x + (rnd() - 0.5) * 80, h * 0.8 + 6, 1.1 + rnd() * 0.5, i % 3 === 1 ? '#3b9f86' : '#17705e', i % 3 === 1 ? '#7ad3b0' : '#34a582', i % 3 === 1 ? '#f4c6e4' : null));
  });
  layer(1.2, (c, w, h) => {   // foreground grass and flowers, in front of the figure
    c.fillStyle = '#0f6a4c';
    c.beginPath(); c.moveTo(0, h);
    for (let x = 0; x <= w; x += 12) c.lineTo(x, h * 0.92 - Math.sin(x * 0.01) * 10 - rnd() * 8);
    c.lineTo(w, h); c.closePath(); c.fill();
    c.lineCap = 'round';
    for (let i = 0; i < 520; i++) {
      const x = rnd() * w, y = h * 0.9 + rnd() * h * 0.1, l = 26 + rnd() * 60, lean = (rnd() - 0.5) * 30;
      c.strokeStyle = rnd() < 0.35 ? '#46c48c' : '#14845c'; c.lineWidth = 3 + rnd() * 3;
      c.beginPath(); c.moveTo(x, y + 20); c.quadraticCurveTo(x + lean * 0.3, y - l * 0.5, x + lean, y - l); c.stroke();
    }
    for (let i = 0; i < 46; i++) {
      const x = rnd() * w, y = h * 0.9 + rnd() * h * 0.08, col = ['#f7d36b', '#f4c6e4', '#ffffff', '#ffb38a'][i % 4];
      c.fillStyle = col; for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; blob(c, x + Math.cos(a) * 7, y + Math.sin(a) * 7, 6); }
      c.fillStyle = '#e48a2a'; blob(c, x, y, 4);
    }
  });

  /* ---------- the particles ---------- */
  let cols = 0, rows = 0, N = 0;
  let home, off, vel, alpha, target, col, glowCol, motion, prevLuma;
  let points = null;
  const pMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uSize: { value: 4 }, uTime: { value: 0 } },
    vertexShader: /* glsl */`
      attribute vec3 aColor; attribute float aAlpha;
      uniform float uSize; varying vec3 vC; varying float vA;
      void main(){ vC = aColor; vA = aAlpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uSize * (0.6 + 0.6 * aAlpha);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`
      varying vec3 vC; varying float vA;
      void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p);
        float a = smoothstep(0.5, 0.12, d) * vA; if (a < 0.01) discard;
        gl_FragColor = vec4(vC + (1.0 - d * 2.0) * 0.18, a); }`,
  });
  // the figure (no camera): a person reaching up toward the wall, as in the exhibit's photographs
  const figCanvas = document.createElement('canvas');
  function drawFigure(w, h) {
    figCanvas.width = w; figCanvas.height = h;
    const c = figCanvas.getContext('2d');
    c.clearRect(0, 0, w, h);
    c.save(); c.translate(w * 0.5, h * 0.99); const s = h / 112; c.scale(s, s);
    c.fillStyle = '#fff'; c.strokeStyle = '#fff'; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.ellipse(0, -76, 6.2, 7.4, 0, 0, Math.PI * 2); c.fill();                        // head
    c.lineWidth = 6; c.beginPath(); c.moveTo(0, -68); c.lineTo(0, -64); c.stroke();                   // neck
    c.beginPath(); c.moveTo(-10, -62); c.quadraticCurveTo(0, -66, 10, -62); c.lineTo(8, -36); c.lineTo(-8, -36); c.closePath(); c.fill(); // torso
    c.lineWidth = 5; c.beginPath(); c.moveTo(9, -60); c.quadraticCurveTo(18, -74, 22, -92); c.stroke(); // raised arm
    c.beginPath(); c.moveTo(-9, -60); c.quadraticCurveTo(-16, -48, -14, -36); c.stroke();             // lowered arm
    c.lineWidth = 7; c.beginPath(); c.moveTo(-4, -37); c.lineTo(-7, -2); c.stroke();                   // legs
    c.beginPath(); c.moveTo(4, -37); c.lineTo(7, -2); c.stroke();
    c.restore();
    return c.getImageData(0, 0, w, h).data;
  }
  let figure = null;
  function rebuild() {
    const want = innerWidth < 700 ? 7000 : 15000;
    cols = Math.max(40, Math.round(Math.sqrt(want * aspect)));
    rows = Math.max(40, Math.round(cols / aspect));
    N = cols * rows;
    home = new Float32Array(N * 3); off = new Float32Array(N * 2); vel = new Float32Array(N * 2);
    alpha = new Float32Array(N); target = new Float32Array(N); col = new Float32Array(N * 3);
    glowCol = new Float32Array(N * 3); motion = new Float32Array(N); prevLuma = null;
    for (let r = 0, i = 0; r < rows; r++) for (let c = 0; c < cols; c++, i++) {
      home[i * 3] = ((c + 0.5) / cols - 0.5) * VW;
      home[i * 3 + 1] = (0.5 - (r + 0.5) / rows) * VH;
      home[i * 3 + 2] = 0;
      // the exhibit's light: pale cyan to turquoise, a little brighter toward the top
      const k = rnd();
      glowCol[i * 3] = 0.55 + k * 0.35; glowCol[i * 3 + 1] = 0.95; glowCol[i * 3 + 2] = 0.9 + k * 0.1;
    }
    figure = drawFigure(cols, rows);
    if (points) { scene.remove(points); points.geometry.dispose(); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
    points = new THREE.Points(g, pMat); points.frustumCulled = false; points.renderOrder = 3; scene.add(points);
    analysis.width = cols; analysis.height = rows;
    pMat.uniforms.uSize.value = (stageEl.clientWidth / cols) * Math.min(devicePixelRatio || 1, 2) * 1.7;
  }
  const analysis = document.createElement('canvas');
  const actx = analysis.getContext('2d', { willReadFrequently: true });

  /* ---------- butterflies that scatter from movement ---------- */
  const wingTex = canvasTexture(512, 128, (c) => {
    const cols4 = [['#f4c6e4', '#d9579f'], ['#9ff3ff', '#1f7fbf'], ['#ffe08a', '#e08a2a'], ['#ffffff', '#3aa6b0']];
    cols4.forEach(([a, b], k) => {
      const x = k * 128 + 64, y = 64;
      for (const sx of [-1, 1]) {
        c.fillStyle = a; c.strokeStyle = INK; c.lineWidth = 3;
        c.beginPath(); c.ellipse(x + sx * 26, y - 14, 28, 22, sx * 0.5, 0, Math.PI * 2); c.fill(); c.stroke();
        c.beginPath(); c.ellipse(x + sx * 20, y + 18, 18, 16, -sx * 0.4, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = b; blob(c, x + sx * 32, y - 18, 7); blob(c, x + sx * 22, y + 20, 5);
      }
      c.fillStyle = INK; c.beginPath(); c.ellipse(x, y, 4, 24, 0, 0, Math.PI * 2); c.fill();
    });
  });
  const BN = 18;
  const bGeo = new THREE.PlaneGeometry(1, 1);
  const uvOff = new Float32Array(BN);
  for (let i = 0; i < BN; i++) uvOff[i] = (i % 4) * 0.25;
  bGeo.setAttribute('aOff', new THREE.InstancedBufferAttribute(uvOff, 1));
  const bMat = new THREE.MeshBasicMaterial({ map: wingTex, transparent: true, depthWrite: false, toneMapped: false });
  bMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aOff;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvMapUv = vec2(uv.x * 0.25 + aOff, uv.y);');
  };
  const flies = new THREE.InstancedMesh(bGeo, bMat, BN);
  flies.frustumCulled = false; flies.position.z = 0.6; flies.renderOrder = 4; scene.add(flies);
  const fly = Array.from({ length: BN }, () => ({ x: (rnd() - 0.5) * 8, y: (rnd() - 0.2) * 3, vx: 0, vy: 0, ph: rnd() * 6, hx: 0, hy: 0, s: 0.18 + rnd() * 0.1 }));
  fly.forEach((f) => { f.hx = f.x; f.hy = f.y; });
  const dummy = new THREE.Object3D();

  /* ---------- framing ---------- */
  onResize((w, h) => {
    aspect = w / h;
    VH = 2 * D * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); VW = VH * aspect;
    for (const m of layers) {
      const k = (D - m.position.z) / D;           // farther layers cover more
      m.scale.set(VW * k * 1.12, VH * k * 1.12, 1);
    }
    rebuild();
  });

  /* ---------- the pointer as a source of movement ---------- */
  const ptr = { x: 0, y: 0, vx: 0, vy: 0, on: false, t: 0 };
  let interacted = false;
  const toWorld = (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width - 0.5) * VW, (0.5 - (e.clientY - r.top) / r.height) * VH];
  };
  stageEl.addEventListener('pointermove', (e) => {
    const [x, y] = toWorld(e);
    if (ptr.on) { ptr.vx = x - ptr.x; ptr.vy = y - ptr.y; }
    ptr.x = x; ptr.y = y; ptr.on = true; ptr.t = now;
    if (!interacted && hint) { interacted = true; hint.classList.add('done'); }
    loop.wake();
  }, { passive: true });
  stageEl.addEventListener('pointerleave', () => { ptr.on = false; });
  stageEl.addEventListener('pointerdown', (e) => {
    const [x, y] = toWorld(e); ptr.x = x; ptr.y = y; ptr.on = true; ptr.t = now; ptr.burst = 1; loop.wake();
  });

  /* ---------- the camera, opt-in ---------- */
  const cam = { stream: null, video: null, seg: null, segFailed: false, mask: null, mw: 0, mh: 0, busy: false };
  const segCanvas = document.createElement('canvas');
  const sctx = segCanvas.getContext('2d');
  const can = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && window.isSecureContext;
  if (btn) {
    if (can) btn.hidden = false;
    else say('This browser can’t share a camera here, so your pointer moves the particles instead.');
    btn.addEventListener('click', () => (cam.stream ? stopCam() : startCam()));
  }
  function say(t) { if (status) status.textContent = t; }
  function setBtn(on, busy) {
    if (!btn) return;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.disabled = !!busy;
    btn.querySelector('.nh-cam-l').textContent = busy ? 'Starting camera…' : on ? 'Stop camera' : 'Enable camera';
  }
  async function startCam() {
    setBtn(false, true); say('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      if (!inView) { stream.getTracks().forEach((t) => t.stop()); setBtn(false); return; }
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.srcObject = stream;
      await v.play();
      cam.stream = stream; cam.video = v; prevLuma = null;
      setBtn(true);
      say('Camera on. Move, and the particles scatter around you.');
      if (hint) hint.classList.add('done');
      loadSegmenter();
      loop.wake();
    } catch (e) {
      setBtn(false);
      const denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      const none = e && (e.name === 'NotFoundError' || e.name === 'OverconstrainedError');
      say(denied ? 'Camera permission was not given. That’s fine: your pointer moves the particles instead.'
        : none ? 'No camera was found. Your pointer moves the particles instead.'
          : 'The camera couldn’t start. Your pointer moves the particles instead.');
    }
  }
  function stopCam() {
    if (cam.stream) cam.stream.getTracks().forEach((t) => t.stop());
    if (cam.video) { cam.video.pause(); cam.video.srcObject = null; }
    cam.stream = null; cam.video = null; cam.mask = null; prevLuma = null;
    setBtn(false);
  }
  async function loadSegmenter() {
    if (cam.seg || cam.segFailed || cam.loading) return;
    cam.loading = true;
    try {
      const { FilesetResolver, ImageSegmenter } = await import(`${MP}/vision_bundle.mjs`);
      const files = await FilesetResolver.forVisionTasks(`${MP}/wasm`);
      const opts = (delegate) => ({ baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: 'VIDEO', outputCategoryMask: false, outputConfidenceMasks: true });
      try { cam.seg = await ImageSegmenter.createFromOptions(files, opts('GPU')); }
      catch (e) { cam.seg = await ImageSegmenter.createFromOptions(files, opts('CPU')); }
    } catch (e) {
      cam.segFailed = true;
      if (cam.stream) say('Camera on. Move, and your movement appears as light.');
    }
    cam.loading = false;
  }
  addEventListener('pagehide', stopCam);
  let inView = true;
  new IntersectionObserver((es) => { inView = es[0].isIntersecting; if (!inView && cam.stream) { stopCam(); say('The camera stopped when the wall left the screen.'); } }).observe(stageEl);

  /* cover-crop the video into the wall's shape, mirrored, at a given size */
  function drawMirrored(ctx, w, h) {
    const v = cam.video, vw = v.videoWidth, vh = v.videoHeight;
    if (!vw || !vh) return false;
    const a = w / h; let sw = vw, sh = vw / a;
    if (sh > vh) { sh = vh; sw = vh * a; }
    ctx.setTransform(-1, 0, 0, 1, w, 0);
    ctx.drawImage(v, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, w, h);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return true;
  }
  let segTick = 0;
  function readCamera() {
    if (!drawMirrored(actx, cols, rows)) return;
    const px = actx.getImageData(0, 0, cols, rows).data;
    if (!prevLuma || prevLuma.length !== N) prevLuma = new Float32Array(N);
    // segmentation runs on a slightly larger frame, every other tick
    if (cam.seg && !cam.busy && (segTick++ % 2 === 0)) {
      const sw = 256, sh = Math.max(64, Math.round(256 / aspect));
      if (segCanvas.width !== sw || segCanvas.height !== sh) { segCanvas.width = sw; segCanvas.height = sh; }
      drawMirrored(sctx, sw, sh);
      cam.busy = true;
      try {
        cam.seg.segmentForVideo(segCanvas, performance.now(), (res) => {
          const m = res.confidenceMasks && res.confidenceMasks[0];
          if (m) {
            const src = m.getAsFloat32Array();
            if (!cam.mask || cam.mask.length !== src.length) cam.mask = new Float32Array(src.length);
            cam.mask.set(src); cam.mw = m.width; cam.mh = m.height;
          }
        });
      } catch (e) { cam.seg = null; cam.segFailed = true; }
      cam.busy = false;
    }
    const hasMask = !!cam.mask;
    for (let r = 0, i = 0; r < rows; r++) for (let c = 0; c < cols; c++, i++) {
      const R = px[i * 4] / 255, G = px[i * 4 + 1] / 255, B = px[i * 4 + 2] / 255;
      const l = 0.3 * R + 0.59 * G + 0.11 * B;
      const d = Math.abs(l - prevLuma[i]); prevLuma[i] = l;
      motion[i] = Math.max(motion[i] * 0.82, d > 0.08 ? Math.min(1, d * 3) : 0);
      let m;
      if (hasMask) {
        const mx = Math.min(cam.mw - 1, Math.floor((c / cols) * cam.mw)), my = Math.min(cam.mh - 1, Math.floor((r / rows) * cam.mh));
        m = cam.mask[my * cam.mw + mx];
        m = Math.min(1, Math.max(0, (m - 0.4) / 0.3));
      } else {
        // fallback: movement reveals the figure, and it lingers for a few seconds
        m = Math.min(1, target[i] * 0.985 + motion[i] * 0.9);
      }
      target[i] = m;
      // the visitor's own colours, lifted toward the exhibit's light
      const lift = 0.35;
      col[i * 3] = Math.min(1, R * 1.3 * (1 - lift) + glowCol[i * 3] * lift);
      col[i * 3 + 1] = Math.min(1, G * 1.3 * (1 - lift) + glowCol[i * 3 + 1] * lift);
      col[i * 3 + 2] = Math.min(1, B * 1.3 * (1 - lift) + glowCol[i * 3 + 2] * lift);
    }
  }
  function readFigure(t) {
    for (let i = 0; i < N; i++) {
      const a = figure[i * 4 + 3] / 255;
      target[i] = a * (0.75 + 0.25 * Math.sin(t * 2 + i * 0.37));
      col[i * 3] = glowCol[i * 3]; col[i * 3 + 1] = glowCol[i * 3 + 1]; col[i * 3 + 2] = glowCol[i * 3 + 2];
      motion[i] *= 0.86;
    }
  }

  /* ---------- the loop ---------- */
  let now = 0, ready = false;
  const camPos = new THREE.Vector3();
  const loop = runWhileVisible(stageEl, (t, dt) => {
    now = t;
    if (cam.stream) { readCamera(); if (calm) loop.wake(); } else readFigure(t);

    // pointer splat: the pointer pushes like a hand would
    const pSpeed = Math.min(1.5, Math.hypot(ptr.vx, ptr.vy) * 8) + (ptr.burst || 0);
    ptr.burst = Math.max(0, (ptr.burst || 0) - dt * 3);
    ptr.vx *= 0.8; ptr.vy *= 0.8;
    const R2 = 0.9 * 0.9;
    const pos = points.geometry.attributes.position.array;
    const kSpring = cam.stream ? 14 : 9, damp = Math.pow(0.04, dt), push = 26 * GENTLE, mPush = cam.stream ? 0.45 : 1;
    const ga = Math.max(1, Math.round(cols / 48));
    for (let r = 0, i = 0; r < rows; r++) for (let c = 0; c < cols; c++, i++) {
      const hx = home[i * 3], hy = home[i * 3 + 1];
      let ox = off[i * 2], oy = off[i * 2 + 1], vx = vel[i * 2], vy = vel[i * 2 + 1];
      // movement in the frame pushes particles down its gradient and shakes them loose
      const m = motion[i];
      if (m > 0.05) {
        const gx = (motion[i - (c >= ga ? ga : 0)] || 0) - (motion[i + (c < cols - ga ? ga : 0)] || 0);
        const gy = (motion[i + (r < rows - ga ? ga * cols : 0)] || 0) - (motion[i - (r >= ga ? ga * cols : 0)] || 0);
        vx += (gx * 3 + (rnd() - 0.5) * m * 1.4) * push * mPush * dt;
        vy += (gy * 3 + (rnd() - 0.5) * m * 1.4) * push * mPush * dt;
      }
      if (ptr.on && pSpeed > 0.02) {
        const dx = hx + ox - ptr.x, dy = hy + oy - ptr.y, d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          const d = Math.sqrt(d2) + 0.02, f = (1 - d / 0.9) * pSpeed * push * 0.6 * dt;
          vx += (dx / d) * f + ptr.vx * f * 6; vy += (dy / d) * f + ptr.vy * f * 6;
        }
      }
      vx = (vx - ox * kSpring * dt) * damp; vy = (vy - oy * kSpring * dt) * damp;
      ox += vx * dt; oy += vy * dt;
      off[i * 2] = ox; off[i * 2 + 1] = oy; vel[i * 2] = vx; vel[i * 2 + 1] = vy;
      // idle shimmer: particles breathe a little around their place
      const sh = calm ? 0 : 0.012;
      pos[i * 3] = hx + ox + (sh && Math.sin(t * 1.3 + i) * sh);
      pos[i * 3 + 1] = hy + oy + (sh && Math.cos(t * 1.1 + i * 1.7) * sh);
      pos[i * 3 + 2] = 0;
      alpha[i] += (target[i] - alpha[i]) * Math.min(1, dt * (cam.stream ? 12 : 4));
    }
    const ga2 = points.geometry.attributes;
    ga2.position.needsUpdate = true; ga2.aColor.needsUpdate = true; ga2.aAlpha.needsUpdate = true;

    // butterflies: wander near home, flee the pointer and movement
    for (let i = 0; i < BN; i++) {
      const f = fly[i];
      const c = Math.min(cols - 1, Math.max(0, Math.floor((f.x / VW + 0.5) * cols)));
      const r = Math.min(rows - 1, Math.max(0, Math.floor((0.5 - f.y / VH) * rows)));
      let fear = motion[r * cols + c] || 0;
      if (ptr.on) { const dx = f.x - ptr.x, dy = f.y - ptr.y, d = Math.hypot(dx, dy) + 0.01; if (d < 1.4) { fear = Math.max(fear, (1 - d / 1.4) * Math.min(1, pSpeed + 0.3)); f.vx += (dx / d) * fear * 6 * dt * GENTLE; f.vy += (dy / d) * fear * 6 * dt * GENTLE; } }
      if (fear > 0.1) { f.vx += (rnd() - 0.5) * fear * 8 * dt * GENTLE; f.vy += rnd() * fear * 6 * dt * GENTLE; }
      if (!calm) { f.vx += Math.sin(t * 0.7 + f.ph) * 0.4 * dt; f.vy += Math.cos(t * 0.9 + f.ph * 2) * 0.35 * dt; }
      f.vx += (f.hx - f.x) * 0.25 * dt; f.vy += (f.hy - f.y) * 0.25 * dt;
      f.vx *= Math.pow(0.3, dt); f.vy *= Math.pow(0.3, dt);
      f.x += f.vx * dt * 2; f.y += f.vy * dt * 2;
      f.x = Math.max(-VW * 0.52, Math.min(VW * 0.52, f.x)); f.y = Math.max(-VH * 0.45, Math.min(VH * 0.52, f.y));
      const flap = calm ? 0.8 : 0.25 + 0.75 * Math.abs(Math.cos(t * (5 + fear * 14) + f.ph));
      dummy.position.set(f.x, f.y, 0);
      dummy.rotation.set(0, 0, THREE.MathUtils.clamp(-f.vx * 0.4, -0.6, 0.6));
      dummy.scale.set(f.s * 2 * flap, f.s * 0.5 * 2, 1);
      dummy.updateMatrix(); flies.setMatrixAt(i, dummy.matrix);
    }
    flies.instanceMatrix.needsUpdate = true;

    // a little parallax from the pointer
    camPos.set(calm ? 0 : pointer.x * 0.5, calm ? 0 : -pointer.y * 0.25, D);
    camera.position.lerp(camPos, ready ? 0.05 : 1);
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    if (!ready) { ready = true; reveal(); }
  });
}

/* ---------- the plates: a loupe that magnifies where the pointer rests ---------- */
function setupLoupes() {
  if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  document.querySelectorAll('.nh-fig').forEach((fig) => {
    const img = fig.querySelector('img'); if (!img) return;
    const lens = document.createElement('span');
    lens.className = 'nh-loupe'; lens.setAttribute('aria-hidden', 'true');
    fig.appendChild(lens);
    const Z = 2.4;
    fig.addEventListener('pointerenter', () => { fig.classList.add('loupe-on'); lens.style.backgroundImage = `url("${img.currentSrc || img.src}")`; });
    fig.addEventListener('pointerleave', () => fig.classList.remove('loupe-on'));
    fig.addEventListener('pointermove', (e) => {
      const fr = fig.getBoundingClientRect(), ir = img.getBoundingClientRect();
      const x = e.clientX - fr.left, y = e.clientY - fr.top;
      const ix = e.clientX - ir.left, iy = e.clientY - ir.top;
      const L = lens.offsetWidth / 2;
      lens.style.left = x + 'px'; lens.style.top = y + 'px';
      lens.style.backgroundSize = `${ir.width * Z}px ${ir.height * Z}px`;
      lens.style.backgroundPosition = `${L - ix * Z}px ${L - iy * Z}px`;
    });
  });
}
