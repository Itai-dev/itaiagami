/**
 * Gallery: an exhibition room, two walls hung with frames and a floor of
 * plinths. Left alone, a visitor walks a loop through the room and the
 * plinths near them rise to meet them. The pointer becomes the visitor: the
 * plinths take their height from their distance to it, each on its own
 * spring. The visitor's mark is the one bright dot. The slider is the reach,
 * in cells.
 *
 * The pattern: a field. Springs, a falloff with a floor, a hit test on the
 * ground plane, and an ambient walk that returns when the pointer leaves.
 */
const {
  Cam, clamp, facing, fit, poly, prism, proj, rings, rrect, unproj,
  spring, stepS, reducedMotion, flatDot, mk, place, pointer, put, register, disposer, solid,
} = HL;

const NX = 4, NY = 3, CELL = 28, FOOT = 15, EX = NX * CELL, EY = NY * CELL, WALL = 62, WT = 3;
const LOW = 5, HIGH = 36, WALK = 0.32;
const falloff = (u) => (u <= 0 ? 1 : u <= 0.42 ? 1 - (u / 0.42) * 0.69 : u <= 1 ? 0.31 - ((u - 0.42) / 0.58) * 0.22 : 0.09);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let R = value * CELL;

  const C = Cam(45, 0.5, 1.78);
  fit(C, [[-WT, -WT, WALL], [EX + 6, EY + 6, -5], [EX + 6, -WT, -5], [-WT, EY + 6, -5], [EX, -WT, WALL], [-WT, EY, WALL]], 200, 162);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  // the floor, then the two walls standing on its back edges
  const [fr, fi] = rings(-WT - 2, -WT - 2, EX + 6, EY + 6, 5, 1.6);
  put(solid(g), prism(P, front, fr, fi, -5, 0));
  for (const [x0, y0, x1, y1] of [[-WT, -WT, 0, EY], [0, -WT, EX, 0]]) {
    const [r, i] = rings(x0, y0, x1, y1, 1.2, 0.5);
    const w = solid(g);
    put(w, prism(P, front, r, i, 0, WALL));
    w.sil.classList.add("sil");
  }
  // frames hung on both walls: an outer frame and its mount
  const onX = (y0, y1, z0, z1) => poly([P(0.4, y0, z0), P(0.4, y1, z0), P(0.4, y1, z1), P(0.4, y0, z1)]);
  const onY = (x0, x1, z0, z1) => poly([P(x0, 0.4, z0), P(x1, 0.4, z0), P(x1, 0.4, z1), P(x0, 0.4, z1)]);
  mk("path", { class: "nf", d: onX(14, 46, 22, 48) + onY(18, 58, 18, 50) + onY(70, 96, 26, 46) }, g);
  mk("path", { class: "nf lo", d: onX(18, 42, 26, 44) + onY(22, 54, 22, 46) + onY(74, 92, 30, 42) }, g);

  // plinths, back to front, each resting on a quiet composition: taller towards the back corner
  const cols = [];
  for (let s = 0; s <= NX + NY - 2; s++) for (let i = 0; i < NX; i++) {
    const j = s - i;
    if (j < 0 || j >= NY) continue;
    const x0 = i * CELL + (CELL - FOOT) / 2, y0 = j * CELL + (CELL - FOOT) / 2;
    const [ring, inner] = rings(x0, y0, x0 + FOOT, y0 + FOOT, 2.2, 0.9);
    const h0 = LOW + 9 * Math.exp(-((i - 2.4) ** 2 + (j - 0.4) ** 2) / 2.2);
    cols.push({ i, j, cx: x0 + FOOT / 2, cy: y0 + FOOT / 2, ring, inner, h0, sp: spring(h0, { eps: 0.04 }), el: solid(g), drawn: NaN });
  }
  // the visitor: a bright dot with two dim footprints, on the floor
  const vis = mk("g", {}, g), vd = flatDot(vis, C, 1.6, "dot"), f1 = flatDot(vis, C, 0.8, "dot off"), f2 = flatDot(vis, C, 0.8, "dot off");

  let over = null, walk = 0, at = null, drawnAt = "";
  /** The ambient visitor's path: a slow loop round the room. */
  const path = (t) => [EX * (0.5 + 0.36 * Math.cos(t)), EY * (0.5 + 0.34 * Math.sin(2 * t))];

  function retarget(p) {
    at = p;
    for (const c of cols) c.sp.t = p ? LOW + (HIGH - LOW) * falloff(Math.hypot(c.cx - p[0], c.cy - p[1]) / R) : c.h0;
  }
  function drawVisitor() {
    const p = at || path(0);
    // on a plinth's lid when it stands inside one, on the floor otherwise
    const under = cols.find((c) => Math.abs(c.cx - p[0]) <= FOOT / 2 && Math.abs(c.cy - p[1]) <= FOOT / 2);
    const z = under ? Math.max(0.6, under.sp.x) : 0, key = p[0].toFixed(2) + "," + p[1].toFixed(2) + "," + z.toFixed(2);
    if (key === drawnAt) return;
    drawnAt = key;
    // move the mark in the paint order to just after the last plinth behind it
    let after = null;
    for (const c of cols) if (c === under || c.cx + c.cy <= p[0] + p[1] - FOOT) after = c;
    if (after && after.el.g.nextSibling !== vis) after.el.g.after(vis);
    place(vd, P(p[0], p[1], z)); place(f1, P(p[0] - 3, p[1] + 3, z)); place(f2, P(p[0] - 6, p[1] + 1, z));
  }

  const B = register(stage, (dt) => {
    let m = false;
    if (!over && !reducedMotion()) { walk += dt * WALK; retarget(path(walk)); }
    for (const c of cols) {
      if (stepS(c.sp, dt)) m = true;
      const h = Math.max(0.6, c.sp.x);
      if (h !== c.drawn) { c.drawn = h; put(c.el, prism(P, front, c.ring, c.inner, 0, h)); c.el.sil.classList.toggle("sil", h > HIGH * 0.6); }
    }
    drawVisitor();
    return m || (!over && !reducedMotion());
  });
  bag.add(B.unregister);

  bag.add(pointer(stage, {
    move: (s) => {
      const [x, y] = unproj(C, s[0], s[1], 0);
      if (x < -6 || x > EX + 6 || y < -6 || y > EY + 6) return;
      over = [clamp(x, 0, EX), clamp(y, 0, EY)];
      retarget(over);
      read.textContent = `room ${clamp(Math.floor(over[0] / CELL), 0, NX - 1)}·${clamp(Math.floor(over[1] / CELL), 0, NY - 1)}`;
      B.wake();
    },
    leave: () => { over = null; read.textContent = "rest"; if (reducedMotion()) retarget(null); B.wake(); },
  }));
  bag.add(() => svg.replaceChildren());

  if (reducedMotion()) retarget(null); else retarget(path(0));
  read.textContent = "rest";
  return { set: (v) => { R = v * CELL; if (over) retarget(over); }, destroy: bag.dispose };
}

hairline({
  name: "gallery",
  means: "An exhibition room: a visitor walks it on their own, and the plinths near them, or the pointer, rise to meet them.",
  rules: [1, 3, 5, 7],
  range: [1.2, 2, 3.2],
  mount,
});
