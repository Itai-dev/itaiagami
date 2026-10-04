/**
 * Layers: a brand world, built as a stack. A strategy plinth at the base, a
 * dot grid on its top; above it, an identity plate with its mark, a campaign
 * plate with its layout, and the screen everything ends up on. At rest the
 * stack is slightly exploded, wider towards the top. The pointer's x scrubs
 * the gap between layers; its y picks a layer, which takes the bright edge.
 * The slider is the widest gap, in world units.
 *
 * The pattern: scrub and pick. A spring per layer for the gap, and a hit test
 * on each layer's target top, so a layer moving under the pointer cannot flip
 * the choice.
 */
const {
  Cam, clamp, extremes, facing, fit, lerp, poly, open, prism, proj, rings, rrect, circ, seg, unproj,
  spring, stepS, flatDot, mk, place, pointer, put, reflect, register, disposer, solid,
} = HL;

const W = 88, D = 64, T = 3.2, BH = 12, BP = 7, GMIN = 4;
const REST = [0.42, 0.6, 0.84], GRADE = [0.8, 0.9, 1];
const NAMES = ["strategy", "identity", "campaign", "screen"];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let G = value, s = -1, act = -1;

  const C = Cam(45, 0.5, 1.4);
  const top = BH + 2.7 * 54 + 3 * T;
  fit(C, [[-BP, -BP, 0], [W + BP, D + BP, -10], [W + BP, -BP, 0], [-BP, D + BP, 0], [0, 0, top], [W, D, top]], 200, 160);
  const P = proj(C), front = facing(C);

  const [br, bi] = rings(-BP, -BP, W + BP, D + BP, 10, 2.2);
  const [pr, pi] = rings(0, 0, W, D, 7, 1.5);
  const lay = (xs, ys, z) => xs.map((q) => P(q[0], q[1], z));
  const ringPts = (ring, ox, oy, z) => ring.map((q) => P(ox + q.u, oy + q.v, z));

  // What each plate really has on its top, as flat marks: [kind, data]
  const marks = [
    null,
    [ // identity: a round mark and the line set beside it
      ["ring", circ(11, 24), 24, 40], ["ring", circ(4, 16), 24, 40],
      ["seg", [[44, 35], [78, 35]]], ["seg", [[44, 45], [66, 45]]],
    ],
    [ // campaign: a layout of one hero frame and two smaller ones
      ["ring", rrect(7, 7, 50, 57, 3, 4), 0, 0], ["ring", rrect(55, 7, 81, 29, 3, 4), 0, 0],
      ["ring", rrect(55, 35, 81, 57, 3, 4), 0, 0],
    ],
    [ // the screen: a bezel round the glass, and a camera dot
      ["ring", rrect(6, 6, W - 6, D - 6, 4, 5), 0, 0],
    ],
  ];

  const g = mk("g", {}, svg);
  reflect(svg, g, P, front, br, 0, 14);
  const base = solid(g);
  put(base, prism(P, front, br, bi, 0, BH));
  base.sil.classList.add("sil");
  // the base's dot grid: the system everything stands on
  const grid = [];
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
    const d = flatDot(g, C, 0.7, "dot off");
    place(d, P(6 + i * 15.2, 6 + j * 17.3, BH));
    grid.push(d);
  }

  // three plates, each with its guides painted before it
  const plates = [1, 2, 3].map((k) => {
    const guide = mk("path", { class: "nf dash" }, g);
    const el = solid(g);
    const mk2 = mk("path", { class: "nf lo" }, g);
    const z0 = BH + REST.slice(0, k).reduce((a, r) => a + r * G, 0) + (k - 1) * T;
    return { k, guide, el, marks: mk2, sp: spring(z0, { eps: 0.03 }), drawn: NaN };
  });
  const cam = flatDot(g, C, 0.9, "dot m"); // the screen's camera, on its near bezel

  function drawPlate(p, below) {
    const z = p.sp.x;
    if (z === p.drawn && below === p.below) return;
    p.drawn = z; p.below = below;
    put(p.el, prism(P, front, pr, pi, z, z + T));
    const zt = z + T;
    let d = "";
    for (const m of marks[p.k]) {
      if (m[0] === "ring") d += poly(ringPts(m[1], m[2], m[3], zt));
      else d += seg(P(m[1][0][0], m[1][0][1], zt), P(m[1][1][0], m[1][1][1], zt));
    }
    p.marks.setAttribute("d", d);
    p.guide.setAttribute("d", extremes(P, pi).map((q) => seg(P(q.u, q.v, below), P(q.u, q.v, z))).join(""));
    if (p.k === 3) place(cam, P(W / 2, D - 3, zt));
  }
  function drawAll() {
    let below = BH;
    for (const p of plates) { drawPlate(p, below); below = p.sp.x + T; }
  }

  const B = register(stage, (dt) => {
    let m = false;
    for (const p of plates) if (stepS(p.sp, dt)) m = true;
    drawAll();
    return m;
  });
  bag.add(B.unregister);

  /** Each plate's bottom, given the scrub s in 0..1 (or rest when s < 0). */
  function targets() {
    let z = BH;
    plates.forEach((p, i) => {
      const gap = s < 0 ? REST[i] * G : lerp(GMIN, G, s) * GRADE[i];
      z += gap; p.sp.t = z; z += T;
    });
  }

  /** The highest layer whose target top holds the point: tested on the target pose, never the one on screen. */
  function hit([x, y]) {
    const tops = [BH].concat(plates.map((p) => p.sp.t + T));
    for (let i = 3; i >= 0; i--) {
      const [u, v] = unproj(C, x, y, tops[i]);
      const m = i === 0 ? BP : 0;
      if (u > -m - 4 && u < W + m + 4 && v > -m - 4 && v < D + m + 4) return i;
    }
    return -1;
  }

  function choose(a) {
    act = a;
    const lit = a < 0 ? 3 : a;
    base.sil.classList.toggle("hi", lit === 0);
    plates.forEach((p) => p.el.sil.classList.toggle("hi", lit === p.k));
    grid.forEach((d, n) => d.setAttribute("class", lit === 0 ? (n % 5 === 0 ? "dot" : "dot m") : "dot off"));
  }

  function update(p) {
    if (p) s = clamp((p[0] - 100) / 200, 0, 1); else s = -1;
    targets();
    const a = p ? hit(p) : -1;
    choose(a);
    read.textContent = !p ? "rest" : a >= 0 ? NAMES[a] : "gap " + Math.round(lerp(GMIN, G, s));
    B.wake();
  }

  plates.forEach((p) => p.el.sil.classList.add("sil"));
  choose(-1);
  drawAll();

  let last = null;
  bag.add(pointer(stage, { move: (p) => { last = p; update(p); }, leave: () => { last = null; update(null); } }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { G = v; update(last); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "layers",
  means: "A brand world as a stack, strategy at the base and the screen on top: x pulls the layers apart, y picks one.",
  rules: [1, 4, 5, 9],
  range: [30, 42, 54],
  mount,
});
