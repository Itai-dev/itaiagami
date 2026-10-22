/* ============================================================
   Tidhar: the opening scene. A white massing model of towers around a
   park, on a site plan, with the film's overlay language drawing itself
   on top: dashed setbacks, a sun path and its angle, flow arrows, a
   measured span, highlighted units and circulation.
   Drag sideways (or ← / →) to move the sun; the shadows follow. As the
   page scrolls, the camera moves from the plan down toward the towers'
   elevations, the way the film moves between scales.
   ============================================================ */
import { THREE, makeStage, runWhileVisible, scrollProgress, pointer, canvasTexture, turnToFace, calm } from './cx-kit.js';

document.body.classList.add('cx-on');
turnToFace('.cx-turn');

const stageEl = document.getElementById('tdStage');
const hint = document.getElementById('tdHint');
if (stageEl) { try { build(); } catch (e) { /* the poster stays */ } }

function build() {
  const st = makeStage(stageEl, { exposure: 1.0 });
  if (!st) return;
  const { renderer, scene, camera } = st;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const COL = { blue: '#3f78e0', sun: '#f2b632', orange: '#ee8d2c', park: '#43a96b', ink: '#14302e', green: '#105250' };

  /* ---------- light: a soft sky and the sun, which the visitor moves ---------- */
  scene.add(new THREE.HemisphereLight('#ffffff', '#d9d4c6', 1.55));
  const sunLight = new THREE.DirectionalLight('#fff3dc', 2.4);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  Object.assign(sunLight.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 40 });
  sunLight.shadow.bias = -0.0008;
  scene.add(sunLight, sunLight.target);

  const site = new THREE.Group(); scene.add(site);
  const S = 11;   // board size

  /* ---------- the site plan board ---------- */
  // the park as one figure: an irregular blob
  const parkPts = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r = 2.05 + Math.sin(a * 3 + 0.6) * 0.28 + Math.cos(a * 2) * 0.18;
    parkPts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r * 0.92));
  }
  const parkCurve = new THREE.SplineCurve([...parkPts, parkPts[0]]);
  const parkOutline = parkCurve.getPoints(80);

  const PX = 2048, toPx = (v) => ((v + S / 2) / S) * PX;
  const planTex = canvasTexture(PX, PX, (c) => {
    c.fillStyle = '#f7f6f1'; c.fillRect(0, 0, PX, PX);
    // fine grid
    c.strokeStyle = 'rgba(16,82,80,.08)'; c.lineWidth = 2;
    for (let i = 0; i <= 44; i++) { const p = (i / 44) * PX; c.beginPath(); c.moveTo(p, 0); c.lineTo(p, PX); c.moveTo(0, p); c.lineTo(PX, p); c.stroke(); }
    // streets: a ring road and two crossings
    c.strokeStyle = '#e4e1d8'; c.lineWidth = 46; c.lineCap = 'round';
    c.beginPath(); c.ellipse(toPx(0), toPx(0), toPx(3.05) - toPx(0), toPx(2.85) - toPx(0), 0, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(toPx(-5.5), toPx(4.6)); c.lineTo(toPx(5.5), toPx(4.2)); c.moveTo(toPx(-4.7), toPx(-5.5)); c.lineTo(toPx(-4.4), toPx(5.5)); c.stroke();
    c.strokeStyle = 'rgba(20,48,46,.25)'; c.lineWidth = 2; c.setLineDash([18, 14]);
    c.beginPath(); c.ellipse(toPx(0), toPx(0), toPx(3.05) - toPx(0), toPx(2.85) - toPx(0), 0, 0, Math.PI * 2); c.stroke();
    c.setLineDash([]);
    // the park, filled as a single green shape, with paths through it
    c.beginPath(); parkOutline.forEach((p, i) => (i ? c.lineTo(toPx(p.x), toPx(p.y)) : c.moveTo(toPx(p.x), toPx(p.y))));
    c.closePath(); c.fillStyle = 'rgba(67,169,107,.78)'; c.fill();
    c.lineWidth = 4; c.strokeStyle = '#2f8a53'; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 6; c.setLineDash([16, 12]);
    c.beginPath(); c.moveTo(toPx(-1.9), toPx(0.4)); c.bezierCurveTo(toPx(-0.6), toPx(-0.9), toPx(0.6), toPx(1.1), toPx(1.9), toPx(-0.3)); c.stroke();
    c.beginPath(); c.moveTo(toPx(-0.3), toPx(-1.9)); c.bezierCurveTo(toPx(0.4), toPx(-0.4), toPx(-0.6), toPx(0.6), toPx(0.2), toPx(1.85)); c.stroke();
    c.beginPath(); c.arc(toPx(0.05), toPx(0.1), 70, 0, Math.PI * 2); c.stroke();
    c.setLineDash([]);
    // a scale bar and the sheet's plan label (ticks only, no figures)
    c.fillStyle = COL.ink; c.strokeStyle = COL.ink; c.lineWidth = 3;
    const sx = toPx(-5.0), sy = toPx(5.05);
    for (let i = 0; i < 4; i++) { if (i % 2 === 0) c.fillRect(sx + i * 70, sy, 70, 14); else c.strokeRect(sx + i * 70, sy, 70, 14); }
    c.font = '500 30px "IBM Plex Mono", monospace'; c.fillText('SITE PLAN', sx, sy - 18);
  });
  const board = new THREE.Mesh(new THREE.BoxGeometry(S, 0.24, S), [
    new THREE.MeshStandardMaterial({ color: '#e9e6dd', roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: '#e9e6dd', roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ map: planTex, roughness: 0.92 }), new THREE.MeshStandardMaterial({ color: '#e9e6dd' }),
    new THREE.MeshStandardMaterial({ color: '#e9e6dd', roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: '#e9e6dd', roughness: 0.9 }),
  ]);
  board.position.y = -0.12; board.receiveShadow = true;
  site.add(board);

  /* trees in the park: small faceted canopies */
  const TREES = 70;
  const trees = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.13, 0), new THREE.MeshStandardMaterial({ color: '#5fb57e', roughness: 0.8, flatShading: true }), TREES);
  trees.castShadow = true;
  {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    let n = 0, guard = 0;
    while (n < TREES && guard++ < 2000) {
      const x = (Math.random() - 0.5) * 4.4, z = (Math.random() - 0.5) * 4.2;
      const a = Math.atan2(z / 0.92, x), r = 2.05 + Math.sin(a * 3 + 0.6) * 0.28 + Math.cos(a * 2) * 0.18;
      if (Math.hypot(x, z / 0.92) > r - 0.25) continue;
      if (Math.abs(z - (-0.6 * x)) < 0.25) continue;      // keep paths clear
      const s = 0.7 + Math.random() * 0.8;
      p.set(x, 0.12 * s, z); sc.set(s, s * 1.1, s); q.setFromEuler(new THREE.Euler(0, Math.random() * 3, 0));
      trees.setMatrixAt(n++, m.compose(p, q, sc));
    }
    trees.count = n;
  }
  site.add(trees);

  /* ---------- the towers: white massing, floor lines on the facades ---------- */
  const facade = canvasTexture(128, 256, (c, w, h) => {
    c.fillStyle = '#fbfbf8'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(20,48,46,.09)';
    for (let y = 0; y < h; y += 16) { c.fillRect(0, y, w, 2); c.fillRect(0, y + 6, w, 5); }
    c.fillStyle = 'rgba(255,255,255,.9)'; for (let x = 0; x < w; x += 32) c.fillRect(x, 0, 3, h);
  });
  facade.wrapS = facade.wrapT = THREE.RepeatWrapping;
  const roofMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 });
  const towersDef = [
    // x, z, w, d, h, rotation
    [-3.6, -2.4, 1.0, 1.25, 4.6, 0.5], [-0.6, -3.7, 1.3, 0.95, 3.6, 0.1], [2.6, -3.0, 1.0, 1.2, 5.4, -0.4],
    [3.9, 0.3, 1.1, 1.0, 3.1, 0.15], [2.9, 3.3, 1.25, 1.0, 4.2, 0.6], [-0.2, 3.9, 1.3, 0.9, 2.6, -0.05],
    [-3.3, 2.6, 1.0, 1.25, 3.8, -0.55], [-4.2, -0.2, 0.9, 1.0, 2.4, 0.05],
  ];
  const towers = towersDef.map(([x, z, w, d, h, r]) => {
    const tex = facade.clone(); tex.repeat.set(Math.max(1, Math.round(w * 2)), h / 1.4); tex.needsUpdate = true;
    const side = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, roofMat, roofMat, side, side]);
    m.position.set(x, h / 2, z); m.rotation.y = r; m.castShadow = true; m.receiveShadow = true;
    site.add(m);
    // a rooftop plant box
    const top = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, 0.22, d * 0.4), roofMat); top.position.set(0, h / 2 + 0.11, 0); top.castShadow = true; m.add(top);
    return { m, x, z, w, d, h, r };
  });

  /* ---------- annotation kit: dashed lines as instanced strokes that draw on ---------- */
  const strokeGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
  const up = new THREE.Vector3(0, 1, 0);
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpD = new THREE.Vector3(), tmpP = new THREE.Vector3();
  const annotations = [];
  function dashed(curve, { color, r = 0.028, dash = 0.22, gap = 0.14, solid = false, order = 0, arrow = false }) {
    const L = curve.getLength();
    const step = solid ? dash : dash + gap;
    const n = Math.max(1, Math.floor(L / step));
    const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    const mesh = new THREE.InstancedMesh(strokeGeo, mat, n);
    for (let i = 0; i < n; i++) {
      const u0 = (i * step) / L, u1 = Math.min(1, (i * step + dash) / L);
      curve.getPointAt(u0, tmpA); curve.getPointAt(u1, tmpB);
      tmpD.subVectors(tmpB, tmpA); const len = tmpD.length() || 1e-3;
      tmpQ.setFromUnitVectors(up, tmpD.normalize());
      tmpP.addVectors(tmpA, tmpB).multiplyScalar(0.5);
      tmpS.set(r, len * (solid ? 1.08 : 1), r);
      mesh.setMatrixAt(i, tmpM.compose(tmpP, tmpQ, tmpS));
    }
    mesh.count = 0;
    site.add(mesh);
    let head = null;
    if (arrow) {
      head = new THREE.Mesh(new THREE.ConeGeometry(r * 4.2, r * 11, 12), mat);
      curve.getPointAt(1, tmpA); curve.getTangentAt(1, tmpD);
      head.position.copy(tmpA); head.quaternion.setFromUnitVectors(up, tmpD);
      head.visible = false; site.add(head);
    }
    const a = { mesh, n, order, head, set(p) { mesh.count = Math.round(n * p); if (head) head.visible = p >= 0.999; } };
    annotations.push(a);
    return a;
  }
  const labelMat = (text, color) => {
    const tex = canvasTexture(512, 96, (c, w, h) => {
      c.font = '500 40px "IBM Plex Mono", monospace';
      const tw = c.measureText(text).width;
      c.fillStyle = 'rgba(250,249,245,.92)'; c.fillRect(0, 18, tw + 36, 60);
      c.fillStyle = color; c.fillRect(0, 18, 6, 60);
      c.fillStyle = '#14302e'; c.textBaseline = 'middle'; c.fillText(text, 20, 50);
    });
    return new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, toneMapped: false });
  };
  const labels = [];
  function label(text, color, pos, order) {
    const s = new THREE.Sprite(labelMat(text, color));
    s.center.set(0, 0.5); s.position.copy(pos); s.scale.set(3.3, 0.62, 1); s.renderOrder = 10;
    s.material.opacity = 0; site.add(s);
    labels.push({ s, order });
    return s;
  }
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const path = (pts, closed = false) => new THREE.CatmullRomCurve3(pts, closed, 'catmullrom', 0.1);
  const line = (a, b) => new THREE.LineCurve3(a, b);

  // 1 · dashed setbacks round the plot
  const sb = 4.85, y0 = 0.02;
  dashed(path([V(-sb, y0, -sb), V(sb, y0, -sb), V(sb, y0, sb), V(-sb, y0, sb)], true), { color: COL.blue, order: 0 });
  label('SETBACK', COL.blue, V(-sb + 0.1, 0.25, -sb - 0.05), 0);
  // 2 · flow arrows round the park
  dashed(path([V(-2.6, 0.06, 1.3), V(-2.75, 0.06, -0.6), V(-1.7, 0.06, -2.35), V(0.2, 0.06, -2.75)]), { color: COL.blue, r: 0.035, dash: 0.3, gap: 0.12, order: 1, arrow: true });
  dashed(path([V(2.55, 0.06, -1.0), V(2.75, 0.06, 0.9), V(1.7, 0.06, 2.4), V(-0.3, 0.06, 2.78)]), { color: COL.blue, r: 0.035, dash: 0.3, gap: 0.12, order: 1.2, arrow: true });
  label('FLOW', COL.blue, V(2.9, 0.4, 1.0), 1);
  label('PARK', COL.park, V(-0.6, 0.35, -0.5), 1.1);
  // 3 · a measured span between two towers, with end ticks
  const ta = towers[3], tb = towers[4];
  const spanY = 3.25;
  const sa = V(ta.x - 0.2, spanY, ta.z + 0.45), sbp = V(tb.x + 0.1, spanY, tb.z - 0.45);
  dashed(line(sa, sbp), { color: COL.orange, solid: true, dash: 0.2, r: 0.024, order: 2 });
  dashed(line(V(sa.x, spanY - 0.22, sa.z), V(sa.x, spanY + 0.22, sa.z)), { color: COL.orange, solid: true, dash: 0.1, r: 0.024, order: 2 });
  dashed(line(V(sbp.x, spanY - 0.22, sbp.z), V(sbp.x, spanY + 0.22, sbp.z)), { color: COL.orange, solid: true, dash: 0.1, r: 0.024, order: 2 });
  label('SPAN', COL.orange, V((sa.x + sbp.x) / 2 + 0.15, spanY + 0.2, (sa.z + sbp.z) / 2), 2);
  // 4 · highlighted volumes: units in one tower, circulation in another
  const vol = (t, w, h, y, d, color, opacity) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    m.position.set(0, y - t.h / 2, 0); t.m.add(m);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, toneMapped: false }));
    m.add(e); return { m, e, opacity };
  };
  const units = vol(towers[2], 0.45, 2.4, 3.4, towers[2].d + 0.04, COL.blue, 0.38);
  const core = vol(towers[0], 0.24, towers[0].h + 0.02, towers[0].h / 2, towers[0].d + 0.04, COL.sun, 0.5);
  label('UNITS', COL.blue, V(towers[2].x + 0.6, 4.4, towers[2].z), 3);
  label('CIRCULATION', COL.sun, V(towers[0].x - 0.2, towers[0].h + 0.5, towers[0].z), 3.2);

  // 5 · the sun path: a dashed arc over the site, the sun on it, a ray to the tallest roof
  const ARC_R = 7.2;
  const sunAt = (u, out) => out.set(-Math.cos(u * Math.PI) * ARC_R, 1.2 + Math.sin(u * Math.PI) * 5.8, -2.2 - Math.sin(u * Math.PI) * 1.6);
  {
    const pts = []; for (let i = 0; i <= 40; i++) pts.push(sunAt(0.08 + (i / 40) * 0.84, new THREE.Vector3()));
    dashed(new THREE.CatmullRomCurve3(pts), { color: COL.sun, r: 0.03, dash: 0.24, gap: 0.2, order: 4 });
  }
  const sunBall = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 16), new THREE.MeshBasicMaterial({ color: COL.sun, toneMapped: false }));
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.4, 40), new THREE.MeshBasicMaterial({ color: COL.sun, transparent: true, opacity: 0.8, side: THREE.DoubleSide, toneMapped: false }));
  sunBall.add(halo); site.add(sunBall);
  const sunLabel = label('SUN ANGLE', COL.sun, V(0, 0, 0), 4);
  // the ray, restroked each frame as the sun moves (a fixed pool of dashes)
  const RAY = 26;
  const ray = new THREE.InstancedMesh(strokeGeo, new THREE.MeshBasicMaterial({ color: COL.sun, toneMapped: false }), RAY);
  ray.count = 0; site.add(ray);
  const rayTarget = V(towers[2].x, towers[2].h + 0.02, towers[2].z);
  // the angle arc at the roof
  const ANG = 14;
  const angleArc = new THREE.InstancedMesh(strokeGeo, ray.material, ANG); angleArc.count = 0; site.add(angleArc);

  /* ---------- interaction: drag or arrow keys move the sun ---------- */
  let sunU = 0.3, sunV = 0, dragging = null, userUntil = 0, now = 0, hinted = false;
  const cv = renderer.domElement;
  const touched = () => { userUntil = now + 6; if (!hinted && hint) { hinted = true; hint.classList.add('done'); } run.wake(); };
  cv.addEventListener('pointerdown', (e) => { dragging = { x: e.clientX, id: e.pointerId }; });
  cv.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== dragging.id) return;
    const dx = e.clientX - dragging.x; dragging.x = e.clientX;
    sunU = Math.min(0.92, Math.max(0.08, sunU + dx / Math.max(320, cv.clientWidth * 0.8)));
    touched();
  });
  const end = (e) => { if (dragging && e.pointerId === dragging.id) dragging = null; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || !run.isInView()) return;
    if (/input|textarea|select/i.test((document.activeElement || {}).tagName || '')) return;
    if (e.key === 'ArrowLeft') { sunV = -0.5; touched(); } else if (e.key === 'ArrowRight') { sunV = 0.5; touched(); }
  });
  addEventListener('keyup', (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') sunV = 0; });

  /* ---------- framing ---------- */
  let wide = true, dist = 18;
  st.onResize((w, h) => {
    wide = w / h > 1.05;
    camera.fov = 30;
    // wide: the model sits left of the title block; phones: above it
    if (wide) camera.setViewOffset(w, h, w * 0.1, -h * 0.03, w, h);
    else camera.setViewOffset(w, h, 0, h * 0.2, w, h);
    camera.updateProjectionMatrix();
    const span = wide ? 21 : 14.5;
    dist = Math.max(span / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect), (wide ? 15 : 20) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))));
  });

  /* ---------- frame ---------- */
  const scrollT = scrollProgress(stageEl);
  const run = runWhileVisible(stageEl, frame);
  const sunPos = new THREE.Vector3(), camPos = new THREE.Vector3(), look = new THREE.Vector3();
  let first = true, drawT = calm ? 99 : 0, az = 0;
  function frame(t, dt) {
    now = t;
    // the drawing draws itself on, one layer after another
    drawT += dt;
    for (let i = 0; i < annotations.length; i++) {
      const a = annotations[i];
      a.set(Math.min(1, Math.max(0, (drawT - 0.6 - a.order * 0.55) / 1.1)));
    }
    for (let i = 0; i < labels.length; i++) {
      const l = labels[i];
      l.s.material.opacity = Math.min(1, Math.max(0, (drawT - 1.4 - l.order * 0.55) / 0.5));
    }
    const vt = Math.min(1, Math.max(0, (drawT - 2.4) / 0.8));
    units.m.material.opacity = units.opacity * vt; units.e.material.opacity = vt;
    core.m.material.opacity = core.opacity * vt; core.e.material.opacity = vt;

    // the sun: drifts across the day when nobody is steering it
    if (sunV) sunU = Math.min(0.92, Math.max(0.08, sunU + sunV * dt));
    else if (!calm && t > userUntil && !dragging) sunU = 0.5 + Math.sin(t * 0.12 + 0.2) * 0.36;
    sunAt(sunU, sunPos);
    sunBall.position.copy(sunPos);
    sunLight.position.copy(sunPos).multiplyScalar(2);
    sunLight.intensity = 1.2 + Math.sin(sunU * Math.PI) * 1.6;
    sunLabel.position.set(sunPos.x + 0.45, sunPos.y + 0.1, sunPos.z);
    halo.lookAt(camera.position);
    // the ray from the sun to the roof, dashed
    const rayP = Math.min(1, Math.max(0, (drawT - 3.0) / 0.8));
    const rn = Math.round(RAY * rayP);
    for (let i = 0; i < rn; i++) {
      const u0 = i / RAY, u1 = (i + 0.55) / RAY;
      tmpA.lerpVectors(sunPos, rayTarget, u0); tmpB.lerpVectors(sunPos, rayTarget, u1);
      tmpD.subVectors(tmpB, tmpA); const len = tmpD.length();
      tmpQ.setFromUnitVectors(up, tmpD.normalize()); tmpP.addVectors(tmpA, tmpB).multiplyScalar(0.5); tmpS.set(0.022, len, 0.022);
      ray.setMatrixAt(i, tmpM.compose(tmpP, tmpQ, tmpS));
    }
    ray.count = rn; ray.instanceMatrix.needsUpdate = true;
    // a small arc at the roof between the horizontal and the ray
    tmpD.subVectors(sunPos, rayTarget); const flat = Math.hypot(tmpD.x, tmpD.z), elev = Math.atan2(tmpD.y, flat), hd = Math.atan2(tmpD.z, tmpD.x);
    const an = rayP >= 1 ? ANG : 0;
    for (let i = 0; i < an; i++) {
      const e0 = (i / ANG) * elev, e1 = ((i + 0.6) / ANG) * elev, R = 0.7;
      tmpA.set(rayTarget.x + Math.cos(hd) * Math.cos(e0) * R, rayTarget.y + Math.sin(e0) * R, rayTarget.z + Math.sin(hd) * Math.cos(e0) * R);
      tmpB.set(rayTarget.x + Math.cos(hd) * Math.cos(e1) * R, rayTarget.y + Math.sin(e1) * R, rayTarget.z + Math.sin(hd) * Math.cos(e1) * R);
      tmpD.subVectors(tmpB, tmpA); const len = tmpD.length() || 1e-3;
      tmpQ.setFromUnitVectors(up, tmpD.normalize()); tmpP.addVectors(tmpA, tmpB).multiplyScalar(0.5); tmpS.set(0.02, len, 0.02);
      angleArc.setMatrixAt(i, tmpM.compose(tmpP, tmpQ, tmpS));
    }
    angleArc.count = an; angleArc.instanceMatrix.needsUpdate = true;

    // camera: from the plan (high) down toward the elevations as the page scrolls
    const s = scrollT();
    const elevC = THREE.MathUtils.lerp(0.98, 0.42, Math.min(1, s * 1.4));
    az += calm ? 0 : dt * 0.02;
    const azim = 0.62 + (calm ? 0 : Math.sin(az) * 0.12) + pointer.x * 0.25;
    const d = dist * (1 - s * 0.22);
    camPos.set(Math.sin(azim) * Math.cos(elevC) * d, Math.sin(elevC) * d - pointer.y * 0.8, Math.cos(azim) * Math.cos(elevC) * d);
    if (first || calm) camera.position.copy(camPos); else camera.position.lerp(camPos, 0.08);
    look.set(0, 1.0 + s * 0.6, 0);
    camera.lookAt(look);

    renderer.render(scene, camera);
    if (first) { first = false; st.reveal(); }
  }
}
