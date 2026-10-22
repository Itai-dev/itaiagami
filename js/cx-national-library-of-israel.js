/* ============================================================
   National Library of Israel: the reading desk.
   An archive book lies open under a reading lamp. Its pages turn with a
   real curl: on their own every few seconds, or when the visitor taps
   the book (right half forward, left half back; arrow keys too). Around
   it lie the archive's letters, envelopes, a photograph and a catalogue
   card, each tied to a fine coloured thread like the interface's lines;
   reach for one and it lifts toward you, tap it to hold it up.
   Scrolling leans the view over the desk into a reading position.

   The pages carry the project's own photographs; the handwriting is
   drawn, abstract strokes rather than real text.
   Reduced motion: no idle turning, swaying or dust; taps still turn.
   ============================================================ */
import { THREE, makeStage, runWhileVisible, turnToFace, pointer, canvasTexture, distanceToFit, calm } from './cx-kit.js';

turnToFace('.cx-turn');
panoramaNudge();

const stageEl = document.getElementById('nlStage');
const hero = stageEl && stageEl.closest('.nl-hero');
const S = makeStage(stageEl, { exposure: 1.1 });
if (S) build(S);

function build({ renderer, scene, camera, reveal, onResize }) {
  const hint = document.getElementById('nlHint');
  let seed = 5;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const INK = '#2f241a', PAPER = '#efe6d2';

  /* ---------- drawing helpers for paper ---------- */
  function paper(c, w, h, tone = PAPER) {
    c.fillStyle = tone; c.fillRect(0, 0, w, h);
    const g = c.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.8);
    g.addColorStop(0, 'rgba(255,250,235,.25)'); g.addColorStop(1, 'rgba(140,105,60,.22)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { c.fillStyle = `rgba(150,110,60,${0.04 + rnd() * 0.06})`; c.beginPath(); c.arc(rnd() * w, rnd() * h, 2 + rnd() * 10, 0, Math.PI * 2); c.fill(); }
  }
  // abstract handwriting: looping strokes in words and lines
  function hand(c, x0, y0, w, lines, lh, ink = INK, size = 1) {
    c.strokeStyle = ink; c.lineWidth = 1.6 * size; c.lineCap = 'round'; c.lineJoin = 'round';
    for (let l = 0; l < lines; l++) {
      let x = x0 + (l === 0 ? 30 * size : 0);
      const y = y0 + l * lh, end = x0 + w * (l === lines - 1 ? 0.55 : 0.92 + rnd() * 0.08);
      while (x < end) {
        const wl = (20 + rnd() * 60) * size;
        c.beginPath(); c.moveTo(x, y);
        for (let s = 0; s < wl; s += 5 * size) {
          const hgt = (rnd() < 0.15 ? 14 : 6) * size;
          c.quadraticCurveTo(x + s + 2.5 * size, y - hgt * (0.5 + rnd() * 0.6), x + s + 5 * size, y + (rnd() - 0.4) * 2 * size);
        }
        c.stroke();
        x += wl + (8 + rnd() * 6) * size;
      }
    }
  }
  const imgs = {};
  function photo(tex, c, src, x, y, w, h, rot) {
    const draw = (im) => {
      c.save(); c.translate(x + w / 2, y + h / 2); c.rotate(rot);
      c.shadowColor = 'rgba(60,40,20,.35)'; c.shadowBlur = 14; c.shadowOffsetY = 5;
      c.fillStyle = '#f7f2e6'; c.fillRect(-w / 2 - 12, -h / 2 - 12, w + 24, h + 24);
      c.shadowColor = 'transparent';
      if (im) {
        const a = w / h, ia = im.width / im.height;
        let sw = im.width, sh = im.height;
        if (ia > a) sw = sh * a; else sh = sw / a;
        c.filter = 'sepia(.25) contrast(1.05)';
        c.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, -w / 2, -h / 2, w, h);
        c.filter = 'none';
      } else { c.fillStyle = '#2a241c'; c.fillRect(-w / 2, -h / 2, w, h); }
      c.fillStyle = 'rgba(40,30,20,.75)';   // photo corners
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        c.beginPath(); c.moveTo(sx * (w / 2 + 14), sy * (h / 2 + 14)); c.lineTo(sx * (w / 2 - 22), sy * (h / 2 + 14)); c.lineTo(sx * (w / 2 + 14), sy * (h / 2 - 22)); c.closePath(); c.fill();
      }
      c.restore();
    };
    draw(null);
    const get = imgs[src] || (imgs[src] = new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }));
    get.then((im) => { if (im) { draw(im); tex.needsUpdate = true; } });
  }
  function stampRing(c, x, y, r, col) {
    c.strokeStyle = col; c.lineWidth = 3;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, r * 0.72, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(x - r * 2.2, y - r * 0.5 + i * r * 0.25); c.lineTo(x - r * 1.1, y - r * 0.5 + i * r * 0.25); c.stroke(); }
  }
  const serif = '"Frank Ruhl Libre", Georgia, serif', mono = '"IBM Plex Mono", monospace';

  /* ---------- the twelve page faces ---------- */
  const PW = 600, PH = 820;
  const faces = [
    (c, t) => { paper(c, PW, PH); c.fillStyle = INK; c.textAlign = 'center';
      c.font = `500 15px ${mono}`; c.fillText('THE ARCHIVE', PW / 2, 250);
      c.font = `400 46px ${serif}`; ['Letters, diaries,', 'photographs', 'and art'].forEach((s, i) => c.fillText(s, PW / 2, 330 + i * 56));
      c.strokeStyle = '#c9a35a'; c.lineWidth = 2; c.beginPath(); c.moveTo(PW / 2 - 40, 520); c.lineTo(PW / 2 + 40, 520); c.stroke(); },
    (c) => { paper(c, PW, PH); hand(c, 60, 120, PW - 120, 17, 36); },
    (c, t) => { paper(c, PW, PH); photo(t, c, '/assets/opt/bea5f573ce58.webp', 70, 90, PW - 140, 330, -0.03); hand(c, 70, 520, PW - 140, 7, 34); },
    (c) => { paper(c, PW, PH); c.strokeStyle = 'rgba(80,110,170,.25)'; c.lineWidth = 1; for (let y = 110; y < PH - 60; y += 34) { c.beginPath(); c.moveTo(50, y); c.lineTo(PW - 50, y); c.stroke(); } c.strokeStyle = 'rgba(200,80,60,.35)'; c.beginPath(); c.moveTo(100, 60); c.lineTo(100, PH - 40); c.stroke(); hand(c, 112, 108, PW - 170, 18, 34, '#2b3a6a'); },
    (c, t) => { paper(c, PW, PH, '#ebe0c6'); photo(t, c, '/assets/opt/54a2e32ea808.webp', 60, 150, PW - 120, 360, 0.02); c.font = `400 13px ${mono}`; c.fillStyle = 'rgba(47,36,26,.7)'; c.fillText('f. 4', 64, PH - 60); },
    (c) => { paper(c, PW, PH); hand(c, 60, 130, PW - 120, 13, 38); stampRing(c, PW - 130, PH - 150, 52, 'rgba(110,70,150,.55)'); },
    (c, t) => { paper(c, PW, PH); photo(t, c, '/assets/opt/2dd33e8c1eaf.webp', 60, 110, PW - 120, 300, -0.015); hand(c, 70, 500, PW - 140, 8, 32); },
    (c) => { paper(c, PW, PH, '#e9dcc0'); hand(c, 60, 110, PW - 120, 19, 34, '#3a2a1c', 0.9); },
    (c, t) => { paper(c, PW, PH); photo(t, c, '/assets/opt/e4e7d7622c15.webp', 70, 220, PW - 140, 300, 0.025); },
    (c) => { paper(c, PW, PH); hand(c, 60, 120, PW - 120, 9, 36);
      c.strokeStyle = INK; c.lineWidth = 2; c.beginPath();   // a small pen sketch of hills
      for (let x = 80; x < PW - 80; x += 6) c.lineTo(x, 620 - 40 * Math.sin(x * 0.012) - 20 * Math.sin(x * 0.03)); c.stroke();
      c.beginPath(); c.arc(PW - 150, 520, 26, 0, Math.PI * 2); c.stroke(); },
    (c) => { paper(c, PW, PH); hand(c, 60, 130, PW - 120, 16, 36, '#2b3a6a'); },
    (c) => { paper(c, PW, PH); c.fillStyle = INK; c.textAlign = 'center'; c.font = `400 34px ${serif}`;
      ['A country’s history', 'told through the people', 'who lived it.'].forEach((s, i) => c.fillText(s, PW / 2, 360 + i * 46)); },
  ];
  const faceTex = faces.map((f) => { let tex; tex = canvasTexture(PW, PH, (c) => f(c, { get needsUpdate() { return false; }, set needsUpdate(v) { if (tex) tex.needsUpdate = v; } })); return tex; });
  // redraw once fonts arrive so the serif pages use the real face
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { seed = 5; faces.forEach((f, i) => faceTex[i].redraw((c) => f(c, faceTex[i]))); });

  /* ---------- the book ---------- */
  const W = 2.1, H = 2.9, L = 6, SEG = 24;
  const book = new THREE.Group(); scene.add(book);
  const cloth = new THREE.MeshStandardMaterial({ color: '#4a1d16', roughness: 0.85 });
  const edge = new THREE.MeshStandardMaterial({ color: '#e5d6b6', roughness: 0.95 });
  for (const sx of [-1, 1]) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(W + 0.12, 0.05, H + 0.16), cloth);
    board.position.set(sx * (W / 2 + 0.06), 0.025, 0); board.castShadow = board.receiveShadow = true; book.add(board);
  }
  const blockH = 0.16;
  const blocks = [-1, 1].map((sx) => {
    const top = canvasTexture(PW, PH, (c) => paper(c, PW, PH, '#ece2cb'));
    const m = new THREE.Mesh(new THREE.BoxGeometry(W - 0.02, blockH, H - 0.04), [edge, edge, new THREE.MeshStandardMaterial({ map: top, roughness: 0.95 }), edge, edge, edge]);
    m.position.set(sx * (W / 2), 0.05 + blockH / 2, 0); m.castShadow = m.receiveShadow = true; book.add(m); return m;
  });
  const baseY = 0.05 + blockH + 0.004;
  // gilt head band at the spine
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, H + 0.1, 12), new THREE.MeshStandardMaterial({ color: '#3a1410', roughness: 0.7 }));
  spine.rotation.x = Math.PI / 2; spine.position.y = 0.03; book.add(spine);

  const leaves = [];
  const uvF = [], uvB = [], idx = [];
  for (let i = 0; i <= SEG; i++) { const u = i / SEG; uvF.push(u, 1, u, 0); uvB.push(1 - u, 1, 1 - u, 0); }
  for (let i = 0; i < SEG; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
  for (let k = 0; k < L; k++) {
    const pos = new THREE.BufferAttribute(new Float32Array((SEG + 1) * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage);
    const gF = new THREE.BufferGeometry(); gF.setAttribute('position', pos); gF.setAttribute('uv', new THREE.Float32BufferAttribute(uvF, 2)); gF.setIndex(idx);
    const gB = new THREE.BufferGeometry(); gB.setAttribute('position', pos); gB.setAttribute('uv', new THREE.Float32BufferAttribute(uvB, 2)); gB.setIndex(idx);
    const front = new THREE.Mesh(gF, new THREE.MeshStandardMaterial({ map: faceTex[k * 2], roughness: 0.92, side: THREE.FrontSide }));
    const back = new THREE.Mesh(gB, new THREE.MeshStandardMaterial({ map: faceTex[k * 2 + 1], roughness: 0.92, side: THREE.BackSide }));
    front.castShadow = back.castShadow = true; front.receiveShadow = back.receiveShadow = true;
    front.userData.page = back.userData.page = true;
    book.add(front, back);
    leaves.push({ front, back, pos, t: 0, gF, gB });
  }
  let spread = 0;
  function layoutLeaf(lf, k) {
    const t = lf.t, a = t * Math.PI, bend = Math.sin(t * Math.PI) * 0.95;
    const yR = baseY + (L - 1 - k) * 0.006, yL = baseY + k * 0.006;
    const y0 = yR + (yL - yR) * t + Math.sin(t * Math.PI) * 0.02;
    const arr = lf.pos.array; let x = 0, y = y0;
    const ds = W / SEG;
    for (let i = 0; i <= SEG; i++) {
      for (let j = 0; j < 2; j++) {
        const o = (i * 2 + j) * 3;
        arr[o] = x; arr[o + 1] = y; arr[o + 2] = j ? H / 2 - 0.02 : -H / 2 + 0.02;
      }
      const s = (i + 0.5) / SEG, al = a - bend * s * s;
      x += Math.cos(al) * ds; y += Math.sin(al) * ds;
    }
    lf.pos.needsUpdate = true;
    lf.gF.computeVertexNormals();
    lf.gB.setAttribute('normal', lf.gF.getAttribute('normal'));
  }
  leaves.forEach(layoutLeaf);
  function turn(dir) {
    spread = Math.max(0, Math.min(L, spread + dir));
    lastTurn = now; loop.wake(); done();
  }

  /* ---------- the desk ---------- */
  const grain = canvasTexture(1024, 1024, (c, w, h) => {
    c.fillStyle = '#3a2a1d'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 220; i++) {
      const y = rnd() * h; c.strokeStyle = `rgba(${rnd() < 0.5 ? '20,12,6' : '90,64,40'},${0.12 + rnd() * 0.2})`; c.lineWidth = 1 + rnd() * 3;
      c.beginPath(); c.moveTo(0, y); for (let x = 0; x <= w; x += 32) c.lineTo(x, y + Math.sin(x * 0.01 + i) * 6); c.stroke();
    }
  });
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(2, 2);
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(30, 18), new THREE.MeshStandardMaterial({ map: grain, roughness: 0.7, metalness: 0.05 }));
  desk.rotation.x = -Math.PI / 2; desk.receiveShadow = true; scene.add(desk);

  /* ---------- letters on the desk, each on a coloured thread ---------- */
  const threadCols = ['#f08a3c', '#6f8fe0', '#e2553b', '#f6f1e6', '#f08a3c'];
  const items = [
    { w: 1.5, h: 0.95, x: -3.55, z: -0.9, r: 0.22, draw: (c, w, h) => { paper(c, w, h, '#e9dcc0'); c.strokeStyle = 'rgba(80,60,40,.35)'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(w / 2, h * 0.55); c.lineTo(w, 0); c.stroke();
      c.fillStyle = '#6f8fe0'; c.fillRect(w - 150, 26, 110, 130); c.strokeStyle = '#f7f2e6'; c.setLineDash([4, 6]); c.lineWidth = 6; c.strokeRect(w - 150, 26, 110, 130); c.setLineDash([]);
      stampRing(c, w - 170, 150, 46, 'rgba(40,30,30,.55)'); hand(c, 120, h * 0.66, w * 0.5, 3, 34, '#2b3a6a', 1.2); } },
    { w: 1.35, h: 1.75, x: 3.45, z: -0.6, r: -0.18, draw: (c, w, h) => { paper(c, w, h); c.strokeStyle = 'rgba(120,90,60,.25)'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, h / 3); c.lineTo(w, h / 3); c.moveTo(0, h * 2 / 3); c.lineTo(w, h * 2 / 3); c.stroke(); hand(c, 50, 90, w - 100, 14, 46, INK, 1.25); } },
    { w: 1.25, h: 0.95, x: -3.3, z: 1.35, r: -0.12, photo: '/assets/opt/bea5f573ce58.webp' },
    { w: 1.45, h: 0.9, x: 3.3, z: 1.5, r: 0.1, draw: (c, w, h) => { paper(c, w, h, '#f1e8d4'); c.strokeStyle = 'rgba(70,100,180,.35)'; c.lineWidth = 2; for (let y = 120; y < h - 20; y += 38) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
      c.strokeStyle = '#e2553b'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 82); c.lineTo(w, 82); c.stroke(); c.fillStyle = '#0d0c0a'; c.beginPath(); c.arc(w / 2, h - 34, 14, 0, Math.PI * 2); c.fill();
      c.font = `500 26px ${mono}`; c.fillStyle = INK; c.fillText('LETTERS · DIARIES · PHOTOGRAPHS · ART', 36, 60); hand(c, 40, 150, w - 80, 4, 38, '#2b2b2b', 1.1); } },
    { w: 1.5, h: 0.92, x: 0.2, z: 2.35, r: 0.05, draw: (c, w, h) => { paper(c, w, h, '#f2ead8'); for (let x = -40; x < w + 40; x += 56) { c.fillStyle = (x / 56) % 2 ? '#e2553b' : '#6f8fe0'; c.save(); c.translate(x, 0); c.transform(1, 0, -0.6, 1, 0, 0); c.fillRect(0, 0, 28, 16); c.fillRect(0, h - 16, 28, 16); c.restore(); }
      hand(c, w * 0.42, h * 0.45, w * 0.48, 3, 40, INK, 1.3); stampRing(c, 150, 170, 52, 'rgba(40,30,30,.45)'); } },
  ];
  const letterMeshes = [];
  items.forEach((it, i) => {
    const tw = 768, th = Math.round(768 * it.h / it.w);
    let tex;
    tex = canvasTexture(tw, th, (c, w, h) => {
      if (it.photo) { c.fillStyle = '#f7f2e6'; c.fillRect(0, 0, w, h); }
      else it.draw(c, w, h);
    });
    if (it.photo) {
      const im = new Image(); im.onload = () => tex.redraw((c, w, h) => {
        c.fillStyle = '#f7f2e6'; c.fillRect(0, 0, w, h);
        const m = 28, a = (w - 2 * m) / (h - 2 * m - 40), ia = im.width / im.height; let sw = im.width, sh = im.height;
        if (ia > a) sw = sh * a; else sh = sw / a;
        c.filter = 'sepia(.35)'; c.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, m, m, w - 2 * m, h - 2 * m - 40); c.filter = 'none';
      }); im.src = it.photo;
    }
    const top = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
    const side = new THREE.MeshStandardMaterial({ color: '#e2d3b2', roughness: 0.9 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(it.w, 0.012, it.h), [side, side, top, side, side, side]);
    m.castShadow = m.receiveShadow = true;
    const g = new THREE.Group(); g.add(m);
    g.position.set(it.x, 0.006 + i * 0.002, it.z); g.rotation.y = it.r;
    scene.add(g);
    m.userData.item = i;
    letterMeshes.push(m);
    // the thread rising from it
    const tp = new Float32Array([0, 0.01, 0, 0, 7, 0]);
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(tp, 3));
    const line = new THREE.Line(tg, new THREE.LineBasicMaterial({ color: threadCols[i], transparent: true, opacity: 0.35 }));
    line.position.copy(g.position); scene.add(line);
    Object.assign(it, { g, line, tp, lift: 0, hold: 0, ph: rnd() * 6 });
  });

  /* ---------- light: one reading lamp, a dim warm room ---------- */
  scene.add(new THREE.HemisphereLight('#ffe6c4', '#1a120b', 0.35));
  const lamp = new THREE.SpotLight('#ffd9a0', 0, 30, 0.62, 0.65, 0);
  lamp.position.set(-1.2, 7.5, 2.4); lamp.target.position.set(0, 0, 0.2);
  lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.0005; lamp.shadow.radius = 4;
  scene.add(lamp, lamp.target);
  const fill = new THREE.DirectionalLight('#9fb0ff', 0.18); fill.position.set(4, 3, -3); scene.add(fill);

  // dust in the lamp light
  const DN = 160, dp = new Float32Array(DN * 3);
  for (let i = 0; i < DN; i++) dp.set([(rnd() - 0.5) * 6, rnd() * 5, (rnd() - 0.5) * 4], i * 3);
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: '#ffe2b0', size: 2, sizeAttenuation: false, transparent: true, opacity: calm ? 0 : 0.45, depthWrite: false }));
  scene.add(dust);

  /* ---------- input ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pageMeshes = [...leaves.flatMap((l) => [l.front, l.back]), ...blocks];
  let hover = -1, held = -1, now = 0, lastTurn = 0, interacted = false;
  window.__nl = () => ({ hover, held, lifts: items.map((i) => +i.lift.toFixed(2)) });
  const done = () => { if (!interacted && hint) { interacted = true; hint.classList.add('done'); } };
  const cast = (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  };
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    cast(e);
    const hit = ray.intersectObjects(letterMeshes, false)[0];
    hover = hit ? hit.object.userData.item : -1;
    renderer.domElement.style.cursor = hover >= 0 || ray.intersectObjects(pageMeshes, false)[0] ? 'pointer' : 'default';
    loop.wake();
  }, { passive: true });
  renderer.domElement.addEventListener('pointerleave', () => { hover = -1; });
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 8) return;
    cast(e);
    const l = ray.intersectObjects(letterMeshes, false)[0];
    if (l) { const i = l.object.userData.item; held = held === i ? -1 : i; done(); loop.wake(); return; }
    if (held >= 0) { held = -1; loop.wake(); return; }
    const p = ray.intersectObjects(pageMeshes, false)[0];
    if (p) turn(p.point.x >= 0 ? 1 : -1);
  });
  let inView = true;
  addEventListener('keydown', (e) => {
    if (!inView || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/input|textarea|select/i.test((document.activeElement || {}).tagName || '')) return;
    if (e.key === 'ArrowRight') turn(1);
    if (e.key === 'ArrowLeft') turn(-1);
  });

  /* ---------- framing ---------- */
  let dist = 9, narrow = false;
  onResize((w, h) => {
    narrow = w / h < 0.9;
    dist = Math.max(narrow ? 10 : 9.2, distanceToFit(camera, narrow ? 5.4 : 11.5, 0.92));
  });
  let scrollT = 0;
  const readScroll = () => { if (!hero) return; const r = hero.getBoundingClientRect(); scrollT = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height))); };
  addEventListener('scroll', () => { readScroll(); if (calm) loop.wake(); }, { passive: true }); readScroll();

  const camGoal = new THREE.Vector3(), look = new THREE.Vector3();
  let ready = false, dir = 1;
  const loop = runWhileVisible(stageEl, (t, dt) => {
    now = t; inView = loop ? loop.isInView() : true;

    // the pages turn on their own when nobody is reading
    if (!calm && t - lastTurn > 5.5) {
      if (spread >= L) dir = -1; else if (spread <= 0) dir = 1;
      spread += dir; lastTurn = t - (dir < 0 ? 4.4 : 0);   // flip back faster than forward
    }
    let moving = false;
    leaves.forEach((lf, k) => {
      const goal = k < spread ? 1 : 0;
      if (Math.abs(lf.t - goal) > 0.0005) {
        const sp = calm ? 6 : 1.6;
        lf.t += Math.sign(goal - lf.t) * Math.min(Math.abs(goal - lf.t), dt * sp * (0.35 + Math.sin(Math.min(1, Math.abs(goal - lf.t)) * Math.PI) * 0.9));
        layoutLeaf(lf, k); moving = true;
      }
    });
    if (calm && moving) loop.wake();

    // letters lift toward the hand, a held one rises to be read
    items.forEach((it, i) => {
      const lg = hover === i ? 1 : 0, hg = held === i ? 1 : 0;
      it.lift += (lg - it.lift) * Math.min(1, dt * 8);
      it.hold += (hg - it.hold) * Math.min(1, dt * 5);
      const y = 0.006 + i * 0.002 + it.lift * 0.28 + it.hold * 2.2;
      it.g.position.y = y;
      it.g.position.x = it.x * (1 - it.hold * 0.55);
      it.g.position.z = it.z + it.hold * 1.6;
      it.g.rotation.x = -it.lift * 0.12 - it.hold * 0.85;
      it.g.rotation.y = it.r * (1 - it.hold);
      const sway = calm ? 0 : Math.sin(t * 0.6 + it.ph) * 0.25;
      it.line.position.set(it.g.position.x, y, it.g.position.z);
      it.tp[3] = sway; it.tp[5] = sway * 0.4; it.line.geometry.attributes.position.needsUpdate = true;
      it.line.material.opacity = 0.3 + it.lift * 0.5 + it.hold * 0.4;
    });

    if (!calm) {
      const a = dg.attributes.position.array;
      for (let i = 0; i < DN; i++) { a[i * 3 + 1] += dt * 0.06; a[i * 3] += Math.sin(t * 0.3 + i) * dt * 0.03; if (a[i * 3 + 1] > 5) a[i * 3 + 1] = 0; }
      dg.attributes.position.needsUpdate = true;
    }
    lamp.intensity = 3.4 * (calm ? 1 : 0.985 + Math.sin(t * 2.1) * 0.015);

    // the view leans over the desk as the page scrolls
    const d = dist * (1 - scrollT * 0.2);
    const px = calm ? 0 : pointer.x, py = calm ? 0 : pointer.y;
    camGoal.set(px * 0.8, d * (0.72 + scrollT * 0.2) - py * 0.4, d * (0.62 - scrollT * 0.32));
    look.set(0, 0, narrow ? -2.6 : -2.3);
    camera.position.lerp(camGoal, ready && !calm ? Math.min(1, dt * 3) : 1);
    camera.lookAt(look);

    renderer.render(scene, camera);
    if (!ready) { ready = true; reveal(); }
  });
}

/* the ultra-wide strip: on narrow screens it scrolls sideways; show a little of the pan once */
function panoramaNudge() {
  const strip = document.getElementById('nlStrip');
  if (!strip || calm || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((es) => {
    if (!es[0].isIntersecting) return; io.disconnect();
    if (strip.scrollWidth > strip.clientWidth + 20) strip.scrollTo({ left: Math.min(160, strip.scrollWidth - strip.clientWidth), behavior: 'smooth' });
  }, { threshold: 0.6 });
  io.observe(strip);
}
