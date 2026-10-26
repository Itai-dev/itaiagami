/* ============================================================
   Channel 13: the opening scene.
   The mark, built in soft white relief the way the identity reel shows
   it: a white 1 and the bowl of the 3, with the top of the 3 made from
   three coloured blocks (magenta, yellow, turquoise). The parts fly in
   and snap together on arrival, drift apart again as the page scrolls,
   turn when dragged, and come apart when tapped, then snap back.

   Progressive enhancement: the poster stays until the first frame and
   stays for good without WebGL. Reduced motion: assembled and still;
   a tap or key still knocks the parts apart for a moment.
   ============================================================ */
import { THREE, makeStage, runWhileVisible, turnToFace, scrollProgress, pointer, calm } from './cx-kit.js';

const stageEl = document.getElementById('c13Stage');
const hint = document.getElementById('c13Hint');

turnToFace('.c13-book, .c13-ground');
setTurn();
if (stageEl) start();

/* ---------- the on-air set turns to face the reader as it scrolls in ---------- */
function setTurn() {
  const set = document.getElementById('c13Set');
  if (!set) return;
  if (calm) { set.classList.add('flat'); return; }
  let queued = false;
  const update = () => {
    queued = false;
    const r = set.getBoundingClientRect();
    // 0 when the set's top meets the bottom of the screen, 1 when its middle reaches the middle
    const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight * 0.5 + r.height * 0.5)));
    const e = 1 - Math.pow(1 - p, 3);
    set.style.setProperty('--ry', (-30 * (1 - e)).toFixed(2) + 'deg');
    set.style.setProperty('--rx', (8 * (1 - e)).toFixed(2) + 'deg');
    set.style.setProperty('--tz', (-60 * (1 - e)).toFixed(1) + 'px');
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();
}

