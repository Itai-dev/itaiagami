/* ============================================================
   Community Lights: the opening scene.
   The installation as it stood: nine tall LED panels in the shape of a
   Hanukkah menorah, the raised shamash in the middle, each crowned with
   a neon flame outline. As in the square, people draw on the panels
   with brushes, sparkles and stickers, and a candle lights once
   someone has drawn on it. When nobody is drawing, other "visitors"
   keep adding to it, lighting the candles in their order.
   ============================================================ */
import { THREE, makeStage, runWhileVisible, pointer, canvasTexture, calm } from './cx-kit.js';

const stageEl = document.getElementById('clStage');
const tools = document.getElementById('clTools');
const hint = document.getElementById('clHint');
const S = makeStage(stageEl, { shadows: false, exposure: 1 });
if (S && tools) build(S);

function build({ renderer, scene, camera, reveal, onResize }) {
  renderer.toneMapping = THREE.NoToneMapping;
  const COLS = ['#ff4fa8', '#ffd84a', '#39d6ff', '#5ef0c0', '#ff9a3c', '#b98cff', '#ffffff'];
  const ORDER = [4, 8, 7, 6, 5, 3, 2, 1, 0];      // the shamash first, then night by night from the right
  const CW = 256, CH = 1024;

  /* ---------- soft glow sprite texture ---------- */
  const glowTex = canvasTexture(128, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });

  /* ---------- the square ---------- */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), new THREE.MeshBasicMaterial({ color: '#140c1c' }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.02, 0);
  scene.add(ground);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(18, 8), new THREE.MeshBasicMaterial({ map: glowTex, color: '#ff8a3a', transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.0, 1.2);
  scene.add(pool);
  const stage = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.5, 1.6), new THREE.MeshBasicMaterial({ color: '#07061a' }));
  stage.position.set(0, 0.25, 0);
  scene.add(stage);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.025, 0.025), new THREE.MeshBasicMaterial({ color: '#ffb36b' }));
  lip.position.set(0, 0.5, 0.8);
  scene.add(lip);

  /* ---------- the flame outline (a neon tube) ---------- */
  const flamePts = (s) => {
    const pts = [];
    for (let i = 0; i < 48; i++) {
      const t = i / 48 * Math.PI * 2;
      pts.push(new THREE.Vector3(0.5 * Math.sin(t) * Math.pow(Math.abs(Math.sin(t / 2)), 1.3) * s, (Math.cos(t) * 0.62 + 0.62) * s, 0));
    }
    return new THREE.CatmullRomCurve3(pts, true);
  };
  const outerGeo = new THREE.TubeGeometry(flamePts(0.62), 96, 0.03, 6, true);
  const innerGeo = new THREE.TubeGeometry(flamePts(0.3), 64, 0.022, 6, true);

  /* ---------- nine panels ---------- */
  const W = 0.86, D = 0.34, GAP = 1.18;
  const bodyMat = new THREE.MeshBasicMaterial({ color: '#0a0920' });
  const neonMat = new THREE.MeshBasicMaterial({ color: '#ff3b6b' });
  const DIM = new THREE.Color('#5d5a7a'), FLAME = new THREE.Color('#ff9a3c'), CORE = new THREE.Color('#ffd84a');
  const panels = [];
  for (let i = 0; i < 9; i++) {
    const sh = i === 4;
    const H = sh ? 3.6 : 3.05, base = sh ? 0.85 : 0.5;
    const g = new THREE.Group();
    g.position.set((i - 4) * GAP, base, 0);
    scene.add(g);
    const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), bodyMat);
    body.position.y = H / 2;
    g.add(body);
    if (sh) { const riser = new THREE.Mesh(new THREE.BoxGeometry(W + 0.1, 0.35, D + 0.1), bodyMat); riser.position.y = -0.175; g.add(riser); }
    // the LED face: a canvas people draw on
    const tex = canvasTexture(CW, CH, () => {});
    const face = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.06, H - 0.06), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    face.position.set(0, H / 2, D / 2 + 0.002);
    face.userData.i = i;
    g.add(face);
    // neon edges
    [[W, 0.03, 0, H], [W, 0.03, 0, 0], [0.03, H, -W / 2, H / 2], [0.03, H, W / 2, H / 2]].forEach(([w, h, x, y]) => {
      const e = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), neonMat);
      e.position.set(x, y, D / 2 + 0.01);
      g.add(e);
    });
    // the flame
    const fMat = new THREE.MeshBasicMaterial({ color: DIM.clone(), toneMapped: false });
    const cMat = new THREE.MeshBasicMaterial({ color: DIM.clone(), toneMapped: false });
    const flame = new THREE.Group();
    flame.add(new THREE.Mesh(outerGeo, fMat));
    const core = new THREE.Mesh(innerGeo, cMat); core.position.y = 0.06; flame.add(core);
    flame.position.set(0, H + 0.12, D / 2);
    g.add(flame);
    const fglow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ff8a2a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    fglow.scale.set(1.8, 1.8, 1); fglow.position.set(0, H + 0.55, D / 2);
    g.add(fglow);
    // the panel's light spilling into the square
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#3b4cff', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.scale.set(2.6, H * 1.6, 1); halo.position.set(0, H / 2, -0.4);
    g.add(halo);
    const p = { g, H, tex, ctx: tex.image.getContext('2d'), face, flame, fMat, cMat, fglow, halo, lit: 0, on: false, pulse: 0, tint: new THREE.Color('#3b4cff'), dirty: true, sticker: i % 4 };
    panels.push(p);
    blank(p);
  }

  function blank(p) {
    const c = p.ctx;
    const gr = c.createLinearGradient(0, 0, 0, CH);
    gr.addColorStop(0, '#2340d8'); gr.addColorStop(0.55, '#1a2a9e'); gr.addColorStop(1, '#120f55');
    c.globalCompositeOperation = 'source-over'; c.shadowBlur = 0;
    c.fillStyle = gr; c.fillRect(0, 0, CW, CH);
    for (let k = 0; k < 70; k++) {            // the touchscreen's starry ground
      c.fillStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.6})`;
      const r = Math.random() < 0.85 ? 1.2 : 2.4;
      c.beginPath(); c.arc(Math.random() * CW, Math.random() * CH, r, 0, 7); c.fill();
    }
    p.dirty = true;
  }

  /* ---------- the toolkit: brush, sparkles, stickers ---------- */
  function stroke(p, a, b, col, w = 26) {
    const c = p.ctx;
    c.globalCompositeOperation = 'source-over';
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.shadowColor = col; c.shadowBlur = 22;
    c.strokeStyle = col; c.lineWidth = w;
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
    c.shadowBlur = 0; c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = w * 0.28;
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
    touched(p, col);
  }
  function spark(c, x, y, r, col) {
    c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 12;
    c.beginPath();
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, rr = k % 2 ? r * 0.28 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath(); c.fill();
  }
  function sparkles(p, x, y, col) {
    const c = p.ctx;
    for (let k = 0; k < 9; k++) spark(c, x + (Math.random() - 0.5) * 150, y + (Math.random() - 0.5) * 220, 6 + Math.random() * 16, Math.random() < 0.35 ? '#ffffff' : col);
    c.shadowBlur = 0;
    touched(p, col);
  }
  function sticker(p, x, y, col) {
    const c = p.ctx, s = 52 + Math.random() * 20, kind = p.sticker++ % 4;
    c.save(); c.translate(x, y); c.rotate((Math.random() - 0.5) * 0.6);
    c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 10; c.lineWidth = 6; c.strokeStyle = '#fff';
    c.beginPath();
    if (kind === 0) {                                   // a star
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k / 10 * Math.PI * 2, r = k % 2 ? s * 0.45 : s; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      c.closePath(); c.fillStyle = col; c.stroke(); c.fill();
    } else if (kind === 1) {                            // a heart
      c.moveTo(0, s * 0.8); c.bezierCurveTo(-s * 1.3, -s * 0.1, -s * 0.5, -s, 0, -s * 0.35); c.bezierCurveTo(s * 0.5, -s, s * 1.3, -s * 0.1, 0, s * 0.8);
      c.fillStyle = col; c.stroke(); c.fill();
    } else if (kind === 2) {                            // a sufganiyah, sugar and jam
      c.arc(0, 0, s * 0.8, 0, 7); c.fillStyle = '#e99a45'; c.stroke(); c.fill();
      c.shadowBlur = 0; c.fillStyle = '#fff3e0'; c.beginPath(); c.ellipse(0, -s * 0.15, s * 0.62, s * 0.45, 0, 0, 7); c.fill();
      c.fillStyle = '#e8304f'; c.beginPath(); c.arc(0, -s * 0.15, s * 0.16, 0, 7); c.fill();
    } else {                                            // a flower
      c.fillStyle = col;
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; c.beginPath(); c.arc(Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.5, s * 0.38, 0, 7); c.fill(); }
      c.shadowBlur = 0; c.fillStyle = '#ffd84a'; c.beginPath(); c.arc(0, 0, s * 0.3, 0, 7); c.fill();
    }
    c.restore();
    touched(p, col);
  }
  function blob(p, x, y, col) { stroke(p, { x, y: y - 1 }, { x: x + 1, y: y + 1 }, col, 44); sparkles(p, x, y, col); }
  function touched(p, col) {
    p.dirty = true; p.pulse = 1;
    p.tint.lerp(new THREE.Color(col), 0.35);
    if (!p.on) { p.on = true; }
  }

  /* ---------- toolbar ---------- */
  let tool = 'brush', colour = COLS[0];
  const colWrap = tools.querySelector('.cl-colours');
  COLS.forEach((c, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'cl-col'; b.style.setProperty('--c', c);
    b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
    b.setAttribute('aria-label', ['Pink', 'Yellow', 'Cyan', 'Mint', 'Orange', 'Lilac', 'White'][i]);
    b.addEventListener('click', () => { colour = c; colWrap.querySelectorAll('.cl-col').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); });
    colWrap.appendChild(b);
  });
  tools.querySelectorAll('.cl-tool').forEach((b) => b.addEventListener('click', () => {
    tool = b.dataset.tool;
    tools.querySelectorAll('.cl-tool').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  }));
  document.getElementById('clClear').addEventListener('click', () => {
    panels.forEach((p) => { blank(p); p.on = false; p.tint.set('#3b4cff'); });
    lastUser = clockT; tick.wake();
  });
  tools.hidden = false;

  /* ---------- drawing with the pointer ---------- */
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  const faces = panels.map((p) => p.face);
  let lastUser = -100, drag = null, clockT = 0, hinted = false;
  const hitAt = (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const h = ray.intersectObjects(faces, false)[0];
    return h ? { p: panels[h.object.userData.i], x: h.uv.x * CW, y: (1 - h.uv.y) * CH } : null;
  };
  const use = () => { lastUser = clockT; if (!hinted && hint) { hinted = true; hint.classList.add('done'); } tick.wake(); };
  renderer.domElement.addEventListener('pointerdown', (e) => {
    const h = hitAt(e); if (!h) return;
    use();
    if (tool === 'brush' && e.pointerType === 'mouse') { drag = h; stroke(h.p, h, { x: h.x + 0.5, y: h.y }, colour); }
    else if (tool === 'brush') blob(h.p, h.x, h.y, colour);
    else if (tool === 'sparkle') sparkles(h.p, h.x, h.y, colour);
    else sticker(h.p, h.x, h.y, colour);
  });
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerType !== 'mouse') return;
    const h = hitAt(e);
    if (!h || h.p !== drag.p) { drag = h; return; }
    stroke(h.p, drag, h, colour); drag = h; use();
  });
  addEventListener('pointerup', () => { drag = null; });

  /* ---------- the other visitors ---------- */
  let bot = null, nextBot = 1.2;
  function botStep(t) {
    if (calm || t - lastUser < 6) return;
    if (!bot) {
      if (t < nextBot) return;
      const unlit = ORDER.filter((i) => !panels[i].on);
      const i = unlit.length ? unlit[0] : (Math.random() * 9) | 0;
      const p = panels[i], col = COLS[(Math.random() * COLS.length) | 0];
      const pts = [], x0 = 40 + Math.random() * 60, amp = 40 + Math.random() * 50, f = 0.006 + Math.random() * 0.01;
      for (let y = CH - 60; y > 120; y -= 22) pts.push({ x: x0 + 60 + Math.sin(y * f) * amp, y });
      bot = { p, col, pts, k: 1, end: Math.random() < 0.5 ? 'sticker' : 'sparkle' };
      return;
    }
    for (let n = 0; n < 2 && bot.k < bot.pts.length; n++, bot.k++) stroke(bot.p, bot.pts[bot.k - 1], bot.pts[bot.k], bot.col, 20);
    if (bot.k >= bot.pts.length) {
      const q = bot.pts[(Math.random() * bot.pts.length) | 0];
      if (bot.end === 'sticker') sticker(bot.p, q.x, q.y, COLS[(Math.random() * COLS.length) | 0]); else sparkles(bot.p, q.x, q.y, bot.col);
      bot = null; nextBot = t + 1.6 + Math.random() * 1.6;
    }
  }

  /* ---------- framing: the menorah under the title ---------- */
  let mobile = false;
  onResize((w, h) => {
    mobile = w < 820;
    const vh = Math.min(h, innerHeight || h);
    const cyp = mobile ? vh * 0.56 : vh * 0.66;
    const cxp = mobile ? w / 2 : w * 0.46;
    camera.setViewOffset(w, h, w / 2 - cxp, h / 2 - cyp, w, h);
  });

  /* ---------- the loop ---------- */
  let ready = false;
  const cam = new THREE.Vector3(), look = new THREE.Vector3(0, 2.2, 0);
  const tick = runWhileVisible(stageEl, (t, dt) => {
    clockT = t;
    botStep(t);
    panels.forEach((p, i) => {
      if (p.dirty) { p.tex.needsUpdate = true; p.dirty = false; }
      p.lit += ((p.on ? 1 : 0) - p.lit) * (calm ? 1 : 1 - Math.pow(0.02, dt));
      p.pulse = Math.max(0, p.pulse - dt * 1.5);
      p.fMat.color.lerpColors(DIM, FLAME, p.lit);
      p.cMat.color.lerpColors(DIM, CORE, p.lit);
      const fl = calm ? 1 : 1 + Math.sin(t * 9 + i * 1.7) * 0.04 * p.lit + Math.sin(t * 13.3 + i) * 0.03 * p.lit;
      p.flame.scale.set(1, fl, 1);
      p.fglow.material.opacity = p.lit * (0.75 + (calm ? 0 : Math.sin(t * 7 + i) * 0.12));
      p.halo.material.color.copy(p.tint);
      p.halo.material.opacity = 0.3 + p.pulse * 0.35;
    });
    // the camera faces the square from the crowd, leaning with the pointer
    const fit = mobile ? 10.7 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect) : 0;
    const dist = Math.max(mobile ? 13 : 17, fit);
    cam.set(pointer.x * 3 + (calm ? 0 : Math.sin(t * 0.17) * 0.5), 2.2 - pointer.y * 1.2, dist);
    camera.position.lerp(cam, ready && !calm ? 0.05 : 1);
    camera.lookAt(look);
    renderer.render(scene, camera);
    if (!ready) { ready = true; reveal(); }
  });
}
