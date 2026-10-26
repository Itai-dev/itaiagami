/* ============================================================
   Riddle: the block-creatures, live.
   Hero: the "Simply smart" stack built from the brand's primary blocks.
   Each piece is a polycube; five of them are characters whose eyes follow
   the pointer. On arrival the puzzle assembles itself, piece by piece.
   Tap the stack (or the button) and it comes apart and floats; tap the
   pieces, one by one, and they snap home. Solve it and the cast hops.
   Lower down: the real business cards as 3D cards you can turn over.

   Reduced motion: the stack starts assembled and still; taps still work
   and animate briefly. No WebGL: the posters stay.
   ============================================================ */
import { THREE, makeStage, runWhileVisible, scrollProgress, roundedBox, imageTexture, calm } from './cx-kit.js';

const COL = { yellow: '#ffd21a', navy: '#1a2ad8', red: '#e8141f', cyan: '#18c8f0', white: '#f6f7f4', ink: '#0d1a8c' };

/* soft toy plastic */
const plastic = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.42, metalness: 0 });

/* a cloud: a cluster of white spheres, flattened on the bottom like the renders */
function makeCloud(scale = 1) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, emissive: '#dff3f8', emissiveIntensity: 0.35 });
  const geo = new THREE.SphereGeometry(1, 20, 14);
  [[0, 0, 0, 0.62], [0.62, -0.1, 0.05, 0.48], [-0.6, -0.12, 0, 0.46], [0.25, 0.32, -0.05, 0.5], [-0.28, 0.24, 0.08, 0.42], [1.05, -0.2, 0, 0.32], [-1.0, -0.22, 0.02, 0.3]]
    .forEach(([x, y, z, r]) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.setScalar(r); g.add(m); });
  g.scale.setScalar(scale);
  g.userData.squish = 0;
  return g;
}

/* pointer → normalised device coords for a canvas */
function ndc(e, el, out) {
  const r = el.getBoundingClientRect();
  out.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  return out;
}

/* ============================================================
   1 · the stack
   ============================================================ */
const heroEl = document.getElementById('rdStage');
const hint = document.getElementById('rdHint');
if (heroEl) { try { hero(); } catch (e) { /* the poster stays */ } }

