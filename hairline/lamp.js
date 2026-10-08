/**
 * Lamp: a work desk with a laptop, a notebook and a mug, and a jointed desk
 * lamp at the back. The pointer picks an item; the lamp's two arms fold so its
 * shade swings over it and dips, and a dashed pool of light lands on the desk
 * under it. At rest the lamp leans out over a bare corner of the desk, its shade bright.
 * The slider is the dip: how far the shade comes down over what it lights.
 *
 * The pattern: one of many. Tweens for which item, a two-link arm solved for
 * the shade's place, and a hit test on each item's resting top, never on the
 * lamp, which is the only thing that moves.
 */
const {
  Cam, clamp, facing, fillet, fit, hull, open, poly, prism, proj, rad, ringAt, rings, rrect, run, seg,
  tdone, tset, tval, tween, unproj, disposer, mk, place, pointer, put, register, solid,
} = HL;

const DW = 150, DD = 96, Z = 36, LEG = 8;
const BX = 76, BY = 12, PZ = Z + 5, L1 = 50, L2 = 48, SR = 11, ST = 4, SH = 12;
const TILT = rad(14), SCR = 28, REST_UP = 24, UP = 20;

/** The items, each with its footprint, its top, and the boxes the pointer is tested against at rest. */
const ITEMS = [
  { name: "laptop", cx: 31, cy: 39, top: Z + 2, hits: [[10, 24, 52, 54, Z + 2], [10, 14, 52, 26, Z + 16]] },
  { name: "notes", cx: 71, cy: 73, top: Z + 2.5, hits: [[50, 60, 92, 86, Z + 2.5]] },
  { name: "mug", cx: 124, cy: 40, top: Z + 14, hits: [[115, 31, 136, 49, Z + 14]] },
];

/** A circle of radius R round (cx, cy), as a ring of samples. */
const disc = (cx, cy, R) => rrect(cx - R, cy - R, cx + R, cy + R, R, 8);

