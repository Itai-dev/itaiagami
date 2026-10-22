/* ============================================================
   SkyMax: the opening scene. A white SkyMax card floats on MAX pink
   among the commercial's puffy holiday toys: palm trees, a pineapple,
   a swim ring, a beach ball. Every tap on it is a purchase: the card
   swipes, a mint ring pulses, and a little toy plane takes off from it
   and circles it, leaving puffy cloud trails. Drag sideways to spin
   the card. Enter makes a purchase from the keyboard.
   ============================================================ */
import { THREE, makeStage, runWhileVisible, scrollProgress, pointer, roundedBox, canvasTexture, turnToFace, calm } from './cx-kit.js';

document.body.classList.add('cx-on');
turnToFace('.cx-turn');
flightPath();

const stageEl = document.getElementById('skStage');
const hint = document.getElementById('skHint');
if (stageEl) { try { build(); } catch (e) { /* the poster stays */ } }

function build() {
  const st = makeStage(stageEl, { shadows: false, exposure: 1.05 });
  if (!st) return;
  const { renderer, scene, camera } = st;
  const NAVY = '#021454', PINK = '#ff5a85', MINT = '#8fe8d6';

  /* ---------- light: bright and soft, pink bounce from below ---------- */
  scene.add(new THREE.HemisphereLight('#ffffff', '#ffb3c6', 1.7));
  const key = new THREE.DirectionalLight('#fff4ec', 2.2); key.position.set(-3, 5, 6); scene.add(key);
  const rim = new THREE.DirectionalLight('#bff5ea', 1.2); rim.position.set(4, 2, -4); scene.add(rim);
  // a soft studio environment so the card's gloss reads
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(20, 24, 12), new THREE.MeshBasicMaterial({ color: '#ff8aa9', side: THREE.BackSide })));
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  panel.position.set(-4, 8, 6); panel.lookAt(0, 0, 0); env.add(panel);
  scene.environment = pmrem.fromScene(env, 0.04).texture;
  scene.environmentIntensity = 0.6;

  const world = new THREE.Group(); scene.add(world);

  /* ---------- the card ---------- */
  const CW = 3.4, CH = 2.14, CR = 0.17, CT = 0.05;
  function cardFace(draw) {
    const tex = canvasTexture(1024, 644, draw);
    const s = new THREE.Shape();
    const x = -CW / 2, y = -CH / 2;
    s.moveTo(x + CR, y); s.lineTo(x + CW - CR, y); s.quadraticCurveTo(x + CW, y, x + CW, y + CR);
    s.lineTo(x + CW, y + CH - CR); s.quadraticCurveTo(x + CW, y + CH, x + CW - CR, y + CH);
    s.lineTo(x + CR, y + CH); s.quadraticCurveTo(x, y + CH, x, y + CH - CR); s.lineTo(x, y + CR); s.quadraticCurveTo(x, y, x + CR, y);
    const g = new THREE.ShapeGeometry(s, 8);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - x) / CW, (p.getY(i) - y) / CH);
    return new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.2 }));
  }
  const planeIcon = (c, x, y, s, col) => {
    c.save(); c.translate(x, y); c.scale(s / 48, s / 48); c.fillStyle = col;
    c.fill(new Path2D('M44 22c0-2-2-3-4-3H30L19 5h-5l6 14H10l-4-5H2l3 10-3 10h4l4-5h10l-6 14h5l11-14h10c2 0 4-1 4-3z'));
    c.restore();
  };
  const ROUND = '"Rubik", "Inter Tight", system-ui, sans-serif';
  function drawFront(c, w, h) {
    const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#eef0f6');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    // soft wave of grey lines, like the printed card
    c.strokeStyle = 'rgba(2,20,84,.07)'; c.lineWidth = 2;
    for (let i = 0; i < 14; i++) { c.beginPath(); c.moveTo(0, 330 + i * 22); c.bezierCurveTo(300, 250 + i * 22, 700, 470 + i * 18, w, 360 + i * 20); c.stroke(); }
    c.fillStyle = NAVY; c.textBaseline = 'alphabetic';
    c.font = `800 92px ${ROUND}`; c.fillText('MAX', 64, 132);
    c.textAlign = 'right'; c.font = `700 70px ${ROUND}`; c.fillStyle = PINK; c.fillText('SKY', w - 64, 128); c.textAlign = 'left';
    // chip
    const cg = c.createLinearGradient(80, 250, 210, 350); cg.addColorStop(0, '#e9d39a'); cg.addColorStop(1, '#b89652');
    c.fillStyle = cg; c.beginPath(); c.roundRect(80, 240, 132, 100, 16); c.fill();
    c.strokeStyle = 'rgba(80,60,20,.45)'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(80, 290); c.lineTo(212, 290); c.moveTo(146, 240); c.lineTo(146, 340); c.stroke();
    // contactless
    c.strokeStyle = NAVY; c.lineWidth = 7; c.lineCap = 'round';
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(250, 290, 22 + i * 18, -0.75, 0.75); c.stroke(); }
    // a row of little planes, taking off
    for (let i = 0; i < 6; i++) planeIcon(c, 560 + i * 66, 260 - i * 6, 46, i % 2 ? 'rgba(2,20,84,.85)' : 'rgba(2,20,84,.45)');
    c.fillStyle = 'rgba(2,20,84,.55)'; c.font = '500 44px "IBM Plex Mono", monospace';
    c.fillText('•••• •••• •••• ••••', 70, 520);
    // pink corner
    c.fillStyle = PINK; c.beginPath(); c.moveTo(w, h - 170); c.quadraticCurveTo(w - 40, h - 20, w - 230, h); c.lineTo(w, h); c.fill();
  }
  function drawBack(c, w, h) {
    c.fillStyle = '#f3f3f7'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#16183a'; c.fillRect(0, 70, w, 120);
    c.fillStyle = '#fff'; c.fillRect(60, 250, 560, 90);
    c.fillStyle = PINK; c.font = `800 120px ${ROUND}`; c.textAlign = 'right'; c.fillText('SKY', w - 70, h - 80);
    for (let i = 0; i < 3; i++) planeIcon(c, 80 + i * 70, h - 150, 50, 'rgba(2,20,84,.5)');
  }
  const card = new THREE.Group();
  const front = cardFace(drawFront); front.position.z = CT / 2 + 0.002;
  const back = cardFace(drawBack); back.rotation.y = Math.PI; back.position.z = -CT / 2 - 0.002;
  const edge = new THREE.Mesh(roundedBox(CW, CT, CH, CR), new THREE.MeshStandardMaterial({ color: '#e7e8ef', roughness: 0.4 }));
  edge.rotation.x = Math.PI / 2; edge.position.z = -CT / 2;
  // the edge box sits on its base; centre it on the card plane
  edge.geometry.translate(0, -CT / 2, 0); edge.position.z = 0;
  card.add(edge, front, back);
  world.add(card);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { front.material.map.redraw(drawFront); back.material.map.redraw(drawBack); });

  // the mint "paid" ring
  const pulse = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 8, 64), new THREE.MeshBasicMaterial({ color: MINT, transparent: true, opacity: 0, toneMapped: false }));
  world.add(pulse);

  /* ---------- puffy holiday toys ---------- */
  const mats = {
    leaf: new THREE.MeshStandardMaterial({ color: '#3fae63', roughness: 0.7 }),
    trunk: new THREE.MeshStandardMaterial({ color: '#d4a266', roughness: 0.8 }),
    nut: new THREE.MeshStandardMaterial({ color: '#7a4a2a', roughness: 0.7 }),
    pine: new THREE.MeshStandardMaterial({ color: '#f7bf2c', roughness: 0.6 }),
    white: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.45 }),
    navy: new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.45 }),
    pink: new THREE.MeshStandardMaterial({ color: PINK, roughness: 0.5 }),
  };
  const sphere = new THREE.SphereGeometry(1, 24, 16);
  function palm() {
    const g = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.11 - i * 0.008, 0.13 - i * 0.008, 0.26, 12), mats.trunk);
      s.position.set(Math.sin(i * 0.35) * 0.12, i * 0.24, 0); s.rotation.z = -0.08 * i; g.add(s);
    }
    const top = new THREE.Group(); top.position.set(0.24, 1.42, 0); g.add(top);
    for (let i = 0; i < 7; i++) {
      const l = new THREE.Mesh(sphere, mats.leaf); l.scale.set(0.62, 0.07, 0.2); l.position.x = 0.5;
      const arm = new THREE.Group(); arm.rotation.y = (i / 7) * Math.PI * 2; arm.rotation.z = -0.45; arm.add(l); top.add(arm);
    }
    for (let i = 0; i < 3; i++) { const n = new THREE.Mesh(sphere, mats.nut); n.scale.setScalar(0.1); n.position.set(Math.cos(i * 2.1) * 0.12, -0.1, Math.sin(i * 2.1) * 0.12); top.add(n); }
    g.scale.setScalar(0.8);
    return g;
  }
  function pineapple() {
    const g = new THREE.Group();
    const tex = canvasTexture(256, 256, (c, w, h) => {
      c.fillStyle = '#f7bf2c'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(160,90,10,.55)'; c.lineWidth = 6;
      for (let i = -8; i < 16; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32 + h, h); c.stroke(); c.beginPath(); c.moveTo(i * 32, h); c.lineTo(i * 32 + h, 0); c.stroke(); }
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3, 2);
    const body = new THREE.Mesh(sphere, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 })); body.scale.set(0.42, 0.56, 0.42); g.add(body);
    for (let i = 0; i < 7; i++) {
      const l = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.5, 8), mats.leaf);
      l.position.y = 0.66; l.rotation.z = (i - 3) * 0.22; l.rotation.x = ((i * 7) % 3 - 1) * 0.2; g.add(l);
    }
    return g;
  }
  function swimRing() {
    const tex = canvasTexture(512, 64, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#ffffff' : PINK; c.fillRect((i * w) / 8, 0, w / 8, h); } });
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.19, 20, 40), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35 }));
    return m;
  }
  function beachBall() {
    const cols = [PINK, '#ffffff', MINT, '#ffffff', '#ffd23f', '#ffffff'];
    const tex = canvasTexture(512, 256, (c, w, h) => { cols.forEach((col, i) => { c.fillStyle = col; c.fillRect((i * w) / 6, 0, w / 6 + 1, h); }); });
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 20), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3 }));
    return m;
  }
  const makers = [palm, pineapple, swimRing, beachBall];

  // four toys float around the card all the time
  const floaters = [
    { o: palm(), p: [-2.7, -1.9, -1.6], r: 0.3 },
    { o: pineapple(), p: [3.1, 1.3, -0.6], r: -0.4 },
    { o: swimRing(), p: [1.2, 2.1, -1.4], r: 0.9 },
    { o: beachBall(), p: [2.7, -1.6, 0.8], r: 0 },
  ];
  floaters.forEach((f, i) => { f.o.position.set(...f.p); f.o.rotation.set(f.r, i, f.r * 0.5); f.base = f.o.position.clone(); world.add(f.o); });

  // a pool of toys that pop out with a purchase
  const POPS = 8;
  const pops = [];
  for (let i = 0; i < POPS; i++) { const o = makers[i % 4](); o.visible = false; world.add(o); pops.push({ o, live: false, t: 0, v: new THREE.Vector3(), spin: new THREE.Vector3() }); }
  let popNext = 0;

  /* ---------- toy planes ---------- */
  function toyPlane() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.6, 8, 20), mats.white); body.rotation.x = Math.PI / 2; g.add(body);
    for (const s of [-1, 1]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.42), mats.navy); win.position.set(s * 0.165, 0.05, 0.04); g.add(win);
      const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.2, 14), mats.pink); eng.rotation.x = Math.PI / 2; eng.position.set(s * 0.3, -0.08, 0.06); g.add(eng);
    }
    const wing = new THREE.Mesh(roundedBox(1.15, 0.045, 0.26, 0.11), mats.navy); wing.position.set(0, -0.04, 0.0); g.add(wing);
    const stab = new THREE.Mesh(roundedBox(0.46, 0.035, 0.14, 0.06), mats.navy); stab.position.set(0, 0.04, -0.36); g.add(stab);
    const fin = new THREE.Mesh(roundedBox(0.04, 0.3, 0.2, 0.02), mats.pink); fin.position.set(0, 0.08, -0.38); g.add(fin);
    const nose = new THREE.Mesh(sphere, mats.navy); nose.scale.set(0.09, 0.05, 0.05); nose.position.set(0, 0.07, 0.36); g.add(nose);
    g.scale.setScalar(0.85);
    return g;
  }
  const PLANES = 7;
  const planes = [];
  for (let i = 0; i < PLANES; i++) { const o = toyPlane(); o.visible = false; world.add(o); planes.push({ o, live: false, t: 0, rx: 2.6, rz: 1.8, y: 0, tilt: 0, dir: 1, ph: 0, life: 9, puffAt: 0 }); }
  let planeNext = 0;
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  function planePos(p, t, out) {
    // grows from the card into an orbit, circles, then climbs away
    const grow = Math.min(1, t / 1.1), ease = 1 - Math.pow(1 - grow, 3);
    const away = Math.max(0, t - p.life);
    const a = p.ph + p.dir * t * 1.15;
    const r = 0.3 + ease * 0.7 + away * 0.6;
    out.set(Math.cos(a) * p.rx * r, p.y * ease + Math.sin(a * 2) * 0.25 + away * away * 1.1, Math.sin(a) * p.rz * r);
    out.applyAxisAngle(AX, p.tilt);
    return out;
  }
  const AX = new THREE.Vector3(0, 0, 1);

  /* puffy cloud trails */
  const PUFFS = 180;
  const puffMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, transparent: true, opacity: 0.92 }), PUFFS);
  puffMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  world.add(puffMesh);
  const WHITE = new THREE.Color('#ffffff'), BLUSH = new THREE.Color('#ff8fae'), pc = new THREE.Color();
  for (let i = 0; i < PUFFS; i++) puffMesh.setColorAt(i, WHITE);
  const puffs = Array.from({ length: PUFFS }, () => ({ life: 0, x: 0, y: 0, z: 0, s: 0 }));
  let puffNext = 0;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < PUFFS; i++) { dummy.scale.setScalar(0); dummy.updateMatrix(); puffMesh.setMatrixAt(i, dummy.matrix); }

  /* ---------- sound: a terminal's two-tone "paid" ---------- */
  let audio = null;
  function beep() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const t = audio.currentTime;
      [[1320, 0], [1760, 0.11]].forEach(([f, d]) => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.06, t + d + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.1);
        o.connect(g); g.connect(audio.destination); o.start(t + d); o.stop(t + d + 0.12);
      });
    } catch (e) { /* no audio */ }
  }

  /* ---------- a purchase ---------- */
  let now = 0, swipe = -1, pulseT = -1;
  function purchase(audible) {
    swipe = now; pulseT = now;
    if (audible) beep();
    // a plane takes off
    const p = planes[planeNext]; planeNext = (planeNext + 1) % PLANES;
    Object.assign(p, { live: true, t: 0, rx: 2.3 + Math.random() * 0.9, rz: 1.4 + Math.random() * 0.8, y: -0.4 + Math.random() * 1.6,
      tilt: (Math.random() - 0.5) * 0.7, dir: Math.random() < 0.5 ? 1 : -1, ph: Math.random() * Math.PI * 2, life: 7 + Math.random() * 5, puffAt: 0 });
    p.o.visible = true; p.o.scale.setScalar(0.01);
    // and a piece of a holiday pops out
    const q = pops[popNext]; popNext = (popNext + 1) % POPS;
    q.live = true; q.t = 0; q.o.visible = true;
    q.o.position.set((Math.random() - 0.5) * 1.2, 0, 0.3);
    q.v.set((Math.random() - 0.5) * 3.2, 2.2 + Math.random() * 1.4, 0.8 + Math.random() * 1.2);
    q.spin.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).multiplyScalar(2);
    if (audible && hint && !hint.classList.contains('done')) hint.classList.add('done');
    run.wake();
  }

  /* ---------- input: tap = purchase, drag sideways = spin ---------- */
  let spin = 0, spinV = 0, down = null;
  const cv = renderer.domElement;
  cv.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, last: e.clientX, moved: 0, id: e.pointerId }; });
  cv.addEventListener('pointermove', (e) => {
    if (!down || e.pointerId !== down.id) return;
    const dx = e.clientX - down.last; down.last = e.clientX; down.moved += Math.abs(dx);
    spin += dx * 0.012; spinV = dx * 0.6; run.wake();
  });
  const end = (e) => {
    if (!down || e.pointerId !== down.id) return;
    const tap = down.moved < 8 && Math.abs(e.clientY - down.y) < 8;
    down = null;
    if (tap && e.type === 'pointerup') purchase(true);
  };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.repeat || !run.isInView()) return;
    const a = document.activeElement;
    if (a && a !== document.body) return;   // Enter on a link or button keeps its meaning
    purchase(true);
  });

  /* ---------- framing ---------- */
  let wide = true, dist = 14;
  st.onResize((w, h) => {
    wide = w / h > 1.05;
    camera.fov = 32;
    // wide: the card sits right of the title; phones: below it
    if (wide) camera.setViewOffset(w, h, -w * 0.2, -h * 0.06, w, h);
    else camera.setViewOffset(w, h, 0, -h * 0.17, w, h);
    camera.updateProjectionMatrix();
    const fitW = (wide ? 11.5 : 5.6) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    const fitH = (wide ? 8.4 : 9) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    dist = Math.max(fitW, fitH);
  });

  /* ---------- frame ---------- */
  const scrollT = scrollProgress(stageEl);
  const run = runWhileVisible(stageEl, frame);
  let first = true;
  if (calm) { /* one plane already in the air for the still frame */ }
  function frame(t, dt) {
    now = t;
    if (first && !calm) { setTimeout(() => purchase(false), 900); }

    // the card: bobbing, following the pointer, spun by a drag, swiped on a purchase
    spinV *= Math.pow(0.02, dt);
    if (!down) { const target = Math.round(spin / (Math.PI * 2)) * Math.PI * 2; spin += (target - spin) * Math.min(1, dt * 2.2) + spinV * dt; }
    const sw = swipe >= 0 ? Math.min(1, (t - swipe) / 0.9) : 1;
    const swE = sw < 1 ? Math.sin(sw * Math.PI) : 0;
    const idle = calm ? 0 : 1;
    card.rotation.set(-0.12 - pointer.y * 0.5 + Math.sin(t * 0.7) * 0.05 * idle - swE * 0.5,
      spin + pointer.x * 0.9 + Math.sin(t * 0.4) * 0.18 * idle + (sw < 1 ? (1 - Math.pow(1 - sw, 3)) * Math.PI * 2 : 0),
      Math.sin(t * 0.5) * 0.04 * idle);
    card.position.set(0, Math.sin(t * 0.9) * 0.08 * idle, swE * 0.6);

    // paid ring
    const pr = pulseT >= 0 ? (t - pulseT) / 0.8 : 2;
    pulse.visible = pr < 1;
    if (pr < 1) { pulse.scale.setScalar(1.2 + pr * 2.4); pulse.material.opacity = (1 - pr) * 0.9; pulse.position.z = 0.1; }

    // floating toys
    for (let i = 0; i < floaters.length; i++) {
      const f = floaters[i];
      f.o.position.set(f.base.x + Math.sin(t * 0.5 + i) * 0.12 * idle - pointer.x * 0.4, f.base.y + Math.sin(t * 0.8 + i * 1.7) * 0.18 * idle - pointer.y * 0.3, f.base.z);
      f.o.rotation.y += dt * 0.3 * idle * (i % 2 ? 1 : -1);
    }
    // popped toys: thrown up, drifting off
    for (let i = 0; i < POPS; i++) {
      const q = pops[i]; if (!q.live) continue;
      q.t += dt;
      q.v.y -= dt * 0.9; q.v.multiplyScalar(Math.pow(0.6, dt));
      q.o.position.addScaledVector(q.v, dt);
      q.o.rotation.x += q.spin.x * dt; q.o.rotation.y += q.spin.y * dt; q.o.rotation.z += q.spin.z * dt;
      const s = q.t < 0.4 ? 1 - Math.pow(1 - q.t / 0.4, 3) * 1 : q.t > 4 ? Math.max(0, 1 - (q.t - 4) / 0.8) : 1;
      q.o.scale.setScalar(Math.max(0.001, s * 0.75));
      if (q.t > 4.8) { q.live = false; q.o.visible = false; }
    }
    // planes and their puffs
    for (let i = 0; i < PLANES; i++) {
      const p = planes[i]; if (!p.live) continue;
      p.t += dt;
      planePos(p, p.t, tmp); planePos(p, p.t + 0.05, tmp2);
      p.o.position.copy(tmp); p.o.lookAt(tmp2.x + world.position.x, tmp2.y + world.position.y, tmp2.z + world.position.z);
      p.o.rotateZ(-p.dir * 0.35);
      p.o.scale.setScalar(Math.min(0.85, p.t * 1.2));
      if (!calm && p.t > 0.25 && p.t > p.puffAt) {
        p.puffAt = p.t + 0.11;
        const f = puffs[puffNext]; puffNext = (puffNext + 1) % PUFFS;
        f.life = 1; f.x = tmp.x - (tmp2.x - tmp.x) * 4; f.y = tmp.y - (tmp2.y - tmp.y) * 4; f.z = tmp.z - (tmp2.z - tmp.z) * 4; f.s = 0.06 + Math.random() * 0.06;
      }
      if (p.t > p.life + 3.5) { p.live = false; p.o.visible = false; }
    }
    for (let i = 0; i < PUFFS; i++) {
      const f = puffs[i];
      if (f.life <= 0) continue;
      f.life -= dt * 0.75;
      const s = f.life > 0 ? f.s * (1 + (1 - f.life) * 2.2) * Math.min(1, f.life * 4) : 0;
      dummy.position.set(f.x, f.y + (1 - f.life) * 0.15, f.z); dummy.scale.setScalar(s); dummy.updateMatrix();
      puffMesh.setMatrixAt(i, dummy.matrix);
      puffMesh.setColorAt(i, pc.copy(BLUSH).lerp(WHITE, Math.max(0, f.life)));
    }
    puffMesh.instanceMatrix.needsUpdate = true;
    if (puffMesh.instanceColor) puffMesh.instanceColor.needsUpdate = true;
    // keep one plane in the air when nobody is buying
    let flying = 0;
    for (let i = 0; i < PLANES; i++) if (planes[i].live) flying++;
    if (!calm && !first && flying === 0) purchase(false);

    // camera: the scene lifts away as the page scrolls
    const s = scrollT();
    camera.position.set(pointer.x * 0.6, 0.4 + s * 2.5 - pointer.y * 0.3, dist);
    camera.lookAt(0, s * 1.2, 0);
    world.position.y = s * 1.5;

    renderer.render(scene, camera);
    if (first) { first = false; st.reveal(); }
  }
}

/* the dashed flight path between idea and system: a plane flies it with the scroll */
function flightPath() {
  const sec = document.querySelector('.sk-flight');
  const path = document.getElementById('skPath');
  const plane = document.getElementById('skPlane');
  if (!sec || !path || !plane || !path.getTotalLength) return;
  const svg = path.ownerSVGElement;
  const len = path.getTotalLength();
  let ticking = false;
  const place = () => {
    ticking = false;
    const r = sec.getBoundingClientRect();
    const p = calm ? 0.55 : Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.1)));
    const a = path.getPointAtLength(p * len), b = path.getPointAtLength(Math.min(len, p * len + 2));
    const vb = svg.viewBox.baseVal, sr = svg.getBoundingClientRect(), so = sec.getBoundingClientRect();
    const sx = sr.width / vb.width, sy = sr.height / vb.height;
    const x = sr.left - so.left + a.x * sx, y = sr.top - so.top + a.y * sy;
    const ang = Math.atan2((b.y - a.y) * sy, (b.x - a.x) * sx);
    plane.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${ang}rad)`;
  };
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(place); } };
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', req);
  place();
}