function hero() {
  const S = makeStage(heroEl, { exposure: 1.0 });
  if (!S) return;
  const { renderer, scene, camera } = S;
  renderer.toneMapping = THREE.NeutralToneMapping;
  camera.fov = 30;

  scene.add(new THREE.HemisphereLight('#ffffff', '#6fc0d4', 1.9));
  const key = new THREE.DirectionalLight('#ffffff', 2.1);
  key.position.set(-5, 10, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 7, bottom: -3, near: 1, far: 30 });
  key.shadow.radius = 5; key.shadow.bias = -0.0008;
  scene.add(key);
  const fill = new THREE.DirectionalLight('#cdf3ff', 0.7);
  fill.position.set(6, 3, 4);
  scene.add(fill);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.16 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const world = new THREE.Group();          // turns a little with the pointer and the scroll
  scene.add(world);

  /* ---------- the puzzle: cells (x, y, z) in a 3 × 4 × 2 stack ---------- */
  const PIECES = [
    { c: 'yellow', cells: [[0, 0, 1], [1, 0, 1], [0, 0, 0]], face: { cell: [1, 0, 1], eyes: COL.ink, extra: 'beak' } },
    { c: 'navy', cells: [[2, 0, 1], [2, 1, 1], [2, 0, 0]] },
    { c: 'red', cells: [[1, 0, 0], [1, 1, 0], [2, 1, 0]] },
    { c: 'cyan', cells: [[0, 1, 1], [1, 1, 1], [0, 1, 0], [0, 2, 1]], face: { cell: [0, 2, 1], eyes: '#ffffff', extra: 'ears' } },
    { c: 'red', cells: [[2, 2, 0], [2, 2, 1]], face: { cell: [2, 2, 1], eyes: COL.yellow, extra: 'antenna' } },
    { c: 'navy', cells: [[0, 2, 0], [1, 2, 0], [1, 2, 1]] },
    { c: 'yellow', cells: [[1, 3, 1], [1, 3, 0]], face: { cell: [1, 3, 1], eyes: COL.ink, extra: 'horn' } },
    { c: 'cyan', cells: [[0, 3, 0]], face: { cell: [0, 3, 0], eyes: COL.ink, extra: 'tuft' } },
  ];
  const U = 1;
  const cellPos = (x, y, z, v) => v.set((x - 1) * U, y * U + U / 2, (z - 0.5) * U);
  // roundedBox's bevel grows the footprint by its bevel on each side, so ask for less
  const BEV = 0.045, SIDE = U * 0.995;
  const cubeGeo = roundedBox(SIDE - 2 * BEV, SIDE, SIDE - 2 * BEV, 0.09);
  cubeGeo.translate(0, -SIDE / 2, 0);                              // centre the cube on its cell
  const mats = {}; Object.keys(COL).forEach((k) => { mats[k] = plastic(COL[k]); });
  const eyeGeo = new THREE.SphereGeometry(0.085, 16, 12);
  const glintGeo = new THREE.SphereGeometry(0.022, 8, 6);
  const glintMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });

  const pieces = [], pickables = [], eyes = [];
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  PIECES.forEach((def, i) => {
    const g = new THREE.Group();
    const centre = new THREE.Vector3();
    def.cells.forEach(([x, y, z]) => centre.add(cellPos(x, y, z, tmp)));
    centre.divideScalar(def.cells.length);
    def.cells.forEach(([x, y, z]) => {
      const m = new THREE.Mesh(cubeGeo, mats[def.c]);
      cellPos(x, y, z, m.position).sub(centre);
      m.castShadow = m.receiveShadow = true;
      m.userData.piece = i;
      g.add(m); pickables.push(m);
    });
    if (def.face) addFace(g, def, centre, i);
    g.position.copy(centre);
    world.add(g);
    pieces.push({
      g, home: centre.clone(), homeQ: new THREE.Quaternion(),
      pos: centre.clone(), vel: new THREE.Vector3(), target: centre.clone(),
      q: new THREE.Quaternion(), tq: new THREE.Quaternion(),
      away: new THREE.Vector3(), awayE: new THREE.Euler(), spin: new THREE.Vector3(),
      out: false, delay: 0, hop: 0, minY: Math.min(...def.cells.map((c) => c[1])), maxY: Math.max(...def.cells.map((c) => c[1])),
    });
  });

  /* eyes on the +z face of the head cube, plus a character detail */
  function addFace(g, def, centre, i) {
    const [x, y, z] = def.face.cell;
    const head = cellPos(x, y, z, new THREE.Vector3()).sub(centre);
    const faceZ = head.z + U / 2 + 0.005;
    const eyeMat = new THREE.MeshStandardMaterial({ color: def.face.eyes, roughness: 0.25 });
    [-0.2, 0.2].forEach((dx) => {
      const holder = new THREE.Group();
      holder.position.set(head.x + dx, head.y + 0.06, faceZ);
      const e = new THREE.Mesh(eyeGeo, eyeMat);
      e.scale.set(1, 1, 0.45);
      const glint = new THREE.Mesh(glintGeo, glintMat);
      glint.position.set(0.025, 0.03, 0.03);
      e.add(glint);
      holder.add(e);
      g.add(holder);
      eyes.push({ e, holder, piece: i, lx: 0, ly: 0, blink: 0 });
    });
    const top = head.y + U / 2;
    const extra = def.face.extra;
    if (extra === 'ears') {
      const earGeo = new THREE.CapsuleGeometry(0.075, 0.42, 4, 10);
      [-0.17, 0.17].forEach((dx, k) => {
        const ear = new THREE.Mesh(earGeo, mats.white);
        ear.position.set(head.x + dx, top + 0.27, head.z + 0.18);
        ear.rotation.z = k ? -0.22 : 0.22;
        ear.rotation.x = -0.18;
        ear.castShadow = true;
        ear.userData.piece = i; ear.userData.ear = k ? -1 : 1;
        g.add(ear); pickables.push(ear);
      });
    } else if (extra === 'antenna') {
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.3, 8), mats.red);
      stick.position.set(head.x, top + 0.15, head.z);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), mats.yellow);
      ball.position.set(head.x, top + 0.33, head.z);
      const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.06, 24), mats.yellow);
      ear.rotation.z = Math.PI / 2;
      ear.position.set(head.x + U / 2 + 0.02, head.y, head.z);
      [stick, ball, ear].forEach((m) => { m.castShadow = true; m.userData.piece = i; g.add(m); pickables.push(m); });
      g.userData.antenna = ball;
    } else if (extra === 'horn') {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.36, 14), plastic('#ffe680'));
      horn.position.set(head.x, top + 0.17, head.z + 0.22);
      horn.rotation.x = 0.25;
      const earGeo = new THREE.ConeGeometry(0.07, 0.16, 10);
      [-0.24, 0.24].forEach((dx) => { const ear = new THREE.Mesh(earGeo, mats.white); ear.position.set(head.x + dx, top + 0.07, head.z + 0.1); g.add(ear); });
      horn.castShadow = true; horn.userData.piece = i;
      g.add(horn); pickables.push(horn);
    } else if (extra === 'beak') {
      const beak = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 10, 0, Math.PI), plastic('#ffb21a'));
      beak.scale.set(1.2, 0.5, 0.9);
      beak.position.set(head.x - 0.02, head.y - 0.2, faceZ - 0.01);
      beak.userData.piece = i;
      g.add(beak); pickables.push(beak);
    } else if (extra === 'tuft') {
      const tuftGeo = new THREE.SphereGeometry(0.13, 14, 10);
      [[-0.12, 0.02, 0.12], [0.1, 0.06, 0.18], [0, 0.14, 0.02]].forEach(([dx, dy, dz]) => {
        const s = new THREE.Mesh(tuftGeo, mats.cyan);
        s.position.set(head.x + dx, top + 0.08 + dy, head.z + dz);
        s.castShadow = true; s.userData.piece = i;
        g.add(s); pickables.push(s);
      });
    }
  }

  /* ---------- clouds ---------- */
  const clouds = [
    { g: makeCloud(0.95), x: -4.6, y: 5.9, z: -3.5, v: 0.11 },
    { g: makeCloud(0.75), x: 4.4, y: 4.9, z: -2.2, v: 0.08 },
    { g: makeCloud(0.55), x: 1.5, y: 7.2, z: -6, v: 0.14 },
  ];
  clouds.forEach((c) => { c.g.position.set(c.x, c.y, c.z); c.g.traverse((m) => { if (m.isMesh) m.userData.cloud = c; }); scene.add(c.g); });
  const cloudMeshes = []; clouds.forEach((c) => c.g.traverse((m) => { if (m.isMesh) cloudMeshes.push(m); }));

  /* ---------- the layout: the stack beside the title ---------- */
  const look = new THREE.Vector3(0, 2.2, 0);
  const camDir = new THREE.Vector3(0.42, 0.42, 1).normalize();
  let dist = 18, narrow = false;
  S.onResize((w, h) => {
    narrow = w / h < 0.8;
    const fov = THREE.MathUtils.degToRad(camera.fov / 2);
    const fillH = narrow ? 0.38 : 0.44;                       // share of the height the stack takes
    const byH = 5.0 / fillH / (2 * Math.tan(fov));
    const byW = (narrow ? 4.4 : 9) / (2 * Math.tan(fov) * camera.aspect) / 0.9;
    dist = Math.max(byH, byW);
    // the copy sits at the bottom left: the stack stands to the right (on a phone, above it)
    camera.setViewOffset(w, h, narrow ? 0 : -w * 0.2, narrow ? h * 0.17 : h * 0.02, w, h);
    layoutAway();
  });

  /* where each piece floats when the puzzle is taken apart */
  function layoutAway() {
    const n = pieces.length;
    pieces.forEach((p, i) => {
      const a = (i / n) * Math.PI * 2 + 0.5;
      const rx = narrow ? 1.75 : 3.7, ry = narrow ? 2.3 : 1.45;
      p.away.set(Math.cos(a) * rx, 2.0 + Math.sin(a) * ry, (i % 3 - 1) * 0.9);
      p.awayE.set((i * 1.7) % 1.2 - 0.6, (i * 2.3) % 2 - 1, (i * 1.3) % 1 - 0.5);
      p.spin.set(((i * 37) % 7 - 3) * 0.05, ((i * 13) % 5 - 2) * 0.09, ((i * 29) % 5 - 2) * 0.04);
    });
  }
  layoutAway();

  /* ---------- state ---------- */
  let clock = 0, apartSince = -1, solvedAt = -10, intro = !calm;
  const anyOut = () => pieces.some((p) => p.out);
  const setLabel = () => {
    if (!hint) return;
    const t = hint.querySelector('.rd-hint-t');
    const out = anyOut();
    t.textContent = out ? 'Tap the pieces to put them back' : 'Tap the blocks to take the puzzle apart';
    btn.textContent = out ? 'Solve it' : 'Take it apart';
  };
  function takeApart() {
    // top pieces leave first
    const order = [...pieces].sort((a, b) => b.maxY - a.maxY);
    order.forEach((p, k) => { p.out = true; p.delay = clock + k * 0.06; p.vel.y += 2.5; });
    apartSince = clock;
    setLabel();
  }
  function putBack(p, delay = 0) {
    p.out = false; p.delay = clock + delay;
    if (!anyOut()) { solvedAt = clock + delay + 0.55; apartSince = -1; }
    setLabel();
  }
  function solveAll() {
    const order = pieces.filter((p) => p.out).sort((a, b) => a.minY - b.minY);
    order.forEach((p, k) => { p.out = false; p.delay = clock + k * 0.16; });
    solvedAt = clock + order.length * 0.16 + 0.45; apartSince = -1;
    setLabel();
  }

  /* the intro: pieces start apart and assemble from the bottom up */
  if (intro) {
    pieces.forEach((p) => { p.out = true; });
    // place them at their float spots straight away
    pieces.forEach((p) => { p.pos.copy(p.away); p.q.setFromEuler(p.awayE); p.g.position.copy(p.pos); p.g.quaternion.copy(p.q); });
  }

  /* ---------- input ---------- */
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), look3 = new THREE.Vector3(2.5, 2.4, 9);
  const lookPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -6);
  let hasPointer = false;
  const pick = (e) => {
    ndc(e, renderer.domElement, ptr);
    ray.setFromCamera(ptr, camera);
    return ray.intersectObjects(pickables, false)[0];
  };
  const aimEyes = (e) => {
    ndc(e, renderer.domElement, ptr);
    ray.setFromCamera(ptr, camera);
    if (ray.ray.intersectPlane(lookPlane, tmp)) { look3.copy(tmp); hasPointer = true; }
  };
  let downAt = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY }; aimEyes(e); });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 10) return;   // a scroll, not a tap
    downAt = null;
    const hit = pick(e);
    if (hit) {
      intro = false;
      const p = pieces[hit.object.userData.piece];
      if (!anyOut()) takeApart();
      else if (p.out) putBack(p);
      else { p.hop = 1; }
      done();
    } else {
      const c = ray.intersectObjects(cloudMeshes, false)[0];
      if (c) c.object.userData.cloud.g.userData.squish = 1;
    }
    loop.wake();
  });
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !loop.isInView()) return;
    aimEyes(e);
    renderer.domElement.style.cursor = pick(e) ? 'pointer' : '';
  }, { passive: true });

  /* an accessible control for the same thing */
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'btn ghost cx-btn-sm rd-hint-btn';
  btn.textContent = 'Take it apart';
  if (hint) { hint.removeAttribute('aria-hidden'); hint.appendChild(btn); hint.querySelector('.rd-hint-t').setAttribute('aria-hidden', 'true'); }
  btn.addEventListener('click', () => { intro = false; if (anyOut()) solveAll(); else takeApart(); done(); loop.wake(); });
  let hinted = false;
  function done() { if (!hinted && hint) { hinted = true; hint.classList.add('used'); } }

  /* ---------- the frame ---------- */
  const scroll = scrollProgress(heroEl);
  const cam = new THREE.Vector3(), eyeLocal = new THREE.Vector3(), q0 = new THREE.Quaternion(), spinE = new THREE.Euler();
  let ready = false, nextIdle = 3, introStart = 0.6;
  const loop = runWhileVisible(heroEl, (t, dt) => {
    clock = t;
    // intro: assemble from the bottom up once the page has settled
    if (intro && t > introStart) {
      intro = false;
      const order = [...pieces].sort((a, b) => a.minY - b.minY || a.home.x - b.home.x);
      order.forEach((p, k) => { p.out = false; p.delay = t + k * 0.17; });
      solvedAt = t + order.length * 0.17 + 0.5;
    }
    // left apart for a while: the puzzle solves itself
    if (!calm && apartSince >= 0 && t - apartSince > 14 && anyOut()) solveAll();

    // idle life: someone hops, ears twitch
    if (!calm && t > nextIdle && !anyOut()) {
      const faces = pieces.filter((p, i) => PIECES[i].face && p.maxY >= 2);
      const p = faces[Math.floor(Math.random() * faces.length)];
      if (p) p.hop = 0.6;
      nextIdle = t + 3.5 + Math.random() * 3;
    }

    // pieces: a springy fly to home or to their float spot
    const k = 70, c = 11;
    for (const p of pieces) {
      if (t < p.delay) continue;
      if (p.out) {
        p.target.copy(p.away);
        if (!calm) p.target.y += Math.sin(t * 1.1 + p.home.x * 2 + p.home.y) * 0.12;
        spinE.set(p.awayE.x + (calm ? 0 : t * p.spin.x), p.awayE.y + (calm ? 0 : t * p.spin.y), p.awayE.z + (calm ? 0 : t * p.spin.z));
        p.tq.setFromEuler(spinE);
      } else {
        p.target.copy(p.home);
        p.tq.copy(p.homeQ);
      }
      // the spring
      tmp.copy(p.target).sub(p.pos).multiplyScalar(k).addScaledVector(p.vel, -c);
      p.vel.addScaledVector(tmp, dt);
      p.pos.addScaledVector(p.vel, dt);
      p.q.slerp(p.tq, 1 - Math.exp(-dt * (p.out ? 5 : 9)));
      // a hop: up and back, with a squash on landing
      let hopY = 0;
      if (p.hop > 0) { hopY = Math.sin((1 - p.hop) * Math.PI) * 0.35 * Math.min(1, p.hop * 3); p.hop = Math.max(0, p.hop - dt * 1.6); }
      p.g.position.set(p.pos.x, p.pos.y + hopY, p.pos.z);
      p.g.quaternion.copy(p.q);
    }
    // solved: everyone hops once
    if (solvedAt > 0 && t >= solvedAt) {
      solvedAt = -10;
      pieces.forEach((p, i) => { if (PIECES[i].face) p.hop = 0.8; });
      if (hint && hinted) { const ht = hint.querySelector('.rd-hint-t'); ht.textContent = 'Solved. Simply smart.'; }
      loop.wake();
    }

    // eyes: look at the pointer (or at the camera), blink now and then
    if (!hasPointer) look3.copy(camera.position);
    for (const e of eyes) {
      const pg = pieces[e.piece].g;
      eyeLocal.copy(look3);
      pg.worldToLocal(eyeLocal);
      eyeLocal.sub(e.holder.position);
      const len = Math.max(0.001, eyeLocal.length());
      const tx = THREE.MathUtils.clamp(eyeLocal.x / len, -1, 1) * 0.07;
      const ty = THREE.MathUtils.clamp(eyeLocal.y / len, -1, 1) * 0.06;
      e.lx += (tx - e.lx) * Math.min(1, dt * 10);
      e.ly += (ty - e.ly) * Math.min(1, dt * 10);
      e.e.position.set(e.lx, e.ly, 0);
      if (!calm && e.blink <= 0 && Math.random() < dt * 0.12) {
        // blink both eyes of this face together
        eyes.forEach((o) => { if (o.piece === e.piece) o.blink = 1; });
      }
      const b = e.blink > 0 ? Math.abs(Math.cos((1 - e.blink) * Math.PI)) : 1;
      e.e.scale.y = Math.max(0.12, b);
      e.blink = Math.max(0, e.blink - dt * 6);
    }

    // clouds drift and squish when tapped
    for (const cl of clouds) {
      if (!calm) { cl.g.position.x += cl.v * dt; if (cl.g.position.x > 9) cl.g.position.x = -9; }
      const s = cl.g.userData.squish;
      if (s > 0) {
        const w = Math.sin(s * Math.PI * 3) * s * 0.18;
        cl.g.scale.set(cl.g.userData.base * (1 + w), cl.g.userData.base * (1 - w), cl.g.userData.base);
        cl.g.userData.squish = Math.max(0, s - dt * 1.4);
      }
    }

    // camera: the page scroll lifts it, the pointer leans the stack
    const sp = scroll();
    world.rotation.y += ((calm ? 0 : (hasPointer ? (look3.x / 30) : Math.sin(t * 0.3) * 0.06)) + sp * 0.5 - world.rotation.y) * Math.min(1, dt * 3);
    cam.copy(camDir).multiplyScalar(dist).add(look);
    cam.y += sp * 2.5;
    camera.position.copy(cam);
    camera.lookAt(look);

    renderer.render(scene, camera);
    if (!ready) { ready = true; S.reveal(); }
  });
  clouds.forEach((c) => { c.g.userData.base = c.g.scale.x; });
  if (calm) setLabel();
}

