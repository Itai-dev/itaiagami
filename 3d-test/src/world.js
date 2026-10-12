/* The world: every screen, floor, slab and line in one composition, and the
   loading of what they show.

   A screen is one unlit plane. It never waits for its image: it starts as a
   flat field of the image's average colour, takes the 48px placeholder as soon
   as that arrives (it reads as a soft glow of the work), and only takes the
   full image once the camera comes within loadRadius. Video screens keep their
   poster image until the camera is within videoRadius and the screen is in
   view; then the video loads, and it pauses again when left behind.

   Light is faked, not computed: screens are unlit, a screen that stands on a
   floor gets a mirrored copy under it (the reflection) and a pool of its own
   colour on the floor in front of it. Fog takes everything into black. */
import {
  AdditiveBlending, BackSide, CanvasTexture, Color, DataTexture, DoubleSide, EdgesGeometry,
  Frustum, LineBasicMaterial, LineSegments, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry,
  RGBAFormat, SRGBColorSpace, Sphere, Texture, Vector3, VideoTexture,
} from 'three';
import { TEX } from './textures.js';

const PLANE = new PlaneGeometry(1, 1);
const EDGES = new EdgesGeometry(PLANE);
const WHITE = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, RGBAFormat);
WHITE.needsUpdate = true;

/** A greyscale canvas texture (for alpha maps and light pools: grey, never transparent pixels). */
function canvasTexture(size, paint) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, size, size);
  paint(g, size);
  return new CanvasTexture(c);
}
const radial = (stops) => canvasTexture(128, (g, s) => {
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  stops.forEach(([at, v]) => r.addColorStop(at, `rgb(${v},${v},${v})`));
  g.fillStyle = r; g.fillRect(0, 0, s, s);
});
// the reflection fades out downwards: bright where the screen meets the floor (uv.y = 0), gone at its far edge
const FADE = canvasTexture(64, (g, s) => {
  const l = g.createLinearGradient(0, 0, 0, s);
  l.addColorStop(0, '#000'); l.addColorStop(0.55, '#111'); l.addColorStop(1, '#bbb');
  g.fillStyle = l; g.fillRect(0, 0, s, s);
});
const FLOOR = radial([[0, 255], [0.6, 200], [1, 0]]);
const POOL = radial([[0, 255], [0.35, 110], [1, 0]]);

const BACK = new MeshBasicMaterial({ color: '#0e0e10', side: BackSide });
const SLAB = new MeshBasicMaterial({ color: '#0b0b0c', side: DoubleSide });
const EDGE = new MeshBasicMaterial({ color: '#1e1e21', side: DoubleSide });
const LINE = new MeshBasicMaterial({ color: '#3d3d40' });

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onerror = reject;
    img.src = url;
    // decode off the main thread where the browser can, so the upload doesn't stall a frame
    img.decode().then(() => resolve(img), () => (img.complete && img.naturalWidth ? resolve(img) : reject(new Error(url))));
  });
}

export class World {
  constructor(scene, renderer, mode, tier) {
    this.scene = scene;
    this.renderer = renderer;
    this.mode = mode;
    this.tier = tier;            // 'lg' or 'sm': the best image this device is allowed
    this.items = [];
    this.objects = [];           // everything added to the scene, for dispose()
    this.textures = new Set();
    this.queue = [];
    this.loading = 0;
    this.changed = true;
    this.frustum = new Frustum();
    this.m4 = new Matrix4();
    this.sphere = new Sphere();
    this.aniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    mode.screens.forEach((s, i) => this.addScreen(s, i));
    (mode.floors || []).forEach((f) => this.addFloor(f));
    (mode.slabs || []).forEach((s) => this.addSlab(s));
    (mode.lines || []).forEach((l) => this.addLine(l));
  }

  add(obj) { this.scene.add(obj); this.objects.push(obj); return obj; }

