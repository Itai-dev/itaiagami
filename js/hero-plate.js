/* ============================================================
   The plate (home hero). One job: move between five project
   stills the way the work itself is made: a line drawing first,
   then the finished image developing across it. Under a mouse,
   a small lens shows the drawing beneath the finished frame.

   - The <img> in the markup is the static frame. It is what you
     get without JavaScript, without WebGL, with reduced motion,
     and if the GL context is lost. It always holds the current
     project, so any fallback is correct.
   - Three.js is fetched only here, only when the plate will run.
   - Renders on demand. No frame is drawn unless a value changed.
   - Auto-advance stops when the plate is off screen, the tab is
     hidden, the window loses focus, or the pointer/keyboard is on it.
   ============================================================ */
const fig = document.querySelector('[data-plate]');
if (fig) setup();

function setup() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gsap = window.gsap;
  const panel = fig.querySelector('.feature-panel');
  const media = fig.querySelector('.fp-media');
  const img = media.querySelector('img');
  const links = [...fig.querySelectorAll('.fp-index a')];
  const desc = fig.querySelector('.fp-now .fc-d');
  const name = fig.querySelector('.fp-now .fc-t');
  const more = fig.querySelector('.fp-now .fc-r');
  const slides = links.map(a => ({
    a, src: a.dataset.src, alt: a.dataset.alt, desc: a.dataset.desc,
    href: a.getAttribute('href'), title: a.querySelector('.fi-t').textContent
  }));
  let current = 0, gl = null;

  /* caption, link and index follow the plate */
  function label(i) {
    const s = slides[i];
    links.forEach((a, j) => { if (j === i) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    panel.href = s.href; panel.setAttribute('aria-label', 'Featured project: ' + s.title + ' case study');
    if (name) name.textContent = s.title;
    if (desc) desc.textContent = s.desc;
    if (more) more.href = s.href;
  }
  function still(i) { const s = slides[i]; img.src = s.src; img.alt = s.alt; }
  function show(i) {
    if (i === current) return;
    current = i; label(i);
    if (gl && gl.live) gl.to(i); else still(i);
  }

  /* the index previews on hover and focus; a click still opens the case study */
  let intent = 0;
  links.forEach((a, i) => {
    a.addEventListener('pointerenter', e => { if (e.pointerType !== 'mouse') return; clearTimeout(intent); intent = setTimeout(() => show(i), 90); });
    a.addEventListener('pointerleave', () => clearTimeout(intent));
    a.addEventListener('focus', () => show(i));
  });

  if (reduce || !gsap) return;

  /* ---------- auto-advance ---------- */
  let visible = false, engaged = false, timer = null;
  const due = () => { timer = null; if (!canRun()) return; show((current + 1) % slides.length); arm(); };
  const canRun = () => visible && !engaged && !document.hidden && document.hasFocus();
  function arm() { if (timer) timer.kill(); timer = canRun() ? gsap.delayedCall(6, due) : null; }
  const engage = on => () => { engaged = on; arm(); };
  fig.addEventListener('pointerenter', engage(true));
  fig.addEventListener('pointerleave', engage(false));
  fig.addEventListener('focusin', engage(true));
  fig.addEventListener('focusout', engage(false));
  const onVis = () => { if (gl) gl.rest(); arm(); };
  document.addEventListener('visibilitychange', onVis);
  addEventListener('blur', onVis);
  addEventListener('focus', arm);
  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; arm(); }, { threshold: .25 });
  io.observe(fig);

  /* ---------- WebGL ---------- */
  let introAsked = false;
  addEventListener('plate:intro', () => { introAsked = true; if (gl && gl.ready) gl.intro(); }, { once: true });
  const idle = window.requestIdleCallback || (fn => setTimeout(fn, 1));
  idle(() => start().catch(() => { /* the still stays; nothing else depends on the canvas */ }));

  async function start() {
    const probe = document.createElement('canvas');
    if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return;
    const THREE = await import('./vendor/three.module.min.js');

    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); blank.needsUpdate = true;
    const u = {
      tA: { value: blank }, tB: { value: blank },
      rA: { value: new THREE.Vector2(1, 1) }, rB: { value: new THREE.Vector2(1, 1) },
      res: { value: new THREE.Vector2(1, 1) }, hasA: { value: 0 },
      f1: { value: -.2 }, f2: { value: -.2 },
      ptr: { value: new THREE.Vector2(.5, .5) }, lens: { value: 0 },
      paper: { value: new THREE.Vector3(1, 1, 1) }, ink: { value: new THREE.Vector3(0, 0, 0) },
      mark: { value: new THREE.Vector3(.949, .361, .02) }
    };
    const material = new THREE.ShaderMaterial({
      uniforms: u, depthTest: false, depthWrite: false,
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader: FRAG
    });
    scene.add(new THREE.Mesh(geometry, material));

    /* render on demand: one frame per change, never a free-running loop */
    let raf = 0, lost = false;
    const draw = () => { raf = 0; if (!lost) renderer.render(scene, camera); };
    const invalidate = () => { if (!raf) raf = requestAnimationFrame(draw); };

    /* theme colours come from css, and follow the theme switch */
    const rgb = v => { const m = /(\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(v) || [0, 0, 0, 0]; return [m[1] / 255, m[2] / 255, m[3] / 255]; };
    const swatch = document.createElement('i'); swatch.hidden = true; fig.appendChild(swatch);
    function tint() {
      const read = name => { swatch.style.color = 'var(' + name + ')'; return rgb(getComputedStyle(swatch).color); };
      u.paper.value.set(...read('--plate-paper')); u.ink.value.set(...read('--plate-ink')); invalidate();
    }
    const themeWatch = new MutationObserver(tint);
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    tint();

    function size() {
      const w = media.clientWidth, h = media.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.getDrawingBufferSize(u.res.value);
      invalidate();
    }
    const ro = new ResizeObserver(size); ro.observe(media);

    const loader = new THREE.TextureLoader();
    const cache = new Map();
    const tex = i => {
      if (!cache.has(i)) cache.set(i, new Promise((ok, no) => loader.load(slides[i].src, t => {
        t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; ok(t);
      }, undefined, no)));
      return cache.get(i);
    };
    const put = (slot, res, t) => { slot.value = t; res.value.set(t.image.width, t.image.height); };

    let tl = null, shown = current, wanted = current;
    const land = () => { still(shown); };
    async function to(i) {
      wanted = i;
      let t; try { t = await tex(i); } catch (e) { still(i); return; }
      if (wanted !== i || i === shown) return;
      if (tl) tl.progress(1).kill();
      /* what is on the plate becomes A; the new project draws over it, then develops */
      put(u.tA, u.rA, u.tB.value); u.hasA.value = 1;
      put(u.tB, u.rB, t); u.f1.value = u.f2.value = -.2; shown = i;
      tl = gsap.timeline({ onUpdate: invalidate, onComplete: land })
        .to(u.f1, { value: 1.25, duration: 1.15, ease: 'power2.inOut' }, 0)
        .to(u.f2, { value: 1.25, duration: 1.35, ease: 'power2.inOut' }, .32);
    }
    function intro() {
      if (tl) return;
      u.hasA.value = 0; u.f1.value = u.f2.value = -.2;
      canvas.classList.add('on'); invalidate();
      tl = gsap.timeline({ onUpdate: invalidate, onComplete: () => { tl = null; } })
        .to(u.f1, { value: 1.25, duration: 1.3, ease: 'power2.inOut' }, 0)
        .to(u.f2, { value: 1.25, duration: 1.7, ease: 'power2.inOut' }, .75);
    }

    /* the lens: mouse only, eased, and put away whenever attention leaves */
    const px = gsap.quickTo(u.ptr.value, 'x', { duration: .45, ease: 'power3.out', onUpdate: invalidate });
    const py = gsap.quickTo(u.ptr.value, 'y', { duration: .45, ease: 'power3.out', onUpdate: invalidate });
    const lensTo = v => gsap.to(u.lens, { value: v, duration: v ? .5 : .35, ease: 'power2.out', overwrite: true, onUpdate: invalidate });
    let box = null, mx = 0, my = 0, moved = false;
    const track = () => { moved = false; if (!box) return; px((mx - box.left) / box.width); py(1 - (my - box.top) / box.height); };
    const onMove = e => {
      if (e.pointerType !== 'mouse') return;
      if (!box) { box = media.getBoundingClientRect(); lensTo(1); }
      mx = e.clientX; my = e.clientY;
      if (!moved) { moved = true; requestAnimationFrame(track); }   /* at most one read per frame */
    };
    const rest = () => { box = null; lensTo(0); };
    media.addEventListener('pointermove', onMove, { passive: true });
    media.addEventListener('pointerleave', rest);
    addEventListener('scroll', () => { if (box) box = media.getBoundingClientRect(); }, { passive: true });

    /* a lost context falls back to the still; a restored one picks up where it was */
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; canvas.classList.remove('on'); });
    canvas.addEventListener('webglcontextrestored', () => { lost = false; size(); canvas.classList.add('on'); });

    const first = await tex(current);
    put(u.tB, u.rB, first); shown = current;
    media.appendChild(canvas); size();
    gl = { live: true, ready: true, to, intro, rest };
    if (introAsked) intro(); else { u.f1.value = u.f2.value = 1.25; canvas.classList.add('on'); invalidate(); }
    idle(() => slides.forEach((s, i) => tex(i).catch(() => {})));

    addEventListener('pagehide', e => {
      if (e.persisted) return;
      gl.live = false;
      if (tl) tl.kill(); if (timer) timer.kill(); clearTimeout(intent);
      gsap.killTweensOf([u.lens, u.ptr.value, u.f1, u.f2]);
      cancelAnimationFrame(raf);
      io.disconnect(); ro.disconnect(); themeWatch.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      removeEventListener('blur', onVis); removeEventListener('focus', arm);
      media.removeEventListener('pointermove', onMove); media.removeEventListener('pointerleave', rest);
      cache.forEach(p => p.then(t => t.dispose()).catch(() => {}));
      blank.dispose(); geometry.dispose(); material.dispose(); renderer.dispose();
      canvas.remove();
    });
  }
}