/* ============================================================
   2 · the business cards, turned over by tap
   ============================================================ */
const cardsEl = document.getElementById('rdCards');
if (cardsEl) {
  // build only when the section comes near, so the hero gets the first frames
  const io = new IntersectionObserver((es) => {
    if (es[0].isIntersecting) { io.disconnect(); try { cards(); } catch (e) { /* poster stays */ } }
  }, { rootMargin: '300px 0px' });
  io.observe(cardsEl);
}

function cards() {
  const S = makeStage(cardsEl, { exposure: 1.0 });
  if (!S) return;
  const { renderer, scene, camera } = S;
  renderer.toneMapping = THREE.NeutralToneMapping;
  camera.fov = 28;
  scene.add(new THREE.HemisphereLight('#ffffff', '#6fc0d4', 2.0));
  const key = new THREE.DirectionalLight('#ffffff', 1.6);
  key.position.set(-3, 6, 8);
  scene.add(key);

  /* the real card artwork, cropped from the photographed cards */
  const crop = (x0, x1, y0, y1) => {
    const t = imageTexture('/assets/opt/riddle-g6.webp');   // one image (cached), two crops
    t.repeat.set(x1 - x0, y1 - y0);
    t.offset.set(x0, 1 - y1);
    return t;
  };
  const front = crop(0.536, 0.769, 0.407, 0.529);      // the logo side
  const back = crop(0.214, 0.444, 0.409, 0.529);       // "simply smart"
  const edge = new THREE.MeshStandardMaterial({ color: '#f4f4f0', roughness: 0.7 });
  // the photographed cards carry their own shading, so light them from within a little
  const fm = new THREE.MeshStandardMaterial({ map: front, emissiveMap: front, emissive: '#ffffff', emissiveIntensity: 0.45, roughness: 0.6 });
  const bm = new THREE.MeshStandardMaterial({ map: back, emissiveMap: back, emissive: '#ffffff', emissiveIntensity: 0.45, roughness: 0.6 });

  const geo = new THREE.BoxGeometry(1.85, 1.0, 0.025);
  const group = new THREE.Group();
  scene.add(group);
  const layout = [[-2.15, 0.15, 0, -0.18, 0.1], [0, -0.1, 0.4, 0.05, -0.04], [2.15, 0.2, 0, 0.2, 0.08]];
  const cardsList = layout.map(([x, y, z, ry, rz], i) => {
    const m = new THREE.Mesh(geo, [edge, edge, edge, edge, fm, bm]);
    m.position.set(x, y, z);
    m.userData = { i, base: new THREE.Vector3(x, y, z), ry, rz, flip: i === 1 ? 1 : 0, rot: i === 1 ? Math.PI : 0 };
    group.add(m);
    return m;
  });
  const clouds = [makeCloud(0.62), makeCloud(0.48)];
  clouds[0].position.set(-1.5, 1.75, -1.5); clouds[1].position.set(1.8, 1.55, -1.8);
  clouds.forEach((c) => scene.add(c));

  let narrow = false;
  S.onResize((w, h) => {
    narrow = w / h < 0.9;
    const span = narrow ? 2.4 : 7.8;
    camera.position.set(0, 0.3, span / 0.9 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
    if (narrow) camera.position.z = Math.max(camera.position.z, 8.5);
    camera.lookAt(0, 0.35, 0);
    // stack the cards vertically on a phone
    cardsList.forEach((m, i) => {
      if (narrow) m.userData.base.set((i - 1) * 0.35, 1.25 - i * 1.25, i * 0.2);
      else m.userData.base.set(layout[i][0], layout[i][1], layout[i][2]);
    });
    clouds[0].position.set(narrow ? -0.9 : -1.6, narrow ? 2.4 : 1.45, -1.5);
    clouds[1].position.set(narrow ? 1.1 : 1.9, narrow ? -2.1 : 1.3, -1.8);
  });

  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let downAt = null, lastFlip = 0, px = 0, py = 0;
  renderer.domElement.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY }; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 10) return;
    downAt = null;
    ray.setFromCamera(ndc(e, renderer.domElement, ptr), camera);
    const hit = ray.intersectObjects(cardsList, false)[0];
    if (hit) { flip(hit.object); lastFlip = loop.clock + 6; }
    loop.wake();
  });
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    ndc(e, renderer.domElement, ptr); px = ptr.x; py = ptr.y;
    ray.setFromCamera(ptr, camera);
    renderer.domElement.style.cursor = ray.intersectObjects(cardsList, false)[0] ? 'pointer' : '';
  });
  const flip = (m) => { m.userData.flip = 1 - m.userData.flip; };

  let ready = false, auto = 3, which = 0;
  const loop = runWhileVisible(cardsEl, (t, dt) => {
    loop.clock = t;
    if (!calm && t > auto && t > lastFlip) { flip(cardsList[which % 3]); which++; auto = t + 3.2; }
    cardsList.forEach((m, i) => {
      const u = m.userData;
      u.rot += (u.flip * Math.PI - u.rot) * Math.min(1, dt * 5);
      const bob = calm ? 0 : Math.sin(t * 0.9 + i * 1.7) * 0.08;
      m.position.set(u.base.x, u.base.y + bob, u.base.z);
      m.rotation.set(-0.08 + (calm ? 0 : Math.sin(t * 0.7 + i) * 0.04), u.ry + u.rot, u.rz);
    });
    group.rotation.y += ((calm ? 0 : px * 0.25) - group.rotation.y) * Math.min(1, dt * 3);
    group.rotation.x += ((calm ? 0 : -py * 0.12) - group.rotation.x) * Math.min(1, dt * 3);
    if (!calm) clouds.forEach((c, i) => { c.position.y += Math.sin(t * 0.6 + i * 2) * 0.0015; });
    renderer.render(scene, camera);
    if (!ready) { ready = true; S.reveal(); }
  });
  loop.clock = 0;
  // with reduced motion the loop rests, so draw again once the card artwork lands
  const im = new Image(); im.onload = () => setTimeout(() => loop.wake(), 50); im.src = '/assets/opt/riddle-g6.webp';
}
