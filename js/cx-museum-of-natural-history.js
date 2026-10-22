/* ============================================================
   Museum of Natural History: you, as a figure of light, in the habitat.
   The installation recognised visitors' movement: a visitor turned into
   fine particles of light over the exhibition's illustrated environments
   and could push the particles around. This page does the same.

   - The backdrop is the project's own illustrations, used as they are
     (cover-fit, a slow cross-fade between them, a touch of parallax).
   - The particles match the ones in the installation photographs: tiny
     mint-white specks, densely packed, additive, with a soft green glow
     around the body and a few brighter glints.
   - Without the camera: a figure made of those particles stands in the
     scene; the pointer (or a finger) pushes the particles and they drift
     back to re-form the figure.
   - With the camera (only after the visitor presses "Enable camera"):
     the visitor is separated from their room by an on-device
     segmentation model (MediaPipe, loaded only then) and drawn with the
     same particles, mirrored. Their movement scatters them. If the model
     can't load, movement alone reveals the figure. Nothing is recorded
     or sent anywhere: frames are read on this device and dropped.
   - The camera stops on "Stop camera", when the wall scrolls out of
     view, and on pagehide.
   - Reduced motion: no cross-fade, drift or twinkle; reactions are gentle.
   ============================================================ */
import { THREE, makeStage, runWhileVisible, turnToFace, pointer, imageTexture, calm } from './cx-kit.js';

turnToFace('.cx-turn');
setupLoupes();

const stageEl = document.getElementById('nhStage');

/* ---------- MediaPipe (pinned), loaded only after the visitor opts in ---------- */
const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite';

/* the project's long-shot environments, as projected on the installation's wall:
   [file, aspect, vertical focus]. Both are 503:800 portraits and the wall takes that
   shape, so each is shown whole. */
const SCENES = {
  valley: ['/assets/opt/mnh-valley.webp', 503 / 800, 0.5],
  street: ['/assets/opt/c021d5d14394.webp', 1006 / 1600, 0.5],
};

