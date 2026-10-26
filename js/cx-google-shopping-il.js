/* ============================================================
   Google Shopping IL: the shop, live.
   A small built set in the films' language, framed in red:
   white wall, blue pipes, the red arch shelf, a blue counter with
   arched cut-outs, yellow bottles. The film's loop plays in a browser
   window on the wall. Tap a bottle and it hops into the cart; a full
   cart rolls off to deliver and comes back empty, and the counter
   restocks. Left alone, the shop keeps selling by itself.

   Reduced motion: a still set; a tap still sends a bottle (briefly
   animated). No WebGL: the poster stays.
   ============================================================ */
import { THREE, makeStage, runWhileVisible, scrollProgress, pointer, roundedBox, canvasTexture, muxTexture, calm } from './cx-kit.js';

const G = { blue: '#2f7cf0', red: '#e5432f', yellow: '#fbbc04', green: '#2fa84f', wall: '#f5f4f0', floor: '#ecebe6', white: '#ffffff' };

const stageEl = document.getElementById('gsStage');
const hint = document.getElementById('gsHint');
if (stageEl) { try { start(); } catch (e) { /* poster stays */ } }

function start() {
  const S = makeStage(stageEl, { exposure: 1.0 });
  if (!S) return;
  const { renderer, scene, camera } = S;
  renderer.toneMapping = THREE.NeutralToneMapping;
  camera.fov = 30;

  const mat = (c, r = 0.45, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...extra });
  const M = { blue: mat(G.blue, 0.3), red: mat(G.red, 0.35), yellow: mat(G.yellow, 0.25), green: mat(G.green, 0.35), wall: mat(G.wall, 0.9, { emissive: '#ffffff', emissiveIntensity: 0.32 }), floor: mat(G.floor, 0.85, { emissive: '#ffffff', emissiveIntensity: 0.18 }), white: mat(G.white, 0.4) };
  const shadowy = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

  /* ---------- light: a bright studio ---------- */
  scene.add(new THREE.HemisphereLight('#ffffff', '#d9d6cc', 1.5));
  const key = new THREE.DirectionalLight('#ffffff', 2.0);
  key.position.set(3, 7, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -2, near: 1, far: 25 });
  key.shadow.radius = 4; key.shadow.bias = -0.0006;
  scene.add(key);

  /* ---------- the room ---------- */
  const room = new THREE.Group();
  scene.add(room);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), M.wall);
  wall.position.set(0, 5, -2); wall.receiveShadow = true; room.add(wall);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), M.floor);
  floor.rotation.x = -Math.PI / 2; floor.position.z = 3; floor.receiveShadow = true; room.add(floor);
  // the green rug of the films
  const rug = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.03, 48), M.green);
  rug.scale.z = 0.45; rug.position.set(1.2, 0.015, 1.3); rug.receiveShadow = true; room.add(rug);

  /* blue pipes along the wall, with soft bends */
  const pipe = (pts, r = 0.07) => {
    const path = new THREE.CurvePath();
    for (let i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(new THREE.Vector3(...pts[i]), new THREE.Vector3(...pts[i + 1])));
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path.getSpacedPoints(80), false, 'catmullrom', 0.05), 160, r, 10), M.blue);
    m.castShadow = true; room.add(m);
  };
  pipe([[-1.2, 6.5, -1.88], [-1.2, 4.3, -1.88], [2.6, 4.3, -1.88], [2.6, 1.6, -1.88], [3.3, 1.6, -1.88]]);
  pipe([[3.9, 6.5, -1.9], [3.9, 3.0, -1.9], [4.6, 3.0, -1.9]], 0.06);

  /* the red arch shelf with green ledges and glasses */
  const archShape = (w, h) => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w / 2);
    s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false);
    s.lineTo(-w / 2, 0);
    return s;
  };
  const shelf = new THREE.Group();
  shelf.position.set(-2.45, 0, -1.75);
  room.add(shelf);
  const archGeo = new THREE.ExtrudeGeometry(archShape(1.7, 3.6), { depth: 0.4, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 24 });
  shelf.add(shadowy(new THREE.Mesh(archGeo, M.red)));
  const ledgeGeo = roundedBox(1.35, 0.06, 0.34, 0.03);
  const glassGeo = new THREE.CylinderGeometry(0.07, 0.05, 0.26, 12);
  const glassMat = mat('#e8f4ff', 0.1, { transparent: true, opacity: 0.6 });
  [0.9, 1.65, 2.4].forEach((y, row) => {
    const l = shadowy(new THREE.Mesh(ledgeGeo, M.green)); l.position.set(0, y, 0.6); shelf.add(l);
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Mesh(row === 1 ? bottleGeo(0.6) : glassGeo, row === 1 ? M.yellow : glassMat);
      g.position.set(-0.55 + i * 0.22, y + (row === 1 ? 0.06 : 0.19), 0.6);
      if (row === 1) g.scale.setScalar(0.55);
      shelf.add(g);
    }
  });

  /* the browser window on the wall: the film's loop plays in it */
  const film = muxTexture('aThm4mmV7qF1NNxU9NfEMXc4Da6ZB3KcHgEdEDhVDhU', 7, 14, { width: 960 });
  const win = new THREE.Group();
  win.position.set(0.75, 2.95, -1.93);
  room.add(win);
  const ww = 2.5, wh = ww * 9 / 16;
  const frame = new THREE.Mesh(roundedBox(ww + 0.12, 0.06, wh + 0.42, 0.09), M.white);
  frame.rotation.x = Math.PI / 2; frame.position.set(0, 0.06, 0);
  frame.castShadow = true; win.add(frame);
  const bar = canvasTexture(512, 40, (c, w, h) => {
    c.fillStyle = '#f1f3f4'; c.fillRect(0, 0, w, h);
    ['#ea4335', '#fbbc04', '#34a853'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(20 + i * 22, h / 2, 6.5, 0, Math.PI * 2); c.fill(); });
    c.fillStyle = '#ffffff'; c.beginPath(); c.roundRect(100, 9, w - 130, h - 18, 5); c.fill();
  });
  const barMesh = new THREE.Mesh(new THREE.PlaneGeometry(ww, ww * 40 / 512), new THREE.MeshBasicMaterial({ map: bar, toneMapped: false }));
  barMesh.position.set(0, wh / 2 + 0.12, 0.07); win.add(barMesh);
  const screenMat = new THREE.MeshBasicMaterial({ map: film.texture, toneMapped: false });
  film.onswap = (t) => { screenMat.map = t; screenMat.needsUpdate = true; };
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), screenMat);
  screen.position.set(0, 0, 0.07); win.add(screen);

  /* the counter: Google blue, arches cut into its front */
  const counter = new THREE.Group();
  counter.position.set(0.4, 0, 0.1);
  room.add(counter);
  const CW = 4.4, CH = 1.15, CD = 0.9;
  const cs = new THREE.Shape();
  cs.moveTo(-CW / 2, 0); cs.lineTo(-CW / 2, CH); cs.lineTo(CW / 2, CH); cs.lineTo(CW / 2, 0);
  const n = 4, aw = 0.62, gap = CW / n;
  for (let i = n - 1; i >= 0; i--) {
    const cx = -CW / 2 + gap * (i + 0.5);
    cs.lineTo(cx + aw / 2, 0); cs.lineTo(cx + aw / 2, 0.42);
    cs.absarc(cx, 0.42, aw / 2, 0, Math.PI, false);
    cs.lineTo(cx - aw / 2, 0);
  }
  cs.lineTo(-CW / 2, 0);
  const cGeo = new THREE.ExtrudeGeometry(cs, { depth: CD, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 3, curveSegments: 20 });
  cGeo.translate(0, 0, -CD / 2);
  counter.add(shadowy(new THREE.Mesh(cGeo, M.blue)));
  const top = shadowy(new THREE.Mesh(roundedBox(CW + 0.3, 0.1, CD + 0.3, 0.08), M.white));
  top.position.y = CH + 0.04; counter.add(top);
  const TOP = CH + 0.14;

  /* decor: a red barrel, a green one, a yellow pouf */
  const barrel = (c, x, z, r, h) => { const b = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.95, h, 28), c)); b.position.set(x, h / 2, z); room.add(b); return b; };
  barrel(M.red, 3.55, -1.25, 0.42, 0.95);
  barrel(M.green, 3.55, -1.25, 0.36, 0.5).position.y = 1.2;
  barrel(M.yellow, -2.6, 1.5, 0.42, 0.42);
  /* bar stools, green seats on yellow legs, as in the films */
  const seatGeo = new THREE.CylinderGeometry(0.32, 0.3, 0.1, 28);
  const ringGeo = new THREE.TorusGeometry(0.24, 0.025, 8, 28); ringGeo.rotateX(Math.PI / 2);
  const legG = new THREE.CylinderGeometry(0.028, 0.028, 0.8, 8);
  [-1.25, -0.05, 1.15].forEach((x) => {
    const st = new THREE.Group(); st.position.set(x, 0, 1.25); room.add(st);
    const seat = shadowy(new THREE.Mesh(seatGeo, M.green)); seat.position.y = 0.82; st.add(seat);
    const ring = new THREE.Mesh(ringGeo, M.yellow); ring.position.y = 0.32; st.add(ring);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; const l = shadowy(new THREE.Mesh(legG, M.yellow)); l.position.set(Math.cos(a) * 0.22, 0.4, Math.sin(a) * 0.22); st.add(l); }
    const back = shadowy(new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 8, 24, Math.PI), M.green)); back.position.set(0, 1.1, -0.22); st.add(back);
  });

  /* ---------- bottles and the cart ---------- */
  function bottleGeo(scale = 1) {
    const p = [[0, 0], [0.13, 0], [0.15, 0.02], [0.15, 0.36], [0.12, 0.45], [0.055, 0.56], [0.05, 0.7], [0.058, 0.72], [0.058, 0.76], [0, 0.76]]
      .map(([x, y]) => new THREE.Vector2(x * scale * 1.3, y * scale * 1.3));
    return new THREE.LatheGeometry(p, 18);
  }
  const bGeo = bottleGeo(1);
  const capMat = mat(G.red, 0.4);
  const capGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.06, 12);
  const slots = [-1.6, -1.05, -0.5, 0.05, 0.6, 1.15].map((x) => new THREE.Vector3(counter.position.x + x, TOP, counter.position.z + 0.05));
  const bottles = slots.map((slot, i) => {
    const m = shadowy(new THREE.Mesh(bGeo, M.yellow));
    const cap = new THREE.Mesh(capGeo, capMat); cap.position.y = 0.99; m.add(cap);
    m.position.copy(slot);
    m.userData.i = i;
    room.add(m);
    return { m, slot, state: 'shelf', t: 0, from: new THREE.Vector3(), to: new THREE.Vector3(), wob: Math.random() * 6, grow: 1 };
  });

  // the cart: a ShoppingIL-blue basket on wheels
  const cart = new THREE.Group();
  const CART_HOME = new THREE.Vector3(2.55, 0, 1.25);
  cart.position.copy(CART_HOME);
  room.add(cart);
  const basket = new THREE.Group(); basket.position.y = 0.55; cart.add(basket);
  const bw = 1.1, bh = 0.55, bd = 0.7, th = 0.05;
  [[0, -bh / 2 + th / 2, 0, bw, th, bd], [0, 0, bd / 2, bw, bh, th], [0, 0, -bd / 2, bw, bh, th], [bw / 2, 0, 0, th, bh, bd], [-bw / 2, 0, 0, th, bh, bd]]
    .forEach(([x, y, z, w, h, d]) => { const p = shadowy(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M.blue)); p.position.set(x, y, z); basket.add(p); });
  // the three stripes of the ShoppingIL cart mark on its front
  [0.12, 0, -0.12].forEach((y, i) => { const s = new THREE.Mesh(new THREE.BoxGeometry(bw * (0.7 - i * 0.12), 0.05, 0.02), M.white); s.position.set(-i * 0.05, y, bd / 2 + 0.03); basket.add(s); });
  const handle = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 10), M.blue));
  handle.rotation.z = 0.5; handle.position.set(-bw / 2 - 0.15, 0.55, 0); basket.add(handle);
  const wheelGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.06, 16); wheelGeo.rotateX(Math.PI / 2);
  const wheels = [];
  [[-0.4, 0.3], [0.4, 0.3], [-0.4, -0.3], [0.4, -0.3]].forEach(([x, z]) => { const w = new THREE.Mesh(wheelGeo, mat('#202124', 0.6)); w.position.set(x, 0.1, z); cart.add(w); wheels.push(w); });
  const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.25, 8);
  [[-0.4, 0.3], [0.4, 0.3], [-0.4, -0.3], [0.4, -0.3]].forEach(([x, z]) => { const l = new THREE.Mesh(legGeo, M.blue); l.position.set(x, 0.24, z); cart.add(l); });
  const inCart = [];
  const CAP = 3;
  let cartState = 'home', cartT = 0;

  /* send one bottle on its way */
  function sell(b) {
    if (b.state !== 'shelf' || cartState !== 'home' || inCart.length >= CAP) return false;
    b.state = 'fly'; b.t = 0;
    b.from.copy(b.m.position);
    const k = inCart.length;
    b.to.set(CART_HOME.x - 0.3 + k * 0.3, 0.42, CART_HOME.z + (k % 2 ? 0.1 : -0.1));
    inCart.push(b);
    return true;
  }

  /* ---------- input ---------- */
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  const meshes = bottles.map((b) => b.m);
  const hit = (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const h = ray.intersectObjects(meshes, true)[0];
    if (!h) return null;
    let o = h.object; while (o && o.userData.i === undefined) o = o.parent;
    return o ? bottles[o.userData.i] : null;
  };
  let downAt = null, userAt = -10, clockT = 0;
  renderer.domElement.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY }; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 10) return;
    downAt = null;
    const b = hit(e);
    if (b) {
      if (!sell(b)) b.wob = 1;            // not now: it just wobbles
      userAt = clockT;
      if (hint) hint.classList.add('done');
    }
    loop.wake();
  });
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    renderer.domElement.style.cursor = hit(e) ? 'pointer' : '';
  });
  // keyboard: B sends the next bottle while the shop is on screen
  addEventListener('keydown', (e) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || !loop.isInView()) return;
    if (/input|textarea|select/i.test((document.activeElement || {}).tagName || '')) return;
    if (e.key.toLowerCase() === 'b') { const b = bottles.find((x) => x.state === 'shelf'); if (b) { sell(b); userAt = clockT; loop.wake(); } }
  });

  /* ---------- framing ---------- */
  const look = new THREE.Vector3(0.4, 1.9, 0);
  let dist = 12, narrow = false;
  S.onResize((w, h) => {
    narrow = w / h < 1.3 && w < 700;
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const fitW = (narrow ? 5.6 : 6.6) / (2 * t * camera.aspect);
    const fitH = 4.5 / (2 * t);
    dist = Math.max(fitW, fitH);
    look.set(narrow ? 0.8 : 0.4, narrow ? 1.85 : 1.6, 0);
    // keep the floor short: push the set down inside the frame
    camera.setViewOffset(w, h, 0, -h * (narrow ? 0.05 : 0.09), w, h);
  });

  /* ---------- the frame ---------- */
  const scroll = scrollProgress(stageEl, { through: true });
  const cam = new THREE.Vector3();
  let ready = false, nextAuto = 2.5;
  const loop = runWhileVisible(stageEl, (t, dt) => {
    clockT = t;
    // the shop sells by itself when nobody is tapping
    if (!calm && t > nextAuto && t - userAt > 5) {
      const b = bottles.find((x) => x.state === 'shelf' && Math.random() < 0.5) || bottles.find((x) => x.state === 'shelf');
      if (b) sell(b);
      nextAuto = t + 1.6;
    }

    for (const b of bottles) {
      if (b.state === 'fly') {
        b.t = Math.min(1, b.t + dt * 1.5);
        const k = b.t;
        b.m.position.lerpVectors(b.from, b.to, k);
        b.m.position.y += Math.sin(k * Math.PI) * 1.4;
        b.m.rotation.z = -k * Math.PI * 2;
        if (k >= 1) { b.state = 'cart'; b.m.rotation.z = 0; }
      } else if (b.state === 'cart') {
        // ride along with the cart
        const idx = inCart.indexOf(b);
        b.m.position.set(cart.position.x - 0.3 + idx * 0.3, 0.42, cart.position.z + (idx % 2 ? 0.1 : -0.1));
      } else if (b.state === 'shelf') {
        b.grow = Math.min(1, b.grow + dt * 3);
        const s = b.grow < 1 ? 1 + Math.sin(b.grow * Math.PI) * 0.25 : 1;
        b.m.scale.set(b.grow * s, b.grow * s, b.grow * s);
        b.m.position.copy(b.slot);
        if (b.wob > 0 && !calm) { b.m.rotation.z = Math.sin(b.wob * 18) * 0.12 * b.wob; b.wob = Math.max(0, b.wob - dt * 1.5); }
      }
    }

    // the cart: full → rolls off to deliver → returns empty → the counter restocks
    if (cartState === 'home' && inCart.length >= CAP && inCart.every((b) => b.state === 'cart')) { cartState = 'out'; cartT = 0; }
    if (cartState === 'out') {
      cartT += dt * 0.55;
      cart.position.x = CART_HOME.x + easeIn(Math.min(1, cartT)) * 9;
      if (cartT >= 1.15) {
        inCart.forEach((b) => { b.state = 'shelf'; b.grow = 0; b.m.rotation.z = 0; });
        inCart.length = 0;
        cartState = 'back'; cartT = 0;
        cart.position.x = CART_HOME.x - 9;
      }
    } else if (cartState === 'back') {
      cartT += dt * 0.6;
      cart.position.x = CART_HOME.x - 9 + easeOut(Math.min(1, cartT)) * 9;
      if (cartT >= 1) { cartState = 'home'; cart.position.x = CART_HOME.x; }
    }
    wheels.forEach((w) => { w.rotation.z = -cart.position.x / 0.1; });

    // camera: the pointer moves you around the set, the scroll walks you in
    const sp = scroll();
    cam.set(look.x + (calm ? 0 : pointer.x * 2.2), look.y + 0.9 + (calm ? 0 : -pointer.y * 0.8), look.z + dist * (1.04 - sp * 0.12));
    camera.position.lerp(cam, ready && !calm ? Math.min(1, dt * 3) : 1);
    camera.lookAt(look);
    renderer.render(scene, camera);
    if (!ready) { ready = true; S.reveal(); }
  });
  const easeIn = (x) => x * x * x;
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  // reduced motion: draw again when the film still arrives
  if (calm) setTimeout(() => loop.wake(), 1500);
}
