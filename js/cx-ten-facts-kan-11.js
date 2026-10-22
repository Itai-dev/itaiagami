/* ============================================================
   Kan 11: 10 Facts — the run.
   The series' cyan line, as a band in space, draws itself while the
   reader scrolls. It turns at right angles like the line in the films,
   passes ten black numbered markers (one per fact on the page) and
   threads between frames of the episode laid out as paper cut-outs,
   colour blocks and grey discs. Tap a marker to jump to its fact.
   Reduced motion: the whole line, drawn, from one still viewpoint.
   ============================================================ */
import { THREE, makeStage, runWhileVisible, pointer, imageTexture, canvasTexture, calm } from './cx-kit.js';

const run = document.getElementById('tfRun');
const stageEl = document.getElementById('tfStage');
const facts = [...document.querySelectorAll('.tf-fact')];
const S = makeStage(stageEl, { shadows: false, exposure: 1 });
if (S && run) build(S);
index();

function build({ renderer, scene, camera, reveal, onResize }) {
  renderer.toneMapping = THREE.NoToneMapping;          // flat graphic colours, exactly
  const CYAN = '#4fd0f5', MINT = '#5df2b3', RED = '#e2403f', INK = '#0b0b0b', GREY = '#d7d9da';
  const PB = 'nAGWrohDvxm3NZSvb6YGQzsfmiAMyxZ4YFktGc5gqDU';

  /* ---------- the line: straight runs, right-angle turns, softly rounded ---------- */
  const legs = [['z', -7], ['x', 3.4], ['z', -6], ['y', 2.4], ['z', -6.5], ['x', -5.2], ['z', -6], ['y', -2.6], ['z', -6.5], ['x', 4.6],
    ['z', -6], ['y', 2.2], ['z', -6.5], ['x', -3.8], ['z', -6], ['y', -2], ['z', -6.5], ['x', 2.8], ['z', -9]];
  const pts = [new THREE.Vector3(0, 0, 6)];
  legs.forEach(([ax, d]) => { const p = pts[pts.length - 1].clone(); p[ax] += d; pts.push(p); });
  const path = new THREE.CurvePath();
  const RC = 0.55;
  let from = pts[0].clone();
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i], last = i === pts.length - 1;
    const dirIn = a.clone().sub(pts[i - 1]).normalize();
    const end = last ? a.clone() : a.clone().addScaledVector(dirIn, -RC);
    path.add(new THREE.LineCurve3(from.clone(), end));
    if (!last) {
      const dirOut = pts[i + 1].clone().sub(a).normalize();
      const next = a.clone().addScaledVector(dirOut, RC);
      path.add(new THREE.QuadraticBezierCurve3(end, a.clone(), next));
      from = next;
    }
  }
  const SEG = 1400, RAD = 4;
  const tubeGeo = new THREE.TubeGeometry(path, SEG, 0.09, RAD, false);
  const tube = new THREE.Mesh(tubeGeo, new THREE.MeshBasicMaterial({ color: CYAN }));
  scene.add(tube);
  const drawTo = (f) => tubeGeo.setDrawRange(0, Math.max(0, Math.floor(f * SEG)) * RAD * 6);

  /* ---------- ten markers: a black ring with its number on a grey disc ---------- */
  const U = Array.from({ length: 10 }, (_, i) => 0.085 + i * (0.86 / 9));
  const ringGeo = new THREE.TorusGeometry(0.26, 0.1, 10, 40);
  const ringMat = new THREE.MeshBasicMaterial({ color: INK });
  const markers = U.map((u, i) => {
    const g = new THREE.Group();
    g.position.copy(path.getPointAt(u));
    const ring = new THREE.Mesh(ringGeo, ringMat);
    g.add(ring);
    const tex = canvasTexture(128, 128, (c, w, h) => {
      c.fillStyle = GREY; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2); c.fill();
      c.fillStyle = INK; c.font = '700 64px "Inter Tight", Inter, system-ui, sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(i + 1), w / 2, h / 2 + 3);
    });
    const disc = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
    disc.scale.setScalar(0.5);
    disc.position.y = 0.72;
    g.add(disc);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData.i = i;
    g.add(hit);
    g.scale.setScalar(calm ? 1 : 0.001);
    scene.add(g);
    return { g, ring, disc, hit, u, s: calm ? 1 : 0, tex };
  });
  // redraw the numbers once the web font is in
  document.fonts && document.fonts.ready.then(() => markers.forEach((m, i) => m.tex.redraw((c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = GREY; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2); c.fill();
    c.fillStyle = INK; c.font = '700 64px "Inter Tight", Inter, system-ui, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(i + 1), w / 2, h / 2 + 3);
  })));

  /* ---------- the archive: frames of the episode as paper cut-outs ---------- */
  const frames = [15, 21, 25, 32.5, 37.5, 45, 50, 60, 62.5, 72.4, 79.9, 89.9, 97.4, 102.4, 109.9];
  const cardGeo = new THREE.PlaneGeometry(1, 1);
  const rnd = mulberry(11);
  const cards = frames.map((time, i) => {
    const u = 0.04 + (i + 0.5) / frames.length * 0.92;
    const p = path.getPointAt(u);
    const side = i % 2 ? 1 : -1;
    const g = new THREE.Group();
    const w = 2.5 + rnd() * 0.9, h = w * 9 / 16;
    g.position.set(p.x + side * (2.1 + rnd() * 1.1), p.y + (rnd() - 0.35) * 1.8, p.z - 0.6 - rnd() * 1.4);
    g.rotation.set(0, -side * (0.15 + rnd() * 0.15), (rnd() - 0.5) * 0.1);
    // a colour block or a grey disc behind some of them, as in the kit
    const kind = i % 4;
    if (kind === 0 || kind === 2) {
      const col = [CYAN, MINT, CYAN, RED][(i / 2) % 4 | 0];
      const blk = new THREE.Mesh(cardGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true }));
      blk.scale.set(w * (0.5 + rnd() * 0.5), h * 0.3, 1);
      blk.position.set(side * w * 0.35, -h * 0.42, -0.05);
      g.add(blk);
    } else if (kind === 1) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(h * 0.8, 48), new THREE.MeshBasicMaterial({ color: GREY, transparent: true }));
      disc.position.set(-side * w * 0.3, h * 0.2, -0.08);
      g.add(disc);
    }
    const shadow = new THREE.Mesh(cardGeo, new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.1, depthWrite: false }));
    shadow.scale.set(w + 0.12, h + 0.12, 1); shadow.position.set(0.08, -0.1, -0.03);
    const paper = new THREE.Mesh(cardGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true }));
    paper.scale.set(w + 0.12, h + 0.12, 1); paper.position.z = -0.01;
    const pic = new THREE.Mesh(cardGeo, new THREE.MeshBasicMaterial({ map: imageTexture(`https://image.mux.com/${PB}/thumbnail.webp?width=640&time=${time}`), transparent: true }));
    pic.scale.set(w, h, 1);
    g.add(shadow, paper, pic);
    g.traverse((o) => { if (o.material) o.userData.base = o.material.opacity ?? 1; });
    scene.add(g);
    return { g, u, v: calm ? 1 : 0 };
  });

  /* ---------- scroll → a place on the line, pinned to each fact ---------- */
  let anchors = [];
  const layout = () => {
    const vh = innerHeight, top = run.getBoundingClientRect().top + scrollY;
    anchors = [[top - 1, 0]];
    facts.forEach((f, i) => {
      const r = f.getBoundingClientRect();
      anchors.push([r.top + scrollY + r.height / 2 - vh / 2, U[i]]);
    });
    anchors.push([top + run.offsetHeight - vh, 1]);
  };
  const uAt = (y) => {
    if (y <= anchors[0][0]) return 0;
    for (let i = 1; i < anchors.length; i++) {
      const [y1, u1] = anchors[i], [y0, u0] = anchors[i - 1];
      if (y <= y1) { const k = (y - y0) / Math.max(1, y1 - y0); return u0 + (u1 - u0) * k; }
    }
    return 1;
  };
  addEventListener('resize', layout);
  addEventListener('load', layout);
  new ResizeObserver(layout).observe(run);
  layout();

  /* ---------- tap a marker: go to its fact ---------- */
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  const hits = markers.map((m) => m.hit);
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10) return;
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const h = ray.intersectObjects(hits, false)[0];
    if (h && facts[h.object.userData.i]) facts[h.object.userData.i].scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' });
  });
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    renderer.domElement.style.cursor = ray.intersectObjects(hits, false).length ? 'pointer' : 'default';
  });

  /* ---------- framing ---------- */
  let W = 1, H = 1, mobile = false;
  onResize((w, h) => { W = w; H = h; mobile = w < 820; });
  let side = 0.5;                                       // where on screen the line's head sits (0..1)

  /* ---------- the frame loop ---------- */
  let u = 0, ready = false;
  const head = new THREE.Vector3(), ahead = new THREE.Vector3(), look = new THREE.Vector3(), cam = new THREE.Vector3(), want = new THREE.Vector3();
  const box = new THREE.Box3().setFromObject(tube), mid = box.getCenter(new THREE.Vector3());
  const tick = runWhileVisible(stageEl, (t, dt) => {
    if (calm) {
      // one still overview of the whole line
      drawTo(1);
      camera.clearViewOffset();
      camera.position.set(mid.x + 16, mid.y + 14, box.max.z + 6);
      camera.lookAt(mid.x, mid.y, mid.z - 4);
      markers.forEach((m) => { m.g.quaternion.copy(camera.quaternion); });
      renderer.render(scene, camera);
      if (!ready) { ready = true; reveal(); }
      return;
    }
    const target = uAt(scrollY);
    u += (target - u) * (1 - Math.pow(0.002, dt));
    // before the first fact the camera stands back and shows the line ahead
    const open = 1 - THREE.MathUtils.smoothstep(u, 0, U[0]);
    drawTo(Math.min(1, u + 0.012 + open * 0.13));

    // nearest fact decides which side the line runs on, opposite the text
    let near = 0, best = 9;
    U.forEach((v, i) => { const d = Math.abs(v - u); if (d < best) { best = d; near = i; } });
    const wantSide = mobile ? 0.5 : u < U[0] - 0.03 ? 0.66 : (near % 2 ? 0.3 : 0.7);
    side += (wantSide - side) * (1 - Math.pow(0.05, dt));
    const cy = mobile ? 0.36 : 0.5;
    camera.setViewOffset(W, H, W / 2 - W * side, H / 2 - H * cy, W, H);

    path.getPointAt(Math.min(1, u), head);
    path.getPointAt(Math.min(1, u + 0.035), ahead);
    look.lerpVectors(head, ahead, 0.45);
    const back = (mobile ? 8.5 : 7) + open * 5;
    want.set(head.x + 3.4 + open * 2.5 + pointer.x * 1.6, head.y + 2.6 + open * 2.5 - pointer.y * 1.2, head.z + back);
    look.z -= open * 6;
    cam.lerp(want, ready ? 1 - Math.pow(0.02, dt) : 1);
    camera.position.copy(cam);
    camera.lookAt(look);

    // markers pop up as the line reaches them; the current one lifts
    markers.forEach((m, i) => {
      const on = u + 0.014 >= m.u ? 1 : 0;
      m.s += (on - m.s) * (1 - Math.pow(0.0005, dt));
      const pop = m.s < 0.999 ? m.s * (1 + Math.sin(m.s * Math.PI) * 0.35) : 1;
      m.g.scale.setScalar(Math.max(0.001, pop * (i === near && best < 0.03 ? 1.18 : 1)));
      m.g.quaternion.copy(camera.quaternion);
      m.disc.position.y = 0.72 + Math.sin(t * 2 + i) * 0.03;
    });
    // frames slide in as the line approaches
    cards.forEach((c) => {
      const on = u + 0.06 + open * 0.13 >= c.u ? 1 : 0;
      c.v += (on - c.v) * (1 - Math.pow(0.01, dt));
      // fade a frame that comes too close to the lens, so it never fills the screen
      const near = THREE.MathUtils.smoothstep(c.g.position.distanceTo(camera.position), 3.2, 6.5);
      const v = c.v * near;
      c.g.visible = v > 0.01;
      if (c.g.visible) c.g.traverse((o) => { if (o.material && o.userData.base !== undefined) o.material.opacity = o.userData.base * v; });
      c.g.position.y += Math.sin(t * 0.7 + c.u * 40) * 0.0008;
    });

    renderer.render(scene, camera);
    if (!ready) { ready = true; reveal(); }
  });
  addEventListener('scroll', () => tick.wake(), { passive: true });
}

/* ---------- the dot index: shown while the facts are on screen ---------- */
function index() {
  const nav = document.getElementById('tfIndex');
  if (!nav || !('IntersectionObserver' in window)) return;
  const links = [...nav.querySelectorAll('a')];
  const list = document.querySelector('.tf-facts');
  new IntersectionObserver((es) => nav.classList.toggle('on', es[0].isIntersecting), { rootMargin: '-40% 0px -40% 0px' }).observe(list);
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const i = facts.indexOf(e.target);
    links.forEach((a, j) => { a.classList.toggle('at', i === j); if (i === j) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  }), { rootMargin: '-45% 0px -45% 0px' });
  facts.forEach((f) => io.observe(f));
}

function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
