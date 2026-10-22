/* ============================================================
   Taormina Sicily: the opening scene.
   A ruined façade at night (procedural: brick walls with arches and
   niches, columns, a broken cornice, two wings) under a projection-
   mapping shader. Four scenes, as in the show: the scan drawing the
   building's own outline in light, the garden washed over the stone,
   a marble god standing in the central niche, and molten light in the
   cracks. A visitor switches scenes (buttons or keys 1–4) and paints
   light across the stone with the pointer (or a tap).
   ============================================================ */
import { THREE, makeStage, runWhileVisible, pointer, imageTexture, calm } from './cx-kit.js';

const stageEl = document.getElementById('taStage');
const cues = document.getElementById('taCues');
const hint = document.getElementById('taHint');
const S = makeStage(stageEl, { shadows: false, exposure: 1.15 });
if (S && cues) build(S);

function build({ renderer, scene, camera, reveal, onResize }) {
  /* ---------- the projector: a camera in front of the wall ---------- */
  const projector = new THREE.PerspectiveCamera(40, 16 / 9, 1, 60);
  projector.position.set(0, 2.4, 15.5);
  projector.lookAt(0, 2.2, 0);
  projector.updateMatrixWorld();
  const projMat = new THREE.Matrix4().multiplyMatrices(projector.projectionMatrix, projector.matrixWorldInverse);

  const PAINT = 24;
  const paint = Array.from({ length: PAINT }, () => new THREE.Vector4(0, -99, 0, 0));
  const garden = imageTexture('/assets/opt/cfede6c39e69.webp');
  const god = imageTexture('/assets/opt/b1cd695ffa8d.webp');
  const uniforms = {
    uTime: { value: 0 }, uMix: { value: new THREE.Vector4(1, 0, 0, 0) }, uScan: { value: -8 },
    uProj: { value: projMat }, uGarden: { value: garden }, uGod: { value: god }, uGodIn: { value: 0 },
    uPaint: { value: paint },
  };

  const NOISE = `
    float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    vec2 h22(vec2 p){ float n = h21(p); return vec2(n, h21(p + n)); }
    float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y); }
    float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++){ s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
    float cracks(vec2 p){ p += vec2(fbm(p * 1.3), fbm(p * 1.3 + 7.1)) * 0.6;
      vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
      for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){ vec2 g = vec2(x, y); vec2 o = h22(i + g);
        float d = length(g + o - f); if (d < d1){ d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
      return 1.0 - smoothstep(0.0, 0.07, d2 - d1); }`;

  const stoneMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `uniform mat4 uProj; varying vec3 vW; varying vec3 vN; varying vec4 vP;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
        vP = uProj * w; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uTime; uniform vec4 uMix; uniform float uScan; uniform sampler2D uGarden; uniform sampler2D uGod;
      uniform float uGodIn; uniform vec4 uPaint[${PAINT}]; varying vec3 vW; varying vec3 vN; varying vec4 vP;
      ${NOISE}
      void main(){
        vec3 n = normalize(vN);
        float face = clamp(dot(n, normalize(vec3(0.0, 0.15, 1.0))), 0.0, 1.0);
        // the stone: courses of brick, weathered
        vec2 b = vW.xy * vec2(2.6, 7.0) + vec2(vW.z * 2.6, 0.0); b.x += step(1.0, mod(floor(b.y), 2.0)) * 0.5;
        vec2 f = fract(b); float mortar = smoothstep(0.0, 0.07, f.x) * smoothstep(1.0, 0.93, f.x) * smoothstep(0.0, 0.12, f.y) * smoothstep(1.0, 0.88, f.y);
        float wear = fbm(vW.xy * 1.7 + vW.z);
        vec3 stone = mix(vec3(0.20, 0.13, 0.09), vec3(0.50, 0.36, 0.26), wear * 0.8 + h21(floor(b)) * 0.35) * (0.55 + 0.45 * mortar);
        vec3 col = stone * (0.025 + 0.035 * face) + vec3(0.006, 0.008, 0.022);
        vec2 puv = vP.xy / vP.w * 0.5 + 0.5;
        float inP = step(0.0, puv.x) * step(puv.x, 1.0) * step(0.0, puv.y) * step(puv.y, 1.0);
        float lit = (0.35 + 0.65 * face) * inP;
        // I · the scan: a warm wash behind a sweeping band of light
        float band = exp(-pow((vW.x - uScan) * 1.2, 2.0));
        float behind = smoothstep(uScan + 0.4, uScan - 0.4, vW.x);
        float trace = (1.0 - mortar) * (0.5 + 0.5 * h21(floor(b) + floor(uTime * 2.0)));
        col += uMix.x * lit * (stone * 0.18 * behind + vec3(1.0, 0.5, 0.18) * (band * 0.9 + behind * trace * 0.55));
        // II · the garden, projected over the stone
        vec3 g = texture2D(uGarden, puv).rgb;
        col += uMix.y * lit * (g * 1.9 * (0.55 + 0.45 * mortar) + stone * 0.12);
        // III · a marble god in the central niche
        vec2 l = (puv - vec2(0.452, 0.325)) / vec2(0.096, 0.30);
        float inG = step(0.0, l.x) * step(l.x, 1.0) * step(0.0, l.y) * step(l.y, 1.0);
        vec2 guv = vec2(0.5, 0.03) + l * vec2(0.25, 0.94);
        vec3 gd = texture2D(uGod, guv).rgb * inG * smoothstep(0.0, 1.0, uGodIn * 1.6 - (1.0 - l.y) * 0.6);
        col += uMix.z * lit * (stone * vec3(0.12, 0.14, 0.22) + gd * 2.6);
        // IV · molten light in the cracks
        float c = cracks(vW.xy * 0.75 + vW.z * 0.4);
        float heat = 0.65 + 0.35 * sin(uTime * 1.7 + vW.x * 0.8 + vW.y * 1.3);
        col += uMix.w * lit * (vec3(1.0, 0.38, 0.06) * c * heat * 2.6 + stone * vec3(0.5, 0.26, 0.14) * 0.6);
        // light painted by the visitor
        for (int i = 0; i < ${PAINT}; i++){ vec4 p = uPaint[i]; vec3 d = vW - p.xyz;
          col += vec3(1.0, 0.72, 0.38) * exp(-dot(d, d) * 5.0) * p.w * face * 0.9; }
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });

  /* ---------- the façade ---------- */
  const facade = new THREE.Group();
  scene.add(facade);
  const archHole = (cx, y0, w, h) => {
    const p = new THREE.Path(); const r = w / 2;
    p.moveTo(cx - r, y0); p.lineTo(cx + r, y0); p.lineTo(cx + r, y0 + h - r);
    p.absarc(cx, y0 + h - r, r, 0, Math.PI, false); p.lineTo(cx - r, y0);
    return p;
  };
  function wall(width, top, holes, depth) {
    // an outline with a broken, ruined top edge
    const s = new THREE.Shape(); const hw = width / 2;
    s.moveTo(-hw, 0); s.lineTo(hw, 0);
    const steps = 18;
    for (let i = 0; i <= steps; i++) {
      const x = hw - (i / steps) * width;
      s.lineTo(x, top(x));
    }
    s.lineTo(-hw, 0);
    holes.forEach((h) => s.holes.push(archHole(...h)));
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 10 });
    g.translate(0, 0, -depth);
    return new THREE.Mesh(g, stoneMat);
  }
  const ruin = (x) => 4.3 + Math.sin(x * 1.7) * 0.18 + Math.sin(x * 4.3) * 0.1 - (Math.abs(x) > 3.6 ? (Math.abs(x) - 3.6) * 0.9 : 0) + (Math.abs(x) < 0.8 ? 0.35 : 0);
  const main = wall(9.6, ruin, [[0, 0.5, 1.9, 2.9], [-2.75, 0.5, 1.35, 2.15], [2.75, 0.5, 1.35, 2.15], [-1.5, 1.9, 0.5, 0.95], [1.5, 1.9, 0.5, 0.95], [-4.05, 1.1, 0.6, 1.2], [4.05, 1.1, 0.6, 1.2]], 0.9);
  facade.add(main);
  // the central niche: a recessed back wall where the god stands
  const niche = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.6), stoneMat);
  niche.position.set(0, 2.1, -0.75);
  facade.add(niche);
  // the wings, turning back like a courtyard corner
  const wingR = wall(4.2, (x) => 3.6 + Math.sin(x * 2.1) * 0.25 - (x < -1.2 ? 0 : (x + 1.2) * 0.35), [[-0.6, 0.5, 1.1, 1.9], [1.2, 1.4, 0.55, 0.95]], 0.8);
  wingR.position.set(6.35, 0, -1.25); wingR.rotation.y = -0.62;
  facade.add(wingR);
  const wingL = wall(3.4, (x) => 3.1 + Math.sin(x * 2.6) * 0.3 - (x > 0.6 ? 0 : (0.6 - x) * 0.45), [[0.3, 0.5, 1.0, 1.7]], 0.8);
  wingL.position.set(-5.95, 0, -1.0); wingL.rotation.y = 0.6;
  facade.add(wingL);
  // a broken cornice and a plinth of two steps
  const box = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stoneMat); m.position.set(x, y, z); facade.add(m); return m; };
  box(6.4, 0.16, 0.34, -0.3, 3.55, 0.1);
  box(1.6, 0.12, 0.3, 3.4, 3.3, 0.08);
  box(10.4, 0.22, 0.9, 0, 0.11, 0.45);
  box(10.8, 0.14, 1.5, 0, -0.07, 0.75);
  // columns with capitals, standing in front of the side arches
  [-1.75, 1.75, -3.7, 3.7].forEach((x, i) => {
    const h = i < 2 ? 2.85 : 2.3 - (i === 3 ? 0.5 : 0);   // one is broken
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, h, 20), stoneMat);
    col.position.set(x, 0.22 + h / 2, 0.42);
    facade.add(col);
    if (i !== 3) box(0.46, 0.14, 0.46, x, 0.22 + h + 0.07, 0.42);
    box(0.44, 0.12, 0.44, x, 0.28, 0.42);
  });
  // ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), new THREE.MeshBasicMaterial({ color: '#06060a' }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.14;
  scene.add(ground);
  // stars
  const N = 500, sp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) sp.set([(Math.random() - 0.5) * 70, 4 + Math.random() * 26, -20 - Math.random() * 10], i * 3);
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#c9cfff', size: 0.06, transparent: true, opacity: 0.7 })));

  /* ---------- I · the scan: the building's edges, drawn in light ---------- */
  const lineMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uScan; uniform vec4 uMix; uniform float uTime; varying vec3 vW;
      void main(){ float on = smoothstep(uScan + 0.3, uScan - 0.3, vW.x); float tip = exp(-pow((vW.x - uScan) * 2.0, 2.0));
        float a = uMix.x * (on * (0.75 + 0.25 * sin(uTime * 3.0 + vW.y * 4.0)) + tip * 1.5);
        gl_FragColor = vec4(vec3(1.0, 0.62, 0.28) * a * 3.0, 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  facade.updateMatrixWorld(true);
  facade.children.forEach((m) => {
    if (!m.geometry) return;
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 25), lineMat);
    e.position.copy(m.position); e.rotation.copy(m.rotation); e.scale.copy(m.scale);
    e.scale.multiplyScalar(1.002);
    facade.add(e);
  });

  /* ---------- scenes ---------- */
  const want = new THREE.Vector4(1, 0, 0, 0);
  const buttons = [...cues.querySelectorAll('button')];
  let mode = 0, modeAt = 0, lastUser = -100, clockT = 0, ready = false, tick = null;
  function setMode(m, byUser) {
    mode = m; modeAt = clockT;
    want.set(m === 0 ? 1 : 0, m === 1 ? 1 : 0, m === 2 ? 1 : 0, m === 3 ? 1 : 0);
    if (m === 0) uniforms.uScan.value = -8;
    if (m === 2) uniforms.uGodIn.value = 0;
    buttons.forEach((b, i) => b.setAttribute('aria-pressed', i === m ? 'true' : 'false'));
    if (byUser) { lastUser = clockT; done(); }
    if (tick) tick.wake();
  }
  buttons.forEach((b, i) => b.addEventListener('click', () => setMode(i, true)));
  cues.hidden = false;
  addEventListener('keydown', (e) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || !tick || !tick.isInView()) return;
    if (/input|textarea|select/i.test((document.activeElement || {}).tagName || '')) return;
    const n = Number(e.key);
    if (n >= 1 && n <= 4) setMode(n - 1, true);
  });

  /* ---------- painting light ---------- */
  let pi = 0;
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  const solids = facade.children.filter((m) => m.isMesh);
  function dab(e, strength) {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(solids, false)[0];
    if (!hit) return;
    paint[pi].set(hit.point.x, hit.point.y, hit.point.z, strength);
    pi = (pi + 1) % PAINT;
    tick.wake();
  }
  let lastDab = 0;
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || calm) return;
    const now = performance.now(); if (now - lastDab < 40) return; lastDab = now;
    dab(e, 1); done();
  });
  renderer.domElement.addEventListener('pointerdown', (e) => { dab(e, 1.6); done(); });
  let hinted = false;
  function done() { if (!hinted && hint) { hinted = true; hint.classList.add('done'); } }

  /* ---------- framing: the façade above the title ---------- */
  let mobile = false;
  onResize((w, h) => {
    mobile = w < 820;
    const cyp = mobile ? Math.min(h, innerHeight) * 0.33 : h * 0.38;
    camera.setViewOffset(w, h, 0, h / 2 - cyp, w, h);
    camera.fov = mobile ? 42 : 32;
    camera.updateProjectionMatrix();
    camera.setViewOffset(w, h, 0, h / 2 - cyp, w, h);
  });

  /* ---------- the loop ---------- */
  const cam = new THREE.Vector3(), look = new THREE.Vector3(0, 2.0, 0);
  if (calm) { setMode(1, false); uniforms.uMix.value.copy(want); }
  tick = runWhileVisible(stageEl, (t, dt) => {
    clockT = t;
    uniforms.uTime.value = t;
    // the show runs itself until someone takes the controls
    if (!calm && t - modeAt > 7.5 && t - lastUser > 12) setMode((mode + 1) % 4, false);
    uniforms.uMix.value.lerp(want, calm ? 1 : 1 - Math.pow(0.08, dt));
    uniforms.uScan.value = Math.min(9, uniforms.uScan.value + dt * (calm ? 99 : 4.2));
    uniforms.uGodIn.value = Math.min(1, uniforms.uGodIn.value + dt * (calm ? 99 : 0.45));
    for (let i = 0; i < PAINT; i++) paint[i].w = Math.max(0, paint[i].w - dt * 0.35);

    const dist = mobile ? 15.5 : 19;
    const sway = calm ? 0 : Math.sin(t * 0.15) * 0.6;
    cam.set(sway + pointer.x * 2.5, 2.3 - pointer.y * 0.8, dist);
    camera.position.lerp(cam, ready && !calm ? 0.05 : 1);
    camera.lookAt(look);
    renderer.render(scene, camera);
    if (!ready) { ready = true; reveal(); }
  });
}
