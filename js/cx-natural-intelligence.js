/* ============================================================
   Natural Intelligence: the machine.
   Every creative from the page on one turning ring, each in its own
   format (feed 4:5, story 9:16), the films playing on their cards.
   The ring turns to bring one creative to the front, and the loop runs
   on it: generate (it lifts out of the ring), test (a signal bar fills
   under it, abstract, no numbers), scale (it grows). Then the next.
   Drag to turn it, tap a creative to bring it forward, or use ← →.

   Only the films near the front play, and only while the hero is on
   screen. Reduced motion: no autoplay, no turning by itself; posters
   instead of films. No WebGL: the poster stays.
   Lower down, the wall of creatives plays each film while it is in view.
   ============================================================ */
import { THREE, makeStage, runWhileVisible, scrollProgress, calm } from './cx-kit.js';

const ADS = [
  { img: 'ni-ad-pet-23.webp', w: 720, h: 900, label: 'BestMoney: pet insurance' },
  { vid: 'ni-ad-home-options', w: 338, h: 600, label: 'BestMoney: home insurance film' },
  { img: 'ni-ad-cards-balance.webp', w: 720, h: 900, label: 'BestMoney: balance transfer cards' },
  { vid: 'ni-ad-loans-sba', w: 338, h: 600, label: 'BestMoney: SBA loans film' },
  { img: 'ni-ad-car-select.webp', w: 506, h: 900, label: 'BestMoney: car insurance' },
  { vid: 'ni-ad-pet-vetbill', w: 480, h: 600, label: 'BestMoney: pet insurance vet bill film' },
  { img: 'ni-ad-loans-100k.webp', w: 720, h: 900, label: 'BestMoney: business loans' },
  { vid: 'ni-ad-street-interview', w: 338, h: 600, label: 'BestMoney: street interview film' },
  { img: 'ni-ad-cards-apr.webp', w: 720, h: 900, label: 'BestMoney: intro APR cards' },
  { vid: 'ni-ad-home-storm', w: 480, h: 600, label: 'BestMoney: home insurance storm film' },
  { img: 'ni-ad-pet-15.webp', w: 506, h: 900, label: 'BestMoney: pet insurance' },
  { vid: 'ni-ad-cards-motion', w: 338, h: 600, label: 'BestMoney: balance transfer motion' },
  { vid: 'ni-ad-home-ugc', w: 338, h: 600, label: 'BestMoney: home insurance creator film' },
];
const BASE = '/assets/opt/';

/* ---------- the wall: films play while in view (as the reel did) ---------- */
(function wall() {
  const vids = [...document.querySelectorAll('.ni-wall video')];
  if (!vids.length || calm || !('IntersectionObserver' in window)) return;
  const play = (v) => {
    if (v.readyState >= 3) { v.play().catch(() => {}); return; }
    if (!v.dataset.wired) { v.dataset.wired = '1'; v.addEventListener('canplay', () => { if (v.dataset.on) v.play().catch(() => {}); }, { once: true }); }
    if (v.preload !== 'auto') { v.preload = 'auto'; v.load(); }
  };
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    const v = e.target;
    if (e.isIntersecting) { v.dataset.on = '1'; play(v); } else { delete v.dataset.on; v.pause(); }
  }), { rootMargin: '100px' });
  vids.forEach((v) => io.observe(v));
})();

/* ---------- the machine ---------- */
const stageEl = document.getElementById('niStage');
if (stageEl) { try { machine(); } catch (e) { /* the poster stays */ } }