function start() {
  const stage = makeStage(stageEl, { shadows: true, exposure: 1 });
  if (!stage) return;
  const { renderer, scene, camera } = stage;
  renderer.toneMapping = THREE.NeutralToneMapping;
  camera.fov = 24; camera.updateProjectionMatrix();

  const MAGENTA = '#ff1380', YELLOW = '#ffd300', TEAL = '#00f1c8';

  /* ---------- light: a soft white studio, one key from the upper left ---------- */
  scene.add(new THREE.HemisphereLight('#ffffff', '#c3c8da', 1.7));
  const key = new THREE.DirectionalLight('#ffffff', 2.1);
  key.position.set(-5, 7, 9);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 6;
  key.shadow.bias = -0.0004;
  Object.assign(key.shadow.camera, { left: -10, right: 10, top: 8, bottom: -8, near: 1, far: 30 });
  scene.add(key);
  const fill = new THREE.DirectionalLight('#e6ecff', 0.55);
  fill.position.set(6, -2, 5);
  scene.add(fill);

  /* a wall that only catches the shadow: the relief sits on the page's own grey */
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.ShadowMaterial({ opacity: 0.16 }));
  wall.position.z = -0.9;
  wall.receiveShadow = true;
  scene.add(wall);

  /* ---------- the mark, drawn from the logo's own proportions ----------
     Coordinates are measured off the logo in pixels (stroke = 50 px) and
     turned into scene units (stroke = 1), centred on the mark. */
  const P = (x, y) => new THREE.Vector2((x - 300) / 50, -(y - 281) / 50);
  const rig = new THREE.Group();
  scene.add(rig);

  const white = new THREE.MeshStandardMaterial({ color: '#f7f7f9', roughness: 0.55, metalness: 0 });
  const tint = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.42, metalness: 0, emissive: c, emissiveIntensity: 0.3 });

  const pieces = [];
  function piece(shape, mat, { depth, z, dir, spin }) {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.055, bevelSegments: 4, curveSegments: 40 });
    g.computeBoundingBox();
    const c = new THREE.Vector3(); g.boundingBox.getCenter(c);
    g.translate(-c.x, -c.y, -c.z);
    const mesh = new THREE.Mesh(g, mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    const home = new THREE.Vector3(c.x, c.y, z + depth / 2);
    mesh.position.copy(home);
    rig.add(mesh);
    const p = {
      mesh, home,
      dir: new THREE.Vector3(...dir), spin: new THREE.Vector3(...spin),
      o: new THREE.Vector3(), v: new THREE.Vector3(),       // positional offset from home, and its velocity
      r: new THREE.Vector3(), w: new THREE.Vector3(),       // rotational offset, and its velocity
      delay: 0,
    };
    mesh.userData.piece = p;
    pieces.push(p);
    return p;
  }
  const inset = (pts, d) => {
    // pull every edge of a convex polygon in by d px, so the bevel grows it back to the drawn edge
    const n = pts.length;
    let area = 0;
    for (let i = 0; i < n; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % n]; area += x1 * y2 - x2 * y1; }
    const sgn = area > 0 ? 1 : -1;
    const lines = pts.map(([x1, y1], i) => {
      const [x2, y2] = pts[(i + 1) % n];
      const l = Math.hypot(x2 - x1, y2 - y1), nx = (-(y2 - y1) / l) * sgn, ny = ((x2 - x1) / l) * sgn;
      return [x1 + nx * d, y1 + ny * d, x2 - x1, y2 - y1];
    });
    return lines.map((b, i) => {
      const a = lines[(i + n - 1) % n];
      const den = a[2] * b[3] - a[3] * b[2];
      const t = ((b[0] - a[0]) * b[3] - (b[1] - a[1]) * b[2]) / den;
      return [a[0] + a[2] * t, a[1] + a[3] * t];
    });
  };
  const poly = (pts, round = 0.06, d = 0) => {
    // a polygon with lightly softened corners
    const v = (d ? inset(pts, d) : pts).map(([x, y]) => P(x, y));
    const s = new THREE.Shape();
    v.forEach((cur, i) => {
      const prev = v[(i + v.length - 1) % v.length], next = v[(i + 1) % v.length];
      const r = Array.isArray(round) ? round[i] : round;
      const a = cur.clone().add(prev.clone().sub(cur).setLength(Math.min(r, prev.distanceTo(cur) / 2)));
      const b = cur.clone().add(next.clone().sub(cur).setLength(Math.min(r, next.distanceTo(cur) / 2)));
      if (i === 0) s.moveTo(a.x, a.y); else s.lineTo(a.x, a.y);
      s.quadraticCurveTo(cur.x, cur.y, b.x, b.y);
    });
    s.closePath();
    return s;
  };

  // the 1
  piece(poly([[186, 157], [237, 157], [237, 400], [186, 400]], [0.22, 0.04, 0.04, 0.04], 2.75), white,
    { depth: 0.75, z: -0.4, dir: [-2.6, 0.6, 1.4], spin: [0.2, -0.9, 0.5] });
  // the bowl of the 3: a thick arc from under the turquoise, round the right, to a flat cut on the left
  {
    const c = P(330, 320), R = (85 - 2.75) / 50, r = (30 + 2.75) / 50, a0 = THREE.MathUtils.degToRad(66), a1 = -Math.PI;
    const s = new THREE.Shape();
    s.moveTo(c.x + Math.cos(a0) * R, c.y + Math.sin(a0) * R);
    s.absarc(c.x, c.y, R, a0, a1, true);
    s.lineTo(c.x + Math.cos(a1) * r, c.y + Math.sin(a1) * r);
    s.absarc(c.x, c.y, r, a1, a0, false);
    s.closePath();
    piece(s, white, { depth: 0.75, z: -0.4, dir: [0.8, -2.4, 1.2], spin: [0.7, 0.4, -0.6] });
  }
  // the three coloured blocks that make the top of the 3, sitting proud of the white
  piece(poly([[249, 157], [410, 157], [360, 207], [249, 207]], 0.035, 3.4), tint(MAGENTA),
    { depth: 0.5, z: 0.18, dir: [0.4, 2.6, 2.0], spin: [-0.8, 0.3, 0.5] });
  piece(poly([[410, 157], [410, 207], [360, 207]], 0.03, 3.4), tint(YELLOW),
    { depth: 0.5, z: 0.18, dir: [3.0, 1.8, 1.6], spin: [0.5, 0.9, -1.1] });
  piece(poly([[360, 207], [410, 207], [410, 222], [344.5, 287.5], [312, 255]], [0.03, 0.03, 0.03, 0.2, 0.2], 3), tint(TEAL),
    { depth: 0.5, z: 0.32, dir: [2.4, -1.0, 2.6], spin: [0.4, -0.7, 0.9] });
  pieces.forEach((p, i) => { p.delay = [0.55, 0.35, 0.9, 1.15, 1.35][i]; });

  /* ---------- layout: mark on the right on wide screens, high and centred on phones ---------- */
  let dist = 15;
  const rigHome = new THREE.Vector3();
  stage.onResize((w, h) => {
    const aspect = w / h, tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    if (aspect >= 1) {
      dist = 5.6 / (0.54 * 2 * tanH);                       // the mark fills ~54% of the height
      const vh = 2 * tanH * dist, vw = vh * aspect;
      rigHome.set(Math.min(vw * 0.25, vw / 2 - 3.3), vh * 0.1, 0);
    } else {
      dist = Math.max(4.8 / (0.66 * 2 * tanH * aspect), 5.6 / (0.4 * 2 * tanH));
      const vh = 2 * tanH * dist;
      rigHome.set(0, vh * 0.16, 0);
    }
  });

  /* ---------- input: drag to turn, tap to knock the parts apart ---------- */
  const canvas = renderer.domElement;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const meshes = pieces.map((p) => p.mesh);
  let spin = 0, spinV = 0, dragging = false, lastX = 0, downX = 0, downY = 0, downT = 0, moved = 0;
  let hinted = false;
  const done = () => { if (!hinted && hint) { hinted = true; hint.classList.add('done'); } };
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

  function knock(hit) {
    const strength = calm ? 3.5 : 7;
    for (const p of pieces) {
      tmp.copy(p.dir).normalize();
      if (hit) {
        // pieces fly away from where the tap landed; the one that was hit flies hardest
        tmp2.copy(p.mesh.position).sub(hit).setZ(0);
        const d = Math.max(0.6, tmp2.length());
        tmp.addScaledVector(tmp2.normalize(), 1.4 / d);
      }
      tmp.z = Math.abs(tmp.z) + 0.6;
      const boost = hit && p.mesh === hit.object ? 1.6 : 1;
      p.v.addScaledVector(tmp.normalize(), strength * boost * (0.8 + Math.random() * 0.4));
      p.w.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 10).multiplyScalar(boost);
    }
    done();
    runner && runner.wake();
  }
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(meshes, false)[0];
    if (!h) return null;
    const local = rig.worldToLocal(h.point.clone());
    return Object.assign(local, { object: h.object });
  }
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; moved = 0;
    lastX = downX = e.clientX; downY = e.clientY; downT = performance.now();
    canvas.classList.add('drag');
  });
  addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    moved = Math.max(moved, Math.hypot(e.clientX - downX, e.clientY - downY));
    if (moved > 6) { spin += dx * 0.012; spinV = dx * 0.7; done(); runner && runner.wake(); }
  }, { passive: true });
  const release = (e, cancelled) => {
    if (!dragging) return;
    dragging = false; canvas.classList.remove('drag');
    if (!cancelled && moved <= 6 && performance.now() - downT < 500) knock(pick(e));
  };
  addEventListener('pointerup', (e) => release(e, false));
  addEventListener('pointercancel', (e) => release(e, true));

  addEventListener('keydown', (e) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || !runner || !runner.isInView()) return;
    if (/input|textarea|select/i.test((document.activeElement || {}).tagName || '') || (document.activeElement || {}).isContentEditable) return;
    if (e.key === '1' || e.key === '3') knock(null);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { spinV += e.key === 'ArrowLeft' ? -5 : 5; done(); runner.wake(); }
  });

  /* ---------- motion ---------- */
  const scrolled = scrollProgress(stageEl);
  const cam = new THREE.Vector3(), look = new THREE.Vector3();
  const K = 46, C = 6.5, KR = 40, CR = 6;           // springs: the parts snap home with a small overshoot
  const target = new THREE.Vector3(), rTarget = new THREE.Vector3();
  let first = true;

  // the parts begin scattered, as they do at the start of the reel
  if (!calm) pieces.forEach((p) => { p.o.copy(p.dir).multiplyScalar(1.8); p.r.copy(p.spin).multiplyScalar(1.8); });

  let lastNow = 0;
  function frame(t) {
    // the springs step in small fixed slices of real time, so they settle the same on slow and fast screens
    const now = performance.now() / 1000;
    let left = lastNow ? Math.min(0.25, now - lastNow) : 1 / 60;
    lastNow = now;
    const s = calm ? 0 : scrolled();
    while (left > 1e-4) {
      const dt = Math.min(1 / 60, left);
      left -= dt;
      step(t, dt, s);
    }
    place(t, s);
  }
  function step(t, dt, s) {
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      // where this part wants to be: home after its entrance, drifting apart as the page scrolls
      const intro = calm || t > p.delay ? 0 : 1.8;
      const apart = intro + s * 1.25;
      target.copy(p.dir).multiplyScalar(apart);
      rTarget.copy(p.spin).multiplyScalar(apart);
      if (!calm && i > 1) target.y += Math.sin(t * 1.1 + i * 1.7) * 0.035;   // the colour blocks breathe
      p.v.x += (K * (target.x - p.o.x) - C * p.v.x) * dt;
      p.v.y += (K * (target.y - p.o.y) - C * p.v.y) * dt;
      p.v.z += (K * (target.z - p.o.z) - C * p.v.z) * dt;
      p.o.addScaledVector(p.v, dt);
      p.w.x += (KR * (rTarget.x - p.r.x) - CR * p.w.x) * dt;
      p.w.y += (KR * (rTarget.y - p.r.y) - CR * p.w.y) * dt;
      p.w.z += (KR * (rTarget.z - p.r.z) - CR * p.w.z) * dt;
      p.r.addScaledVector(p.w, dt);
    }
    // turning: free while dragged, then it settles back facing you (whole turns are kept)
    if (!dragging) {
      const goal = Math.round((spin + spinV * 0.35) / (Math.PI * 2)) * Math.PI * 2;
      spinV += (7 * (goal - spin) - 3.2 * spinV) * dt;
      spin += spinV * dt;
    }
  }
  function place(t, s) {
    for (const p of pieces) {
      p.mesh.position.copy(p.home).add(p.o);
      p.mesh.rotation.set(p.r.x, p.r.y, p.r.z);
    }
    const sway = calm ? 0 : Math.sin(t * 0.35) * 0.1;
    // the mark faces the camera wherever the layout puts it, turned a touch so its depth shows
    const face = Math.atan2(-rigHome.x, dist) - 0.16, tilt = Math.atan2(rigHome.y, dist);
    rig.rotation.set(tilt - pointer.y * 0.18 + (calm ? 0 : s * 0.25), face + spin + sway + pointer.x * 0.4, 0);
    rig.position.copy(rigHome);
    rig.position.y += s * 1.2;

    cam.set(pointer.x * 0.6, pointer.y * -0.4, dist);
    if (first) camera.position.copy(cam); else camera.position.lerp(cam, 0.06);
    look.set(0, 0, 0);
    camera.lookAt(look);

    renderer.render(scene, camera);
    if (first) { first = false; stage.reveal(); }
  }
  const runner = runWhileVisible(stageEl, frame);
}
