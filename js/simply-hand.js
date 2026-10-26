/* ============================================================
   Simply Vision Pro: the white glove hand from the launch film.
   A right hand seen from the player's seat, sculpted as one soft surface:
   capsules and a rounded back of hand blended with smooth unions (a
   signed-distance field), meshed once at load with surface nets, normals
   taken from the field so it shades like a clay model.

   Hand space: x to the right, y up, z toward the player. The origin is the
   index fingertip where it meets a key. setPress(0..1) curls the index
   finger down and the whole hand settles onto the key.
   ============================================================ */

/* ---------- the sculpture ---------- */
const v3 = (x, y, z) => [x, y, z];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.sqrt(dot(a, a));
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// a capsule whose radius runs from ra at a to rb at b
function capsule(a, b, ra, rb) {
  const ab = sub(b, a), l2 = dot(ab, ab);
  return (p) => {
    const ap = sub(p, a);
    const h = Math.min(1, Math.max(0, dot(ap, ab) / l2));
    const d = [ap[0] - ab[0] * h, ap[1] - ab[1] * h, ap[2] - ab[2] * h];
    return len(d) - (ra + (rb - ra) * h);
  };
}
// a finger: a chain of joints with tapering radii, its segments blended softly
function finger(joints, radii) {
  const segs = [];
  for (let i = 0; i < joints.length - 1; i++) segs.push(capsule(joints[i], joints[i + 1], radii[i], radii[i + 1]));
  return (p) => { let d = Infinity; for (const s of segs) d = smin(d, s(p), 0.03); return d; };
}
// a rounded box in its own frame (centre, axes, half sizes, corner radius)
function roundBox(c, ex, ey, ez, b, r) {
  return (p) => {
    const q0 = sub(p, c);
    const q = [Math.abs(dot(q0, ex)) - b[0], Math.abs(dot(q0, ey)) - b[1], Math.abs(dot(q0, ez)) - b[2]];
    const o = [Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0)];
    return len(o) + Math.min(Math.max(q[0], Math.max(q[1], q[2])), 0) - r;
  };
}
function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/* Proportions read from the film: chunky glove fingers about a key wide,
   curled into a pianist's arch; the back of the hand rises from a low wrist
   to a high row of knuckles; the thumb rests at the left. */