/* A = the project leaving, B = the project arriving.
   Two fronts cross the plate on a diagonal. Behind the first, B appears as a
   line drawing on paper; behind the second, B is the finished image. */
const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tA, tB;
uniform vec2 rA, rB, res, ptr;
uniform float hasA, f1, f2, lens;
uniform vec3 paper, ink, mark;

vec2 cover(vec2 uv, vec2 r){
  float a = res.x / res.y, t = r.x / r.y;
  vec2 s = a > t ? vec2(1., t / a) : vec2(a / t, 1.);
  return (uv - .5) * s + .5;
}
float luma(vec3 c){ return dot(c, vec3(.299, .587, .114)); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
}
/* the drawing: Sobel edges of the photograph, inked on paper over a faint construction grid */
vec3 drawing(vec2 uv){
  vec2 e = 1.6 / res;
  float tl = luma(texture2D(tB, cover(uv + e * vec2(-1.,  1.), rB)).rgb);
  float  t = luma(texture2D(tB, cover(uv + e * vec2( 0.,  1.), rB)).rgb);
  float tr = luma(texture2D(tB, cover(uv + e * vec2( 1.,  1.), rB)).rgb);
  float  l = luma(texture2D(tB, cover(uv + e * vec2(-1.,  0.), rB)).rgb);
  float  r = luma(texture2D(tB, cover(uv + e * vec2( 1.,  0.), rB)).rgb);
  float bl = luma(texture2D(tB, cover(uv + e * vec2(-1., -1.), rB)).rgb);
  float  b = luma(texture2D(tB, cover(uv + e * vec2( 0., -1.), rB)).rgb);
  float br = luma(texture2D(tB, cover(uv + e * vec2( 1., -1.), rB)).rgb);
  float gx = (tr + 2. * r + br) - (tl + 2. * l + bl);
  float gy = (tl + 2. * t + tr) - (bl + 2. * b + br);
  float line = smoothstep(.1, .44, length(vec2(gx, gy)));
  vec2 cell = res.y / 12. * vec2(1.);
  vec2 g = abs(fract(gl_FragCoord.xy / cell) - .5) * cell;
  float grid = 1. - smoothstep(.0, 1.2, min(g.x, g.y));
  vec3 c = mix(paper, ink, grid * .07);
  return mix(c, ink, line * .86);
}
void main(){
  vec3 photoB = texture2D(tB, cover(vUv, rB)).rgb;
  vec3 photoA = texture2D(tA, cover(vUv, rA)).rgb;
  vec3 sketch = drawing(vUv);
  float d = (vUv.x * .75 + (1. - vUv.y) * .55) / 1.3 + (noise(vUv * 7.) - .5) * .07;
  float m1 = smoothstep(0., .05, f1 - d);
  float m2 = smoothstep(0., .16, f2 - d);
  vec3 col = mix(paper, photoA, hasA);
  col = mix(col, sketch, m1);
  col = mix(col, photoB, m2);
  /* the lens */
  vec2 q = (vUv - ptr) * vec2(res.x / res.y, 1.);
  float dist = length(q), rad = .17;
  float inside = (1. - smoothstep(rad - .012, rad, dist)) * lens * m2;
  col = mix(col, sketch, inside);
  float px = 1.5 / res.y;
  float ring = (1. - smoothstep(px, px * 2.2, abs(dist - rad))) * lens * m2;
  col = mix(col, mark, ring);
  gl_FragColor = vec4(col, 1.);
}`;