function machine() {
  const S = makeStage(stageEl, { exposure: 1.0, shadows: false });
  if (!S) return;
  const { renderer, scene, camera } = S;
  renderer.toneMapping = THREE.NoToneMapping;
  camera.fov = 30;
  const stepsEl = document.getElementById('niSteps');
  const nowEl = document.getElementById('niNow');

  scene.add(new THREE.AmbientLight('#ffffff', 1.2));
  const warm = new THREE.PointLight('#ff4a1c', 30, 14, 1.5);
  warm.position.set(0, 1.5, 0);
  scene.add(warm);

  /* a rounded rectangle with 0..1 UVs, for the card faces */
  function roundedRect(w, h, r) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return s;
  }
  function face(w, h, r) {
    const g = new THREE.ShapeGeometry(roundedRect(w, h, r), 6);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
    return g;
  }

  /* ---------- the ring ---------- */
  const ring = new THREE.Group();
  scene.add(ring);
  const N = ADS.length, R = 5.4, H = 2.3;
  const loader = new THREE.TextureLoader();
  const backMat = new THREE.MeshBasicMaterial({ color: '#0d0d0f' });
  const edgeMat = new THREE.MeshBasicMaterial({ color: '#2a2a2e' });
  const cards = ADS.map((ad, i) => {
    const w = H * ad.w / ad.h;
    const pivot = new THREE.Group();                 // sits on the ring, faces out
    const a = (i / N) * Math.PI * 2;
    pivot.position.set(Math.sin(a) * R, 0, Math.cos(a) * R);
    pivot.rotation.y = a;
    ring.add(pivot);
    const card = new THREE.Group();
    pivot.add(card);
    const slab = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRect(w + 0.08, H + 0.08, 0.14), { depth: 0.05, bevelEnabled: false, curveSegments: 6 }), [backMat, edgeMat]);
    slab.position.z = -0.055;
    card.add(slab);
    const tex = loader.load(BASE + (ad.img || ad.vid + '-poster.jpg'));
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    const scr = new THREE.Mesh(face(w, H, 0.11), mat);
    scr.position.z = 0.001;
    scr.userData.i = i;
    card.add(scr);
    let video = null, vtex = null;
    if (ad.vid && !calm) {
      video = document.createElement('video');
      video.muted = true; video.loop = true; video.playsInline = true; video.preload = 'none';
      video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
      video.src = BASE + ad.vid + '.mp4';
      vtex = new THREE.VideoTexture(video);
      vtex.colorSpace = THREE.SRGBColorSpace;
      video.addEventListener('playing', () => { mat.map = vtex; mat.needsUpdate = true; }, { once: true });
    }
    return { ad, pivot, card, scr, mat, video, a, w, lift: 0, grow: 0, playing: false };
  });
  const screens = cards.map((c) => c.scr);

  /* the signal bar under the front creative, and a soft glow behind it */
  const barBg = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.035), new THREE.MeshBasicMaterial({ color: '#2a2a2e' }));
  const barCv = document.createElement('canvas'); barCv.width = 256; barCv.height = 4;
  const bctx = barCv.getContext('2d'); const grad = bctx.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0, '#ff0c2c'); grad.addColorStop(1, '#ff8a1a'); bctx.fillStyle = grad; bctx.fillRect(0, 0, 256, 4);
  const barTex = new THREE.CanvasTexture(barCv); barTex.colorSpace = THREE.SRGBColorSpace;
  const barFg = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.035), new THREE.MeshBasicMaterial({ map: barTex, toneMapped: false }));
  barFg.geometry.translate(0.5, 0, 0);
  scene.add(barBg, barFg);
  const glowCv = document.createElement('canvas'); glowCv.width = glowCv.height = 128;
  const gctx = glowCv.getContext('2d'); const rg = gctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  rg.addColorStop(0, 'rgba(255,60,30,0.85)'); rg.addColorStop(0.5, 'rgba(255,40,40,0.25)'); rg.addColorStop(1, 'rgba(255,40,40,0)');
  gctx.fillStyle = rg; gctx.fillRect(0, 0, 128, 128);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(glowCv), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(glow);

  /* a faint track on the floor of the ring */
  const track = new THREE.Mesh(new THREE.RingGeometry(R - 0.02, R + 0.02, 128), new THREE.MeshBasicMaterial({ color: '#ff5a2a', transparent: true, opacity: 0.35 }));
  track.rotation.x = -Math.PI / 2; track.position.y = -H / 2 - 0.35;
  scene.add(track);

  /* ---------- turning ---------- */
  const step = (Math.PI * 2) / N;
  let angle = 0, vel = 0, target = 0, dragging = false, lastX = 0, downX = 0, downY = 0, moved = 0;
  let front = 0, phaseT = 0, idleUntil = 0;
  const frontIndex = () => ((Math.round(-angle / step) % N) + N) % N;
  const goTo = (i) => {
    // shortest way round to card i
    const cur = -angle / step;
    let d = i - (((Math.round(cur) % N) + N) % N);
    if (d > N / 2) d -= N; if (d < -N / 2) d += N;
    target = -(Math.round(cur) + d) * step;
  };
  const el = renderer.domElement;
  el.addEventListener('pointerdown', (e) => {
    dragging = true; moved = 0; lastX = downX = e.clientX; downY = e.clientY; vel = 0;
  });
  addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    moved = Math.max(moved, Math.abs(e.clientX - downX));
    if (Math.abs(e.clientY - downY) > 14 && moved < 10) { dragging = false; return; }   // a vertical scroll
    const k = 2.4 / Math.max(320, el.clientWidth);
    angle += dx * k * Math.PI; vel = dx * k * Math.PI * 60;
    target = angle;
    loop.wake();
  }, { passive: true });
  const release = (e) => {
    if (!dragging) return;
    dragging = false;
    if (moved < 8) {                                   // a tap: bring that creative forward
      const r = el.getBoundingClientRect();
      ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ptr, camera);
      const hit = ray.intersectObjects(screens, false)[0];
      if (hit) goTo(hit.object.userData.i);
    } else {
      // coast, then settle on the nearest creative
      target = Math.round((angle + vel * 0.25) / step) * step;
    }
    idleUntil = loop.t + 6;
    stageEl.classList.add('touched');
    loop.wake();
  };
  addEventListener('pointerup', release);
  addEventListener('pointercancel', () => { dragging = false; target = Math.round(angle / step) * step; });
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  el.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || dragging) return;
    const r = el.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    el.style.cursor = ray.intersectObjects(screens, false)[0] ? 'pointer' : 'grab';
  });
  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || !loop.isInView()) return;
    if (/input|textarea|select/i.test((document.activeElement || {}).tagName || '')) return;
    if (e.key === 'ArrowRight') { goTo((frontIndex() + 1) % N); idleUntil = loop.t + 6; loop.wake(); }
    if (e.key === 'ArrowLeft') { goTo((frontIndex() + N - 1) % N); idleUntil = loop.t + 6; loop.wake(); }
  });

  /* ---------- framing ---------- */
  let narrow = false;
  const look = new THREE.Vector3();
  S.onResize((w, h) => {
    narrow = w / h < 0.85;
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const fitW = (narrow ? 4.8 : 11.6) / (2 * t * camera.aspect);
    const fitH = (narrow ? 4.4 : 4.8) / (2 * t);
    const d = Math.max(fitW, fitH);
    camera.position.set(0, narrow ? 1.6 : 1.9, R + d);
    look.set(0, narrow ? -0.1 : 0.05, R - 1);
    camera.lookAt(look);
    // the title sits at the bottom left: the ring turns to the right of it (on a phone, above it)
    camera.setViewOffset(w, h, narrow ? 0 : -w * 0.25, narrow ? h * 0.12 : h * 0.04, w, h);
  });

  /* ---------- the frame ---------- */
  const scroll = scrollProgress(stageEl);
  let ready = false, lastFront = -1, lastScroll = scroll();
  const steps = stepsEl ? [...stepsEl.children] : [];
  const loop = runWhileVisible(stageEl, (t, dt) => {
    loop.t = t;
    // scrolling the page turns the machine a little
    const sp = scroll();
    if (!calm && Math.abs(sp - lastScroll) > 0.0005) { target += (sp - lastScroll) * -2.2; angle += (sp - lastScroll) * -2.2; }
    lastScroll = sp;

    if (!dragging) {
      angle += (target - angle) * Math.min(1, dt * 4.5);
    }
    ring.rotation.y = angle;
    front = frontIndex();

    // the loop on the front creative: generate → test → scale, then the next one
    if (front !== lastFront) { lastFront = front; phaseT = 0; if (nowEl) nowEl.textContent = ADS[front].label; }
    const settled = !dragging && Math.abs(target - angle) < 0.02;
    if (settled) phaseT += dt;
    const phase = phaseT < 0.9 ? 0 : phaseT < 2.4 ? 1 : 2;
    steps.forEach((s, k) => s.classList.toggle('on', settled && k === phase));
    if (!calm && settled && t > idleUntil && phaseT > 4.2) goTo((front + 1) % N);

    // cards: the front one lifts out and grows; films near the front play
    for (let i = 0; i < N; i++) {
      const c = cards[i];
      let rel = c.a + angle; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      const isFront = i === front && settled;
      c.lift += ((isFront ? 1 : 0) - c.lift) * Math.min(1, dt * 5);
      c.grow += ((isFront && phase === 2 ? 1 : 0) - c.grow) * Math.min(1, dt * 4);
      c.card.position.z = c.lift * 0.9;
      c.card.position.y = c.lift * 0.12;
      c.card.scale.setScalar(1 + c.grow * 0.18);
      const near = Math.abs(rel) < 1.1;
      c.mat.color.setScalar(0.35 + 0.65 * Math.max(0, Math.cos(rel)) ** 0.6);
      if (c.video) {
        const want = near && loop.isInView() && !document.hidden;
        if (want && !c.playing) { c.playing = true; c.video.play().catch(() => { c.playing = false; }); }
        else if (!want && c.playing) { c.playing = false; c.video.pause(); }
      }
    }

    // bar and glow follow the front creative
    const fc = cards[front];
    const testK = !settled ? 0 : phase === 0 ? 0 : Math.min(1, (phaseT - 0.9) / 1.5);
    const fy = -H / 2 * (1 + fc.grow * 0.18) - 0.22 + fc.lift * 0.12;
    const fz = R + fc.lift * 0.9 + 0.02;
    const bw = fc.w * 0.9;
    barBg.position.set(0, fy, fz); barBg.scale.x = bw;
    barFg.position.set(-bw / 2, fy, fz + 0.001); barFg.scale.x = Math.max(0.0001, bw * testK);
    barBg.visible = barFg.visible = fc.lift > 0.5;
    glow.position.set(0, 0.1, R - 0.4);
    glow.scale.setScalar(5 + fc.grow * 1.5 + (calm ? 0 : Math.sin(t * 1.4) * 0.2));
    glow.material.opacity = 0.55 + fc.lift * 0.45;

    renderer.render(scene, camera);
    if (!ready) { ready = true; S.reveal(); }
  });
  loop.t = 0;
  // the films are paused whenever the hero leaves the screen
  new IntersectionObserver((es) => { if (!es[0].isIntersecting) cards.forEach((c) => { if (c.video && c.playing) { c.playing = false; c.video.pause(); } }); }).observe(stageEl);
  // reduced motion: draw again once the posters land
  if (calm) setTimeout(() => loop.wake(), 1200);
}
