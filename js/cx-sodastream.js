/* ============================================================
   SodaStream: the opening scene. The desert has come indoors: a piece
   of the spot's daylit kitchen set (white counter, oak front, the
   brand's blue shelving) stands in the dunes, and a camel stands beside
   it, chewing, unbothered. The machine on the counter is the only thing
   being demonstrated: tap it (or press P) to push the lever, and the
   bottle fizzes. Nobody reacts.
   ============================================================ */
import { THREE, makeStage, runWhileVisible, scrollProgress, pointer, roundedBox, canvasTexture, turnToFace, calm } from './cx-kit.js';

document.body.classList.add('cx-on');
turnToFace('.cx-turn');
preroll();

const stageEl = document.getElementById('ssStage');
const hint = document.getElementById('ssHint');
if (stageEl) { try { build(); } catch (e) { /* the poster stays */ } }

function build() {
  const st = makeStage(stageEl, { exposure: 1.0 });
  if (!st) return;
  const { renderer, scene, camera } = st;
  const HORIZON = new THREE.Color('#f5e2c6');
  scene.fog = new THREE.Fog(HORIZON, 16, 52);

  /* ---------- light: high desert sun, warm sky ---------- */
  scene.add(new THREE.HemisphereLight('#fff4e2', '#d9a066', 1.5));
  const sun = new THREE.DirectionalLight('#fff1da', 2.6);
  sun.position.set(-5, 9, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -3, near: 1, far: 30 });
  sun.shadow.bias = -0.0006;
  sun.shadow.radius = 3;
  scene.add(sun);

  /* ---------- dunes, flattening into a floor where the set stands ---------- */
  {
    const g = new THREE.PlaneGeometry(90, 90, 150, 150);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, col = new Float32Array(p.count * 3);
    const sand = new THREE.Color('#e3b077'), crest = new THREE.Color('#f3cf9d'), low = new THREE.Color('#c88d55'), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const r = Math.hypot(x * 0.8, z + 1);
      const f = THREE.MathUtils.smoothstep(r, 3.2, 10);
      const ridge = 1 - Math.abs(Math.sin(x * 0.16 + z * 0.07 + Math.sin(z * 0.11) * 1.4));
      const h = (Math.pow(ridge, 2.2) * 2.6 + Math.sin(x * 0.05 - z * 0.09) * 1.2 + Math.sin(z * 0.21 + 1.3) * 0.4) * f;
      p.setY(i, h - 0.02);
      const t = Math.min(1, Math.max(0, h / 3));
      c.copy(low).lerp(sand, Math.min(1, t * 2)).lerp(crest, Math.max(0, t * 2 - 1) * 0.8 + ridge * ridge * 0.25 * f);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    const dunes = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
    dunes.receiveShadow = true;
    scene.add(dunes);
  }

  /* ---------- the set: counter, oak front, blue shelving ---------- */
  const set = new THREE.Group(); scene.add(set);
  const white = new THREE.MeshStandardMaterial({ color: '#f6f5f1', roughness: 0.35 });
  const oakTex = canvasTexture(512, 256, (cx, w, h) => {
    cx.fillStyle = '#dcbb8e'; cx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) { cx.fillStyle = 'rgba(120,80,40,.16)'; cx.fillRect(x, 0, 2, h); cx.fillStyle = 'rgba(255,255,255,.12)'; cx.fillRect(x + 3, 0, 3, h); }
  });
  const oak = new THREE.MeshStandardMaterial({ map: oakTex, roughness: 0.6 });
  const CX = 0.55;
  const counterTop = new THREE.Mesh(roundedBox(3.5, 0.09, 0.86, 0.06), white);
  counterTop.position.set(CX, 0.86, 0); counterTop.castShadow = counterTop.receiveShadow = true;
  const counterBody = new THREE.Mesh(new THREE.BoxGeometry(3.36, 0.86, 0.74), [oak, oak, white, white, oak, oak]);
  counterBody.position.set(CX, 0.43, -0.02); counterBody.castShadow = counterBody.receiveShadow = true;
  set.add(counterTop, counterBody);
  const blue = new THREE.MeshStandardMaterial({ color: '#4fb3df', roughness: 0.55 });
  const wall = new THREE.Mesh(roundedBox(2.5, 2.45, 0.14, 0.05), blue);
  wall.position.set(CX + 0.55, 0, -0.62); wall.castShadow = wall.receiveShadow = true;
  set.add(wall);
  const shelfObjs = [];
  [1.55, 2.05].forEach((y, k) => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.04, 0.26), white);
    shelf.position.set(CX + 0.55, y, -0.45); shelf.castShadow = true; set.add(shelf);
    for (let i = 0; i < 4; i++) {
      const tall = (i + k) % 2 === 0;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(tall ? 0.06 : 0.07, tall ? 0.06 : 0.06, tall ? 0.34 : 0.16, 18), tall ? new THREE.MeshStandardMaterial({ color: k ? '#1c2226' : '#ffffff', roughness: 0.4 }) : new THREE.MeshStandardMaterial({ color: '#cfeaf6', roughness: 0.15, transparent: true, opacity: 0.7 }));
      m.position.set(CX - 0.35 + i * 0.5, y + (tall ? 0.19 : 0.1), -0.45); m.castShadow = true; set.add(m); shelfObjs.push(m);
    }
  });

  /* ---------- the machine ---------- */
  const machine = new THREE.Group();
  machine.position.set(CX + 0.75, 0.905, 0.02);
  set.add(machine);
  const black = new THREE.MeshStandardMaterial({ color: '#1b1f23', roughness: 0.42, metalness: 0.15 });
  const chrome = new THREE.MeshStandardMaterial({ color: '#d7dade', roughness: 0.22, metalness: 0.85 });
  const base = new THREE.Mesh(roundedBox(0.6, 0.045, 0.5, 0.08), chrome); machine.add(base);
  const column = new THREE.Mesh(roundedBox(0.46, 1.22, 0.3, 0.1), black); column.position.set(0, 0.03, -0.11); column.castShadow = true; machine.add(column);
  const head = new THREE.Mesh(roundedBox(0.46, 0.26, 0.44, 0.1), black); head.position.set(0, 0.98, 0.02); head.castShadow = true; machine.add(head);
  const trim = new THREE.Mesh(roundedBox(0.47, 0.02, 0.45, 0.1), chrome); trim.position.set(0, 0.97, 0.02); machine.add(trim);
  // the lever: hinged at the back of the head, it rises toward the front
  const leverPivot = new THREE.Group(); leverPivot.position.set(0, 1.25, -0.16); machine.add(leverPivot);
  const lever = new THREE.Mesh(roundedBox(0.15, 0.06, 0.5, 0.05), black); lever.position.set(0, 0, 0.24); lever.castShadow = true; leverPivot.add(lever);
  const leverCap = new THREE.Mesh(roundedBox(0.16, 0.025, 0.12, 0.04), chrome); leverCap.position.set(0, 0.04, 0.42); leverPivot.add(leverCap);
  // the bottle and the water in it
  const bottle = new THREE.Group(); bottle.position.set(0, 0.05, 0.1); machine.add(bottle);
  const glassMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false });
  const bottleBody = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.8, 32, 1, true), glassMat); bottleBody.position.y = 0.4; bottle.add(bottleBody);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.64, 32), new THREE.MeshStandardMaterial({ color: '#bfe6f6', roughness: 0.1, transparent: true, opacity: 0.55, depthWrite: false }));
  water.position.y = 0.33; bottle.add(water);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 24), black); cap.position.y = 0.84; bottle.add(cap);

  // a glass of it beside the machine, strawberries and ice
  const glass = new THREE.Group(); glass.position.set(CX - 0.15, 0.905, 0.12); set.add(glass);
  glass.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.3, 28, 1, true), glassMat), { position: new THREE.Vector3(0, 0.15, 0) }));
  const gw = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.095, 0.22, 28), water.material); gw.position.y = 0.115; glass.add(gw);
  const berry = new THREE.MeshStandardMaterial({ color: '#e0283c', roughness: 0.5 });
  [[-0.03, 0.12, 0.02, 0.4], [0.04, 0.17, -0.03, -0.6]].forEach(([x, y, z, r]) => { const b = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.08, 10), berry); b.position.set(x, y, z); b.rotation.z = r; glass.add(b); });
  const ice = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, roughness: 0.1 });
  [[0.02, 0.2, 0.03], [-0.04, 0.21, -0.03]].forEach(([x, y, z]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), ice); b.position.set(x, y, z); b.rotation.set(0.4, 0.7, 0); glass.add(b); });

  /* bubbles: in the bottle (they surge on a push) and a few in the glass */
  const BUB = 110;
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.1, transparent: true, opacity: 0.85, depthWrite: false }), BUB);
  bubbles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  set.add(bubbles);
  const bub = Array.from({ length: BUB }, (_, i) => ({ glass: i >= 90, x: 0, y: -1, z: 0, v: 0, s: 0, live: false }));
  const dummy = new THREE.Object3D();
  const bottleOrigin = new THREE.Vector3(machine.position.x, machine.position.y + 0.05, machine.position.z + 0.1);
  const glassOrigin = glass.position.clone();
  function spawn(b) {
    const o = b.glass ? glassOrigin : bottleOrigin, R = b.glass ? 0.08 : 0.095;
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * R;
    b.x = o.x + Math.cos(a) * r; b.z = o.z + Math.sin(a) * r; b.y = o.y + 0.02 + Math.random() * 0.05;
    b.v = 0.25 + Math.random() * 0.5; b.s = 0.006 + Math.random() * 0.012; b.live = true;
  }

  /* ---------- the camel: a stylised figure, standing, chewing, unbothered ---------- */
  const camel = new THREE.Group();
  const hide = new THREE.MeshStandardMaterial({ color: '#c99257', roughness: 0.85 });
  const hideD = new THREE.MeshStandardMaterial({ color: '#a8743f', roughness: 0.9 });
  const ball = new THREE.SphereGeometry(1, 28, 18);
  const blob = (sx, sy, sz, x, y, z, m = hide) => { const o = new THREE.Mesh(ball, m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); o.castShadow = true; return o; };
  camel.add(blob(0.82, 0.44, 0.38, 0, 1.55, 0));            // body
  camel.add(blob(0.4, 0.42, 0.3, -0.08, 1.86, 0));          // hump
  camel.add(blob(0.3, 0.32, 0.3, 0.62, 1.52, 0));           // chest
  camel.add(blob(0.32, 0.3, 0.3, -0.62, 1.55, 0));          // haunch
  const neckCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.66, 1.55, 0), new THREE.Vector3(1.05, 1.5, 0), new THREE.Vector3(1.28, 1.85, 0), new THREE.Vector3(1.36, 2.28, 0)]);
  const neck = new THREE.Mesh(new THREE.TubeGeometry(neckCurve, 24, 0.13, 12), hide); neck.castShadow = true; camel.add(neck);
  const headG = new THREE.Group(); headG.position.set(1.38, 2.32, 0); camel.add(headG);
  headG.add(blob(0.22, 0.15, 0.14, 0.12, 0.02, 0));
  headG.add(blob(0.15, 0.11, 0.115, 0.32, -0.02, 0));        // muzzle
  const jaw = new THREE.Group(); jaw.position.set(0.18, -0.06, 0); headG.add(jaw);
  jaw.add(blob(0.15, 0.05, 0.09, 0.12, -0.03, 0, hideD));
  const eyes = [];
  for (const s of [-1, 1]) {
    const eye = blob(0.03, 0.03, 0.02, 0.2, 0.07, s * 0.12, new THREE.MeshStandardMaterial({ color: '#2a1d14', roughness: 0.3 })); headG.add(eye); eyes.push(eye);
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 8), hideD); ear.position.set(0.0, 0.15, s * 0.08); ear.rotation.x = s * 0.35; headG.add(ear);
  }
  const leg = (x, z, bend) => {
    const g = new THREE.Group(); g.position.set(x, 1.32, z);
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.5, 4, 10), hide); up.position.y = -0.3; up.castShadow = true; g.add(up);
    const knee = new THREE.Group(); knee.position.set(0, -0.62, 0); knee.rotation.z = bend; g.add(knee);
    const low = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.52, 4, 10), hide); low.position.y = -0.32; low.castShadow = true; knee.add(low);
    knee.add(blob(0.11, 0.04, 0.09, 0.03, -0.66, 0, hideD));
    camel.add(g); return g;
  };
  leg(0.55, 0.16, 0); leg(0.55, -0.16, 0); leg(-0.58, 0.17, 0.12); leg(-0.58, -0.17, 0.12);
  const tail = new THREE.Group(); tail.position.set(-0.85, 1.62, 0); camel.add(tail);
  const tailM = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.36, 4, 8), hideD); tailM.position.y = -0.2; tail.add(tailM);
  camel.position.set(-1.75, 0, -0.35);
  camel.rotation.y = 0.32;
  scene.add(camel);

  /* ---------- sound: the push, then the fizz ---------- */
  let audio = null, noise = null;
  function fizzSound() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      if (!noise) {
        noise = audio.createBuffer(1, audio.sampleRate * 1.2, audio.sampleRate);
        const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      const t = audio.currentTime;
      const src = audio.createBufferSource(); src.buffer = noise;
      const hp = audio.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2400;
      const g = audio.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      src.connect(hp); hp.connect(g); g.connect(audio.destination); src.start(t); src.stop(t + 1.15);
      const o = audio.createOscillator(), og = audio.createGain();   // the lever's low thunk
      o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.12);
      og.gain.setValueAtTime(0.12, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      o.connect(og); og.connect(audio.destination); o.start(t); o.stop(t + 0.16);
    } catch (e) { /* no audio */ }
  }

  /* ---------- the push ---------- */
  let now = 0, pushAt = -9, fizz = 0.12, blinkAt = 3, hinted = false;
  function push(audible) {
    pushAt = now; fizz = Math.min(1.6, fizz + 1);
    if (audible) fizzSound();
    blinkAt = now + 0.9;                      // the camel's entire response: a blink, a beat later
    if (audible && !hinted && hint) { hinted = true; hint.classList.add('done'); }
    run.wake();
  }
  renderer.domElement.addEventListener('click', () => push(true));
  addEventListener('keydown', (e) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || !run.isInView()) return;
    const a = document.activeElement;
    if (/input|textarea|select/i.test((a || {}).tagName || '')) return;
    if (e.key.toLowerCase() === 'p' || (e.key === 'Enter' && (!a || a === document.body))) push(true);
  });

  /* ---------- framing ---------- */
  let wide = true, dist = 9;
  st.onResize((w, h) => {
    wide = w / h > 1.05;
    camera.fov = wide ? 30 : 36;
    camera.setViewOffset(w, h, 0, -h * (wide ? 0.2 : 0.17), w, h);   // the scene sits low, under the title
    camera.updateProjectionMatrix();
    const fitW = (wide ? 9.5 : 5.6) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    dist = Math.max(fitW, wide ? 9 : 7);
  });

  /* ---------- frame ---------- */
  const scrollT = scrollProgress(stageEl);
  const run = runWhileVisible(stageEl, frame);
  const camPos = new THREE.Vector3(), look = new THREE.Vector3();
  let first = true;
  function frame(t, dt) {
    now = t;
    const idle = calm ? 0 : 1;
    // lever: down fast, a short hold, back up
    const pt = t - pushAt;
    const down = pt < 0.18 ? pt / 0.18 : pt < 0.55 ? 1 : pt < 1.0 ? 1 - (pt - 0.55) / 0.45 : 0;
    leverPivot.rotation.x = -0.42 + down * 0.4;
    bottle.position.x = down > 0 && pt < 0.8 ? Math.sin(t * 70) * 0.004 : 0;
    // bubbles
    fizz += (0.12 - fizz) * Math.min(1, dt * 0.7);
    const top = bottleOrigin.y + 0.62, gtop = glassOrigin.y + 0.21;
    for (let i = 0; i < BUB; i++) {
      const b = bub[i];
      const rate = b.glass ? 0.6 : fizz;
      if (!b.live) { if (Math.random() < rate * dt * (b.glass ? 2 : 6)) spawn(b); else { dummy.scale.setScalar(0); dummy.updateMatrix(); bubbles.setMatrixAt(i, dummy.matrix); continue; } }
      b.y += b.v * dt * (b.glass ? 0.6 : 0.8 + fizz);
      b.x += Math.sin(t * 9 + i) * 0.0006;
      if (b.y > (b.glass ? gtop : top)) { b.live = false; }
      dummy.position.set(b.x + (b.glass ? 0 : bottle.position.x), b.y, b.z);
      dummy.scale.setScalar(b.live ? b.s * (b.glass ? 0.8 : 1 + fizz * 0.4) : 0);
      dummy.updateMatrix(); bubbles.setMatrixAt(i, dummy.matrix);
    }
    bubbles.instanceMatrix.needsUpdate = true;

    // the camel: chews, breathes, flicks its tail, blinks; otherwise ignores everything
    jaw.rotation.z = -0.08 - (Math.sin(t * 5.2) * 0.5 + 0.5) * 0.14 * idle;
    jaw.rotation.y = Math.sin(t * 2.6) * 0.08 * idle;
    headG.rotation.z = -0.12 + Math.sin(t * 0.7) * 0.03 * idle;
    headG.rotation.y = 0.25 + Math.sin(t * 0.31) * 0.06 * idle;
    camel.position.y = Math.sin(t * 1.1) * 0.006 * idle;
    tail.rotation.x = Math.sin(t * 1.7) * 0.25 * idle;
    if (!calm && t > blinkAt + 0.16) blinkAt = t + 2.5 + Math.random() * 3;
    const blink = t > blinkAt && t < blinkAt + 0.16 ? 0.15 : 1;
    eyes[0].scale.y = eyes[1].scale.y = 0.03 * blink;

    // camera: a slow drift, the pointer, and a dolly toward the machine as the page scrolls
    const s = scrollT();
    const d = dist * (1 - s * 0.35);
    const sway = Math.sin(t * 0.2) * 0.25 * idle;
    camPos.set(1.4 + sway + pointer.x * 1.2 + s * 0.6, 2.0 + d * 0.12 - pointer.y * 0.4 - s * 0.6, d);
    if (first || calm) camera.position.copy(camPos); else camera.position.lerp(camPos, 0.06);
    look.set(-0.15 + s * 1.2, 1.15 - s * 0.1, -0.2);
    camera.lookAt(look);

    renderer.render(scene, camera);
    if (first) { first = false; st.reveal(); if (!calm) setTimeout(() => push(false), 1400); }
  }
}

/* the pre-roll bar under the challenge fills as it crosses the screen */
function preroll() {
  const bar = document.getElementById('ssRoll');
  if (!bar || calm) return;
  const sec = bar.closest('section');
  let ticking = false;
  const paint = () => {
    ticking = false;
    const r = sec.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + r.height)));
    bar.style.setProperty('--p', (0.05 + p * 0.95).toFixed(3));
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
  paint();
}