function sculpt() {
  const R = 0.088;
  const fingers = [
    // index (its tip is the origin); the middle joint is the high point of the arch
    finger([v3(0.0, 0.36, 0.44), v3(0.0, 0.43, 0.29), v3(0.0, 0.47, 0.13), v3(0.0, 0.28, 0.02), v3(0.0, R, 0.0)], [R * 1.1, R * 1.1, R * 1.06, R * 1.0, R * 0.96]),
    // middle
    finger([v3(0.205, 0.37, 0.44), v3(0.205, 0.45, 0.28), v3(0.21, 0.50, 0.11), v3(0.215, 0.30, -0.01), v3(0.215, R, -0.03)], [R * 1.1, R * 1.1, R * 1.06, R * 1.0, R * 0.96]),
    // ring
    finger([v3(0.39, 0.35, 0.45), v3(0.40, 0.42, 0.29), v3(0.405, 0.46, 0.13), v3(0.41, 0.27, 0.02), v3(0.41, R, 0.0)], [R * 1.06, R * 1.06, R * 1.02, R * 0.97, R * 0.93]),
    // little finger
    finger([v3(0.555, 0.31, 0.46), v3(0.57, 0.36, 0.32), v3(0.585, 0.39, 0.19), v3(0.59, 0.23, 0.10), v3(0.59, R * 0.9, 0.08)], [R * 0.95, R * 0.95, R * 0.9, R * 0.86, R * 0.82]),
  ];
  const thumb = finger([v3(0.0, 0.22, 0.6), v3(-0.14, 0.24, 0.42), v3(-0.19, 0.18, 0.26), v3(-0.17, R, 0.14)], [R * 1.3, R * 1.18, R * 1.08, R * 1.0]);
  // the back of the hand: a soft slab sloping from the wrist up to just under the knuckles
  const knuckles = v3(0.29, 0.33, 0.36), wristTop = v3(0.29, 0.2, 0.8);
  const along = norm(sub(knuckles, wristTop)), ex = [1, 0, 0], up = norm(cross(ex, along));
  const mid = [(knuckles[0] + wristTop[0]) / 2, (knuckles[1] + wristTop[1]) / 2 - 0.045, (knuckles[2] + wristTop[2]) / 2];
  const slab = roundBox(mid, ex, along, up, [0.24, 0.21, 0.0], 0.11);
  const back = (p) => {
    const a = dot(sub(p, mid), along);
    const t = Math.min(1, Math.max(0, (0.22 - a) / 0.44));          // 0 at the knuckles, 1 at the wrist
    const k = 1 - 0.2 * t;
    return slab([mid[0] + (p[0] - mid[0]) / k, p[1], p[2]]) * k;
  };
  // the wrist: wide, a little flattened, flaring into the hand and ending in a soft cuff
  const wristCap = capsule(v3(0.29, 0.18, 0.78), v3(0.29, 0.12, 1.0), 0.21, 0.2);
  const wrist = (p) => wristCap([p[0], 0.18 + (p[1] - 0.18) / 0.72, p[2]]) * 0.72;

  const fIndex = fingers[0];
  const sdf = (p) => {
    let d = smin(back(p), wrist(p), 0.14);
    let f = Infinity;
    for (const g of fingers) f = smin(f, g(p), 0.014);    // glove fingers touch but keep their grooves
    d = smin(d, f, 0.05);
    d = smin(d, thumb(p), 0.07);
    return d;
  };
  // how much a point belongs to the index finger (for its press)
  const bend = (p) => {
    const di = fIndex(p);
    let dr = Infinity;
    for (let i = 1; i < fingers.length; i++) dr = Math.min(dr, fingers[i](p));
    dr = Math.min(dr, back(p) + 0.02, thumb(p));
    const t = Math.min(1, Math.max(0, (dr - di) / 0.08 + 0.5));
    const below = Math.min(1, Math.max(0, (0.32 - p[2]) / 0.08));     // only what lies in front of the knuckle moves
    return t * t * (3 - 2 * t) * below;
  };
  return { sdf, bend, bounds: [[-0.32, -0.04, -0.16], [0.76, 0.62, 1.3]] };
}

/* ---------- surface nets: one smooth mesh from the field ---------- */
function mesh(sdf, bounds, step) {
  const [lo, hi] = bounds;
  const nx = Math.ceil((hi[0] - lo[0]) / step) + 1, ny = Math.ceil((hi[1] - lo[1]) / step) + 1, nz = Math.ceil((hi[2] - lo[2]) / step) + 1;
  const field = new Float32Array(nx * ny * nz);
  const at = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++)
    field[at(i, j, k)] = sdf([lo[0] + i * step, lo[1] + j * step, lo[2] + k * step]);

  const cellVert = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const cat = (i, j, k) => i + (nx - 1) * (j + (ny - 1) * k);
  const pos = [];
  const corners = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const v = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) { v[c] = field[at(i + corners[c][0], j + corners[c][1], k + corners[c][2])]; if (v[c] < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of edges) {
      if ((v[a] < 0) === (v[b] < 0)) continue;
      const t = v[a] / (v[a] - v[b]);
      sx += corners[a][0] + (corners[b][0] - corners[a][0]) * t;
      sy += corners[a][1] + (corners[b][1] - corners[a][1]) * t;
      sz += corners[a][2] + (corners[b][2] - corners[a][2]) * t;
      n++;
    }
    cellVert[cat(i, j, k)] = pos.length / 3;
    pos.push(lo[0] + (i + sx / n) * step, lo[1] + (j + sy / n) * step, lo[2] + (k + sz / n) * step);
  }
  const idx = [];
  const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d); };
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const inside = field[at(i, j, k)] < 0;
    if (j > 0 && k > 0 && inside !== (field[at(i + 1, j, k)] < 0))   // edge along x
      quad(cellVert[cat(i, j - 1, k - 1)], cellVert[cat(i, j, k - 1)], cellVert[cat(i, j, k)], cellVert[cat(i, j - 1, k)], !inside);
    if (i > 0 && k > 0 && inside !== (field[at(i, j + 1, k)] < 0))   // edge along y
      quad(cellVert[cat(i - 1, j, k - 1)], cellVert[cat(i - 1, j, k)], cellVert[cat(i, j, k)], cellVert[cat(i, j, k - 1)], !inside);
    if (i > 0 && j > 0 && inside !== (field[at(i, j, k + 1)] < 0))   // edge along z
      quad(cellVert[cat(i - 1, j - 1, k)], cellVert[cat(i, j - 1, k)], cellVert[cat(i, j, k)], cellVert[cat(i - 1, j, k)], !inside);
  }
  return { pos, idx };
}

