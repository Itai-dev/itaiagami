/* ============================================================
   Tower of David: the citadel at nightfall.
   A citadel cut from limestone blocks (walls, a keep, the slender
   minaret) stands in golden-hour light. Scrolling brings the night, and
   as it falls a projector draws the city onto the stone in light: the
   way the museum lets one physical model carry every period. Tapping
   redraws the projection (contours, arches, skyline); the pointer
   carries a torch along the walls.

   Reduced motion: no drift or wandering torch; scroll and taps still
   change the scene, one frame at a time. No WebGL: the photo stays.
   ============================================================ */
import { THREE, makeStage, runWhileVisible, turnToFace, pointer, canvasTexture, calm } from './cx-kit.js';

turnToFace('.cx-turn');

const stageEl = document.getElementById('tdStage');
const hero = document.getElementById('tdHero');
const pin = hero && hero.querySelector('.td-pin');
const hint = document.getElementById('tdHint');
const chItems = [...document.querySelectorAll('#tdCh li')];
const S = makeStage(stageEl, { exposure: 1.0 });
if (S && hero) build(S);

function build({ renderer, scene, camera, reveal, onResize }) {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  /* ---------- the stone: every block is one instance of a unit box ---------- */
  const CH = 0.22, BL = 0.5, DEP = 0.34;
  const blocks = [];      // x, y, z, ry, sx, sy, sz, tone
  const cores = [];       // the darker mortar mass behind each wall
  const put = (x, y, z, ry, sx, sy, sz) => blocks.push([x, y, z, ry, sx, sy, sz, rnd()]);

  /* a straight wall from a to b, laid in running bond, with optional
     battlements and window openings ([along0, along1, course0, course1]) */
  function wall(ax, az, bx, bz, { courses, base = 0, depth = DEP, merlons = true, holes = [] }) {
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
    const ry = -Math.atan2(dz, dx);
    for (let r = 0; r < courses; r++) {
      const y = base + r * CH + CH / 2;
      // the course is laid in runs between any openings, so openings have clean jambs
      let runs = [[0, L]];
      for (const [h0, h1, c0, c1] of holes) {
        if (r < c0 || r > c1) continue;
        runs = runs.flatMap(([u, v]) => (h1 <= u || h0 >= v) ? [[u, v]] : [[u, h0], [h1, v]].filter(([p, q]) => q - p > 0.05));
      }
      for (const [u, v] of runs) {
        let s = u + (r % 2 ? -BL * 0.5 : 0);
        while (s < v) {
          let e = Math.min(v, s + BL * (0.75 + rnd() * 0.5));
          if (v - e < 0.15) e = v;
          const a = Math.max(u, s), len = e - a, mid = (a + e) / 2;
          if (len > 0.05) {
            const jut = (rnd() - 0.5) * 0.04;
            put(ax + ux * mid - uz * jut, y, az + uz * mid + ux * jut, ry, len - 0.035, CH - 0.035, depth + (rnd() - 0.5) * 0.03);
          }
          s = e;
        }
      }
    }
    cores.push([ax + dx / 2, base + courses * CH / 2, az + dz / 2, ry, L, courses * CH, depth * 0.72]);
    if (merlons) {
      const y = base + courses * CH + CH * 0.75;
      for (let s = 0.16; s < L - 0.16; s += 0.62) put(ax + ux * (s + 0.18), y, az + uz * (s + 0.18), ry, 0.36, CH * 1.5, depth);
    }
    return base + courses * CH;
  }
  function rect(x0, z0, x1, z1, o) {
    wall(x0, z1, x1, z1, o.front ? { ...o, ...o.front } : o);
    wall(x1, z1, x1, z0, o);
    wall(x1, z0, x0, z0, o);
    wall(x0, z0, x0, z1, o);
  }
  /* a round shaft of stone rings */
  function ring(cx, cz, R, base, courses, { depth = 0.3, n = Math.max(10, Math.round((Math.PI * 2 * R) / 0.36)), gaps = 0 } = {}) {
    for (let r = 0; r < courses; r++) {
      const y = base + r * CH + CH / 2, off = (r % 2) * Math.PI / n;
      for (let i = 0; i < n; i++) {
        if (gaps && i % gaps === 1) continue;
        const a = (i / n) * Math.PI * 2 + off;
        const arc = (Math.PI * 2 * R) / n;
        put(cx + Math.cos(a) * R, y, cz + Math.sin(a) * R, -a + Math.PI / 2, arc * 0.95, CH - 0.035, depth);
      }
    }
    return base + courses * CH;
  }

  /* the glacis: a stepped stone skirt under the whole enclosure */
  const G = 4;
  for (let g = 0; g < G; g++) {
    const o = (G - g) * 0.22;
    rect(-4.2 - o, -3.0 - o, 4.2 + o, 2.6 + o, { courses: 1, base: g * CH, merlons: false, depth: 0.5 });
  }
  const gTop = G * CH;
  // the enclosure, with a gate and arrow-slit windows on the front
  rect(-4.2, -3.0, 4.2, 2.6, {
    courses: 12, base: gTop,
    front: { holes: [[3.7, 4.5, 0, 5], [1.2, 1.45, 6, 9], [6.6, 6.85, 6, 9], [2.4, 2.65, 6, 9]] },
  });
  // the keep: a broad square tower on the left corner
  rect(-5.2, 0.4, -2.6, 3.0, { courses: 25, base: gTop, front: { holes: [[1.2, 1.4, 15, 19], [1.2, 1.4, 7, 10]] } });
  const keepTop = gTop + 25 * CH;
  // a smaller tower at the back right
  rect(2.4, -3.6, 4.6, -1.4, { courses: 19, base: gTop, front: { holes: [[1.0, 1.2, 11, 14]] } });
  const backTop = gTop + 19 * CH;
  // the minaret: a slender round shaft, a balcony, a lantern and a dome
  const MX = 3.3, MZ = 2.0;
  let y = ring(MX, MZ, 0.82, gTop, 9, { depth: 0.34 });            // plinth
  y = ring(MX, MZ, 0.62, y, 27, { depth: 0.28 });                    // shaft
  y = ring(MX, MZ, 0.8, y, 1, { depth: 0.2 });                       // corbel
  y = ring(MX, MZ, 0.9, y, 1, { depth: 0.2 });
  ring(MX, MZ, 0.92, y, 2, { depth: 0.08, gaps: 3 });                // parapet
  y = ring(MX, MZ, 0.46, y, 9, { depth: 0.24, gaps: 4 });            // lantern with openings
  const lanternTop = y;
  // a small inner keep wall to break up the courtyard
  wall(-2.6, -0.6, 2.4, -0.6, { courses: 7, base: gTop, depth: 0.3 });

  const blockGeo = new THREE.BoxGeometry(1, 1, 1);
  const grain = canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = '#d9d9d9'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const v = 170 + Math.floor(rnd() * 85);
      c.fillStyle = `rgba(${v},${v},${v},${0.25 + rnd() * 0.4})`;
      c.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 2);
    }
    for (let i = 0; i < 18; i++) {   // chisel marks
      c.strokeStyle = 'rgba(150,150,150,.35)'; c.lineWidth = 1;
      const x = rnd() * w, yy = rnd() * h;
      c.beginPath(); c.moveTo(x, yy); c.lineTo(x + 6 + rnd() * 10, yy + 18 + rnd() * 16); c.stroke();
    }
  });
  const stoneMat = new THREE.MeshStandardMaterial({ color: '#ffffff', map: grain, roughness: 0.9, metalness: 0 });
  const stone = new THREE.InstancedMesh(blockGeo, stoneMat, blocks.length);
  const tones = ['#efe6d2', '#e6d9bd', '#ddcba8', '#f3ebda', '#d5c09b', '#e9dcc0', '#d9c7a4'].map((c) => new THREE.Color(c));
  const dummy = new THREE.Object3D();
  blocks.forEach((b, i) => {
    dummy.position.set(b[0], b[1], b[2]); dummy.rotation.set(0, b[3], 0); dummy.scale.set(b[4], b[5], b[6]);
    dummy.updateMatrix(); stone.setMatrixAt(i, dummy.matrix);
    stone.setColorAt(i, tones[Math.floor(b[7] * tones.length)]);
  });
  stone.castShadow = stone.receiveShadow = true;
  scene.add(stone);
  const core = new THREE.InstancedMesh(blockGeo, new THREE.MeshStandardMaterial({ color: '#4a3a26', roughness: 1 }), cores.length);
  cores.forEach((b, i) => {
    dummy.position.set(b[0], b[1], b[2]); dummy.rotation.set(0, b[3], 0); dummy.scale.set(b[4], b[5], b[6]);
    dummy.updateMatrix(); core.setMatrixAt(i, dummy.matrix);
  });
  core.receiveShadow = true;
  scene.add(core);

  // solid masses the blocks wrap: courtyard floor, tower roofs, the minaret's core
  const fill = new THREE.MeshStandardMaterial({ color: '#b89a6c', roughness: 1 });
  const slab = (x, yy, z, w, h, d) => { const m = new THREE.Mesh(blockGeo, fill); m.position.set(x, yy, z); m.scale.set(w, h, d); m.receiveShadow = true; scene.add(m); return m; };
  slab(0, gTop + 0.9, -0.2, 8.2, 1.8, 5.4);
  slab(-3.9, keepTop - 0.15, 1.7, 2.5, 0.3, 2.5);
  slab(3.5, backTop - 0.15, -2.5, 2.1, 0.3, 2.1);
  const mcore = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, lanternTop - gTop, 16), new THREE.MeshStandardMaterial({ color: '#3b2e1e', roughness: 1 }));
  mcore.position.set(MX, (lanternTop + gTop) / 2, MZ); scene.add(mcore);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: '#d7c19a', roughness: 0.7 }));
  dome.position.set(MX, lanternTop, MZ); dome.scale.y = 1.15; dome.castShadow = true; scene.add(dome);
  const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.5, 8), new THREE.MeshStandardMaterial({ color: '#d9ae57', metalness: 0.8, roughness: 0.3 }));
  finial.position.set(MX, lanternTop + 0.75, MZ); scene.add(finial);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), finial.material);
  knob.position.set(MX, lanternTop + 0.62, MZ); scene.add(knob);

  // the ground: warm earth that fades out into the sky behind
  const fade = canvasTexture(256, 256, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, '#fff'); g.addColorStop(0.55, '#fff'); g.addColorStop(1, '#000');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  fade.colorSpace = THREE.NoColorSpace;
  const groundMat = new THREE.MeshStandardMaterial({ color: '#6b5234', roughness: 1, alphaMap: fade, transparent: true, depthWrite: false });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 48), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.renderOrder = -1;
  scene.add(ground);

  /* ---------- light ---------- */
  const hemi = new THREE.HemisphereLight('#c4cbe8', '#6a4a2a', 1.3);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffc994', 2.8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -6, near: 1, far: 50 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
  scene.add(sun); scene.add(sun.target);
  const moon = new THREE.DirectionalLight('#7f9ce8', 0);
  moon.position.set(-8, 14, 6); scene.add(moon);

  /* the projector: a spotlight whose cone carries a drawing */
  const chapters = [drawContours, drawArches, drawSkyline].map((fn) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 1024;
    const c = cv.getContext('2d'); c.fillStyle = '#000'; c.fillRect(0, 0, 1024, 1024);
    c.lineCap = 'round'; c.lineJoin = 'round';
    fn(c, 1024); return cv;
  });
  const projTex = canvasTexture(1024, 1024, (c) => c.drawImage(chapters[0], 0, 0));
  const proj = new THREE.SpotLight('#ffffff', 0, 60, 0.4, 0.35, 0);
  proj.map = projTex;
  proj.castShadow = true;
  proj.shadow.mapSize.set(1024, 1024);
  proj.shadow.bias = -0.0004;
  proj.position.set(-1.2, 5.5, 17);
  proj.target.position.set(-0.2, 2.6, 0);
  scene.add(proj); scene.add(proj.target);

  /* floodlights at the foot of the walls, for the night */
  const floods = [[-3.9, 0.5, 4.8], [1.4, 0.5, 4.4], [4.6, 0.5, 3.6]].map(([x, yy, z]) => {
    const l = new THREE.PointLight('#ffb35c', 0, 7, 1.4); l.position.set(x, yy, z); scene.add(l); return l;
  });

  /* the torch: a warm point light and a small flame glow */
  const torch = new THREE.PointLight('#ffa64a', 0, 7, 1.7);
  scene.add(torch);
  const flameTex = canvasTexture(128, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(0.25, 'rgba(255,170,70,.7)'); g.addColorStop(1, 'rgba(255,120,30,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  flame.scale.set(0.9, 0.9, 1);
  scene.add(flame);

  /* stars, for the night */
  const starGeo = new THREE.BufferGeometry();
  const sp = new Float32Array(900 * 3);
  for (let i = 0; i < 900; i++) {
    const a = rnd() * Math.PI * 2, e = 0.08 + rnd() * 1.2, R = 70;
    sp.set([Math.cos(a) * Math.cos(e) * R, Math.sin(e) * R, Math.sin(a) * Math.cos(e) * R - 20], i * 3);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#dfe8ff', size: 2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false }));
  scene.add(stars);

  /* ---------- the projection: redraw with a sweeping wipe ---------- */
  let ch = 0, from = 0, wipe = 1, lastSwap = 0;
  function redraw(next) {
    from = ch; ch = next; wipe = 0;
    chItems.forEach((li, i) => li.classList.toggle('on', i === ch));
  }
  function paintProjection() {
    projTex.redraw((c, w, h) => {
      c.drawImage(chapters[from], 0, 0);
      const x = wipe * (w + 80);
      c.save(); c.beginPath(); c.rect(0, 0, x, h); c.clip();
      c.fillStyle = '#000'; c.fillRect(0, 0, x, h);
      c.drawImage(chapters[ch], 0, 0);
      c.restore();
      if (wipe < 1) {   // the drawing edge: a bright line of light
        const g = c.createLinearGradient(x - 70, 0, x, 0);
        g.addColorStop(0, 'rgba(255,230,170,0)'); g.addColorStop(1, 'rgba(255,236,190,.9)');
        c.fillStyle = g; c.fillRect(x - 70, 0, 70, h);
      }
    });
  }

  /* ---------- input ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const torchPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -3.4);   // just in front of the walls
  const torchAt = new THREE.Vector3(1.5, 2.2, 3.4), torchGoal = new THREE.Vector3(1.5, 2.2, 3.4);
  let lastMove = -10, interacted = false;
  function aim(clientX, clientY) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(torchPlane, torchGoal)) {
      torchGoal.x = THREE.MathUtils.clamp(torchGoal.x, -6, 6);
      torchGoal.y = THREE.MathUtils.clamp(torchGoal.y, 0.6, 7);
    }
    lastMove = now;
  }
  let now = 0;
  if (!calm) stageEl.parentElement.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') aim(e.clientX, e.clientY); }, { passive: true });
  let downAt = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 8) return;
    aim(e.clientX, e.clientY);
    tap();
  });
  function tap() {
    redraw((ch + 1) % chapters.length); lastSwap = now;
    if (!interacted && hint) { interacted = true; hint.classList.add('done'); }
    loop.wake();
  }
  let inView = true;
  addEventListener('keydown', (e) => {
    if (!inView || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/input|textarea|select/i.test((document.activeElement || {}).tagName || '')) return;
    if (e.key === 'ArrowRight') { tap(); }
    if (e.key === 'ArrowLeft') { redraw((ch + chapters.length - 1) % chapters.length); lastSwap = now; loop.wake(); }
  });

  /* ---------- night: how far the visitor has scrolled through the pinned hero ---------- */
  let night = 0;
  const readNight = () => {
    const r = hero.getBoundingClientRect();
    const span = Math.max(1, r.height - innerHeight);
    night = calm && r.height <= innerHeight * 1.05 ? 0.6 : Math.min(1, Math.max(0, -r.top / span));
  };
  addEventListener('scroll', () => { readNight(); if (calm) loop.wake(); }, { passive: true });
  addEventListener('resize', readNight);
  readNight();

  /* ---------- framing ---------- */
  const look = new THREE.Vector3(), camGoal = new THREE.Vector3();
  let wide = true, dist = 22;
  onResize((w, h) => {
    wide = w / h > 0.9;
    dist = wide ? 31 : 44;
  });

  /* colours for dusk → night */
  const C = (h) => new THREE.Color(h);
  const sky = { dusk: C('#c4cbe8'), night: C('#40558f') }, gnd = { dusk: C('#5a3d20'), night: C('#0b1028') };
  const sunCol = { dusk: C('#ffc994'), night: C('#ff8a4a') };
  const tmp = new THREE.Color();

  let shown = 0, ready = false, lastNight = -1;
  const loop = runWhileVisible(stageEl, (t, dt) => {
    now = t;
    inView = loop ? loop.isInView() : true;
    // the night follows scroll, eased
    shown += (night - shown) * (calm || !ready ? 1 : Math.min(1, dt * 4));
    const n = shown;
    if (Math.abs(n - lastNight) > 0.002) { pin.style.setProperty('--n', n.toFixed(3)); lastNight = n; }

    // sun sinks and reddens, the sky light turns blue
    const sunA = 0.45 - n * 0.5 + (calm ? 0 : Math.sin(t * 0.07) * 0.03);
    sun.position.set(14 * Math.cos(sunA + 2.6), 2 + 10 * Math.max(0.02, Math.sin(0.35 + (1 - n) * 0.45)), 10);
    sun.color.copy(sunCol.dusk).lerp(sunCol.night, n);
    sun.intensity = 2.8 * (1 - n) * (1 - n) + 0.05;
    hemi.color.copy(sky.dusk).lerp(sky.night, n);
    hemi.groundColor.copy(gnd.dusk).lerp(gnd.night, n);
    hemi.intensity = 1.3 - n * 0.75;
    moon.intensity = n * 0.9;
    for (const f of floods) f.intensity = n * n * 9;
    groundMat.color.copy(tmp.set('#6b5234')).lerp(C2, n);
    stars.material.opacity = Math.max(0, n - 0.35) * 1.4;

    // the projector warms up as the light goes
    if (wipe < 1) { wipe = Math.min(1, wipe + dt * (calm ? 4 : 0.75)); paintProjection(); }
    else if (!calm && n > 0.5 && t - lastSwap > 9) { redraw((ch + 1) % chapters.length); lastSwap = t; }
    const flick = calm ? 1 : 0.94 + Math.sin(t * 13.0) * 0.02 + Math.sin(t * 5.1) * 0.03;
    proj.intensity = (0.25 + n * 7.5) * flick;

    // the torch: follows the pointer, wanders the walls when left alone
    if (!calm && t - lastMove > 3) {
      torchGoal.set(Math.sin(t * 0.23) * 4.2 - 0.5, 1.6 + Math.sin(t * 0.41) * 0.9 + 0.8, 3.4);
    }
    torchAt.lerp(torchGoal, calm ? 1 : Math.min(1, dt * 3));
    torch.position.copy(torchAt);
    const tf = calm ? 1 : 0.85 + Math.sin(t * 17) * 0.08 + Math.sin(t * 7.3) * 0.07;
    torch.intensity = (0.6 + n * 5) * tf;
    flame.position.copy(torchAt);
    flame.material.opacity = (0.25 + n * 0.75) * tf;

    // camera: closer and lower as night falls; the pointer leans it a little
    const d = dist * (1 - n * 0.06);
    const px = calm ? 0 : pointer.x, py = calm ? 0 : pointer.y;
    if (wide) {
      camGoal.set(-6.5 + px * 2 + n * 2.5, 5.2 - py * 0.8, d);
      look.set(-3.6 + n * 0.6, 4.1 + n * 0.7, 0);
    } else {
      camGoal.set(-4 + px * 1.5 + n * 1.5, 7.5 - n * 0.6, d);
      look.set(0.2, 2.4 + n * 0.6, 0);
    }
    camera.position.lerp(camGoal, calm || !ready ? 1 : Math.min(1, dt * 2.5));
    camera.lookAt(look);

    renderer.render(scene, camera);
    if (!ready) { ready = true; reveal(); }
  });
  const C2 = new THREE.Color('#1a1830');

  /* ================= the three drawings the projector carries ================= */
  function glow(c, color, width, blur) { c.strokeStyle = color; c.lineWidth = width; c.shadowColor = color; c.shadowBlur = blur; }

  // I · the terrain in contour lines, a walled city drawn over it
  function drawContours(c, S) {
    glow(c, 'rgba(170,225,255,.95)', 3, 8);
    for (let k = 0; k < 13; k++) {
      c.beginPath();
      const R = 50 + k * 38;
      for (let i = 0; i <= 120; i++) {
        const a = (i / 120) * Math.PI * 2;
        const rr = R * (1 + 0.12 * Math.sin(a * 3 + k * 0.6) + 0.06 * Math.sin(a * 7 - k));
        const x = S * 0.52 + Math.cos(a) * rr * 1.25, y = S * 0.55 + Math.sin(a) * rr * 0.8;
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke();
    }
    // the city: a walled quarter of small blocks
    glow(c, 'rgba(255,236,190,1)', 4, 12);
    const poly = [[300, 420], [700, 380], [760, 640], [330, 700]];
    c.beginPath(); poly.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.stroke();
    c.lineWidth = 2.5;
    for (let gx = 340; gx < 730; gx += 34) for (let gy = 420; gy < 670; gy += 30) {
      if (rnd() < 0.3) continue;
      const w = 14 + rnd() * 12, h = 10 + rnd() * 12;
      if (gx + w > 720 + (gy - 420) * 0.15 || gx < 320 + (gy - 420) * 0.12) continue;
      c.strokeRect(gx, gy, w, h);
    }
  }

  // II · a run of pointed arches under a band of eight-point stars
  function drawArches(c, S) {
    glow(c, 'rgba(255,214,140,1)', 4, 10);
    const n = 7, w = S / n;
    for (let i = 0; i < n; i++) {
      const x0 = i * w + 14, x1 = (i + 1) * w - 14, mx = (x0 + x1) / 2, base = 820, spring = 560, top = 430;
      c.beginPath();
      c.moveTo(x0, base); c.lineTo(x0, spring);
      c.quadraticCurveTo(x0, top + 40, mx, top);
      c.quadraticCurveTo(x1, top + 40, x1, spring);
      c.lineTo(x1, base); c.stroke();
      c.beginPath(); c.arc(mx, spring + 30, 20, 0, Math.PI * 2); c.stroke();
    }
    glow(c, 'rgba(170,225,255,.95)', 3, 8);
    for (let i = 0; i < 9; i++) star8(c, (i + 0.5) * (S / 9), 330, 38);
    c.beginPath(); c.moveTo(0, 280); c.lineTo(S, 280); c.moveTo(0, 380); c.lineTo(S, 380); c.stroke();
  }
  function star8(c, x, y, r) {
    c.beginPath();
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.62 : r;
      i ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.stroke();
  }

  // III · a skyline drawn in light: domes, towers, cypresses, a moon
  function drawSkyline(c, S) {
    const base = 780;
    glow(c, 'rgba(255,236,190,1)', 4, 12);
    c.beginPath(); c.moveTo(0, base); c.lineTo(S, base); c.stroke();
    const shapes = [['b', 40, 90, 120], ['d', 150, 110, 150], ['t', 280, 40, 300], ['b', 330, 120, 90], ['d', 470, 150, 200], ['c', 640, 26, 170], ['b', 680, 110, 140], ['t', 810, 46, 260], ['d', 880, 100, 120], ['c', 990, 22, 140]];
    for (const [k, x, w, h] of shapes) {
      c.beginPath();
      if (k === 'b') { c.rect(x, base - h, w, h); }
      if (k === 'd') { c.moveTo(x, base); c.lineTo(x, base - h); c.lineTo(x + w * 0.12, base - h); c.arc(x + w / 2, base - h, w * 0.38, Math.PI, 0); c.lineTo(x + w, base - h); c.lineTo(x + w, base); }
      if (k === 't') { c.moveTo(x, base); c.lineTo(x, base - h); c.lineTo(x + w / 2, base - h - w * 0.8); c.lineTo(x + w, base - h); c.lineTo(x + w, base); }
      if (k === 'c') { c.moveTo(x, base); c.quadraticCurveTo(x - w, base - h * 0.5, x, base - h); c.quadraticCurveTo(x + w, base - h * 0.5, x, base); }
      c.stroke();
      if (k === 'b' || k === 'd') for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x + w * (0.25 + i * 0.25), base - h * 0.45, 7, Math.PI, 0); c.lineTo(x + w * (0.25 + i * 0.25) + 7, base - h * 0.3); c.lineTo(x + w * (0.25 + i * 0.25) - 7, base - h * 0.3); c.closePath(); c.stroke(); }
    }
    glow(c, 'rgba(170,225,255,.95)', 3, 10);
    c.beginPath(); c.arc(760, 300, 70, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(760, 300, 96, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < 40; i++) { const x = rnd() * S, yy = 120 + rnd() * 420; c.beginPath(); c.arc(x, yy, 2 + rnd() * 2, 0, Math.PI * 2); c.stroke(); }
  }
}
