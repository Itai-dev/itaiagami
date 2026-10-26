/* ============================================================
   Simply Vision Pro: the playable keyboard.
   A live 3D keyboard under a floating purple notation bar, the way the
   launch film showed it, with the film's white virtual hand above it.
   On a desktop the hand is the cursor: it follows the pointer and a click
   presses the key under the index finger. On touch, the hand travels to
   the tapped key and presses it. Idle, the hand plays the lesson. The melody plays itself silently (keys light
   turquoise in time); a visitor can tap keys or use the computer keyboard
   (A W S E D F T G Y H U J K) and hear them.

   Progressive enhancement: the poster image stays until WebGL is ready,
   and stays for good without WebGL. Reduced motion: no autoplay, no
   camera drift; a key still answers when pressed.
   ============================================================ */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.186.1/+esm';
import { buildHand } from './simply-hand.js';

const stage = document.getElementById('pnStage');
const hint = document.getElementById('pnHint');
if (stage) start().catch(() => {});

async function start() {
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }                       // no WebGL: the poster stays

  const TEAL = new THREE.Color('#2ef2d0');

  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.className = 'pn-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);

  /* ---------- light: a soft white studio, one key light; the purple lives in the notation bar ---------- */
  scene.add(new THREE.HemisphereLight('#ffffff', '#cfcad8', 1.7));
  const key = new THREE.DirectionalLight('#ffffff', 2.4);
  key.position.set(-2.5, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 3, bottom: -3, near: 1, far: 16 });
  key.shadow.radius = 6;
  scene.add(key);
  const rim = new THREE.PointLight('#ffffff', 8, 9, 1.6);
  rim.position.set(2.8, 1.6, -1.6);
  scene.add(rim);
  const glow = new THREE.PointLight(TEAL, 0, 2.2, 2);   // follows the lit key
  scene.add(glow);

  /* ---------- the keyboard: C3 to C5, 15 white keys ---------- */
  const W = 0.25, GAP = 0.012, WD = 1.45, WH = 0.17;   // white key width, depth, height
  const BW = 0.15, BD = 0.92, BH = 0.16;               // black key
  const whiteNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const blackAfter = { C: 'C#', D: 'D#', F: 'F#', G: 'G#', A: 'A#' };
  const keys = {};                                     // note name -> {mesh, mat, pivot, black}
  const board = new THREE.Group();
  scene.add(board);

  const whiteGeo = rounded(W - GAP, WH, WD, 0.03);
  const blackGeo = rounded(BW, BH, BD, 0.025);
  const whiteMat = () => new THREE.MeshStandardMaterial({ color: '#f5f3fa', roughness: 0.32, metalness: 0, emissive: TEAL, emissiveIntensity: 0 });
  const blackMat = () => new THREE.MeshStandardMaterial({ color: '#16131f', roughness: 0.38, metalness: 0.1, emissive: TEAL, emissiveIntensity: 0 });

  const whites = [];
  for (let o = 3; o <= 5; o++) for (const n of whiteNames) { if (o === 5 && n !== 'C') break; whites.push(n + o); }
  const x0 = -(whites.length * W) / 2 + W / 2;
  whites.forEach((name, i) => {
    const pivot = new THREE.Group();                   // keys hinge at the back, like real ones
    pivot.position.set(x0 + i * W, 0, -WD / 2);
    const mat = whiteMat();
    const mesh = new THREE.Mesh(whiteGeo, mat);
    mesh.position.set(0, WH / 2, WD / 2);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.note = name;
    pivot.add(mesh); board.add(pivot);
    keys[name] = { mesh, mat, pivot, black: false, x: pivot.position.x, press: 0 };
    const b = blackAfter[name[0]];
    if (b && i < whites.length - 1) {
      const bName = b + name.slice(1);
      const bp = new THREE.Group();
      bp.position.set(x0 + i * W + W / 2, 0, -WD / 2);
      const bm = blackMat();
      const bmesh = new THREE.Mesh(blackGeo, bm);
      bmesh.position.set(0, WH + BH / 2 - 0.04, BD / 2);
      bmesh.castShadow = true;
      bmesh.userData.note = bName;
      bp.add(bmesh); board.add(bp);
      keys[bName] = { mesh: bmesh, mat: bm, pivot: bp, black: true, x: bp.position.x, press: 0 };
    }
  });

  /* the instrument's body: a soft white shell with a dark control strip */
  const span = whites.length * W;
  const body = new THREE.Mesh(rounded(span + 0.5, 0.36, 0.75, 0.08),
    new THREE.MeshStandardMaterial({ color: '#ebe7f4', roughness: 0.45 }));
  body.position.set(0, 0.16, -WD / 2 - 0.3);
  body.castShadow = body.receiveShadow = true;
  board.add(body);
  const base = new THREE.Mesh(rounded(span + 0.5, 0.12, WD + 0.78, 0.05),
    new THREE.MeshStandardMaterial({ color: '#e2ddee', roughness: 0.5 }));
  base.position.set(0, -0.05, -0.33);
  base.receiveShadow = true;
  board.add(base);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(span - 0.4, 0.012, 0.14),
    new THREE.MeshStandardMaterial({ color: '#1d1828', roughness: 0.3, metalness: 0.3 }));
  strip.position.set(0, 0.345, -WD / 2 - 0.3);
  board.add(strip);
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.07),
    new THREE.MeshBasicMaterial({ color: '#46f0d4' }));
  lcd.rotation.x = -Math.PI / 2;
  lcd.position.set(0, 0.352, -WD / 2 - 0.3);
  board.add(lcd);
  for (let i = 0; i < 6; i++) {                         // a row of small buttons
    const k = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 20),
      new THREE.MeshStandardMaterial({ color: '#cfc9dc', roughness: 0.4 }));
    k.position.set(-1.45 + i * 0.16, 0.35, -WD / 2 - 0.3);
    board.add(k);
  }

  /* a floor well below the keyboard that only catches its shadow, so it floats over the page */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: 0.2 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.6;
  floor.receiveShadow = true;
  scene.add(floor);

  /* ---------- the floating notation bar ---------- */
  const melody = ['E4', 'E4', 'F4', 'G4', 'G4', 'F4', 'E4', 'D4', 'C4', 'C4', 'D4', 'E4', 'E4', 'D4', 'D4'];
  const panel = notationPanel(melody);
  panel.group.position.set(0, 1.25, -1.05);
  panel.group.rotation.x = -0.12;
  scene.add(panel.group);

  /* the turquoise beam that drops onto the next key */
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.9, 0.02),
    new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  scene.add(beam);

  /* ---------- the hand: the film's white glove hand (js/simply-hand.js). Its origin is the index fingertip ---------- */
  const hand = new THREE.Group();
  scene.add(hand);
  let glove = null;
  // sculpted once, just after the first frame, so the keyboard appears without waiting for it
  setTimeout(() => {
    glove = buildHand(THREE, { step: matchMedia('(max-width: 700px)').matches ? 0.017 : 0.0135 });
    glove.scale.setScalar(1.2);
    hand.add(glove);
    loop();
  }, 60);
  const WHITE_TOP = WH + 0.02, BLACK_TOP = WH + BH - 0.02;
  const keyPoint = (k, v = new THREE.Vector3()) => v.set(k.x, (k.black ? BLACK_TOP : WHITE_TOP) + board.position.y, k.black ? -0.12 : 0.36);
  const handPos = new THREE.Vector3(), handTarget = new THREE.Vector3();
  let handPress = 0, queued = null, hoverKey = null;
  keyPoint(keys.E4, handTarget); handPos.copy(handTarget);   // start resting over the first note
  const HOVER = 0.14;

  /* ---------- sound: a small soft piano voice, only after a visitor plays ---------- */
  let audio = null;
  const freq = (n) => {
    const order = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const semis = order.indexOf(n.slice(0, -1)) + (Number(n.slice(-1)) - 4) * 12 - 9;
    return 440 * Math.pow(2, semis / 12);
  };
  function sound(n) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const t = audio.currentTime, f = freq(n);
      const out = audio.createGain();
      out.gain.setValueAtTime(0.0001, t);
      out.gain.exponentialRampToValueAtTime(0.32, t + 0.008);
      out.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      const lp = audio.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(f * 6, t); lp.frequency.exponentialRampToValueAtTime(f * 1.5, t + 1.2);
      lp.connect(out); out.connect(audio.destination);
      [[1, 'triangle', 1], [2, 'sine', 0.35], [3, 'sine', 0.12]].forEach(([h, type, g]) => {
        const o = audio.createOscillator(), og = audio.createGain();
        o.type = type; o.frequency.value = f * h; og.gain.value = g;
        o.connect(og); og.connect(lp); o.start(t); o.stop(t + 1.7);
      });
    } catch (e) { /* no audio: the keys still light */ }
  }

  /* ---------- pressing a key ---------- */
  let lastPlayed = null;
  function press(n, { audible = false } = {}) {
    const k = keys[n]; if (!k) return;
    k.press = 1;
    lastPlayed = k;
    if (audible) sound(n);
  }

  /* the hand travels to a key, then presses it when the finger arrives */
  function playWithHand(n, audible) {
    const k = keys[n]; if (!k) return;
    keyPoint(k, handTarget);
    queued = { n, audible };
    if (audible) warmAudio();
  }
  function warmAudio() {   // the audio context must start inside the visitor's gesture
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) {}
  }

  /* ---------- the self-playing lesson ---------- */
  let step = 0, nextAt = 0, userUntil = 0;
  const STEP = 0.48;

  /* ---------- input: tap/click keys, or the home row of a computer keyboard ---------- */
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  const keyMeshes = Object.values(keys).map((k) => k.mesh);
  const hoverPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5), onPlane = new THREE.Vector3();
  const aim = (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(keyMeshes, false)[0];
    return hit ? keys[hit.object.userData.note] && hit.object.userData.note : null;
  };
  // a fine pointer: the hand is the cursor, hovering over the key under it
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    const n = aim(e);
    hoverKey = n;
    if (n) keyPoint(keys[n], handTarget);
    else if (ray.ray.intersectPlane(hoverPlane, onPlane)) handTarget.set(THREE.MathUtils.clamp(onPlane.x, -2.3, 2.3), 0.36 + board.position.y, THREE.MathUtils.clamp(onPlane.z, -0.6, 1.2));
    userUntil = clock.elapsedTime + 2.5;
  });
  renderer.domElement.addEventListener('pointerleave', () => { hoverKey = null; userUntil = clock.elapsedTime + 0.8; });
  renderer.domElement.addEventListener('pointerdown', (e) => {
    const n = aim(e);
    if (n) { playWithHand(n, true); userUntil = clock.elapsedTime + 4; played(); }
  });
  const map = { a: 'C4', w: 'C#4', s: 'D4', e: 'D#4', d: 'E4', f: 'F4', t: 'F#4', g: 'G4', y: 'G#4', h: 'A4', u: 'A#4', j: 'B4', k: 'C5' };
  addEventListener('keydown', (e) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || !inView) return;
    if (/input|textarea|select/i.test((document.activeElement || {}).tagName || '')) return;
    const n = map[e.key.toLowerCase()];
    if (n) { playWithHand(n, true); userUntil = clock.elapsedTime + 4; played(); }
  });
  let hinted = false;
  function played() { if (!hinted && hint) { hinted = true; hint.classList.add('done'); } }

  /* ---------- layout: fit the keyboard to the screen ---------- */
  const look = new THREE.Vector3(0, 0.45, -0.1);    // between the keys and the notation bar
  let baseDist = 6;
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const fitW = (span + 0.6) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    baseDist = Math.max(camera.aspect > 1.4 ? 6 : 4.6, fitW * 1.1);   // wide frames: step back so the notation bar fits too
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  /* ---------- scroll and pointer: the camera leans in as the page moves ---------- */
  let scrollT = 0, px = 0, py = 0;
  addEventListener('scroll', () => {
    const r = stage.getBoundingClientRect();
    scrollT = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + r.height))) - 0.5;   // -0.5..0.5 as it crosses the screen
  }, { passive: true });
  if (!calm) addEventListener('pointermove', (e) => { px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5; }, { passive: true });

  /* ---------- run only while visible ---------- */
  let inView = true;
  new IntersectionObserver((es) => { inView = es[0].isIntersecting; if (inView) loop(); }).observe(stage);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(); });

  let elapsed = 0, last = 0;   // a small clock (THREE.Clock is deprecated); pauses off screen
  const clock = { getDelta() { const now = performance.now() / 1000; const d = last ? now - last : 0; last = now; elapsed += Math.min(d, 0.25); return d; }, get elapsedTime() { return elapsed; } };
  let running = false, ready = false;
  const cam = new THREE.Vector3();
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    // the lesson plays itself while nobody is playing
    if (!calm && t > userUntil && t >= nextAt) {
      const n = melody[step];
      playWithHand(n, false);
      panel.setCursor(step);
      step = (step + 1) % melody.length;
      nextAt = t + (step === 0 ? STEP * 4 : STEP);
    }

    // keys: dip and glow, then ease back
    for (const k of Object.values(keys)) {
      k.pivot.rotation.x = k.press * (k.black ? 0.07 : 0.06);
      k.mat.emissiveIntensity = k.press * 1.6;
      k.press = Math.max(0, k.press - dt * 2.4);
    }
    // the hand: glide to its target, press when the finger arrives, then lift
    const follow = calm ? 1 : 1 - Math.exp(-dt * (queued && queued.audible ? 22 : 13));
    handPos.lerp(handTarget, follow);
    if (queued && Math.hypot(handPos.x - handTarget.x, handPos.z - handTarget.z) < 0.035) {
      press(queued.n, { audible: queued.audible });
      handPress = 1; queued = null;
    }
    hand.position.set(handPos.x, handPos.y + HOVER - handPress * (HOVER + 0.03), handPos.z);
    if (glove) glove.userData.setPress(handPress);
    hand.rotation.z = calm ? 0 : Math.sin(t * 1.1) * 0.03;
    handPress = Math.max(0, handPress - dt * 5);

    if (lastPlayed) {
      const v = lastPlayed.press;
      beam.position.set(lastPlayed.x, (lastPlayed.black ? WH + BH : WH) + 0.47, lastPlayed.black ? -WD / 2 + BD * 0.62 : 0.1);
      beam.material.opacity = v * 0.55;
      beam.scale.y = 0.4 + v * 0.6;
      glow.position.set(lastPlayed.x, 0.5, 0.2);
      glow.intensity = v * 6;
    }

    // camera: a slow breath and the visitor's pointer
    const d = baseDist;
    const sway = calm ? 0 : Math.sin(t * 0.25) * 0.12;
    cam.set(sway + px * 0.9, 2.35 + d * 0.32 - py * 0.4, d * 0.88);
    camera.position.lerp(cam, calm || !ready ? 1 : 0.06);
    camera.lookAt(look);
    // parallax: the keyboard floats and the notation bar, nearer the eye, travels further with scroll and pointer
    const s = calm ? 0 : scrollT;
    board.position.y = (calm ? 0 : Math.sin(t * 0.8) * 0.04) - s * 0.12;
    panel.group.position.set(px * 0.3, 1.25 + s * 0.55 + (calm ? 0 : Math.sin(t * 0.9) * 0.03), -1.05 + 0.25);

    renderer.render(scene, camera);
    if (!ready) { ready = true; stage.appendChild(renderer.domElement); stage.classList.add('live'); }
  }
  function loop() {
    if (running) return;
    running = true;
    const tick = () => {
      if (!inView || document.hidden) { running = false; last = 0; return; }
      frame();
      if (calm && !anyPressed()) { running = false; last = 0; return; }   // reduced motion: draw, then rest
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  const anyPressed = () => queued || handPress > 0.001 || Object.values(keys).some((k) => k.press > 0.001);
  // with reduced motion, a key press wakes the loop just long enough to animate it
  if (calm) {
    const wake = () => setTimeout(loop, 0);
    renderer.domElement.addEventListener('pointerdown', wake);
    addEventListener('keydown', wake);
    press('E4'); panel.setCursor(0);
    keyPoint(keys.E4, handTarget); handPos.copy(handTarget);
  }
  loop();

  /* ---------- helpers ---------- */
  function rounded(w, h, d, r) {
    // a box with softened vertical edges: extrude a rounded rectangle
    const s = new THREE.Shape();
    const x = -w / 2, z = -d / 2;
    s.moveTo(x + r, z);
    s.lineTo(x + w - r, z); s.quadraticCurveTo(x + w, z, x + w, z + r);
    s.lineTo(x + w, z + d - r); s.quadraticCurveTo(x + w, z + d, x + w - r, z + d);
    s.lineTo(x + r, z + d); s.quadraticCurveTo(x, z + d, x, z + d - r);
    s.lineTo(x, z + r); s.quadraticCurveTo(x, z, x + r, z);
    const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelSize: r * 0.5, bevelThickness: r * 0.5, bevelSegments: 3, curveSegments: 6 });
    g.rotateX(Math.PI / 2);
    g.translate(0, h / 2, 0);
    g.computeVertexNormals();
    return g;
  }

  function notationPanel(notes) {
    const group = new THREE.Group();
    const cw = 1600, ch = 300;
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const c = cv.getContext('2d');
    const rr = (x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
    // purple glass frame, white staff card, the clef and the notes
    rr(0, 0, cw, ch, 56); c.fillStyle = 'rgba(139,77,255,0.94)'; c.fill();
    rr(28, 30, cw - 56, ch - 60, 34); c.fillStyle = '#ffffff'; c.fill();
    const top = 92, gap = 26;
    c.strokeStyle = '#3a3150'; c.lineWidth = 3;
    for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(70, top + i * gap); c.lineTo(cw - 70, top + i * gap); c.stroke(); }
    c.fillStyle = '#2b2440'; c.font = '200px serif'; c.textBaseline = 'alphabetic';
    c.fillText('\u{1D11E}', 64, top + gap * 4 + 52);
    const pos = { C4: 5, D4: 4.5, E4: 4, F4: 3.5, G4: 3, A4: 2.5, B4: 2, C5: 1.5 };   // line index from top
    const xs = notes.map((_, i) => 240 + i * ((cw - 330) / (notes.length - 1)));
    notes.forEach((n, i) => {
      const y = top + pos[n] * gap;
      c.save(); c.translate(xs[i], y); c.rotate(-0.35);
      c.beginPath(); c.ellipse(0, 0, 17, 12, 0, 0, Math.PI * 2); c.fillStyle = '#231d36'; c.fill(); c.restore();
      c.beginPath(); c.moveTo(xs[i] + 15, y - 3); c.lineTo(xs[i] + 15, y - 78); c.lineWidth = 3.5; c.strokeStyle = '#231d36'; c.stroke();
      if (n === 'C4') { c.beginPath(); c.moveTo(xs[i] - 28, y); c.lineTo(xs[i] + 28, y); c.lineWidth = 3; c.stroke(); }
    });
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const pw = 3.2, ph = pw * ch / cw;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
    group.add(card);
    // the playhead: a turquoise line that steps from note to note
    const cursor = new THREE.Mesh(new THREE.PlaneGeometry(0.022, ph * 0.62),
      new THREE.MeshBasicMaterial({ color: TEAL, toneMapped: false }));
    cursor.position.z = 0.002;
    group.add(cursor);
    const toX = (px) => (px / cw - 0.5) * pw;
    let target = toX(xs[0]) - 0.05;
    cursor.position.x = target;
    cursor.onBeforeRender = () => { cursor.position.x += (target - cursor.position.x) * 0.25; };
    return { group, setCursor: (i) => { target = toX(xs[i]) - 0.05; } };
  }
}