/* ---------- the three.js object ---------- */
export function buildHand(THREE, { step = 0.0135 } = {}) {
  const { sdf, bend, bounds } = sculpt();
  const { pos, idx } = mesh(sdf, bounds, step);
  const n = pos.length / 3;
  const normals = new Float32Array(n * 3), weights = new Float32Array(n), colors = new Float32Array(n * 3);
  const e = 0.004;
  for (let i = 0; i < n; i++) {
    const p = [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
    const g = norm([
      sdf([p[0] + e, p[1], p[2]]) - sdf([p[0] - e, p[1], p[2]]),
      sdf([p[0], p[1] + e, p[2]]) - sdf([p[0], p[1] - e, p[2]]),
      sdf([p[0], p[1], p[2] + e]) - sdf([p[0], p[1], p[2] - e]),
    ]);
    normals.set(g, i * 3);
    weights[i] = bend(p);
    // soft occlusion baked from the field: grooves between fingers and creases darken a little, like the film's render
    let occ = 0;
    for (let s = 1; s <= 5; s++) {
      const h = s * 0.03;
      occ += (h - sdf([p[0] + g[0] * h, p[1] + g[1] * h, p[2] + g[2] * h])) / Math.pow(2, s);
    }
    const ao = Math.min(1, Math.max(0, 1 - occ * 4.2));
    const c = 0.62 + 0.38 * ao;
    colors[i * 3] = c; colors[i * 3 + 1] = c * 0.99; colors[i * 3 + 2] = c * 0.975;
  }
  // wind every triangle to face out, along the field's gradient
  for (let t = 0; t < idx.length; t += 3) {
    const [a, b, c] = [idx[t], idx[t + 1], idx[t + 2]];
    const pa = [pos[a * 3], pos[a * 3 + 1], pos[a * 3 + 2]];
    const fn = cross(sub([pos[b * 3], pos[b * 3 + 1], pos[b * 3 + 2]], pa), sub([pos[c * 3], pos[c * 3 + 1], pos[c * 3 + 2]], pa));
    const nn = [normals[a * 3] + normals[b * 3] + normals[c * 3], normals[a * 3 + 1] + normals[b * 3 + 1] + normals[c * 3 + 1], normals[a * 3 + 2] + normals[b * 3 + 2] + normals[c * 3 + 2]];
    if (dot(fn, nn) < 0) { idx[t + 1] = c; idx[t + 2] = b; }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('aBend', new THREE.BufferAttribute(weights, 1));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex(idx);

  // a soft matte glove: warm white, a little sheen at the edges like cotton
  const mat = new THREE.MeshPhysicalMaterial({ color: '#f6f3ee', vertexColors: true, roughness: 0.78, metalness: 0, sheen: 0.6, sheenRoughness: 0.7, sheenColor: new THREE.Color('#ffffff') });
  const uBend = { value: 0 };
  const knuckle = new THREE.Vector3(0, 0.42, 0.28);
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uBend = uBend;
    sh.uniforms.uKnuckle = { value: knuckle };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aBend;\nuniform float uBend;\nuniform vec3 uKnuckle;\nmat3 bendRot(float a){ float c = cos(a), s = sin(a); return mat3(1.0,0.0,0.0, 0.0,c,s, 0.0,-s,c); }')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nobjectNormal = bendRot(uBend * aBend) * objectNormal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = uKnuckle + bendRot(uBend * aBend) * (transformed - uKnuckle);');
  };
  const hand = new THREE.Mesh(geo, mat);
  hand.castShadow = true;
  hand.receiveShadow = true;
  hand.userData.setPress = (v) => { uBend.value = -0.32 * v; };   // the fingertip swings down toward the key
  return hand;
}
