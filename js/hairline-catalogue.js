/**
 * Catalogue: a creative system as a card-catalogue cabinet, two columns of
 * four drawers. Left alone, an index runs through the drawers and the ones
 * near it slide out, the nearest furthest. The pointer takes over: the drawer
 * under it and its neighbours slide out by distance, each on its own spring,
 * and the drawer under it takes the bright edge. The slider is the reach.
 *
 * The pattern: a field over discrete parts. Springs, a falloff with a floor,
 * and a hit test on the drawers' resting fronts.
 */
const {
  Cam, clamp, facing, fit, poly, prism, proj, rings, rrect, seg,
  spring, stepS, reducedMotion, mk, pointer, put, reflect, register, disposer, solid,
} = HL;

const COLS = 2, ROWS = 4, D = 44, DW = 30, DH = 21, GAP = 3, M = 5, PANEL = 1.8, MAX = 26, STEP = 0.95;
const WC = M * 2 + COLS * DW + (COLS - 1) * GAP, HC = M * 2 + ROWS * DH + (ROWS - 1) * GAP;
const falloff = (u) => (u <= 0 ? 1 : u <= 0.5 ? 1 - u * 1.2 : u <= 1 ? 0.4 - (u - 0.5) * 0.7 : 0.05);
const ORDER = [0, 1, 3, 2, 4, 5, 7, 6]; // the index's walk: a snake up through the drawers

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let R = value;

  const C = Cam(45, 0.5, 1.6);
  fit(C, [[-4, -4, -6], [D + MAX + PANEL, WC + 4, -6], [D + MAX + PANEL, -4, -6], [-4, WC + 4, HC], [D, -4, HC], [D + MAX, WC, HC]], 200, 160);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  const [pr, pi] = rings(-4, -4, D + 4, WC + 4, 4, 1.4);
  reflect(svg, g, P, front, pr, -6, 10);
  put(solid(g), prism(P, front, pr, pi, -6, 0));
  const body = solid(g);
  const [br, bi] = rings(0, 0, D, WC, 3, 1.4);
  put(body, prism(P, front, br, bi, 0, HC));
  body.sil.classList.add("sil");
  // the empty bays the drawers sit in, on the cabinet's front
  let bays = "";
  const drawers = [];
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
    const y0 = M + c * (DW + GAP), z0 = M + r * (DH + GAP);
    bays += poly([P(D, y0, z0), P(D, y0 + DW, z0), P(D, y0 + DW, z0 + DH), P(D, y0, z0 + DH)]);
    drawers.push({ c, r, y0, z0 });
  }
  mk("path", { class: "nf lo", d: bays }, g);
  // drawers, back to front: the far column first, and in each column bottom up, since a
  // drawer can be hidden by the one above it but never by the one below
  const dg = mk("g", {}, g);
  drawers.forEach((d, k) => {
    d.k = k;
    d.grp = mk("g", {}, dg);
    d.el = solid(d.grp);
    d.face = mk("path", { class: "nf lo" }, d.grp);
    d.h0 = 1.2 + 5 * Math.exp(-((d.r - 2.6) ** 2 + (d.c - 1) ** 2) / 1.2);
    d.sp = spring(d.h0, { eps: 0.03 });
    d.drawn = NaN;
  });

  function drawDrawer(d) {
    const out = Math.max(0, d.sp.x);
    if (out === d.drawn) return;
    d.drawn = out;
    const x1 = D + out + PANEL;
    const [ring, inner] = rings(D, d.y0, x1, d.y0 + DW, 1.2, Math.min(0.6, (x1 - D) / 2 - 0.05));
    put(d.el, prism(P, front, ring, inner, d.z0, d.z0 + DH));
    // the front: a label holder above a finger pull
    const yc = d.y0 + DW / 2, zc = d.z0 + DH / 2;
    const fr = (y, z) => P(x1, y, z);
    d.face.setAttribute("d",
      poly([fr(yc - 6, zc + 2), fr(yc + 6, zc + 2), fr(yc + 6, zc + 7), fr(yc - 6, zc + 7)]) +
      poly(rrect(-4, -1.6, 4, 1.6, 1.6, 4).map((q) => fr(yc + q.u, zc - 4 + q.v))));
  }

  let over = false, act = -1, clock = 0, idx = 0;
  function aim(a, auto = false) {
    act = a;
    for (const d of drawers) {
      if (a < 0) { d.sp.t = d.h0; continue; }
      const t = drawers[a], u = Math.hypot(d.c - t.c, (d.r - t.r) * 1.2) / R;
      d.sp.t = MAX * falloff(u);
      d.el.sil.classList.toggle("hi", d === t);
    }
    if (a < 0) drawers.forEach((d) => d.el.sil.classList.remove("hi"));
    read.textContent = a >= 0 && !auto ? "drawer " + (drawers[a].c * ROWS + drawers[a].r + 1) : "rest";
    B.wake();
  }

  const B = register(stage, (dt) => {
    let m = false;
    if (!over && !reducedMotion()) {
      clock += dt;
      if (clock >= STEP) { clock = 0; idx = (idx + 1) % ORDER.length; aim(ORDER[idx], true); }
    }
    for (const d of drawers) { if (stepS(d.sp, dt)) m = true; drawDrawer(d); }
    return m || (!over && !reducedMotion());
  });
  bag.add(B.unregister);

  // hit: the drawer whose RESTING front centre is nearest the pointer on screen
  const centres = drawers.map((d) => P(D + PANEL, d.y0 + DW / 2, d.z0 + DH / 2));
  function hit([x, y]) {
    let best = -1, bd = 1e9;
    centres.forEach(([cx, cy], k) => { const dd = Math.hypot(cx - x, (cy - y) * 1.3); if (dd < bd) { bd = dd; best = k; } });
    return bd < 60 ? best : -1;
  }

  bag.add(pointer(stage, {
    move: (p) => { const a = hit(p); if (a !== act || !over) aim(a); over = true; },
    leave: () => { over = false; clock = STEP; aim(-1); },
  }));
  bag.add(() => svg.replaceChildren());

  for (const d of drawers) drawDrawer(d);
  if (reducedMotion()) aim(-1); else aim(ORDER[0], true);
  return { set: (v) => { R = v; if (act >= 0) aim(act, !over); }, destroy: bag.dispose };
}

hairline({
  name: "catalogue",
  means: "A card-catalogue cabinet: an index runs through it on its own, and the drawers near it, or the pointer, slide out.",
  rules: [1, 3, 5, 9],
  range: [0.9, 1.5, 2.4],
  mount,
});
