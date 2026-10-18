/**
 * Site: a website as a browser plate with its parts laid on it: the hero
 * block, a row of three cards, lines of text and a button. Left alone, a
 * cursor runs down the page and the parts near it lift off the plate, the
 * nearest highest, as if the page were being built. The pointer takes over:
 * the part under it and its neighbours lift by distance, each on its own
 * spring, and the part under it takes the bright edge. The slider is the
 * reach.
 *
 * The pattern: a field over discrete parts (as in Catalogue). Springs, a
 * falloff with a floor, and a hit test on the parts' resting centres.
 */
const {
  Cam, circ, fit, poly, prism, proj, facing, rings, rrect, seg,
  spring, stepS, reducedMotion, mk, pointer, put, reflect, register, disposer, solid,
} = HL;

// the page: x runs down it (top of page is the far edge), y across it
const W = 62, L = 46, T = 2.2, MAX = 16, STEP = 0.8;
const falloff = (u) => (u <= 0 ? 1 : u <= 0.5 ? 1 - u * 1.2 : u <= 1 ? 0.4 - (u - 0.5) * 0.7 : 0.04);

// the parts, top of the page first: [x0, y0, x1, y1, thickness, corner]
const PARTS = [
  [10, 4, 26, L - 4, 2.4, 2],          // hero
  [30, 4, 41, 15, 2, 1.6],             // card
  [30, 17.5, 41, 28.5, 2, 1.6],        // card
  [30, 31, 41, L - 4, 2, 1.6],         // card
  [45, 4, 46.6, 34, 1.2, 0.8],         // text line
  [48.6, 4, 50.2, 26, 1.2, 0.8],       // text line
  [53, 4, 57.5, 17, 1.8, 2.2],         // button
];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let R = value;

  const C = Cam(45, 0.5, 3.9);
  fit(C, [[-3, -3, -4], [W + 3, L + 3, -4], [W + 3, -3, -4], [-3, L + 3, T + MAX + 4], [W, L, T + MAX]], 200, 160);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  // the browser plate, with its top bar and three window dots
  const [br, bi] = rings(0, 0, W, L, 3, 1.4);
  reflect(svg, g, P, front, br, 0, 10);
  const base = solid(g);
  put(base, prism(P, front, br, bi, 0, T));
  base.sil.classList.add("sil");
  const top = (x, y) => P(x, y, T);
  let chrome = seg(top(6.5, 1.6), top(6.5, L - 1.6));
  [3.4, 6.8, 10.2].forEach((y) => { chrome += poly(circ(1.1, 14).map((q) => top(3.3 + q.u, y + q.v))); });
  chrome += poly(rrect(2.2, 15, 4.4, L - 4, 1.1, 4).map((q) => top(q.u, q.v)));
  mk("path", { class: "nf lo", d: chrome }, g);

  // parts, painted far to near (ascending x + y) so a nearer part covers a farther one
  const pg = mk("g", {}, g);
  const parts = PARTS.map(([x0, y0, x1, y1, th, r], k) => ({ k, x0, y0, x1, y1, th, r }))
    .sort((a, b) => (a.x0 + a.y0) - (b.x0 + b.y0))
    .map((p) => {
      p.grp = mk("g", {}, pg);
      p.el = solid(p.grp);
      p.face = mk("path", { class: "nf lo" }, p.grp);
      p.sp = spring(0, { eps: 0.03 });
      p.drawn = NaN;
      return p;
    });
  const byIndex = [...parts].sort((a, b) => a.k - b.k);

  function drawPart(p) {
    const z0 = T + Math.max(0, p.sp.x);
    if (z0 === p.drawn) return;
    p.drawn = z0;
    const [ring, inner] = rings(p.x0, p.y0, p.x1, p.y1, p.r, Math.min(0.6, (Math.min(p.x1 - p.x0, p.y1 - p.y0)) / 2 - 0.1));
    put(p.el, prism(P, front, ring, inner, z0, z0 + p.th));
    const z = z0 + p.th, f = (x, y) => P(x, y, z);
    let d = "";
    if (p.k === 0) {
      // the hero image: a frame-less picture of a hill and a sun
      d += seg(f(p.x1 - 3, p.y1 - 4), f(p.x0 + 7, p.y1 - 16)) + seg(f(p.x0 + 7, p.y1 - 16), f(p.x1 - 6, p.y0 + 14))
        + seg(f(p.x1 - 6, p.y0 + 14), f(p.x0 + 9, p.y0 + 4));
      d += poly(circ(2, 16).map((q) => f(p.x0 + 5 + q.u, p.y1 - 7 + q.v)));
    } else if (p.k <= 3) {
      // a card: a picture and two lines
      d += seg(f(p.x0 + 6.5, p.y0 + 1.6), f(p.x0 + 6.5, p.y1 - 1.6)) + seg(f(p.x0 + 8.6, p.y0 + 1.6), f(p.x0 + 8.6, p.y1 - 4));
    }
    p.face.setAttribute("d", d);
  }

  let over = false, act = -1, clock = 0, idx = 0;
  function aim(a, auto = false) {
    act = a;
    for (const p of parts) {
      if (a < 0) { p.sp.t = 0; p.el.sil.classList.remove("hi"); continue; }
      const t = byIndex[a];
      const u = Math.hypot((p.x0 + p.x1 - t.x0 - t.x1) / 2 / 14, (p.y0 + p.y1 - t.y0 - t.y1) / 2 / 22) / R;
      p.sp.t = MAX * falloff(u);
      p.el.sil.classList.toggle("hi", p === t);
    }
    read.textContent = a >= 0 && !auto ? "part " + (a + 1) : "rest";
    B.wake();
  }

  const B = register(stage, (dt) => {
    let m = false;
    if (!over && !reducedMotion()) {
      clock += dt;
      if (clock >= STEP) { clock = 0; idx = (idx + 1) % byIndex.length; aim(idx, true); }
    }
    for (const p of parts) { if (stepS(p.sp, dt)) m = true; drawPart(p); }
    return m || (!over && !reducedMotion());
  });
  bag.add(B.unregister);

  // hit: the part whose RESTING top centre is nearest the pointer on screen
  const centres = byIndex.map((p) => P((p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2, T + p.th));
  function hit([x, y]) {
    let best = -1, bd = 1e9;
    centres.forEach(([cx, cy], k) => { const dd = Math.hypot(cx - x, (cy - y) * 1.3); if (dd < bd) { bd = dd; best = k; } });
    return bd < 70 ? best : -1;
  }

  bag.add(pointer(stage, {
    move: (p) => { const a = hit(p); if (a !== act || !over) aim(a); over = true; },
    leave: () => { over = false; clock = STEP; aim(-1); },
  }));
  bag.add(() => svg.replaceChildren());

  for (const p of parts) drawPart(p);
  if (reducedMotion()) aim(-1); else aim(0, true);
  return { set: (v) => { R = v; if (act >= 0) aim(act, !over); }, destroy: bag.dispose };
}

hairline({
  name: "site",
  means: "A website as a browser plate with its parts on it: a cursor runs down the page, and the parts near it, or the pointer, lift off.",
  rules: [1, 3, 5, 9],
  range: [0.9, 1.4, 2.4],
  mount,
});
