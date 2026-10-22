/* ============================================================
   Amdocs: Make It Amazing. The opening scene is the film's centrepiece:
   a pinball machine in the terracotta hall, "MAKE IT" on its backglass.
   It is playable: ← / → (or Z / M) work the flippers, and a tap on the
   left or right half of the table does the same on touch. Nobody playing?
   The machine plays itself in attract mode.

   The physics is a small 2D simulation on the playfield plane (x across,
   z down the table), drawn in 3D on a tilted table.
   ============================================================ */
import { THREE, makeStage, runWhileVisible, scrollProgress, pointer, roundedBox, canvasTexture, turnToFace, calm } from './cx-kit.js';

document.body.classList.add('cx-on');
turnToFace('.cx-turn');

const stageEl = document.getElementById('amStage');
const hint = document.getElementById('amHint');
if (stageEl) { try { build(); } catch (e) { /* the poster stays */ } }

function build() {
  const st = makeStage(stageEl, { exposure: 1.1 });
  if (!st) return;
  const { renderer, scene, camera } = st;

  /* ---------- palette (from the film) ---------- */
  const C = {
    terra: '#a9502e', terraD: '#6e2c19', brass: '#d9a35a', cream: '#f4e7cf',
    teal: '#163f3b', tealL: '#24605a', wood: '#6a2c19', carpet: '#3d4a2a',
  };

  /* ---------- a warm room for the brass to reflect ---------- */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(20, 24, 12), new THREE.MeshBasicMaterial({ color: '#4a2014', side: THREE.BackSide })));
  const lamp = new THREE.MeshBasicMaterial({ color: '#fff1d6' });
  [[-6, 9, -2], [6, 9, -2], [0, 10, 6], [-9, 4, 6]].forEach(([x, y, z]) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 8), lamp); m.position.set(x, y, z); env.add(m);
  });
  const floorGlow = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: '#3d4a2a' }));
  floorGlow.rotation.x = -Math.PI / 2; floorGlow.position.y = -6; env.add(floorGlow);
  scene.environment = pmrem.fromScene(env, 0.04).texture;
  scene.environmentIntensity = 0.9;

  /* ---------- light: lamp light from above, warm and soft ---------- */
  scene.add(new THREE.HemisphereLight('#ffe4c0', '#2a1a10', 0.9));
  const key = new THREE.DirectionalLight('#fff0d8', 2.2);
  key.position.set(-4, 12, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 8, bottom: -8, near: 2, far: 30 });
  key.shadow.bias = -0.0006;
  key.shadow.radius = 4;
  scene.add(key);

  /* ---------- the table: playfield coordinates ----------
     x in [-3, 3], z from -5.6 (top, under the backglass) to 5.6 (the player).
     The plunger lane runs up the right edge (x > 2.55). */
  const TILT = 0.12;
  const table = new THREE.Group();
  table.rotation.x = TILT;
  scene.add(table);
  const XC = -0.22;                           // centre line of the play area (left of the lane)
  const R = 0.16;                             // ball radius

  const mat = {
    wood: new THREE.MeshStandardMaterial({ color: C.wood, roughness: 0.55 }),
    brass: new THREE.MeshStandardMaterial({ color: C.brass, metalness: 0.95, roughness: 0.28 }),
    cream: new THREE.MeshStandardMaterial({ color: C.cream, roughness: 0.35 }),
    terra: new THREE.MeshStandardMaterial({ color: C.terra, roughness: 0.5 }),
    rubber: new THREE.MeshStandardMaterial({ color: '#1b1210', roughness: 0.7 }),
  };

  /* playfield art, after the machine in the film: dark teal, a copper-red
     figure down the middle, brass rings round the bumpers, cream chevrons */
  const bumpersDef = [[-1.25, -2.15], [0.8, -2.2], [-0.22, -0.85]];
  const PW = 1024, PH = 1912;
  const toU = (x) => ((x + 3) / 6) * PW, toV = (z) => ((z + 5.6) / 11.2) * PH;
  const fieldTex = canvasTexture(PW, PH, (c) => {
    const g = c.createRadialGradient(PW * 0.45, PH * 0.45, 50, PW * 0.45, PH * 0.45, PH * 0.7);
    g.addColorStop(0, '#22534e'); g.addColorStop(1, '#0d2624');
    c.fillStyle = g; c.fillRect(0, 0, PW, PH);
    // the red figure
    c.beginPath();
    const fig = [[XC, -3.6], [1.5, -2.4], [1.8, -0.4], [0.9, 0.6], [1.6, 2.0], [0.7, 3.2], [XC, 3.9], [-1.1, 3.2], [-2.0, 2.0], [-1.3, 0.6], [-2.2, -0.4], [-1.9, -2.4]];
    fig.forEach(([x, z], i) => (i ? c.lineTo(toU(x), toV(z)) : c.moveTo(toU(x), toV(z))));
    c.closePath();
    const rg = c.createLinearGradient(0, toV(-3.6), 0, toV(3.9));
    rg.addColorStop(0, '#b4532f'); rg.addColorStop(1, '#7a2e1a');
    c.fillStyle = rg; c.fill();
    c.lineWidth = 6; c.strokeStyle = '#d9a35a'; c.stroke();
    // brass rings under the bumpers
    bumpersDef.forEach(([x, z]) => {
      for (const [r, w, a] of [[0.62, 5, 0.9], [0.78, 2, 0.5]]) {
        c.beginPath(); c.arc(toU(x), toV(z), r * PW / 6, 0, Math.PI * 2);
        c.lineWidth = w; c.strokeStyle = `rgba(232,186,118,${a})`; c.stroke();
      }
    });
    // chevrons pointing up the table
    c.fillStyle = '#f4e7cf';
    for (let i = 0; i < 3; i++) {
      const y = toV(1.4 - i * 0.42), x = toU(XC);
      c.globalAlpha = 0.85 - i * 0.22;
      c.beginPath(); c.moveTo(x - 70, y + 34); c.lineTo(x, y - 6); c.lineTo(x + 70, y + 34); c.lineTo(x + 70, y + 52); c.lineTo(x, y + 12); c.lineTo(x - 70, y + 52); c.closePath(); c.fill();
    }
    c.globalAlpha = 1;
    // fine lane lines and the apron lettering
    c.strokeStyle = 'rgba(232,186,118,.35)'; c.lineWidth = 2;
    for (const x of [-1.7, 1.26]) { c.beginPath(); c.moveTo(toU(x), toV(-4.8)); c.lineTo(toU(x), toV(-3.4)); c.stroke(); }
    // the plunger lane, darker
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(toU(2.55), toV(-2.2), toU(3) - toU(2.55), PH);
  });

  // playfield outline: rectangle below, half circle above
  const shape = new THREE.Shape();
  shape.moveTo(-3, -5.6); shape.lineTo(3, -5.6); shape.lineTo(3, 2.5);
  shape.absarc(0, 2.5, 3, 0, Math.PI, false);
  shape.lineTo(-3, -5.6);
  const fieldGeo = new THREE.ShapeGeometry(shape, 24);
  // shape y is -z on the table; set uvs from table coordinates
  {
    const p = fieldGeo.attributes.position, uv = fieldGeo.attributes.uv;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = -p.getY(i); uv.setXY(i, (x + 3) / 6, 1 - (z + 5.6) / 11.2); }
    fieldGeo.rotateX(-Math.PI / 2);
  }
  const field = new THREE.Mesh(fieldGeo, new THREE.MeshStandardMaterial({ map: fieldTex, roughness: 0.35, metalness: 0.05 }));
  field.receiveShadow = true;
  table.add(field);

  // the cabinet under it
  const cab = new THREE.Mesh(roundedBox(6.6, 1.1, 11.6, 0.25), mat.wood);
  cab.position.set(0, -1.12, 0.15); cab.castShadow = true; cab.receiveShadow = true;
  table.add(cab);
  const trim = new THREE.Mesh(roundedBox(6.7, 0.06, 11.7, 0.26), mat.brass);
  trim.position.set(0, -0.09, 0.15);
  table.add(trim);

  /* ---------- walls: physics segments + their meshes ---------- */
  const segs = [];   // {ax,az,bx,bz,r,e,kick,id}
  const seg = (ax, az, bx, bz, o = {}) => { const s = { ax, az, bx, bz, r: o.r ?? 0.05, e: o.e ?? 0.45, kick: o.kick || 0, id: o.id || null }; segs.push(s); return s; };
  function railMesh(ax, az, bx, bz, h, t, m) {
    const len = Math.hypot(bx - ax, bz - az);
    const b = new THREE.Mesh(new THREE.BoxGeometry(t, h, len), m);
    b.position.set((ax + bx) / 2, h / 2, (az + bz) / 2);
    b.rotation.y = Math.atan2(bx - ax, bz - az);
    b.castShadow = true; b.receiveShadow = true;
    table.add(b); return b;
  }
  // outer walls
  seg(-3, 5.8, -3, -2.5); railMesh(-3.1, 5.75, -3.1, -2.5, 0.42, 0.2, mat.wood);
  seg(3, -2.5, 3, 5.8); railMesh(3.1, -2.5, 3.1, 5.75, 0.42, 0.2, mat.wood);
  const ARC = 18;
  for (let i = 0; i < ARC; i++) {
    const a0 = Math.PI + (i / ARC) * Math.PI, a1 = Math.PI + ((i + 1) / ARC) * Math.PI;
    seg(3 * Math.cos(a0), -2.5 + 3 * Math.sin(a0), 3 * Math.cos(a1), -2.5 + 3 * Math.sin(a1));
  }
  {
    const s = new THREE.Shape();
    s.absarc(0, 0, 3.2, 0, Math.PI, false); s.lineTo(-3, 0); s.absarc(0, 0, 3, Math.PI, 0, true); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.42, bevelEnabled: false, curveSegments: 36 });
    g.rotateX(-Math.PI / 2);
    const arc = new THREE.Mesh(g, mat.wood); arc.position.set(0, 0, -2.5); arc.castShadow = true; table.add(arc);
    const s2 = new THREE.Shape();
    s2.absarc(0, 0, 3.04, 0, Math.PI, false); s2.lineTo(-2.98, 0); s2.absarc(0, 0, 2.98, Math.PI, 0, true); s2.closePath();
    const g2 = new THREE.ExtrudeGeometry(s2, { depth: 0.3, bevelEnabled: false, curveSegments: 36 }); g2.rotateX(-Math.PI / 2);
    const inner = new THREE.Mesh(g2, mat.brass); inner.position.set(0, 0, -2.5); table.add(inner);
  }
  // plunger lane
  seg(2.55, 5.8, 2.55, -1.7, { r: 0.04 }); railMesh(2.55, 5.8, 2.55, -1.7, 0.3, 0.06, mat.brass);
  seg(2.55, 5.62, 3, 5.62, { e: 0.1 });
  // inlane guides down to the flippers
  const LP = { x: XC - 1.28, z: 4.45 }, RP = { x: XC + 1.28, z: 4.45 };
  seg(-3, 2.6, LP.x - 0.08, LP.z - 0.1); railMesh(-3, 2.6, LP.x - 0.08, LP.z - 0.1, 0.3, 0.07, mat.brass);
  seg(2.55, 2.6, RP.x + 0.08, RP.z - 0.1); railMesh(2.55, 2.6, RP.x + 0.08, RP.z - 0.1, 0.3, 0.07, mat.brass);
  // slingshots: a cream kicker face over a terracotta body
  const slings = [];
  function sling(side) {
    const m = (x) => (side < 0 ? x : 2 * XC - x);
    const A = [m(-1.95), 2.2], B = [m(-1.95), 3.0], Cc = [m(-1.5), 3.45];
    seg(A[0], A[1], B[0], B[1], { r: 0.06 });
    seg(B[0], B[1], Cc[0], Cc[1], { r: 0.06 });
    const face = seg(Cc[0], Cc[1], A[0], A[1], { r: 0.06, e: 0.5, kick: 4.2, id: 'sling' });
    const sh = new THREE.Shape([new THREE.Vector2(A[0], -A[1]), new THREE.Vector2(B[0], -B[1]), new THREE.Vector2(Cc[0], -Cc[1])]);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.26, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.03, bevelSegments: 2 });
    g.rotateX(-Math.PI / 2);
    const body = new THREE.Mesh(g, mat.terra.clone()); body.castShadow = true; table.add(body);
    body.material.emissive.set('#ff9a5a'); body.material.emissiveIntensity = 0;
    railMesh(Cc[0], Cc[1], A[0], A[1], 0.28, 0.08, mat.cream);
    face.mesh = body; slings.push(face);
  }
  sling(-1); sling(1);

  // posts at the top lanes
  const circles = [];   // {x,z,r,e,kick,id,lit,mesh}
  for (const x of [-1.7, -0.22, 1.26]) {
    circles.push({ x, z: -4.1, r: 0.09, e: 0.5, kick: 0, id: 'post' });
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.32, 16), mat.brass);
    p.position.set(x, 0.16, -4.1); p.castShadow = true; table.add(p);
  }
  // pop bumpers: terracotta skirt, a cream lamp cap that lights on a hit, a brass collar
  const bumpers = [];
  const bumpGeo = new THREE.CylinderGeometry(0.36, 0.4, 0.26, 32);
  const capGeo = new THREE.CylinderGeometry(0.37, 0.37, 0.08, 32);
  const collarGeo = new THREE.TorusGeometry(0.38, 0.035, 8, 40);
  bumpersDef.forEach(([x, z], i) => {
    const b = { x, z, r: 0.4, e: 0.6, kick: 6.5, id: 'bumper', lit: 0, i };
    const base = new THREE.Mesh(bumpGeo, mat.terra); base.position.set(x, 0.13, z); base.castShadow = true;
    const capMat = new THREE.MeshStandardMaterial({ color: C.cream, roughness: 0.3, emissive: '#ffd9a0', emissiveIntensity: 0.1 });
    const cap = new THREE.Mesh(capGeo, capMat); cap.position.set(x, 0.3, z); cap.castShadow = true;
    const collar = new THREE.Mesh(collarGeo, mat.brass); collar.rotation.x = Math.PI / 2; collar.position.set(x, 0.26, z);
    const light = new THREE.PointLight('#ffcf8a', 0, 2.2, 2); light.position.set(x, 0.7, z);
    table.add(base, cap, collar, light);
    Object.assign(b, { cap, capMat, light });
    bumpers.push(b); circles.push(b);
  });

  /* ---------- flippers ---------- */
  const FL = 1.12, REST = 0.52, UP = -0.42;
  function flipperGeo() {
    const s = new THREE.Shape();
    const r0 = 0.15, r1 = 0.07;
    s.absarc(0, 0, r0, Math.PI / 2, Math.PI * 1.5, false);
    s.lineTo(FL, -r1);
    s.absarc(FL, 0, r1, -Math.PI / 2, Math.PI / 2, false);
    s.lineTo(0, r0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2, curveSegments: 10 });
    g.rotateX(-Math.PI / 2);   // lies on the table; its +x runs along the flipper
    return g;
  }
  const fGeo = flipperGeo();
  const flippers = [LP, RP].map((p, k) => {
    const dir = k === 0 ? 1 : -1;
    const g = new THREE.Group(); g.position.set(p.x, 0.04, p.z);
    const m = new THREE.Mesh(fGeo, mat.cream); m.castShadow = true;
    if (dir < 0) m.scale.x = -1;     // mirrored for the right side
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.24, 12), mat.brass); pin.position.y = 0.12;
    g.add(m, pin); table.add(g);
    return { p, dir, a: REST, held: false, group: g, tx: 0, tz: 0, ptx: 0, ptz: 0 };
  });
  const setTip = (f) => { f.tx = f.p.x + f.dir * FL * Math.cos(f.a); f.tz = f.p.z + FL * Math.sin(f.a); };
  flippers.forEach((f) => { setTip(f); f.ptx = f.tx; f.ptz = f.tz; });

  /* ---------- the ball ---------- */
  const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 16), new THREE.MeshStandardMaterial({ color: '#fffaf0', metalness: 1, roughness: 0.12, envMapIntensity: 2.6 }));
  ballMesh.castShadow = true;
  table.add(ballMesh);
  const ball = { x: 2.78, z: 5.3, vx: 0, vz: 0, inPlay: false, wait: 0.9, still: 0 };

  /* ---------- backglass: "MAKE IT" in a cream lightbox, the score in brass ---------- */
  let score = 0, shown = -1;
  const glassTex = canvasTexture(1024, 640, () => {});
  function drawGlass() {
    glassTex.redraw((c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#b45a34'); g.addColorStop(1, '#5e2414');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      // panel seams, like the hall's walls
      c.fillStyle = 'rgba(0,0,0,.18)'; for (let x = 64; x < w; x += 128) c.fillRect(x, 0, 3, h);
      c.strokeStyle = '#e2ad66'; c.lineWidth = 10; c.strokeRect(14, 14, w - 28, h - 28);
      // the lightbox
      c.shadowColor = 'rgba(255,220,160,.9)'; c.shadowBlur = 40;
      c.fillStyle = '#f7ecd6'; c.fillRect(170, 92, w - 340, 230);
      c.shadowBlur = 0;
      c.fillStyle = '#3a2a22'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '800 150px "Big Shoulders Display", "Inter Tight", Impact, sans-serif';
      if ('letterSpacing' in c) c.letterSpacing = '14px';
      c.fillText('MAKE IT', w / 2 + 7, 210);
      if ('letterSpacing' in c) c.letterSpacing = '0px';
      // score
      c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(300, 400, w - 600, 130);
      c.fillStyle = '#ffd08a'; c.shadowColor = 'rgba(255,190,100,.8)'; c.shadowBlur = 18;
      c.font = '500 96px "IBM Plex Mono", monospace';
      c.fillText(String(score).padStart(6, '0'), w / 2, 468);
      c.shadowBlur = 0;
    });
  }
  drawGlass();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawGlass(); });
  const backbox = new THREE.Group();
  const bbBody = new THREE.Mesh(roundedBox(6.7, 4.3, 0.7, 0.12), mat.wood);
  bbBody.position.set(0, 0, 0);
  const bbFace = new THREE.Mesh(new THREE.PlaneGeometry(6.1, 3.8), new THREE.MeshBasicMaterial({ map: glassTex, toneMapped: false }));
  bbFace.position.set(0, 2.15, 0.43);
  const bbTrim = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.12, 0.8), mat.brass); bbTrim.position.set(0, 4.32, 0);
  backbox.add(bbBody, bbFace, bbTrim);
  // the backbox stands upright at the top of the table
  backbox.position.set(0, -0.2, -6.3);
  backbox.rotation.x = -TILT;
  table.add(backbox);
  const glassGlow = new THREE.PointLight('#ffd7a0', 4, 6, 2); glassGlow.position.set(0, 2.4, -4.6); table.add(glassGlow);

  // legs to the carpet, and a floor that only catches the shadow
  for (const [x, z] of [[-2.9, 5.2], [2.9, 5.2], [-2.9, -4.9], [2.9, -4.9]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 4, 12), mat.brass);
    leg.position.set(x, -3.6, z); leg.rotation.x = -TILT; table.add(leg);
  }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.3 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -5.4; floor.receiveShadow = true; scene.add(floor);

  /* ---------- sound: small blips, only once a visitor has played ---------- */
  let audio = null;
  function blip(f, dur = 0.12, type = 'triangle', vol = 0.07) {
    if (!audio) return;
    try {
      const t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.6, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* silent */ }
  }
  function wakeAudio() {
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) { audio = null; }
  }

  /* ---------- input ---------- */
  let userUntil = 0, now = 0, hinted = false;
  const run = runWhileVisible(stageEl, frame);
  function userPlayed() {
    userUntil = now + 10;
    wakeAudio();
    if (!hinted && hint) { hinted = true; hint.classList.add('done'); }
    run.wake();
  }
  function hold(k, on) {
    const f = flippers[k];
    if (on && !f.held) blip(k ? 180 : 160, 0.05, 'square', 0.025);
    f.held = on;
  }
  const inField = () => /input|textarea|select/i.test((document.activeElement || {}).tagName || '') || (document.activeElement && document.activeElement.isContentEditable);
  const keyL = new Set(['arrowleft', 'z', 'a']), keyR = new Set(['arrowright', 'm', 'l', '/']);
  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || !run.isInView() || inField()) return;
    const k = e.key.toLowerCase();
    if (keyL.has(k)) { hold(0, true); userPlayed(); } else if (keyR.has(k)) { hold(1, true); userPlayed(); }
  });
  addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (keyL.has(k)) hold(0, false); else if (keyR.has(k)) hold(1, false);
  });
  const ptrSide = new Map();
  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    // split at the table's centre on screen
    const side = e.clientX - r.left < tableScreenX * r.width ? 0 : 1;
    ptrSide.set(e.pointerId, side); hold(side, true); userPlayed();
  });
  const up = (e) => { const s = ptrSide.get(e.pointerId); if (s !== undefined) { ptrSide.delete(e.pointerId); if (![...ptrSide.values()].includes(s)) hold(s, false); } };
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => canvas.addEventListener(t, up));
  addEventListener('blur', () => { hold(0, false); hold(1, false); ptrSide.clear(); });

  /* ---------- physics ---------- */
  const G = 6.6, MAXV = 17;
  let hitCool = 0;
  function collideSeg(s) {
    const dx = s.bx - s.ax, dz = s.bz - s.az;
    const l2 = dx * dx + dz * dz;
    let t = ((ball.x - s.ax) * dx + (ball.z - s.az) * dz) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const cx = s.ax + t * dx, cz = s.az + t * dz;
    let nx = ball.x - cx, nz = ball.z - cz;
    const d = Math.hypot(nx, nz), min = R + s.r;
    if (d >= min || d < 1e-6) return;
    nx /= d; nz /= d;
    ball.x += nx * (min - d); ball.z += nz * (min - d);
    const vn = ball.vx * nx + ball.vz * nz;
    if (vn < 0) {
      ball.vx -= (1 + s.e) * vn * nx; ball.vz -= (1 + s.e) * vn * nz;
      if (s.kick && vn < -0.6) { ball.vx += nx * s.kick; ball.vz += nz * s.kick; hit(s); }
    }
  }
  function collideCircle(c) {
    let nx = ball.x - c.x, nz = ball.z - c.z;
    const d = Math.hypot(nx, nz), min = R + c.r;
    if (d >= min || d < 1e-6) return;
    nx /= d; nz /= d;
    ball.x = c.x + nx * min; ball.z = c.z + nz * min;
    const vn = ball.vx * nx + ball.vz * nz;
    if (vn < 0) {
      ball.vx -= (1 + c.e) * vn * nx; ball.vz -= (1 + c.e) * vn * nz;
      if (c.kick) { ball.vx += nx * c.kick; ball.vz += nz * c.kick; hit(c); }
    }
  }
  function collideFlipper(f, h) {
    const dx = f.tx - f.p.x, dz = f.tz - f.p.z, l2 = dx * dx + dz * dz;
    let t = ((ball.x - f.p.x) * dx + (ball.z - f.p.z) * dz) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const cx = f.p.x + t * dx, cz = f.p.z + t * dz;
    let nx = ball.x - cx, nz = ball.z - cz;
    const d = Math.hypot(nx, nz), rad = 0.15 - 0.08 * t, min = R + rad;
    if (d >= min || d < 1e-6) return;
    nx /= d; nz /= d;
    ball.x = cx + nx * min; ball.z = cz + nz * min;
    // the flipper's surface speed at the contact point
    const fvx = ((f.tx - f.ptx) / h) * t, fvz = ((f.tz - f.ptz) / h) * t;
    const vn = (ball.vx - fvx) * nx + (ball.vz - fvz) * nz;
    if (vn < 0) { ball.vx -= 1.3 * vn * nx; ball.vz -= 1.3 * vn * nz; }
  }
  function hit(o) {
    if (o.id === 'bumper') {
      o.lit = 1; score += 100; blip(420 + o.i * 140, 0.16);
    } else if (o.id === 'sling') {
      o.lit = 1; score += 10; blip(300, 0.08, 'square', 0.03);
    }
    hitCool = 0.05;
  }
  function step(h) {
    for (let k = 0; k < 2; k++) {
      const f = flippers[k];
      f.ptx = f.tx; f.ptz = f.tz;
      const target = f.held ? UP : REST;
      const sp = f.held ? 15 : 9;
      f.a += Math.sign(target - f.a) * Math.min(Math.abs(target - f.a), sp * h);
      setTip(f);
    }
    if (!ball.inPlay) return;
    ball.vz += G * h;
    const v = Math.hypot(ball.vx, ball.vz);
    if (v > MAXV) { ball.vx *= MAXV / v; ball.vz *= MAXV / v; }
    ball.x += ball.vx * h; ball.z += ball.vz * h;
    for (let i = 0; i < segs.length; i++) collideSeg(segs[i]);
    for (let i = 0; i < circles.length; i++) collideCircle(circles[i]);
    collideFlipper(flippers[0], h); collideFlipper(flippers[1], h);
  }
  function serve() {
    ball.x = 2.78; ball.z = 5.4; ball.vx = 0; ball.vz = 0; ball.inPlay = true; ball.wait = 0.7;
  }
  serve();
  window.__amBall = ball;
  window.__amSim = (sec) => { const log = []; let tt = 0; for (let i = 0; i < sec * 60; i++) { tt += 1 / 60; now = 1000 + tt; simFrame(1 / 60); if (i % 15 === 0) log.push([ball.x.toFixed(2), ball.z.toFixed(2), Math.hypot(ball.vx, ball.vz).toFixed(1), score].join(' ')); } return log; };

  /* attract mode: the machine flips for itself when nobody is playing */
  let aiHoldL = 0, aiHoldR = 0;
  function attract(dt) {
    aiHoldL -= dt; aiHoldR -= dt;
    const near = ball.z > 3.55 && ball.z < 4.75 && ball.vz > -1;
    if (near && ball.x < XC + 0.05 && aiHoldL <= 0 && Math.random() < 0.18) aiHoldL = 0.22;
    if (near && ball.x > XC - 0.05 && aiHoldR <= 0 && Math.random() < 0.18) aiHoldR = 0.22;
    flippers[0].held = aiHoldL > 0; flippers[1].held = aiHoldR > 0;
  }

  /* ---------- framing ---------- */
  let tableScreenX = 0.66, dist = 20, wide = true;
  st.onResize((w, h) => {
    wide = w / h > 1.05;
    camera.fov = wide ? 30 : 34;
    tableScreenX = wide ? 0.68 : 0.5;
    // shift the picture: right of the title on wide screens, up above it on phones
    if (wide) camera.setViewOffset(w, h, -w * (tableScreenX - 0.5), -h * 0.02, w, h);
    else camera.setViewOffset(w, h, 0, h * 0.15, w, h);
    camera.updateProjectionMatrix();
    const vfit = (wide ? 17.5 : 22) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    const hfit = 8.2 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (wide ? camera.aspect * 0.55 : camera.aspect));
    dist = Math.max(vfit, hfit);
  });

  function simFrame(dt, auto = true, t = now) {
    if (auto) attract(dt);

    // the plunger: a ball resting in the lane goes up after a beat
    if (ball.x > 2.55 && ball.z > 4.9 && Math.abs(ball.vz) < 0.5) {
      ball.wait -= dt;
      if (ball.wait <= 0 && (!calm || t < userUntil)) { ball.vz = -(12.6 + Math.random() * 1.6); ball.vx = 0; ball.wait = 0.7; blip(120, 0.2, 'sine', 0.05); }
    }
    const N = 10, h = dt / N;
    for (let i = 0; i < N; i++) step(h);
    // drained, or stuck: serve again
    const sp = Math.hypot(ball.vx, ball.vz);
    ball.still = sp < 0.15 && !(ball.x > 2.55 && ball.z > 4.9) ? ball.still + dt : 0;
    if (ball.z > 6.2 || ball.still > 2.5 || !Number.isFinite(ball.x)) serve();

  }

  /* ---------- frame ---------- */
  const scrollT = scrollProgress(stageEl);
  const camPos = new THREE.Vector3(), look = new THREE.Vector3(), lookNow = new THREE.Vector3(0, 0, -1);
  let first = true, lightT = 0;
  function frame(t, dt) {
    now = t;
    const auto = !calm && t > userUntil;
    simFrame(dt, auto, t);
    // light the bumpers (an idle chase in attract mode)
    lightT += dt;
    for (let i = 0; i < bumpers.length; i++) {
      const b = bumpers[i];
      b.lit = Math.max(0, b.lit - dt * 3);
      const chase = auto ? 0.25 + 0.25 * Math.max(0, Math.sin(lightT * 3 - i * 2.1)) : 0.15;
      b.capMat.emissiveIntensity = chase + b.lit * 2.2;
      b.light.intensity = b.lit * 5;
      b.cap.position.y = 0.3 - b.lit * 0.04;
    }
    for (let i = 0; i < slings.length; i++) { const s = slings[i]; s.lit = Math.max(0, (s.lit || 0) - dt * 4); s.mesh.material.emissiveIntensity = s.lit * 0.8; }
    if (score !== shown && hitCool <= 0) { shown = score; drawGlass(); }
    hitCool -= dt;

    // place things
    ballMesh.position.set(ball.x, R, ball.z);
    ballMesh.rotation.x += ball.vz * dt / R; ballMesh.rotation.z -= ball.vx * dt / R;
    flippers[0].group.rotation.y = -flippers[0].a; flippers[1].group.rotation.y = flippers[1].a;

    // camera: the player's view, rising toward the film's overhead shot as the page scrolls
    const s = scrollT();
    const px = calm ? 0 : pointer.x, py = calm ? 0 : pointer.y;
    const sway = calm ? 0 : Math.sin(t * 0.3) * 0.25;
    const elev = THREE.MathUtils.lerp(0.95, 1.35, s);   // angle above the table plane
    const d = dist * (1 - s * 0.08);
    camPos.set(XC * 0.5 + px * 1.6 + sway, Math.sin(elev) * d - py * 0.8, Math.cos(elev) * d + 1.2);
    look.set(XC * 0.5, -0.5, -0.7);
    if (first || calm) camera.position.copy(camPos); else camera.position.lerp(camPos, 0.06);
    lookNow.lerp(look, first ? 1 : 0.1);
    camera.lookAt(lookNow);

    renderer.render(scene, camera);
    if (first) { first = false; st.reveal(); }
  }
}