  addScreen(spec, index) {
    const t = TEX[spec.tex], aspect = t.w / t.h;
    const w = spec.w ?? spec.h * aspect, h = spec.h ?? spec.w / aspect;
    const placeholder = new Color(t.color);
    const mat = new MeshBasicMaterial({ map: WHITE, color: placeholder.clone() });
    const mesh = this.add(new Mesh(PLANE, mat));
    mesh.scale.set(w, h, 1);
    mesh.position.fromArray(spec.pos);
    if (spec.rot) mesh.rotation.fromArray(spec.rot);
    mesh.add(new Mesh(PLANE, BACK));
    const outline = new LineSegments(EDGES, new LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
    outline.scale.setScalar(1.0);
    mesh.add(outline);
    mesh.updateMatrixWorld();

    const item = {
      index, spec, slug: spec.slug, tex: t, w, h, mesh, mat, outline, placeholder,
      center: mesh.position.clone(),
      normal: new Vector3(0, 0, 1).applyQuaternion(mesh.quaternion),
      state: 'none', lq: null, hi: null, video: null, vtex: null, playing: false,
      dim: 1, dimTo: 1, glow: 0, glowTo: 0, mirror: null, pool: null,
    };
    mesh.userData.item = item;

    const floorY = this.mode.floorY;
    if (spec.reflect && floorY != null) {
      const mm = new MeshBasicMaterial({ map: WHITE, color: placeholder.clone(), alphaMap: FADE, transparent: true, opacity: 0.55, depthWrite: false, side: DoubleSide });
      const m = this.add(new Mesh(PLANE, mm));
      m.scale.set(w, -h, 1);
      m.position.set(spec.pos[0], 2 * floorY - spec.pos[1], spec.pos[2]);
      if (spec.rot) m.rotation.set(-spec.rot[0], spec.rot[1], -spec.rot[2]);
      m.renderOrder = 1;
      item.mirror = mm;
    }
    if (spec.glow && floorY != null) {
      const pm = new MeshBasicMaterial({ map: POOL, color: placeholder.clone().multiplyScalar(0.4), blending: AdditiveBlending, transparent: true, depthWrite: false });
      const p = this.add(new Mesh(PLANE, pm));
      p.rotation.x = -Math.PI / 2;
      // the pool lies on the floor in front of the screen: a little wider than it, a third as deep
      const fwd = item.normal.clone().setY(0).normalize();
      p.position.set(spec.pos[0] + fwd.x * w * 0.18, floorY + 0.02, spec.pos[2] + fwd.z * w * 0.18);
      p.rotation.z = Math.atan2(fwd.x, fwd.z);
      p.scale.set(w * 1.15, w * 0.34, 1);
      p.renderOrder = 3;
      item.pool = pm;
    }
    this.items.push(item);
    // every placeholder is requested at once: 48px images, a few hundred bytes each
    this.request(item, 'lq', index === 0 ? 0 : 1);
  }

  addFloor({ pos, r }) {
    const m = this.add(new Mesh(PLANE, new MeshBasicMaterial({ color: '#0a0a0b', alphaMap: FLOOR, transparent: true, opacity: 0.86, depthWrite: false })));
    m.rotation.x = -Math.PI / 2;
    m.position.set(pos[0], this.mode.floorY, pos[1]);
    m.scale.set(r * 2, r * 2, 1);
    m.renderOrder = 2;
  }

  addSlab({ pos, w, h }) {
    const m = this.add(new Mesh(PLANE, SLAB));
    m.position.fromArray(pos);
    m.scale.set(w, h, 1);
    // a hairline catches each vertical edge, so the gate reads against the dark
    for (const side of [-1, 1]) {
      const e = this.add(new Mesh(PLANE, EDGE));
      e.position.set(pos[0] + side * w / 2, pos[1], pos[2] + 0.01);
      e.scale.set(0.05, h, 1);
    }
  }

  addLine({ pos, w }) {
    const m = this.add(new Mesh(PLANE, LINE));
    m.position.fromArray(pos);
    m.rotation.x = -Math.PI / 2;
    m.scale.set(w, 0.06, 1);
  }

  /* ---------- loading ---------- */

  request(item, tier, priority = 1) {
    const key = item.spec.tex + ':' + tier;
    if (item['req_' + tier]) return;
    item['req_' + tier] = true;
    this.queue.push({ item, tier, priority, key });
    this.queue.sort((a, b) => a.priority - b.priority);
    this.pump();
  }

  pump() {
    // at most three images in flight, so the nearest ones are never stuck behind the rest
    while (this.loading < 3 && this.queue.length) {
      const job = this.queue.shift();
      this.loading++;
      const { item, tier } = job;
      const file = tier === 'lq' ? 'lq' : (item.spec.tier === 'lg' && this.tier === 'lg' ? 'lg' : 'sm');
      loadImage(`/3d-test/tex/${item.spec.tex}-${file}.webp`).then((img) => {
        if (this.disposed) return;
        const tex = new Texture(img);
        tex.colorSpace = SRGBColorSpace;
        tex.anisotropy = tier === 'lq' ? 1 : this.aniso;
        tex.needsUpdate = true;
        this.textures.add(tex);
        if (tier === 'lq') {
          item.lq = tex;
          if (item.state === 'none') this.show(item, tex, 'lq');
        } else {
          item.hi = tex;
          if (!item.playing) this.show(item, tex, 'hi');
        }
      }).catch(() => {}).finally(() => { this.loading--; this.pump(); });
    }
  }

  show(item, tex, state) {
    item.state = state;
    item.mat.map = tex;
    if (item.mirror) item.mirror.map = tex;
    this.tint(item);
    this.changed = true;
  }

  tint(item) {
    // a screen shows its image at full strength; before the image, its average colour
    const base = item.state === 'none' ? item.placeholder : new Color(1, 1, 1);
    item.mat.color.copy(base).multiplyScalar(item.dim);
    if (item.mirror) { item.mirror.color.copy(base).multiplyScalar(item.dim); }
    if (item.pool) item.pool.opacity = item.dim;
  }

  startVideo(item) {
    if (!item.video) {
      const v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
      v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      v.src = item.tex.webm && v.canPlayType('video/webm; codecs="vp9"') ? item.tex.webm : item.tex.video;
      v.addEventListener('playing', () => {
        if (this.disposed) return;
        if (!item.vtex) { item.vtex = new VideoTexture(v); item.vtex.colorSpace = SRGBColorSpace; this.textures.add(item.vtex); }
        item.playing = true;
        this.show(item, item.vtex, 'video');
      });
      v.addEventListener('pause', () => { item.playing = false; });
      item.video = v;
    }
    const p = item.video.play();
    if (p) p.catch(() => {});
  }

  /* ---------- per frame ---------- */

  /** Loads what the camera is near, plays the videos in view, eases hover and focus. Returns true if anything changed. */
  update(camera, dt, { hovered, focused }) {
    let changed = this.changed;
    this.changed = false;
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const k = 1 - Math.exp(-dt * 6);
    for (const item of this.items) {
      const d = camera.position.distanceTo(item.center);
      const r = Math.max(item.w, item.h) / 2;
      // full image when near; dropped again when far behind, so memory stays flat on a long scroll
      if (d - r < this.mode.loadRadius) this.request(item, 'hi', d);
      else if (item.hi && !item.playing && d - r > this.mode.loadRadius * 2.2) {
        item.hi.dispose(); this.textures.delete(item.hi); item.hi = null; item.req_hi = false;
        if (item.lq) this.show(item, item.lq, 'lq');
      }
      if (item.tex.video) {
        this.sphere.set(item.center, r);
        const near = d - r < this.mode.videoRadius && this.frustum.intersectsSphere(this.sphere);
        if (near && (!item.video || item.video.paused)) this.startVideo(item);
        else if (!near && item.video && !item.video.paused) item.video.pause();
        if (item.playing) changed = true;   // a playing video needs new frames
      }
      // focus dims everything else; hover draws a hairline round the screen
      // (a linear-light factor: 0.08 reads as about a quarter of the brightness on screen)
      item.dimTo = focused && focused.slug !== item.slug ? 0.08 : 1;
      item.glowTo = hovered === item || (focused && focused === item) ? 0.55 : 0;
      if (Math.abs(item.dim - item.dimTo) > 0.002) { item.dim += (item.dimTo - item.dim) * k; this.tint(item); changed = true; }
      if (Math.abs(item.glow - item.glowTo) > 0.002) { item.glow += (item.glowTo - item.glow) * k; item.outline.material.opacity = item.glow; changed = true; }
    }
    return changed;
  }

  get stats() {
    let hi = 0, videos = 0;
    for (const i of this.items) { if (i.state === 'hi') hi++; if (i.playing) videos++; }
    return { screens: this.items.length, hi, videos };
  }

  dispose() {
    this.disposed = true;
    for (const o of this.objects) {
      this.scene.remove(o);
      o.traverse((c) => { if (c.material && c.material !== BACK && c.material !== SLAB && c.material !== EDGE && c.material !== LINE) c.material.dispose(); });
    }
    for (const t of this.textures) t.dispose();
    for (const i of this.items) if (i.video) { i.video.pause(); i.video.removeAttribute('src'); i.video.load(); }
  }
}
