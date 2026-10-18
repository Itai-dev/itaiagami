/* Hero cloud (home). One card per project, its still on a slowly turning
   sphere, in the hero's right column. Drag sideways to spin it, hover a card
   for the project's name, click or tap to open its case study.

   Loaded by js/site.js only after the page has loaded and the intro has gone
   (and never under reduced motion), with three.js from the import map in
   index.html. The folders figure (js/hairline-cases.js) stays until the cloud
   has drawn its first frame; if anything fails on the way (no WebGL, no data,
   no images) the cloud removes itself and the folders stay.

   Light by design: no scroll or wheel handling (the page keeps its scroll; on
   touch only a sideways drag spins), device pixel ratio capped at 2, textures
   sized to the cards on screen, and the frame loop sleeps while the hero is
   off screen or the tab is hidden. */
import * as THREE from 'three';

const FOV = 30;                  // vertical field of view, degrees
const CARD = .54;                // a card's long side, as a share of the sphere radius
const SQUASH = .9;               // the sphere is a little flatter than round
const TILT = -.2;                // seen from slightly above
const SPIN = .0016;              // ambient turn, radians per 60fps frame
const BACK = .14;                // opacity of the farthest card
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

export async function mount(host) {
  const projects = await fetch('/data/projects.json').then(r => {
    if (!r.ok) throw new Error(`projects ${r.status}`);
    return r.json();
  });
  const list = projects.filter(p => p && p.slug && (p.thumb || p.hero));
  if (list.length < 6) throw new Error('too few projects');

  /* ---------- DOM: a box the size of the folders figure; the canvas bleeds past it ---------- */
  const box = document.createElement('div');
  box.className = 'hero-cloud';
  box.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.className = 'hc-label';
  box.appendChild(label);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (err) {
    throw new Error('no WebGL');
  }
  const dispose = () => {
    try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) { /* already gone */ }
    box.remove();
  };

  try {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.className = 'hc-canvas';
    box.prepend(canvas);
    host.appendChild(box);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, .1, 100);
    const halfTan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const plane = new THREE.PlaneGeometry(1, 1);

    /* ---------- sizes ---------- */
    let BW = 1, BH = 1;          // the box (where the sphere must fit), CSS px
    let CW = 1, CH = 1, OX = 0, OY = 0;   // the canvas, and its offset from the box
    let stretch = 1;             // the sphere widens to fill a wide box
    function measure() {
      BW = box.clientWidth || 1; BH = box.clientHeight || 1;
      CW = canvas.clientWidth || BW; CH = canvas.clientHeight || BH;
      OX = (CW - BW) / 2; OY = (CH - BH) / 2;
      // half extents of the cloud at z=0, in sphere radii (front cards sit nearer, so a little extra)
      const c = CARD * .56;
      const ey = SQUASH * 1.04 + c;
      stretch = THREE.MathUtils.clamp(((BW / BH) * ey - c) / 1.04, 1, 1.15);
      const ex = stretch * 1.04 + c;
      // camera distance that fits both extents inside the box
      const dist = Math.max(ex * CH / (halfTan * BW), ey * CH / (halfTan * BH));
      camera.position.set(0, 0, dist);
      camera.aspect = CW / CH;
      camera.updateProjectionMatrix();
      renderer.setSize(CW, CH, false);
    }
    const pxPerUnit = z => CH / (2 * halfTan * Math.max(.1, camera.position.z - z));

    /* ---------- cards: Fibonacci points on a unit sphere, no card at a pole ----------
       The home page's ranked projects take the points nearest the equator, where
       the cloud is easiest to see, and the first of them starts at the front. */
    const n = list.length;
    const rank = p => (Number.isFinite(p.homeRank) ? p.homeRank : 1e3);
    const ordered = list.map((p, k) => [p, k]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(e => e[0]);
    const slots = [...Array(n).keys()].sort((a, b) => Math.abs(n - 1 - 2 * a) - Math.abs(n - 1 - 2 * b) || a - b);
    const cards = ordered.map((p, k) => {
      const i = slots[k];
      const y = 1 - (2 * i + 1) / n;
      const r = Math.sqrt(1 - y * y);
      const a = i * GOLDEN;
      const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, depthTest: false });
      const mesh = new THREE.Mesh(plane, mat);
      mesh.visible = false;
      scene.add(mesh);
      return {
        p, mesh, mat, aspect: 16 / 9, ready: false, hover: 0, seed: i,
        home: new THREE.Vector3(Math.cos(a) * r, y * SQUASH, Math.sin(a) * r),
        pos: new THREE.Vector3(), sx: 0, sy: 0, sw: 0, sh: 0, depth: 0,
      };
    });

    /* ---------- textures: drawn small with rounded corners ---------- */
    measure();
    const frontPx = CARD * pxPerUnit(1) * 1.25;            // a hovered front card, CSS px
    const cap = Math.min(512, Math.max(192, Math.round(frontPx * Math.min(devicePixelRatio || 1, 2))));
    const aniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const loadImage = src => new Promise((res, rej) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = src;
    });
    const texture = img => {
      const k = Math.min(1, cap / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(2, Math.round(img.naturalWidth * k)), h = Math.max(2, Math.round(img.naturalHeight * k));
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      const rr = Math.max(w, h) * .022;
      g.beginPath();
      if (g.roundRect) g.roundRect(0, 0, w, h, rr); else g.rect(0, 0, w, h);
      g.clip();
      g.drawImage(img, 0, 0, w, h);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = aniso;
      return t;
    };
    const loads = cards.map(async cd => {
      let img;
      try { img = await loadImage(cd.p.thumb || cd.p.hero); }
      catch (e) { if (cd.p.hero && cd.p.thumb) img = await loadImage(cd.p.hero); else throw e; }
      cd.mat.map = texture(img);
      cd.mat.needsUpdate = true;
      cd.aspect = img.naturalWidth / img.naturalHeight || cd.aspect;
      cd.ready = true;
    });
    // wait for the stills (a few seconds at most); a sparse cloud is not worth showing
    await Promise.race([Promise.allSettled(loads), new Promise(r => setTimeout(r, 6000))]);
    const shown = cards.filter(cd => cd.ready);
    if (shown.length < Math.min(6, n)) throw new Error('stills did not load');
    // a card whose still arrives later fades in on its own

    /* ---------- state ---------- */
    let rotY = slots[0] * GOLDEN - Math.PI / 2 - .25, velY = 0, tilt = TILT, velT = 0;   // the first card just left of front, turning in
    let hovered = null, drag = null, px = -1e4, py = -1e4;
    let spinK = 1;                       // ambient spin slows to a stop while the pointer is on a card
    const euler = new THREE.Euler(), q = new THREE.Quaternion();
    const t0 = performance.now();
    let last = t0;

    /* ---------- hit test: the front-most card under the pointer, in screen space ---------- */
    function pick(x, y) {
      let best = null;
      for (const cd of cards) {
        if (!cd.mesh.visible || cd.mat.opacity < .5) continue;
        if (Math.abs(x - cd.sx) <= cd.sw / 2 && Math.abs(y - cd.sy) <= cd.sh / 2 && (!best || cd.depth > best.depth)) best = cd;
      }
      return best;
    }
    const local = e => {
      const r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    function setHover(cd) {
      if (cd === hovered) return;
      hovered = cd;
      canvas.classList.toggle('is-card', !!cd);
      label.classList.toggle('on', !!cd);
      if (cd) label.textContent = cd.p.name || cd.p.slug;
    }

    /* ---------- pointer: drag sideways to spin, click or tap a card to open it ---------- */
    canvas.addEventListener('pointerdown', e => {
      if (e.button) return;
      const [x, y] = local(e);
      drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, lx: e.clientX, ly: e.clientY, moved: 0, type: e.pointerType, sx: x, sy: y };
      velY = velT = 0;
      if (e.pointerType === 'mouse') { try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* fine */ } }
      wake();
    });
    canvas.addEventListener('pointermove', e => {
      [px, py] = local(e);
      if (drag && drag.id === e.pointerId) {
        const dx = e.clientX - drag.lx, dy = e.clientY - drag.ly;
        drag.lx = e.clientX; drag.ly = e.clientY;
        drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0));
        if (drag.moved > 6) {
          canvas.classList.add('is-drag');
          setHover(null);
          const k = 3.2 / Math.max(BW, 240);
          velY = dx * k; rotY += velY;
          // only a mouse tilts the sphere; on touch the vertical belongs to the page scroll
          if (drag.type === 'mouse') { velT = dy * k * .5; tilt = THREE.MathUtils.clamp(tilt + velT, -.75, .45); }
        }
      } else if (e.pointerType === 'mouse') {
        setHover(pick(px, py));
      }
      wake();
    });
    const end = e => {
      if (!drag || drag.id !== e.pointerId) return;
      const click = e.type === 'pointerup' && drag.moved <= 6;
      drag = null;
      canvas.classList.remove('is-drag');
      if (!click) return;
      const [x, y] = local(e);
      const cd = pick(x, y);
      if (cd) location.href = `/work/${cd.p.slug}.html`;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('pointerleave', e => {
      if (e.pointerType !== 'mouse') return;
      px = py = -1e4;
      if (!drag) setHover(null);
    });

    /* ---------- frame loop: runs only while the hero is on screen and the tab is visible ---------- */
    const tmp = new THREE.Vector3();
    let raf = 0, onScreen = true, firstFrame = null;
    const firstDrawn = new Promise(r => { firstFrame = r; });
    function frame(now) {
      raf = 0;
      const f = Math.min(4, Math.max(.25, (now - last) / 16.67));
      last = now;
      const t = (now - t0) / 1000;
      const ease = a => 1 - Math.pow(1 - a, f);

      spinK += ((hovered ? 0 : 1) - spinK) * ease(.06);
      if (!drag) {
        rotY += velY * f; velY *= Math.pow(.94, f);
        tilt += velT * f; velT *= Math.pow(.9, f);
        tilt += (TILT - tilt) * ease(.02);
        rotY += SPIN * spinK * f;
      }
      euler.set(tilt, rotY, 0, 'XYZ');
      q.setFromEuler(euler);

      const R = 1;
      for (const cd of cards) {
        cd.hover += ((cd === hovered ? 1 : 0) - cd.hover) * ease(.18);
        tmp.copy(cd.home).multiplyScalar(R);
        tmp.x += Math.sin(t * .6 + cd.seed * 1.7) * .018;
        tmp.y += Math.cos(t * .5 + cd.seed * 2.3) * .018;
        tmp.applyQuaternion(q);
        tmp.x *= stretch;
        cd.pos.copy(tmp);
        // depth: 0 at the back of the sphere, 1 at the front
        const d = THREE.MathUtils.clamp((tmp.z / R + 1) / 2, 0, 1);
        const fade = BACK + (1 - BACK) * d * d * (3 - 2 * d);
        const dim = hovered && cd !== hovered ? .8 : 1;
        const want = cd.ready ? Math.max(fade * dim, cd.hover) : 0;
        cd.mat.opacity += (want - cd.mat.opacity) * ease(.12);
        const len = CARD * R * (1 + cd.hover * .14);
        const w = cd.aspect >= 1 ? len : len * cd.aspect, h = cd.aspect >= 1 ? len / cd.aspect : len;
        cd.mesh.position.copy(tmp);
        cd.mesh.scale.set(w, h, 1);
        cd.mesh.visible = cd.ready && cd.mat.opacity > .01;
        // where it lands on screen (canvas px), for the hit test and the label
        const k = pxPerUnit(tmp.z);
        tmp.project(camera);
        cd.sx = (tmp.x + 1) / 2 * CW; cd.sy = (1 - tmp.y) / 2 * CH;
        cd.sw = w * k; cd.sh = h * k; cd.depth = cd.pos.z;
        cd.mesh.renderOrder = Math.round(cd.pos.z * 1000);
      }
      renderer.render(scene, camera);

      if (hovered) {
        // the name sits under the card's left edge, kept inside the box
        const lx = THREE.MathUtils.clamp(hovered.sx - hovered.sw / 2 - OX, 0, Math.max(0, BW - label.offsetWidth));
        const ly = hovered.sy + hovered.sh / 2 - OY + 8;
        label.style.transform = `translate3d(${Math.round(lx)}px,${Math.round(ly)}px,0)`;
      }
      if (firstFrame) { firstFrame(); firstFrame = null; }
      if (onScreen && !document.hidden) raf = requestAnimationFrame(frame);
    }
    function wake() {
      if (!raf && onScreen && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); }
    }
    new IntersectionObserver(es => {
      onScreen = es[es.length - 1].isIntersecting;
      if (onScreen) wake();
    }, { rootMargin: '80px 0px' }).observe(box);
    document.addEventListener('visibilitychange', wake);
    new ResizeObserver(() => { measure(); wake(); }).observe(box);

    wake();
    await firstDrawn;

    /* ---------- swap: the cloud fades in over the folders, which then go ---------- */
    host.classList.add('cloud-in', 'ready');
    requestAnimationFrame(() => box.classList.add('ready'));
    const folders = host.querySelector('[data-hairline]');
    setTimeout(() => {
      try { if (host.hairline && host.hairline.destroy) host.hairline.destroy(); } catch (e) { /* gone anyway */ }
      if (folders) folders.remove();
      host.classList.add('has-cloud');
      measure(); wake();
    }, 900);
    return true;
  } catch (err) {
    dispose();
    throw err;
  }
}
