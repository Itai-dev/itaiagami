/* ============================================================
   HERO — gummy bears (source)
   Real geometry in a real renderer: three.js, WebGL, lit and
   shaded per frame. There is no bear model to download — the
   bear is built here out of spheres, welded into a single mesh,
   so the whole thing ships as code rather than as an asset.

   THIS FILE IS NOT SERVED. It is bundled and minified into
   js/hero-gummies.min.js, which is what the page loads:

       npm run build:gummies

   Re-run that after editing this file, and commit both.
   ============================================================ */
import {
  Scene, PerspectiveCamera, WebGLRenderer, Group, Mesh, Color,
  SphereGeometry, BufferGeometry, BufferAttribute, Matrix3, Matrix4,
  Vector3, Euler, MeshPhysicalMaterial, MeshStandardMaterial,
  DirectionalLight, PointLight, AmbientLight, CanvasTexture,
  EquirectangularReflectionMapping, PMREMGenerator,
  ACESFilmicToneMapping, MathUtils
} from 'three';

/* ---------- the bear ----------
   Proportions of the sweet, not of a bear: a pear body, a wide low head,
   ears set on the corners, stubby limbs, and a raised belly. Every part is a
   squashed sphere, which is also why the silhouette stays soft everywhere. */
const PARTS = [
  /* [radius, scale,               position,              segments] */
  [.62, [1.00, 1.06, .74], [    0, -.26,    0], 40],   /* body        */
  [.30, [1.00,  .70, .55], [    0, -.30,  .36], 28],   /* belly       */
  [.50, [1.00,  .93, .82], [    0,  .62,    0], 40],   /* head        */
  [.19, [1.00, 1.00, .62], [ -.38, 1.00, -.02], 24],   /* ear, left   */
  [.19, [1.00, 1.00, .62], [  .38, 1.00, -.02], 24],   /* ear, right  */
  [.20, [1.00,  .78, .90], [    0,  .48,  .34], 24],   /* snout       */
  [.25, [1.18,  .86, .82], [ -.64,  .04,  .04], 26],   /* arm, left   */
  [.25, [1.18,  .86, .82], [  .64,  .04,  .04], 26],   /* arm, right  */
  [.31, [1.00,  .82, .94], [ -.35, -.80,  .06], 28],   /* leg, left   */
  [.31, [1.00,  .82, .94], [  .35, -.80,  .06], 28]    /* leg, right  */
];

/* eyes and nose, pressed into the face — their own mesh, a shade deeper */
const FACE = [
  [.072, [-.20, .72, .40]],
  [.072, [ .20, .72, .40]],
  [.070, [   0, .55, .52]]
];

/* Weld a list of [geometry, matrix] into one indexed geometry. three.js keeps
   its merge helper in the examples, and this needs so little of it — position
   and normal, no uvs, nothing textured — that carrying the helper would cost
   more than the twenty lines. One mesh per bear also means one draw call. */
function weld(parts){
  let vn = 0, inn = 0;
  for(const [g] of parts){ vn += g.attributes.position.count; inn += g.index.count; }

  const position = new Float32Array(vn * 3);
  const normal   = new Float32Array(vn * 3);
  const index    = (vn > 65535 ? new Uint32Array(inn) : new Uint16Array(inn));

  const v = new Vector3(), nm = new Matrix3();
  let vo = 0, io = 0;

  for(const [g, m] of parts){
    const gp = g.attributes.position, gn = g.attributes.normal, gi = g.index;
    nm.getNormalMatrix(m);
    for(let i = 0; i < gp.count; i++){
      v.fromBufferAttribute(gp, i).applyMatrix4(m).toArray(position, (vo + i) * 3);
      v.fromBufferAttribute(gn, i).applyMatrix3(nm).normalize().toArray(normal, (vo + i) * 3);
    }
    for(let i = 0; i < gi.count; i++) index[io + i] = gi.getX(i) + vo;
    vo += gp.count; io += gi.count;
    g.dispose();
  }

  const out = new BufferGeometry();
  out.setAttribute('position', new BufferAttribute(position, 3));
  out.setAttribute('normal',   new BufferAttribute(normal, 3));
  out.setIndex(new BufferAttribute(index, 1));
  out.computeBoundingSphere();
  return out;
}

function build(list, detail){
  const m = new Matrix4();
  return weld(list.map(p => {
    const [r, s, t, seg] = p.length === 4 ? p : [p[0], [1,1,1], p[1], 18];
    const q = Math.max(8, Math.round((seg || 18) * detail));
    m.makeScale(s[0], s[1], s[2]).setPosition(t[0], t[1], t[2]);
    return [new SphereGeometry(r, q, Math.max(6, Math.round(q * .55))), m.clone()];
  }));
}