const S = makeStage(stageEl, { shadows: false, exposure: 1.0 });
if (S) build(S);

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

  /* ---------- the backdrop: the illustrations themselves, cross-fading ---------- */
  const order = () => ['valley', 'street'];
  const texOf = {};
  for (const k in SCENES) texOf[k] = imageTexture(SCENES[k][0]);
  const bgMat = new THREE.ShaderMaterial({
    depthWrite: false, toneMapped: false,
    uniforms: {
      tA: { value: null }, tB: { value: null }, aA: { value: 1 }, aB: { value: 1 }, fA: { value: 0.5 }, fB: { value: 0.5 },
      uMix: { value: 0 }, uAspect: { value: 1.6 }, uPar: { value: new THREE.Vector2() },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      uniform sampler2D tA, tB; uniform float aA, aB, fA, fB, uMix, uAspect; uniform vec2 uPar; varying vec2 vUv;
      vec2 cover(vec2 uv, float ia, float focus){
        vec2 s = uAspect > ia ? vec2(1.0, ia / uAspect) : vec2(uAspect / ia, 1.0);
        s /= 1.015;                                        // a sliver of slack for the parallax
        vec2 c = vec2(0.5, mix(0.5, 1.0 - focus, 1.0 - s.y > 0.0 ? 1.0 : 0.0));
        c.y = clamp(c.y, s.y * 0.5, 1.0 - s.y * 0.5);
        return (uv - 0.5) * s + c + uPar * (1.0 - s) * 0.5;
      }
      void main(){
        vec3 a = texture2D(tA, cover(vUv, aA, fA)).rgb;
        vec3 b = texture2D(tB, cover(vUv, aB, fB)).rgb;
        gl_FragColor = vec4(mix(a, b, uMix), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), bgMat);
  bg.position.z = -1; bg.renderOrder = 0; scene.add(bg);
  let sceneIdx = 0, fade = 1, nextFadeAt = 9;
  function setScenes(a, b) {
    const [, arA, fcA] = SCENES[a], [, arB, fcB] = SCENES[b];
    bgMat.uniforms.tA.value = texOf[a]; bgMat.uniforms.aA.value = arA; bgMat.uniforms.fA.value = fcA;
    bgMat.uniforms.tB.value = texOf[b]; bgMat.uniforms.aB.value = arB; bgMat.uniforms.fB.value = fcB;
  }

  /* ---------- the particles ---------- */
  let cols = 0, rows = 0, N = 0;
  let home, off, vel, alpha, target, pres, motion, prevLuma;
  let points = null, halo = null, shade = null;
  const pUniforms = { uSize: { value: 2 }, uTime: { value: 0 }, uTwinkle: { value: calm ? 0 : 1 } };
  const vert = (sizeK) => /* glsl */`
    attribute float aAlpha; attribute float aSeed;
    uniform float uSize, uTime, uTwinkle; varying float vA; varying float vS;
    void main(){
      vS = aSeed;
      float tw = 1.0 - uTwinkle * 0.45 * (0.5 + 0.5 * sin(uTime * (2.0 + aSeed * 5.0) + aSeed * 60.0));
      vA = aAlpha * tw;
      gl_PointSize = uSize * ${sizeK} * (0.55 + aSeed * 0.9);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;
  // a speck: a bright mint-white core; one in ~12 is a brighter glint
  const speckMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: pUniforms,
    vertexShader: vert('1.0'),
    fragmentShader: /* glsl */`
      varying float vA; varying float vS;
      void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard;
        float core = pow(1.0 - d, 1.6);
        float glint = step(0.92, vS) * 0.8;
        vec3 c = mix(vec3(0.6, 1.0, 0.8), vec3(0.9, 1.0, 0.93), core);
        gl_FragColor = vec4(c * core * vA * (0.52 + glint), 1.0); }`,
  });
  // a faint dark halo under the body, so the light reads on the bright art without dimming it
  const shadeMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: pUniforms,
    vertexShader: vert('7.0'),
    fragmentShader: /* glsl */`
      varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard;
        gl_FragColor = vec4(0.02, 0.16, 0.15, exp(-d * d * 3.0) * vA * 0.035); }`,
  });
  // the glow around the body: large, faint, green
  const haloMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: pUniforms,
    vertexShader: vert('6.0'),
    fragmentShader: /* glsl */`
      varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard;
        float g = exp(-d * d * 3.5);
        gl_FragColor = vec4(vec3(0.42, 1.0, 0.74) * g * vA * 0.06, 1.0); }`,
  });

  // the figure (no camera): a person reaching up toward the wall, as in the exhibit's photographs
  const figCanvas = document.createElement('canvas');
  function drawFigure(w, h) {
    figCanvas.width = w; figCanvas.height = h;
    const c = figCanvas.getContext('2d', { willReadFrequently: true });
    c.clearRect(0, 0, w, h);
    c.save(); c.translate(w * 0.44, h * 0.9); const s = (h * 0.66) / 98; c.scale(s, s);   // feet on the path, two-thirds of the wall
    c.fillStyle = '#fff'; c.strokeStyle = '#fff'; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.ellipse(0, -84, 5.2, 6.4, 0, 0, Math.PI * 2); c.fill();                        // head
    c.lineWidth = 4; c.beginPath(); c.moveTo(0, -78); c.lineTo(0, -73); c.stroke();                   // neck
    c.beginPath(); c.moveTo(-8.5, -72); c.quadraticCurveTo(0, -75, 8.5, -72);                         // shoulders, torso, hips
    c.lineTo(6, -56); c.lineTo(7, -44); c.lineTo(-7, -44); c.lineTo(-6, -56); c.closePath(); c.fill();
    c.lineWidth = 3.6; c.beginPath(); c.moveTo(7.5, -70); c.quadraticCurveTo(13, -82, 15, -98); c.stroke(); // raised arm, reaching for the wall
    c.beginPath(); c.moveTo(-7.5, -70); c.quadraticCurveTo(-12, -58, -11, -46); c.stroke();           // lowered arm
    c.lineWidth = 5; c.beginPath(); c.moveTo(-3.5, -45); c.lineTo(-5.5, -2); c.stroke();               // legs
    c.beginPath(); c.moveTo(3.5, -45); c.lineTo(5.5, -2); c.stroke();
    c.restore();
    // soften the edge so the body has a fringe of looser specks, as in the photographs
    const d = c.getImageData(0, 0, w, h).data, out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let a = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < w && yy < h) { a += d[(yy * w + xx) * 4 + 3]; n++; }
      }
      out[y * w + x] = a / n / 255;
    }
    return out;
  }
  let figure = null;
  function rebuild() {
    const want = innerWidth < 700 ? 22000 : 36000;
    cols = Math.max(40, Math.round(Math.sqrt(want * aspect)));
    rows = Math.max(40, Math.round(cols / aspect));
    N = cols * rows;
    home = new Float32Array(N * 3); off = new Float32Array(N * 2); vel = new Float32Array(N * 2);
    alpha = new Float32Array(N); target = new Float32Array(N); pres = new Float32Array(N);
    motion = new Float32Array(N); prevLuma = null;
    const seeds = new Float32Array(N);
    for (let r = 0, i = 0; r < rows; r++) for (let c = 0; c < cols; c++, i++) {
      // jittered inside its cell, so the body reads as glitter rather than a grid
      home[i * 3] = ((c + rnd()) / cols - 0.5) * VW;
      home[i * 3 + 1] = (0.5 - (r + rnd()) / rows) * VH;
      seeds[i] = rnd();
    }
    figure = drawFigure(cols, rows);
    if (points) { scene.remove(points, halo, shade); points.geometry.dispose(); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    shade = new THREE.Points(g, shadeMat); shade.frustumCulled = false; shade.renderOrder = 1; scene.add(shade);
    halo = new THREE.Points(g, haloMat); halo.frustumCulled = false; halo.renderOrder = 2; scene.add(halo);
    points = new THREE.Points(g, speckMat); points.frustumCulled = false; points.renderOrder = 3; scene.add(points);
    analysis.width = cols; analysis.height = rows;
    pUniforms.uSize.value = (stageEl.clientWidth / cols) * Math.min(devicePixelRatio || 1, 2) * 1.35;
  }
  const analysis = document.createElement('canvas');
  const actx = analysis.getContext('2d', { willReadFrequently: true });

  /* ---------- framing ---------- */
  let first = true;
  onResize((w, h) => {
    aspect = w / h;
    VH = 2 * D * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); VW = VH * aspect;
    const k = (D + 1) / D;
    bg.scale.set(VW * k * 1.02, VH * k * 1.02, 1);
    bgMat.uniforms.uAspect.value = aspect;
    if (first) { const o = order(); setScenes(o[0], o[1]); first = false; }
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
        m = Math.min(1, pres[i] * 0.985 + motion[i] * 0.9);
      }
      pres[i] = m;
      // the same particles as the figure; the frame's light only shades their strength
      target[i] = m * (0.6 + 0.4 * Math.min(1, l * 1.6));
    }
  }
  function readFigure(t) {
    const breathe = calm ? 1 : 0.92 + 0.08 * Math.sin(t * 1.4);
    for (let i = 0; i < N; i++) { target[i] = figure[i] * breathe; motion[i] *= 0.86; }
  }

  /* ---------- the loop ---------- */
  let now = 0, ready = false;
  const camPos = new THREE.Vector3();
  const loop = runWhileVisible(stageEl, (t, dt) => {
    now = t;
    pUniforms.uTime.value = t;
    if (cam.stream) { readCamera(); if (calm) loop.wake(); } else readFigure(t);

    // the backdrop: a slow cross-fade from one illustration to the next
    if (!calm) {
      if (fade >= 1 && t > nextFadeAt) {
        const o = order(); sceneIdx = (sceneIdx + 1) % o.length;
        setScenes(o[(sceneIdx + o.length - 1) % o.length], o[sceneIdx]); fade = 0; bgMat.uniforms.uMix.value = 0;
      }
      if (fade < 1) { fade = Math.min(1, fade + dt / 2.5); bgMat.uniforms.uMix.value = fade * fade * (3 - 2 * fade); if (fade >= 1) nextFadeAt = t + 9; }
      bgMat.uniforms.uPar.value.set(pointer.x * 0.6, -pointer.y * 0.6);
    }

    // pointer splat: the pointer pushes like a hand would
    const pSpeed = Math.min(1.5, Math.hypot(ptr.vx, ptr.vy) * 8) + (ptr.burst || 0);
    ptr.burst = Math.max(0, (ptr.burst || 0) - dt * 3);
    ptr.vx *= 0.8; ptr.vy *= 0.8;
    const R2 = 0.7 * 0.7;
    const pos = points.geometry.attributes.position.array;
    const kSpring = cam.stream ? 14 : 9, damp = Math.pow(0.04, dt), push = 26 * GENTLE, mPush = cam.stream ? 0.45 : 1;
    const ga = Math.max(1, Math.round(cols / 48));
    const sh = calm ? 0 : 0.01;
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
      if (ptr.on && pSpeed > 0.02 && alpha[i] > 0.01) {
        const dx = hx + ox - ptr.x, dy = hy + oy - ptr.y, d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          const d = Math.sqrt(d2) + 0.02, f = (1 - d / 0.7) * pSpeed * push * 0.6 * dt;
          vx += (dx / d) * f + ptr.vx * f * 6; vy += (dy / d) * f + ptr.vy * f * 6;
        }
      }
      vx = (vx - ox * kSpring * dt) * damp; vy = (vy - oy * kSpring * dt) * damp;
      ox += vx * dt; oy += vy * dt;
      off[i * 2] = ox; off[i * 2 + 1] = oy; vel[i * 2] = vx; vel[i * 2 + 1] = vy;
      pos[i * 3] = hx + ox + (sh && Math.sin(t * 1.3 + i) * sh);
      pos[i * 3 + 1] = hy + oy + (sh && Math.cos(t * 1.1 + i * 1.7) * sh);
      alpha[i] += (target[i] - alpha[i]) * Math.min(1, dt * (cam.stream ? 12 : 4));
    }
    const at = points.geometry.attributes;
    at.position.needsUpdate = true; at.aAlpha.needsUpdate = true;

    camPos.set(calm ? 0 : pointer.x * 0.3, calm ? 0 : -pointer.y * 0.15, D);
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
