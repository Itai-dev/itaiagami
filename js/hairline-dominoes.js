/**
 * Dominoes: a launch as a chain reaction. Eight tiles stand on a board, the
 * first already tipping. Left alone, it falls, the run cascades to the end
 * and stands back up. The pointer pushes the tile under it: everything from
 * there on falls in turn, the delay growing with distance, and the pushed
 * tile takes the bright edge. The slider is the step between tiles, in ms.
 *
 * The pattern: one of many. Tweens, a stagger by distance, identity in the
 * pips, and a hit test on the tiles' resting centres along the row.
 */
const {
  Cam, clamp, fillet, fit, hull, poly, prism, proj, rings, seg,
  tdone, tset, tval, tween, reducedMotion, facing, mk, place, pointer, put, reflect, register, disposer, solid,
} = HL;

const N = 8, G = 22, T = 5, H = 34, WD = 20, TIP = 8, CYCLE = 6, PUSH_AT = 0.7, RESET_AT = 3.8;
const LEAN = (Math.asin((G - T) / H) * 180) / Math.PI;
const PIPS = [[1, 2], [3, 0], [2, 4], [5, 1], [0, 3], [4, 4], [6, 2], [1, 5]];
const SPOT = { 0: [], 1: [[0, 0]], 2: [[-1, 1], [1, -1]], 3: [[-1, 1], [0, 0], [1, -1]], 4: [[-1, 1], [1, 1], [-1, -1], [1, -1]],
  5: [[-1, 1], [1, 1], [0, 0], [-1, -1], [1, -1]], 6: [[-1, 1], [1, 1], [-1, 0], [1, 0], [-1, -1], [1, -1]] };
const rad = (d) => (d * Math.PI) / 180;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let step = value;

  const X0 = -10, X1 = (N - 1) * G + T + H + 6;
  const C = Cam(45, 0.5, 1.62);
  fit(C, [[X0, -WD, -4], [X1, WD, -4], [X0, WD, H + 4], [X1, -WD, 0], [0, -WD, H]], 200, 168);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [br, bi] = rings(X0, -WD / 2 - 8, X1, WD / 2 + 8, 6, 1.6);
  reflect(svg, g, P, front, br, -4, 10);
  put(solid(g), prism(P, front, br, bi, -4, 0));

  // a tile's face outline, in its own plane: y across, h up
  const face = fillet([[-WD / 2, 0], [WD / 2, 0], [WD / 2, H], [-WD / 2, H]], [2.4, 2.4, 2.4, 2.4], 3);
  const tiles = [];
  for (let i = 0; i < N; i++) {
    const grp = mk("g", {}, g);
    const sil = mk("path", { class: "sil" }, grp), fr = mk("path", { class: "nf lo" }, grp);
    const pips = [];
    PIPS[i].forEach((n, half) => SPOT[n].forEach(([a, b]) => pips.push({ y: a * 5, h: (half ? H / 4 : (3 * H) / 4) + b * 4.6, el: mk("circle", { r: 1.15, class: "dot m" }, grp) })));
    tiles.push({ x: i * G + T, sil, fr, pips, th: tween(i === 0 ? TIP : 0), drawn: NaN });
  }

  function drawTile(t, now) {
    const th = tval(t.th, now);
    if (th === t.drawn) return;
    t.drawn = th;
    const c = Math.cos(rad(th)), s = Math.sin(rad(th));
    const w = (a, y, h) => P(t.x + a * c + h * s, y, -a * s + h * c);
    const fF = face.map(([y, h]) => w(0, y, h)), fB = face.map(([y, h]) => w(-T, y, h));
    t.sil.setAttribute("d", poly(hull(fF.concat(fB))));
    t.fr.setAttribute("d", poly(fF) + seg(w(0, -WD / 2 + 2.5, H / 2), w(0, WD / 2 - 2.5, H / 2)));
    t.pips.forEach((p) => place(p.el, w(0, p.y, p.h)));
  }

  let over = false, act = -2, clock = 0, pushed = false;
  const B = register(stage, (dt, now) => {
    let moving = false;
    for (const t of tiles) { drawTile(t, now); if (!tdone(t.th, now)) moving = true; }
    if (over || reducedMotion()) return moving;
    clock += dt;
    if (!pushed && clock >= PUSH_AT && clock < RESET_AT) { pushed = true; push(0, true); }
    if (pushed && clock >= RESET_AT) { pushed = false; push(-1, true); }
    if (clock >= CYCLE) clock = 0;
    return true;
  });
  bag.add(B.unregister);

  /** a ≥ 0 pushes tile a, and the run falls from there; -1 stands them all back up, from the far end. */
  function push(a, auto = false) {
    if (a === act) return;
    const now = performance.now();
    act = a;
    tiles.forEach((t, i) => {
      if (a < 0) tset(t.th, i === 0 ? TIP : 0, now, (N - 1 - i) * step * 0.6);
      else tset(t.th, i < a ? 0 : i === N - 1 ? 88 : LEAN, now, Math.max(0, i - a) * step);
      t.sil.classList.toggle("hi", a < 0 ? i === 0 : i === a);
    });
    read.textContent = a >= 0 && !auto ? "tile " + String(a + 1).padStart(2, "0") : "rest";
    B.wake();
  }

  // hit: the tile whose RESTING centre is nearest the pointer along the row
  const cx = tiles.map((t) => P(t.x - T / 2, 0, H / 2)[0]);
  function hit([x]) {
    let best = 0;
    cx.forEach((c, i) => { if (Math.abs(c - x) < Math.abs(cx[best] - x)) best = i; });
    return Math.abs(cx[best] - x) > 40 ? -2 : best;
  }

  bag.add(pointer(stage, {
    move: (p) => { over = true; const a = hit(p); if (a >= 0) push(a); },
    leave: () => { over = false; clock = RESET_AT; pushed = true; },
  }));
  bag.add(() => svg.replaceChildren());

  tiles[0].sil.classList.add("hi");
  read.textContent = "rest";
  return { set: (v) => { step = v; }, destroy: bag.dispose };
}

hairline({
  name: "dominoes",
  means: "A launch as a domino run: it topples and resets on its own, and the pointer pushes the run from any tile.",
  rules: [1, 2, 5, 10],
  range: [40, 80, 140],
  mount,
});