/* ---------- a small environment, drawn rather than downloaded ----------
   Gloss needs something to reflect. This paints a soft studio — bright above,
   a warm key to one side, a cool fill to the other — into a canvas, and lets
   three prefilter it. It is a few kilobytes of canvas instead of an HDR file. */
function studio(renderer, light){
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const x = c.getContext('2d');

  const sky = x.createLinearGradient(0, 0, 0, 128);
  sky.addColorStop(0, light ? '#dfe3ea' : '#c9ced8');
  sky.addColorStop(.5, light ? '#aab0bb' : '#6d7380');
  sky.addColorStop(1, light ? '#6e7480' : '#23262c');
  x.fillStyle = sky; x.fillRect(0, 0, 256, 128);

  for(const [cx, cy, r, col] of [[70, 26, 42, '#ffffff'], [196, 40, 34, '#ffd9b0'], [130, 96, 30, '#9fc4ff']]){
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  const tex = new CanvasTexture(c);
  tex.mapping = EquirectangularReflectionMapping;
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose(); tex.dispose();
  return env;
}

/* Where each bear sits, as a fraction of the hero box, and how tall it is as a
   fraction of the hero's height. `mid` ones flank the headline, and step aside
   on narrow screens where it runs nearly the full width. */
const LAYOUT = [
  { at: [.125, .25 ], h: .17, tone: 0, spin: -.45, bob: 9.0,  lean: -.22 },
  { at: [.865, .20 ], h: .19, tone: 1, spin:  .38, bob: 11.0, lean:  .26 },
  { at: [.075, .62 ], h: .14, tone: 2, spin:  .52, bob: 8.0,  lean:  .30, mid: true },
  { at: [.930, .645], h: .16, tone: 3, spin: -.34, bob: 10.0, lean: -.18, mid: true },
  { at: [.225, .855], h: .15, tone: 1, spin:  .30, bob: 12.0, lean:  .16 },
  { at: [.800, .845], h: .13, tone: 2, spin: -.50, bob: 9.5,  lean: -.28 }
];

export function start(host){
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  const root = document.documentElement;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');

  let renderer;
  try{
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  }catch(e){ return; }
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene  = new Scene();
  const camera = new PerspectiveCamera(32, 1, .1, 100);
  camera.position.set(0, 0, 10);

  /* One geometry, shared by every bear — two meshes each, twelve draw calls.
     The segment counts above are the shape's; this is how much of them is
     worth keeping at the size these render. A sphere of 28 segments drawn
     150px across sits within half a pixel of a true circle, so the rest is
     vertices nobody can see. */
  const detail = matchMedia('(max-width:700px)').matches ? .5 : .7;
  const bodyGeo = build(PARTS, detail);
  const faceGeo = build(FACE, detail);

  const bears = [];
  const holder = new Group();
  scene.add(holder);

  /* Gummy without paying for refraction: a flat background gives a
     transmissive material nothing worth bending, and the transmission pass is
     the expensive one. Clearcoat over a soft body, plus a little self-lit
     colour, reads as translucent candy at this size. Sheen would add a touch
     more at the edges and another whole BRDF to every shaded pixel, which is
     not a trade worth making for decoration. */
  function makeMaterials(){
    return LAYOUT.map(() => new MeshPhysicalMaterial({
      color: 0xffffff, roughness: .3, metalness: 0,
      clearcoat: 1, clearcoatRoughness: .1,
      emissive: new Color(0x000000), emissiveIntensity: .16
    }));
  }
  const mats = makeMaterials();
  const faceMat = new MeshStandardMaterial({ color: 0x241a12, roughness: .35, metalness: 0 });

  LAYOUT.forEach((L, i) => {
    const g = new Group();
    g.add(new Mesh(bodyGeo, mats[i]));
    g.add(new Mesh(faceGeo, faceMat));
    g.userData = L;
    holder.add(g);
    bears.push(g);
  });

  /* key, fill and a rim from behind — the rim is what makes the edges glow
     like something you could bite */
  const key  = new DirectionalLight(0xffffff, 2.1); key.position.set(-3, 5, 6);
  const fill = new DirectionalLight(0xbdd4ff, .8);  fill.position.set(5, -2, 3);
  const rim  = new PointLight(0xffffff, 60, 40);    rim.position.set(0, 1, -7);
  const amb  = new AmbientLight(0xffffff, .35);
  scene.add(key, fill, rim, amb);

  /* ---------- colours, taken from the site's own accent tokens ---------- */
  const hex = v => { const m = /#([0-9a-f]{6})/i.exec(v || ''); return m ? parseInt(m[1], 16) : null; };
  let env = null;
  function readTheme(){
    const cs = getComputedStyle(root);
    const tones = ['--k1','--k2','--k3','--k4']
      .map(k => hex(cs.getPropertyValue(k)))
      .filter(v => v !== null);
    if(tones.length){
      mats.forEach((m, i) => {
        const c = new Color(tones[LAYOUT[i].tone % tones.length]);
        m.color.copy(c);
        m.emissive.copy(c);
      });
    }
    const light = root.getAttribute('data-theme') === 'light';
    if(env) env.dispose();
    env = studio(renderer, light);
    scene.environment = env;
    /* a white page throws a lot back at them; dialled down, the sweets keep
       their colour instead of going pastel */
    scene.environmentIntensity = light ? .62 : .8;
    amb.intensity = light ? .3 : .35;
    renderer.toneMappingExposure = light ? .92 : 1.05;
    draw();
  }

  /* ---------- sizing ---------- */
  let w = 0, h = 0;
  function layout(){
    const r = host.getBoundingClientRect();
    w = r.width; h = r.height;
    if(!w || !h) return;

    /* 1.5 rather than 2: these are small, round and already antialiased, and
       the difference is invisible next to the cost of shading four times the
       pixels on an integrated GPU */
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    /* how much of the world the camera sees at the plane the bears sit on,
       so a bear asked for "a sixth of the hero" really is that tall */
    const vh = 2 * Math.tan(MathUtils.degToRad(camera.fov) / 2) * camera.position.z;
    const vw = vh * camera.aspect;
    const narrow = w < 900;

    bears.forEach(b => {
      const L = b.userData;
      b.visible = !(narrow && L.mid);
      const s = (L.h * vh) / 2.2;                  /* the bear stands ~2.2 units */
      b.scale.setScalar(s);
      b.position.set((L.at[0] - .5) * vw, (.5 - L.at[1]) * vh, 0);
      b.userData.y0 = b.position.y;
    });
  }

  /* ---------- the loop ---------- */
  let raf = 0, running = false, t0 = 0;
  const e = new Euler();

  function pose(t){
    for(const b of bears){
      if(!b.visible) continue;
      const L = b.userData;
      b.position.y = L.y0 + Math.sin(t / L.bob + L.lean * 7) * (L.h * .09) * (2.2 * b.scale.x / L.h);
      e.set(Math.sin(t / (L.bob * 1.7)) * .12, t * L.spin * .12 + L.lean * 3, L.lean + Math.sin(t / (L.bob * 2.3)) * .1);
      b.setRotationFromEuler(e);
    }
  }

  function draw(){ if(w && h) renderer.render(scene, camera); }

  function frame(now){
    raf = running ? requestAnimationFrame(frame) : 0;
    if(!t0) t0 = now;
    pose((now - t0) / 1000);
    draw();
  }

  /* host.dataset.motion says whether the loop is turning. It costs nothing,
     and without it there is no way to tell a paused canvas from a still one. */
  function play(){
    if(running || reduced.matches) return;
    running = true; host.dataset.motion = 'running';
    raf = requestAnimationFrame(frame);
  }
  function pause(){
    running = false; host.dataset.motion = 'paused';
    cancelAnimationFrame(raf); raf = 0;
  }

  /* ---------- wire up ---------- */
  host.appendChild(canvas);
  layout();
  readTheme();
  pose(0);
  draw();
  host.classList.add('ready');
  host.dataset.motion = 'paused';

  new MutationObserver(readTheme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  let resizeRaf = 0;
  addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => { layout(); pose(0); draw(); });
  }, { passive: true });

  new IntersectionObserver(es => {
    es[0].isIntersecting && !document.hidden ? play() : pause();
  }, { threshold: 0 }).observe(host);

  document.addEventListener('visibilitychange', () => { document.hidden ? pause() : play(); });
  reduced.addEventListener('change', () => { reduced.matches ? pause() : play(); });

  /* a lost context would otherwise leave a blank canvas sitting in the hero */
  canvas.addEventListener('webglcontextlost', ev => { ev.preventDefault(); pause(); host.classList.remove('ready'); });
  canvas.addEventListener('webglcontextrestored', () => { layout(); readTheme(); host.classList.add('ready'); play(); });
}