/** Where the elbow sits when the arm reaches from the pivot to the shade's hook at (hx, hy, hz). */
function elbow(hx, hy, hz) {
  const dx = hx - BX, dy = hy - BY, r = Math.hypot(dx, dy) || 1e-3, dz = hz - PZ;
  const D = Math.min(Math.hypot(r, dz), L1 + L2 - 2);
  const a = Math.acos(clamp((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1));
  const th = Math.atan2(dz, r) + a, h = L1 * Math.cos(th);
  return [BX + (dx / r) * h, BY + (dy / r) * h, PZ + L1 * Math.sin(th)];
}

/** The laptop: a hinged lid leaning back, then the base with its keyboard and trackpad. */
function laptop(P, front, g) {
  const w = (u, v, o = 0) => P(u, 24 - v * Math.sin(TILT) - o, Z + 2 + v * Math.cos(TILT));
  const lid = fillet([[11, 0], [51, 0], [51, SCR], [11, SCR]], [1, 1, 2.6, 2.6]);
  const bez = fillet([[13.5, 2.5], [48.5, 2.5], [48.5, SCR - 2.5], [13.5, SCR - 2.5]], [0.6, 0.6, 1.4, 1.4]);
  const back = mk("path", { d: poly(lid.map((p) => w(p[0], p[1], 1.4))), class: "lo" }, g);
  const face = mk("path", { d: poly(lid.map((p) => w(p[0], p[1]))), class: "sil" }, g);
  mk("path", { d: poly(bez.map((p) => w(p[0], p[1]))), class: "nf lo" }, g);
  const [r, i] = rings(10, 24, 52, 54, 3, 1);
  const base = solid(g);
  put(base, prism(P, front, r, i, Z, Z + 2));
  mk("path", { d: poly(ringAt(P, rrect(14, 27, 48, 41, 1.4, 3), Z + 2)), class: "nf lo" }, g);
  mk("path", { d: poly(ringAt(P, rrect(24, 44, 38, 51, 1.4, 3), Z + 2)), class: "nf lo" }, g);
  return [back, face, base.sil];
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let dip = value, act = -1;

  // Every pose the shade can take, so the fit holds the lamp at its highest and lowest.
  const poses = [[116, 74, Z + REST_UP]].concat(ITEMS.flatMap((it) => [0, 12].map((d) => [it.cx, it.cy, it.top + UP - d])));
  const extreme = poses.flatMap(([x, y, z]) => [elbow(x, y, z + SH + 3), [x - SR, y - SR, z], [x + SR, y + SR, z], [x, y, z + SH + 3]]);
  const C = Cam(45, 0.5, 1.55);
  fit(C, [[0, 0, Z], [DW, DD, 0], [DW, 0, 0], [0, DD, 0], [BX, BY, PZ]].concat(extreme), 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  // The desk: four legs, back to front, then the top that covers their heads.
  for (const [x, y] of [[4, 4], [DW - 12, 4], [4, DD - 12], [DW - 12, DD - 12]]) {
    const [r, i] = rings(x, y, x + LEG, y + LEG, 3, 0.8);
    put(solid(g), prism(P, front, r, i, 0, Z - 6));
  }
  const [dr, di] = rings(0, 0, DW, DD, 8, 2.2);
  put(solid(g), prism(P, front, dr, di, Z - 6, Z));
  // The pool of light: a guide on the desk, painted before the items that stand in it.
  const pool = mk("path", { class: "dash nf" }, g);

  const lit = [laptop(P, front, g)];
  // The lamp's foot sits behind the notebook and the mug.
  const [fr, fi] = [disc(BX, BY, 9), disc(BX, BY, 7.4)];
  put(solid(g), prism(P, front, fr, fi, Z, Z + 3));
  const nb = solid(g);
  put(nb, prism(P, front, ...rings(50, 60, 92, 86, 2.4, 1.2), Z, Z + 2.5));
  // the notebook's spiral: rings along its spine
  for (let k = 0; k < 7; k++) place(mk("circle", { r: 1, class: "dot off" }, g), P(53, 63 + k * 3.4, Z + 2.5));
  mk("path", { d: seg(P(57, 62, Z + 2.5), P(57, 84, Z + 2.5)), class: "nf lo" }, g);
  lit.push([nb.sil]);
  const mug = solid(g);
  put(mug, prism(P, front, disc(124, 40, 7), disc(124, 40, 5.8), Z, Z + 14));
  // the handle, a loop on the near side of the mug
  const loop = [];
  for (let k = 0; k <= 10; k++) { const a = rad(-90 + k * 18); loop.push(P(124 + 7 + 4.5 * Math.cos(a), 40, Z + 7 + 4.5 * Math.sin(a))); }
  const handle = mk("path", { d: open(loop), class: "nf sil" }, g);
  lit.push([mug.sil, handle]);

  // The lamp, painted last: it reaches over everything on the desk.
  const lamp = mk("g", {}, g);
  const arm = mk("path", { class: "nf sil" }, lamp), arm2 = mk("path", { class: "nf lo" }, lamp);
  const shade = solid(lamp), stem = mk("path", { class: "nf sil" }, lamp);
  const joints = [0, 1, 2].map(() => mk("circle", { r: 1.4, class: "dot m" }, lamp));
  shade.sil.classList.add("hi");

  const tw = { x: tween(poses[0][0]), y: tween(poses[0][1]), z: tween(poses[0][2]) };
  let last = "";
  function draw(x, y, zb) {
    const key = [x, y, zb].map((n) => n.toFixed(2)).join();
    if (key === last) return;
    last = key;
    const hook = [x, y, zb + SH + 3], E = elbow(...hook), B = [BX, BY, PZ];
    // a second bar beside the first, as a desk lamp's arm has
    const dx = hook[0] - BX, dy = hook[1] - BY, n = Math.hypot(dx, dy) || 1, o = [(-dy / n) * 1.8, (dx / n) * 1.8];
    const sh = (p) => P(p[0] + o[0], p[1] + o[1], p[2]);
    arm.setAttribute("d", open([B, E, hook].map((p) => P(...p))));
    arm2.setAttribute("d", open([B, E, hook].map(sh)));
    stem.setAttribute("d", seg(P(x, y, zb + SH), P(...hook)));
    const foot = disc(x, y, SR), top = disc(x, y, ST), inner = disc(x, y, ST - 1);
    put(shade, {
      sil: poly(hull(ringAt(P, foot, zb).concat(ringAt(P, top, zb + SH)))),
      crease: open(ringAt(P, run(inner, front), zb + SH)),
    });
    // the pool spreads as the shade rises
    pool.setAttribute("d", poly(ringAt(P, disc(x, y, SR + 4 + (zb - Z) * 0.3), Z)));
    [B, E, hook].forEach((p, k) => place(joints[k], P(...p)));
  }

  const B = register(stage, (_dt, now) => {
    draw(tval(tw.x, now), tval(tw.y, now), tval(tw.z, now));
    return !(tdone(tw.x, now) && tdone(tw.y, now) && tdone(tw.z, now));
  });
  bag.add(B.unregister);

  /** The item under a screen point, tested on each item's resting top; the nearest wins. */
  function hit([sx, sy]) {
    let best = -1;
    ITEMS.forEach((it, k) => {
      for (const [x0, y0, x1, y1, z] of it.hits) {
        const [x, y] = unproj(C, sx, sy, z);
        if (x > x0 - 2 && x < x1 + 2 && y > y0 - 2 && y < y1 + 2 && (best < 0 || it.cx + it.cy > ITEMS[best].cx + ITEMS[best].cy)) best = k;
      }
    });
    return best;
  }

  function aim(a, force) {
    if (a === act && !force) return;
    act = a;
    const now = performance.now(), it = ITEMS[a];
    const t = a < 0 ? poses[0] : [it.cx, it.cy, it.top + UP - dip];
    tset(tw.x, t[0], now, 0); tset(tw.y, t[1], now, 0); tset(tw.z, t[2], now, 0);
    lit.forEach((els, k) => els.forEach((el) => el.classList.toggle("hi", k === a)));
    shade.sil.classList.toggle("hi", a < 0);
    read.textContent = a < 0 ? "rest" : it.name;
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => aim(hit(p)), leave: () => aim(-1) }));
  bag.add(() => svg.replaceChildren());
  read.textContent = "rest";

  return {
    set: (v) => { dip = v; if (act >= 0) aim(act, true); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "lamp",
  means: "A desk lamp folds its arm to light whatever on the desk is under the pointer.",
  rules: [1, 4, 5, 8],
  range: [0, 6, 12],
  mount,
});
