/**
 * Projection: an exhibition floor. A projector on its stand at the back
 * throws its beam over a field of light pixels. Left alone, a ripple of light
 * runs out across the floor every few seconds; the pointer paints light where
 * it passes and holds a pool of light where it rests, the pixels rise as they light, and every mark fades back to the
 * floor's resting glow. The slider is the afterglow, in seconds.
 *
 * The pattern: paint and decay. A decay per pixel, a hit test on the ground
 * plane (which never moves), and an idle loop that returns when the pointer
 * leaves.
 */
const {
  Cam, clamp, facing, fit, poly, prism, proj, rings, rrect, seg, unproj,
  reducedMotion, flatDot, mk, place, pointer, put, reflect, register, disposer, solid,
} = HL;

const NX = 14, NY = 10, CELL = 9, EX = NX * CELL, EY = NY * CELL, PB = 6, LIFT = 15;
const REACH = 28, WAVE = 7, SPEED = 70, EVERY = 3.2, IDLE_BACK = 1.2;
const ST = [-12, -12], SZ = 74;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let glow = value;

  const C = Cam(45, 0.5, 1.5);
  fit(C, [[-PB, -PB, -PB], [EX + PB, EY + PB, -PB], [EX + PB, -PB, -PB], [-PB, EY + PB, -PB], [ST[0], ST[1], SZ + 12], [EX, EY, LIFT]], 200, 162);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [fr, fi] = rings(-PB, -PB, EX + PB, EY + PB, 8, 2);
  reflect(svg, g, P, front, fr, -PB, 12);

  // the projector's stand, behind the floor
  const [sr, si] = rings(ST[0] - 7, ST[1] - 7, ST[0] + 7, ST[1] + 7, 7, 1.4);
  put(solid(g), prism(P, front, sr, si, -PB, -PB + 2.5));
  mk("path", { class: "nf", d: seg(P(ST[0], ST[1], -PB + 2.5), P(ST[0], ST[1], SZ)) }, g);

  const floor = solid(g);
  put(floor, prism(P, front, fr, fi, -PB, 0));
  floor.sil.classList.add("sil");

  // the beam, from the lens to the field's four corners, lying on the floor
  const lens = P(ST[0] + 5, ST[1] + 5, SZ - 1);
  mk("path", { class: "nf dash", d: [[0, 0], [EX, 0], [0, EY], [EX, EY]].map(([x, y]) => seg(lens, P(x, y, 0))).join("") }, g);
  mk("path", { class: "nf lo", d: poly([[0, 0], [EX, 0], [EX, EY], [0, EY]].map(([x, y]) => P(x, y, 0))) }, g);

  // pixels, back to front; each keeps a resting glow, two soft pools of light
  const px = [];
  for (let s = 0; s <= NX + NY - 2; s++) for (let i = 0; i < NX; i++) {
    const j = s - i;
    if (j < 0 || j >= NY) continue;
    const u = i / (NX - 1), v = j / (NY - 1);
    const base = 0.42 * Math.exp(-((u - 0.28) ** 2 + (v - 0.7) ** 2) / 0.05) + 0.3 * Math.exp(-((u - 0.78) ** 2 + (v - 0.3) ** 2) / 0.03);
    const x = (i + 0.5) * CELL, y = (j + 0.5) * CELL;
    px.push({ i, j, x, y, base, e: 0, el: flatDot(g, C, 1.4, "dot off"), drawn: NaN, cls: "" });
  }

  // the projector itself, on top of its stand, angled at the floor
  const head = solid(g);
  const [hr, hi] = rings(ST[0] - 8, ST[1] - 6, ST[0] + 8, ST[1] + 6, 3.5, 1.2);
  put(head, prism(P, front, hr, hi, SZ, SZ + 10));
  head.sil.classList.add("sil");
  const lensRing = mk("path", { class: "nf" }, g);
  lensRing.setAttribute("d", poly(rrect(-2.6, -2.6, 2.6, 2.6, 2.6, 4).map((q) => P(ST[0] + 5 + q.u, ST[1] + 5 + q.v, SZ))));

  let over = null, sinceLeave = IDLE_BACK, clock = EVERY - 0.6, ripple = null, last = "";

  function cls(L) { return L > 0.72 ? "dot" : L > 0.26 ? "dot m" : "dot off"; }
  function drawPx(p) {
    const L = Math.max(p.base, p.e);
    if (L === p.drawn) return;
    p.drawn = L;
    place(p.el, P(p.x, p.y, L * LIFT));
    const c = cls(L);
    if (c !== p.cls) { p.cls = c; p.el.setAttribute("class", c); }
  }
  function excite(cx, cy, r, w, top = 1) {
    for (const p of px) {
      const d = Math.hypot(p.x - cx, p.y - cy), k = w ? 1 - Math.abs(d - r) / w : 1 - (d / r) ** 2;
      if (k > 0) p.e = Math.max(p.e, clamp(k, 0, 1) * top);
    }
  }

  const B = register(stage, (dt) => {
    const still = reducedMotion(), fade = Math.exp(-dt / glow);
    let lit = false;
    for (const p of px) { if (p.e > 0.004) { p.e *= fade; lit = true; } else p.e = 0; }
    if (!over && !still) {
      sinceLeave += dt;
      if (sinceLeave >= IDLE_BACK) {
        clock += dt;
        if (!ripple && clock >= EVERY) { clock = 0; ripple = { x: EX * (0.2 + 0.6 * Math.random()), y: EY * (0.2 + 0.6 * Math.random()), r: 0 }; }
      }
    }
    if (over) excite(over[0], over[1], REACH, 0);
    if (ripple) {
      ripple.r += SPEED * dt;
      excite(ripple.x, ripple.y, ripple.r, WAVE, 0.8);
      if (ripple.r > EX + EY) ripple = null;
    }
    for (const p of px) drawPx(p);
    return lit || !!ripple || (!over && !still);
  });
  bag.add(B.unregister);

  function say(t) { if (t !== last) { last = t; read.textContent = t; } }

  bag.add(pointer(stage, {
    move: (s) => {
      const [x, y] = unproj(C, s[0], s[1], 0);
      if (x < -PB || x > EX + PB || y < -PB || y > EY + PB) { over = null; say("rest"); B.wake(); return; }
      over = [x, y]; ripple = null; sinceLeave = 0;
      excite(x, y, REACH, 0);
      say(`px ${clamp(Math.floor(x / CELL), 0, NX - 1)}·${clamp(Math.floor(y / CELL), 0, NY - 1)}`);
      B.wake();
    },
    leave: () => { over = null; sinceLeave = 0; say("rest"); B.wake(); },
  }));
  bag.add(() => svg.replaceChildren());

  for (const p of px) drawPx(p);
  say("rest");
  return {
    set: (v) => { glow = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "projection",
  means: "A projector throws light onto an exhibition floor: ripples cross it on their own, and the pointer paints light that fades.",
  rules: [1, 3, 5, 7],
  range: [0.4, 0.9, 1.8],
  mount,
});
