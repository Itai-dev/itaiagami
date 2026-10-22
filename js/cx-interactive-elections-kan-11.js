/* ============================================================
   Kan 11 Interactive Elections: the opening scene.
   A parliament of 120 seats on a glass studio dais, under the Knesset
   drawn in light and over a field of blue particles, as in the title.
   The seats count themselves in; a visitor taps blocs (in the scene or
   on the results card) to build a coalition, and the seats regroup so
   the coalition reads from the left against the majority line.
   Deliberately abstract: lettered blocs in neutral colours, random
   sizes, no real parties, numbers or results.
   ============================================================ */
import { THREE, makeStage, runWhileVisible, pointer, roundedBox, calm } from './cx-kit.js';

const stageEl = document.getElementById('elStage');
const hud = document.getElementById('elHud');
const S = makeStage(stageEl, { shadows: false, exposure: 1.1 });
if (S && hud) build(S);
rail();

function build({ renderer, scene, camera, reveal, onResize }) {
  const SEATS = 120, MAJ = 61;
  const ORANGE = new THREE.Color('#ffa31a');
  const DARK = new THREE.Color('#13235f'), WHITE = new THREE.Color('#ffffff');
  const blocCols = ['#ffffff', '#7fb6ff', '#3d7bff', '#b9c6e4', '#5c6fa8', '#2ad0ff'].map((c) => new THREE.Color(c));
  const NAMES = ['A', 'B', 'C', 'D', 'E', 'F'];

  /* ---------- light ---------- */
  scene.add(new THREE.HemisphereLight('#bcd6ff', '#0a1650', 1.6));
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(-3, 8, 6);
  scene.add(key);
  const glow = new THREE.PointLight('#3d8bff', 30, 12, 1.5);
  glow.position.set(0, 2.5, -1);
  scene.add(glow);

  /* ---------- the hemicycle: seven rows, 120 slots ---------- */
  const ROWS = 7, R0 = 1.55, R1 = 3.55;
  const radii = Array.from({ length: ROWS }, (_, i) => R0 + (R1 - R0) * i / (ROWS - 1));
  const sumR = radii.reduce((a, b) => a + b, 0);
  const counts = radii.map((r) => Math.round(SEATS * r / sumR));
  counts[ROWS - 1] += SEATS - counts.reduce((a, b) => a + b, 0);
  const slots = [];
  radii.forEach((r, i) => {
    for (let k = 0; k < counts[i]; k++) {
      const th = Math.PI - (k + 0.5) / counts[i] * Math.PI;
      slots.push({ th, r, x: Math.cos(th) * r, z: -Math.sin(th) * r, ry: th - Math.PI / 2 });
    }
  });
  slots.sort((a, b) => (b.th - a.th) || (a.r - b.r));      // left to right, like a parliament chart

  const seatGeo = roundedBox(0.2, 0.16, 0.2, 0.05);
  const seatMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35, metalness: 0.15 });
  seatMat.onBeforeCompile = (sh) => {                    // the seat's own colour also glows
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n#ifdef USE_INSTANCING_COLOR\ntotalEmissiveRadiance += vColor.rgb * 0.45;\n#endif');
  };
  const seats = new THREE.InstancedMesh(seatGeo, seatMat, SEATS);
  seats.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(seats);
  const seat = Array.from({ length: SEATS }, (_, i) => ({
    bloc: 0, ord: 0, lit: 0, delay: 0,
    x: slots[i].x, z: slots[i].z, y: 0, ry: slots[i].ry, lift: 0,
  }));
  const tmpC = new THREE.Color(), dummy = new THREE.Object3D();

  /* ---------- the dais, the majority line, the Knesset in light ---------- */
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(R1 + 0.5, R1 + 0.5, 0.08, 96, 1, false, Math.PI / 2, Math.PI),
    new THREE.MeshStandardMaterial({ color: '#0c1d63', roughness: 0.45, metalness: 0.2 }));
  dais.position.y = -0.05;
  scene.add(dais);
  const rimMat = new THREE.MeshBasicMaterial({ color: '#a9d0ff', toneMapped: false });
  [R1 + 0.5, R0 - 0.35].forEach((r) => {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 6, 120, Math.PI), rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.005;
    rim.rotation.z = Math.PI;
    scene.add(rim);
  });
  const podium = new THREE.Mesh(roundedBox(0.7, 0.22, 0.34, 0.1), new THREE.MeshStandardMaterial({ color: '#2a4fb8', roughness: 0.3, metalness: 0.3, emissive: '#3d8bff', emissiveIntensity: 0.35 }));
  podium.position.set(0, -0.01, -0.35);
  scene.add(podium);

  const majMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, toneMapped: false, depthWrite: false });
  const majLine = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, R1 - R0 + 0.9), majMat);
  majLine.position.set(0, 0.0, -(R0 + R1) / 2);
  scene.add(majLine);
  const curtainMat = new THREE.MeshBasicMaterial({ color: '#ffa31a', transparent: true, opacity: 0, toneMapped: false, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const curtain = new THREE.Mesh(new THREE.PlaneGeometry(R1 - R0 + 0.9, 1.1), curtainMat);
  curtain.rotation.y = Math.PI / 2;
  curtain.position.set(0, 0.55, -(R0 + R1) / 2);
  scene.add(curtain);

  const knesset = new THREE.Group();                     // a colonnade of light, as in the title
  const kMat = new THREE.MeshBasicMaterial({ color: '#cfe3ff', transparent: true, opacity: 0.7, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false });
  const KW = 8.4;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(KW, 0.09, 0.04), kMat); roof.position.y = 1.75; knesset.add(roof);
  const roof2 = new THREE.Mesh(new THREE.BoxGeometry(KW * 0.93, 0.04, 0.04), kMat); roof2.position.y = 1.6; knesset.add(roof2);
  const colGeo = new THREE.BoxGeometry(0.06, 1, 0.04);
  for (let i = 0; i < 18; i++) {
    const c = new THREE.Mesh(colGeo, kMat);
    const x = -KW * 0.45 + KW * 0.9 * i / 17;
    const h = 1.5 - Math.abs(x) * 0.06;
    c.scale.y = h; c.position.set(x, h / 2, 0);
    knesset.add(c);
  }
  knesset.position.set(0, 0, -R1 - 3.2);
  knesset.scale.set(1.2, 0.85, 1);
  scene.add(knesset);

  /* ---------- the field of particles ---------- */
  const N = calm ? 1600 : 2600;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), ph = new Float32Array(N), sz = new Float32Array(N);
  const palette = ['#3d8bff', '#7fb6ff', '#2ad0ff', '#ffffff', '#1f63e6'].map((c) => new THREE.Color(c));
  for (let i = 0; i < N; i++) {
    let x = (Math.random() - 0.5) * 30, z = -2 - Math.random() * 18, y = 0;
    if (Math.abs(x) < R1 + 1.2 && z > -R1 - 2.2) z -= R1 + 2.4;     // keep clear of the dais
    if (Math.random() < 0.3) y = Math.pow(Math.random(), 3) * 2.6;   // towers of light, like a city
    pos.set([x, y - 0.12, z], i * 3);
    const c = palette[(Math.random() * palette.length) | 0];
    col.set([c.r, c.g, c.b], i * 3);
    ph[i] = Math.random() * 6.28; sz[i] = 0.6 + Math.random() * 1.8;
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  pg.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
  pg.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
  const pMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute float aPhase; attribute float aSize; attribute vec3 color; uniform float uTime; uniform float uPR;
      varying vec3 vC; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPR * (34.0 / -mv.z); vA = 0.45 + 0.55 * (0.5 + 0.5 * sin(uTime * 1.4 + aPhase)); vC = color; }`,
    fragmentShader: `varying vec3 vC; varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * vA; if (a < 0.01) discard; gl_FragColor = vec4(vC, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  scene.add(new THREE.Points(pg, pMat));

  /* ---------- blocs, the count and the coalition ---------- */
  let sizes = [], coalition = [], counting = 0;
  const buttons = [];
  const blocsEl = document.getElementById('elBlocs');
  const fill = document.getElementById('elFill');
  const status = document.getElementById('elStatus');
  NAMES.forEach((n, b) => {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'el-bloc';
    btn.setAttribute('aria-pressed', 'false');
    btn.style.setProperty('--c', '#' + blocCols[b].getHexString());
    btn.innerHTML = `<span class="sw">Bloc ${n}</span><span class="bar" aria-hidden="true"></span>`;
    btn.addEventListener('click', () => { user(); toggle(b, true); });
    blocsEl.appendChild(btn); buttons.push(btn);
  });
  hud.hidden = false;

  function newCount() {
    // random, abstract bloc sizes that add up to 120, none a majority alone
    let w = NAMES.map(() => 0.35 + Math.random());
    const sum = w.reduce((a, b) => a + b, 0);
    sizes = w.map((v) => Math.max(5, Math.round(v / sum * SEATS)));
    let diff = SEATS - sizes.reduce((a, b) => a + b, 0);
    while (diff !== 0) { const i = (Math.random() * sizes.length) | 0; const s = Math.sign(diff); if (sizes[i] + s >= 5 && sizes[i] + s < MAJ - 10) { sizes[i] += s; diff -= s; } }
    let i = 0;
    sizes.forEach((n, b) => { for (let k = 0; k < n; k++, i++) { seat[i].bloc = b; seat[i].ord = k; } });
    const t = clockT;
    seat.forEach((s) => { s.lit = calm ? 1 : 0; s.delay = t + 0.3 + Math.random() * 3.2; });
    counting = calm ? 0 : t + 3.8;
    coalition = [];
    buttons.forEach((btn, b) => { btn.setAttribute('aria-pressed', 'false'); btn.style.setProperty('--w', (sizes[b] / 45 * 100).toFixed(1)); });
    arrange();
  }

  function arrange() {
    const order = [...coalition, ...NAMES.map((_, b) => b).filter((b) => !coalition.includes(b))];
    const offset = []; let o = 0;
    order.forEach((b) => { offset[b] = o; o += sizes[b]; });
    seat.forEach((s) => { s.slot = offset[s.bloc] + s.ord; });
    const n = coalition.reduce((a, b) => a + sizes[b], 0);
    fill.style.width = (n / SEATS * 100).toFixed(1) + '%';
    hud.classList.toggle('maj', n >= MAJ);
    majority = n >= MAJ;
    paint();
  }
  let majority = false;

  function toggle(b, announce) {
    const i = coalition.indexOf(b);
    if (i >= 0) coalition.splice(i, 1); else coalition.push(b);
    buttons[b].setAttribute('aria-pressed', i >= 0 ? 'false' : 'true');
    arrange();
    if (announce) status.textContent = !coalition.length ? 'Tap the blocs to build a majority.' : majority ? 'Majority reached.' : 'Short of a majority.';
    if (majority && i < 0) pulse = 1;
    tick.wake();
  }

  function paint() {
    const any = coalition.length > 0;
    seat.forEach((s, i) => {
      const inC = coalition.includes(s.bloc);
      tmpC.copy(blocCols[s.bloc]);
      if (any) tmpC.multiplyScalar(inC ? 1.25 : 0.32);
      if (inC && majority) tmpC.lerp(ORANGE, 0.8);
      tmpC.lerpColors(DARK, tmpC, s.lit);
      seats.setColorAt(i, tmpC);
      s.lift = inC ? 0.1 : 0;
    });
    seats.instanceColor.needsUpdate = true;
  }

  /* ---------- input: tap a seat to toggle its bloc; keys 1–6; R recounts ---------- */
  let lastUser = -100, pulse = 0, hover = -1;
  const user = () => { lastUser = clockT; demo = null; };
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  const pick = (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObject(seats, false)[0];
    return hit ? seat[hit.instanceId].bloc : -1;
  };
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10 || performance.now() - down.t > 600) return;
    const b = pick(e);
    if (b >= 0) { user(); toggle(b, true); }
  });
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const b = pick(e);
    if (b !== hover) { hover = b; renderer.domElement.style.cursor = b >= 0 ? 'pointer' : 'default'; tick.wake(); }
  });
  document.getElementById('elRecount').addEventListener('click', () => { user(); newCount(); status.textContent = 'Counting again.'; tick.wake(); });
  addEventListener('keydown', (e) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || !tick.isInView()) return;
    if (/input|textarea|select/i.test((document.activeElement || {}).tagName || '')) return;
    const n = Number(e.key);
    if (n >= 1 && n <= 6) { user(); toggle(n - 1, true); }
    else if (e.key.toLowerCase() === 'r') { user(); newCount(); }
  });

  /* ---------- an idle demonstration: someone builds a coalition, then lets it go ---------- */
  let demo = null;
  function demoStep(t) {
    if (calm || counting > t || t - lastUser < 9) return;
    if (!demo) {
      if (coalition.length) return;
      const order = NAMES.map((_, b) => b).sort(() => Math.random() - 0.5);
      demo = { order, next: t + 0.6, hold: 0 };
      return;
    }
    if (t < demo.next) return;
    if (majority) {
      if (!demo.hold) { demo.hold = t + 3.2; demo.next = demo.hold; return; }
      [...coalition].forEach((b) => toggle(b, false));
      demo = null; lastUser = t - 5;                 // rest a little before the next round
      return;
    }
    const b = demo.order.shift();
    if (b === undefined) { demo = null; return; }
    if (!coalition.includes(b)) toggle(b, false);
    demo.next = t + 0.9;
  }

  /* ---------- framing: the hemicycle sits where the layout leaves room ---------- */
  const look = new THREE.Vector3(0, 0.4, -2.2);
  let dist = 12, mobile = false;
  onResize((w, h) => {
    mobile = w < 900;
    // the region the parliament should fill, in px
    // phones: the stage spans the whole hero, the chamber sits in its first screen
    const vh = Math.min(h, innerHeight || h);
    const rw = mobile ? w * 0.98 : w * 0.5, rh = mobile ? vh * 0.34 : h * 0.5;
    const cxp = mobile ? w / 2 : w * 0.56, cyp = mobile ? 60 + vh * 0.2 : h * 0.33;
    camera.setViewOffset(w, h, w / 2 - cxp, h / 2 - cyp, w, h);
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const needW = 8.4 / (rw / w), needH = 5.6 / (rh / h);
    dist = Math.max(needW / (2 * Math.tan(vFov / 2) * camera.aspect), needH / (2 * Math.tan(vFov / 2)));
  });

  /* ---------- the frame loop ---------- */
  let clockT = 0, ready = false;
  const cam = new THREE.Vector3();
  newCount();
  const tick = runWhileVisible(stageEl, (t, dt) => {
    clockT = t;
    pMat.uniforms.uTime.value = t;

    // the count: seats light one by one
    if (counting) {
      seat.forEach((s, i) => { if (s.lit < 1 && t > s.delay) s.lit = Math.min(1, s.lit + dt * 3.5); });
      paint();
      if (t > counting && seat.every((s) => s.lit >= 1)) counting = 0;
    }
    demoStep(t);

    // seats glide to their slots
    const k = calm ? 1 : 1 - Math.pow(0.0015, dt);
    pulse = Math.max(0, pulse - dt * 0.8);
    for (let i = 0; i < SEATS; i++) {
      const s = seat[i], sl = slots[s.slot];
      s.x += (sl.x - s.x) * k; s.z += (sl.z - s.z) * k; s.ry = sl.ry;
      const hov = hover === s.bloc ? 0.06 : 0;
      const wave = calm ? 0 : Math.sin(t * 2 + sl.th * 3) * 0.012;
      const hop = Math.min(0.6, Math.hypot(sl.x - s.x, sl.z - s.z) * 0.35);   // seats hop over each other
      s.y += ((s.lift + hov) * (1 + pulse * 1.5) + wave + hop - s.y) * k;
      const pop = s.lit < 1 ? 0.4 + s.lit * 0.6 : 1;
      dummy.position.set(s.x, s.y, s.z);
      dummy.rotation.set(0, -s.ry, 0);
      dummy.scale.setScalar(pop);
      dummy.updateMatrix();
      seats.setMatrixAt(i, dummy.matrix);
    }
    seats.instanceMatrix.needsUpdate = true;

    // the majority line wakes when the coalition crosses it
    majMat.color.lerp(majority ? ORANGE : WHITE, 0.1);
    majMat.opacity += ((majority ? 1 : 0.35) - majMat.opacity) * 0.1;
    curtainMat.opacity += ((majority ? 0.16 + pulse * 0.25 : 0) - curtainMat.opacity) * 0.1;
    kMat.opacity = 0.55 + (calm ? 0 : Math.sin(t * 0.8) * 0.12);

    // camera: high over the chamber, leaning with the pointer
    const sway = calm ? 0 : Math.sin(t * 0.2) * 0.35;
    cam.set(sway + pointer.x * 2.2, dist * 0.5 - pointer.y * 1.2, dist * 0.87 - 2.2);
    camera.position.lerp(cam, ready && !calm ? 0.05 : 1);
    camera.lookAt(look);

    renderer.render(scene, camera);
    if (!ready) { ready = true; reveal(); }
  });
}

/* ---------- the running order: the rail lights the screen in view ---------- */
function rail() {
  const links = [...document.querySelectorAll('.el-rail a')];
  if (!links.length || !('IntersectionObserver' in window)) return;
  const targets = links.map((a) => document.querySelector(a.getAttribute('href')));
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const i = targets.indexOf(e.target);
    links.forEach((a, j) => a.classList.toggle('on', i === j));
    if (i >= 0) links[i].setAttribute('aria-current', 'true');
    links.forEach((a, j) => { if (j !== i) a.removeAttribute('aria-current'); });
  }), { rootMargin: '-45% 0px -50% 0px' });
  targets.forEach((t) => t && io.observe(t));
}
