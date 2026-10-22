/* ============================================================
   Mako 12+: the opening scene.
   The "+" of 12+, four rounded arms in the end card's colours, cast in
   clear glass with a coloured light inside each arm. A beam of white
   light comes in from wherever the pointer is and leaves the other side
   split into a spectrum, the prism band that runs through the campaign.
   Tap to turn the "+" a quarter; scroll and it rises into the sky until
   it is one more star, as in the film's first shot.

   Progressive enhancement: the poster stays without WebGL. Reduced
   motion: no drift or sweep; a tap still turns the "+".
   ============================================================ */
import { THREE, makeStage, runWhileVisible, turnToFace, scrollProgress, pointer, canvasTexture, calm } from './cx-kit.js';

const stageEl = document.getElementById('mkStage');
const hint = document.getElementById('mkHint');

turnToFace('.mk-screen, .mk-idea', { threshold: 0.2 });
streak();
if (stageEl) start();

/* ---------- the band of light that crosses the catalogue as it scrolls ---------- */
function streak() {
  const reel = document.getElementById('mkReel');
  const band = reel && reel.querySelector('.mk-streak');
  if (!band || calm) return;
  let queued = false;
  const update = () => {
    queued = false;
    const r = reel.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + r.height)));
    band.style.setProperty('--x', p.toFixed(4));
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();
}

function start() {
  const stage = makeStage(stageEl, { shadows: false, exposure: 1.0, alpha: false });
  if (!stage) return;
  const { renderer, scene, camera } = stage;
  renderer.setClearColor('#0b0716', 1);
  renderer.toneMapping = THREE.NeutralToneMapping;
  if ('transmissionResolutionScale' in renderer) renderer.transmissionResolutionScale = 0.5;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));   // the glass is costly: keep the canvas lighter
  camera.fov = 30; camera.near = 0.5; camera.far = 60; camera.updateProjectionMatrix();
  const CAMZ = 15;
  camera.position.set(0, 0, CAMZ);

  /* ---------- an environment to give the glass something to reflect ---------- */
  {
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: '#120c26', side: THREE.BackSide })));
    const panel = (c, w, h, x, y, z, s = 1) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(s), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
    };
    panel('#ffffff', 10, 3, -4, 9, 6, 3);      // a soft box overhead
    panel('#ffffff', 3, 8, 10, 1, 4, 1.4);     // a strip to the right
    panel('#ff4a3d', 6, 1.2, -9, -3, -4, 2);
    panel('#ffb21f', 1.2, 6, 9, -4, -6, 2);
    panel('#16d391', 6, 1.2, 4, -9, 3, 2);
    panel('#6b5cff', 1.2, 6, -10, 3, -2, 2);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.04).texture;
    pm.dispose();
  }

  /* ---------- the night: a deep violet sky, a low glow on the horizon, stars ---------- */
  const skyTex = canvasTexture(512, 512, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#07040f'); g.addColorStop(0.55, '#110a24'); g.addColorStop(0.86, '#22163f'); g.addColorStop(1, '#2d1d4d');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const glowAt = (x, y, r, col) => { const rg = c.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = rg; c.fillRect(0, 0, w, h); };
    glowAt(w * 0.72, h * 1.05, w * 0.6, 'rgba(120,80,200,.35)');
    glowAt(w * 0.2, h * 0.2, w * 0.4, 'rgba(60,40,140,.18)');
  });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: skyTex, toneMapped: false, depthWrite: false }));
  sky.position.z = -14;
  scene.add(sky);

  const STARS = 520;
  const starPos = new Float32Array(STARS * 3), starSeed = new Float32Array(STARS);
  for (let i = 0; i < STARS; i++) {
    starPos[i * 3] = (Math.random() - 0.5) * 60; starPos[i * 3 + 1] = (Math.random() - 0.3) * 30; starPos[i * 3 + 2] = -12 - Math.random() * 1.5;
    starSeed[i] = Math.random();
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('seed', new THREE.BufferAttribute(starSeed, 1));
  const starMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uScale: { value: 1 } },
    vertexShader: `attribute float seed; uniform float uTime; uniform float uScale; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0);
        vA = (0.35 + 0.65 * seed) * (0.6 + 0.4 * sin(uTime * (0.6 + seed * 1.8) + seed * 40.0));
        gl_PointSize = (1.0 + seed * seed * 2.6) * uScale; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vec3(1.0, 0.96, 1.0), vA * smoothstep(0.5, 0.0, d)); }`,
  });
  scene.add(new THREE.Points(starGeo, starMat));

  /* ---------- the "+": four glass arms, each with its colour lit inside ---------- */
  const ARMS = [
    { outer: '#ff2448', inner: '#ff7a2a', rot: 0 },               // top: red into orange
    { outer: '#ff9f1a', inner: '#ffd447', rot: -Math.PI / 2 },    // right: amber into yellow
    { outer: '#11c8b4', inner: '#17d68a', rot: Math.PI },         // bottom: green into teal
    { outer: '#4a4cff', inner: '#8d5cff', rot: Math.PI / 2 },     // left: blue into violet
  ];
  const plus = new THREE.Group();
  const spinner = new THREE.Group();
  plus.add(spinner);
  scene.add(plus);
  const D = 1.2, LEN = 1.0, R = 0.4;
  const glassGeo = new THREE.CapsuleGeometry(R, LEN, 12, 40);
  const coreGeo = new THREE.CapsuleGeometry(R * 0.34, LEN * 0.92, 8, 24);
  const glowTex = canvasTexture(128, 256, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, h / 2);
    g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(0.35, 'rgba(255,255,255,.28)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.save(); c.translate(w / 2, h / 2); c.scale(0.5, 1); c.translate(-w / 2, -h / 2);
    c.fillStyle = g; c.fillRect(-w, 0, w * 3, h); c.restore();
  });
  const cores = [], glows = [];
  ARMS.forEach((a) => {
    const arm = new THREE.Group();
    arm.rotation.z = a.rot;
    const glass = new THREE.Mesh(glassGeo, new THREE.MeshPhysicalMaterial({
      color: '#ffffff', metalness: 0, roughness: 0.05, transmission: 1, thickness: 1.1, ior: 1.5,
      dispersion: 6, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.3,
      attenuationColor: new THREE.Color(a.inner).lerp(new THREE.Color('#ffffff'), 0.55), attenuationDistance: 2.2,
    }));
    glass.position.y = D;
    // the core runs from the arm's inner colour (near the centre) to its outer colour
    const g = coreGeo.clone();
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
    const ci = new THREE.Color(a.inner), co = new THREE.Color(a.outer), cc = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const k = THREE.MathUtils.clamp((pos.getY(i) + LEN * 0.6) / (LEN * 1.2), 0, 1);
      cc.copy(ci).lerp(co, k); col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const core = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
    core.position.y = D;
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 3.1), new THREE.MeshBasicMaterial({
      map: glowTex, color: new THREE.Color(a.outer).lerp(new THREE.Color(a.inner), 0.5), transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    glow.position.set(0, D, -0.6);
    arm.add(glow, core, glass);
    spinner.add(arm);
    cores.push(core); glows.push(glow);
  });

  /* ---------- the light: a white beam in, a spectrum out ---------- */
  const beamTex = canvasTexture(512, 64, (c, w, h) => {
    const gx = c.createLinearGradient(0, 0, w, 0);
    gx.addColorStop(0, 'rgba(255,255,255,1)'); gx.addColorStop(0.25, 'rgba(255,255,255,.85)'); gx.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gx; c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'destination-in';
    const gy = c.createLinearGradient(0, 0, 0, h);
    gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(0.5, 'rgba(0,0,0,1)'); gy.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gy; c.fillRect(0, 0, w, h);
  });
  const fanTex = canvasTexture(1024, 512, (c, w, h) => {
    // a wedge opening from the left-middle, red at one edge to violet at the other
    const gy = c.createLinearGradient(0, 0, 0, h);
    [['#ff2a3a', 0.08], ['#ff8a1f', 0.24], ['#ffe03a', 0.38], ['#4fe36f', 0.52], ['#22d1f0', 0.66], ['#5b5cff', 0.8], ['#b25cff', 0.92]].forEach(([col, s]) => gy.addColorStop(s, col));
    c.fillStyle = gy;
    c.beginPath(); c.moveTo(0, h / 2 - 3); c.lineTo(w, 0); c.lineTo(w, h); c.lineTo(0, h / 2 + 3); c.closePath(); c.fill();
    c.globalCompositeOperation = 'destination-in';
    const gx = c.createLinearGradient(0, 0, w, 0);
    gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(0.35, 'rgba(0,0,0,.55)'); gx.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gx; c.fillRect(0, 0, w, h);
  });
  const lightMat = (map) => new THREE.MeshBasicMaterial({ map, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const ray = new THREE.PlaneGeometry(1, 1); ray.translate(0.5, 0, 0);
  const beam = new THREE.Mesh(ray, lightMat(beamTex));
  const fan = new THREE.Mesh(ray, lightMat(fanTex));
  beam.position.z = fan.position.z = -0.25;
  plus.add(beam, fan);
  const sparkTex = canvasTexture(128, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  const spark = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), lightMat(sparkTex));
  spark.position.z = 0.5;
  plus.add(spark);

  /* ---------- layout ---------- */
  const home = new THREE.Vector3();
  let unit = 1;
  stage.onResize((w, h) => {
    const aspect = w / h, vh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * CAMZ, vw = vh * aspect;
    sky.scale.set(vw * 2.3, vh * 2.3, 1);
    starMat.uniforms.uScale.value = Math.min(2, renderer.getPixelRatio());
    if (aspect >= 1) { unit = Math.min(1, vh * 0.5 / 4.2); home.set(Math.min(vw * 0.22, vw / 2 - 2.6 * unit), vh * 0.07, 0); }
    else { unit = Math.min(1, vw * 0.74 / 4.2); home.set(0, vh * 0.15, 0); }
  });

  /* ---------- input ---------- */
  let spinTarget = 0, spin = 0, spinV = 0, flash = 0, keyAngle = 0, lastMove = -10;
  const canvas = renderer.domElement;
  let hinted = false;
  const done = () => { if (!hinted && hint) { hinted = true; hint.classList.add('done'); } };
  const turn = () => { spinTarget -= Math.PI / 2; flash = 1; done(); runner.wake(); };
  canvas.addEventListener('click', turn);
  addEventListener('pointermove', () => { lastMove = clockT; }, { passive: true });
  addEventListener('keydown', (e) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || !runner.isInView()) return;
    const a = document.activeElement || {};
    if (/input|textarea|select/i.test(a.tagName || '') || a.isContentEditable) return;
    if (e.key === '+' || e.key === '=') turn();
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { keyAngle += e.key === 'ArrowLeft' ? 0.35 : -0.35; lastMove = -10; done(); runner.wake(); }
  });

  /* ---------- motion ---------- */
  const scrolled = scrollProgress(stageEl);
  const scr = new THREE.Vector3();
  let angle = 2.5, first = true, clockT = 0, lastNow = 0;
  function frame(t) {
    clockT = t;
    const now = performance.now() / 1000;
    const dt = lastNow ? Math.min(0.1, now - lastNow) : 1 / 60;
    lastNow = now;
    const s = calm ? 0 : scrolled();

    // where the light comes from: the pointer while it moves, otherwise a slow sweep
    let want;
    if (!calm && t - lastMove < 4) {
      scr.copy(plus.position).project(camera);
      want = Math.atan2((-pointer.y * 2 - scr.y), (pointer.x * 2 - scr.x) * camera.aspect);
    } else {
      want = 2.45 + keyAngle + (calm ? 0 : Math.sin(t * 0.22) * 0.7);
    }
    let d = want - angle; d = Math.atan2(Math.sin(d), Math.cos(d));
    angle += d * (calm ? 1 : 1 - Math.exp(-dt * 4));

    // the quarter turn, on a spring
    spinV += (40 * (spinTarget - spin) - 8 * spinV) * dt;
    spin += spinV * dt;
    if (calm) spin = spinTarget;
    flash = Math.max(0, flash - dt * 1.4);

    plus.position.copy(home);
    plus.position.y += s * 3.2;
    plus.scale.setScalar(unit * (1 - s * 0.82));
    spinner.rotation.set(-pointer.y * 0.4 + (calm ? 0 : Math.sin(t * 0.31) * 0.12), pointer.x * 0.6 + (calm ? 0 : Math.sin(t * 0.4) * 0.28), spin);

    // the beam comes in along `angle`, the spectrum leaves opposite, bent a little
    const fade = 1 - Math.min(1, s * 1.6);
    beam.rotation.z = angle;
    beam.scale.set(16, 0.16 + flash * 0.1, 1);
    beam.material.opacity = (0.55 + flash * 0.4) * fade;
    fan.rotation.z = angle + Math.PI - 0.22;
    fan.scale.set(13 + flash * 3, 6.5, 1);
    fan.material.opacity = (0.5 + flash * 0.4) * fade;
    spark.material.opacity = (0.6 + flash * 0.6) * fade;
    const pulse = calm ? 1 : 0.85 + Math.sin(t * 1.3) * 0.15;
    for (const g of glows) g.material.opacity = (0.4 * pulse + flash * 0.5) * (0.4 + 0.6 * fade);
    starMat.uniforms.uTime.value = calm ? 0 : t;

    // the camera leans a little with the pointer
    camera.position.set(pointer.x * 0.8, -pointer.y * 0.5, CAMZ);
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    if (first) { first = false; stage.reveal(); }
  }
  const runner = runWhileVisible(stageEl, frame);
}
