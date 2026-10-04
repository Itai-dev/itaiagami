/**
 * Studio: a product shot. A bottle stands on a turntable, always turning
 * slowly, and a camera on its tripod watches it down a dashed line of sight.
 * Moving the pointer across pushes the platter round; friction bleeds the
 * spin, then a spring clicks it onto the nearest of eight shots, marked by
 * the ticks on the base, and the camera takes the bright edge. The slider is the coast: how long a push lasts.
 *
 * The pattern: push the camera. Ambient motion while visible, friction on a
 * push, then a spring onto a detent; nothing under the pointer is picked, so
 * nothing on screen can move out from under it.
 */
const {
  Cam, clamp, circ, facing, fit, hull, open, poly, prism, proj, rrect, ringAt, run, seg,
  spring, stepS, reducedMotion, flatDot, mk, place, pointer, put, reflect, register, disposer, solid,
} = HL;

const RB = 54, RP = 46, ZB = 5, ZP = 9, SHOTS = 8, STEP = 360 / SHOTS;
const IDLE = 14, GAIN = 7, WMAX = 720, SETTLE = 9;
const G = [-12, 100], LZ = 36;

/** A ring turned by a degrees about the origin, then moved to (ox, oy); normals turn with it. */
const xf = (ring, a, ox = 0, oy = 0) => {
  const c = Math.cos((a * Math.PI) / 180), s = Math.sin((a * Math.PI) / 180);
  return ring.map((q) => ({ u: ox + q.u * c - q.v * s, v: oy + q.u * s + q.v * c, nu: q.nu * c - q.nv * s, nv: q.nu * s + q.nv * c }));
};

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let coast = value;

  const C = Cam(45, 0.5, 1.62);
  fit(C, [[-RB, -RB, 0], [RB, RB, -12], [RB, -RB, 0], [-RB, RB, 0], [0, 0, 64], [G[0] - 20, G[1] + 16, 0], [G[0], G[1], 50]], 200, 168);
  const P = proj(C), front = facing(C);

  // the camera's frame: u along the line of sight, v across it
  const dl = Math.hypot(G[0], G[1]), d = [-G[0] / dl, -G[1] / dl], aim = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  const at = (u, v) => [G[0] + d[0] * u - d[1] * v, G[1] + d[1] * u + d[0] * v];

  const g = mk("g", {}, svg);
  reflect(svg, g, P, front, circ(RB, 48), 0, 12);
  // the turntable's base, with its eight shot ticks
  put(solid(g), prism(P, front, circ(RB, 48), circ(RB - 2, 48), 0, ZB));
  const ticks = [];
  for (let k = 0; k < SHOTS; k++) {
    const a = (k * STEP * Math.PI) / 180, t = flatDot(g, C, 0.8, "dot off");
    place(t, P(Math.cos(a) * (RB - 4.5), Math.sin(a) * (RB - 4.5), ZB));
    ticks.push(t);
  }
  const platter = solid(g);
  put(platter, prism(P, front, circ(RP, 48), circ(RP - 1.6, 48), ZB, ZP));
  const spokes = mk("path", { class: "nf lo" }, g);
  const index = flatDot(g, C, 1, "dot m");
  // the line of sight, painted before the bottle so the bottle covers its end
  const lens0 = at(10, 0), lens1 = at(19, 0);
  mk("path", { class: "nf dash", d: seg(P(lens1[0], lens1[1], LZ), P(0, 0, 30)) }, g);

  // the bottle: body, label panel, neck and cap
  const body = solid(g), panel = mk("path", { class: "nf lo" }, g), neck = solid(g), cap = solid(g);
  put(neck, prism(P, front, circ(4.6, 20), circ(3.4, 20), 46, 51));

  // the camera: tripod legs, lens, body, viewfinder
  const legs = [0, 120, 240].map((a) => {
    const r = ((aim + 180 + a) * Math.PI) / 180;
    return seg(P(G[0], G[1], 27), P(G[0] + Math.cos(r) * 17, G[1] + Math.sin(r) * 17, 0));
  });
  mk("path", { class: "nf", d: legs.join("") }, g);
  const ringV = (c, r) => {
    const pts = [];
    for (let k = 0; k < 24; k++) {
      const f = (k / 24) * Math.PI * 2;
      pts.push(P(c[0] - d[1] * r * Math.cos(f), c[1] + d[0] * r * Math.cos(f), LZ + r * Math.sin(f)));
    }
    return pts;
  };
  const lens = mk("path", { class: "sil", d: poly(hull(ringV(lens0, 6).concat(ringV(lens1, 6)))) }, g);
  const cbody = solid(g);
  put(cbody, prism(P, front, xf(rrect(-7, -11, 7, 11, 3.5, 4), aim, G[0], G[1]), xf(rrect(-5.6, -9.6, 5.6, 9.6, 2.1, 4), aim, G[0], G[1]), 27, 43));
  cbody.sil.classList.add("sil");
  const vf = solid(g);
  const vc = at(-3, 3);
  put(vf, prism(P, front, xf(rrect(-3.5, -3.5, 3.5, 3.5, 1.5, 3), aim, vc[0], vc[1]), xf(rrect(-2.5, -2.5, 2.5, 2.5, 1, 3), aim, vc[0], vc[1]), 43, 47));
  lens.classList.add("sil");

  const BR = rrect(-14, -8.5, 14, 8.5, 4.5, 4), BI = rrect(-12.6, -7.1, 12.6, 7.1, 3.1, 4);
  const CR = rrect(-6.5, -6.5, 6.5, 6.5, 2.6, 4), CI = rrect(-5.3, -5.3, 5.3, 5.3, 1.4, 4);

  let th = 0, w = IDLE, over = false, settling = null, drawn = NaN, last = null, shot = -1;

  function draw() {
    if (th === drawn) return;
    drawn = th;
    put(body, prism(P, front, xf(BR, th), xf(BI, th), ZP, 46));
    put(cap, prism(P, front, xf(CR, th), xf(CI, th), 51, 63));
    // the label panel, on whichever long face looks at the viewer
    const r = (th * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
    let pd = "";
    for (const side of [-1, 1]) {
      if (!front({ nu: -s * side, nv: c * side })) continue;
      const pt = (u, z) => P(u * c - 8.5 * side * s, u * s + 8.5 * side * c, z);
      pd += poly([pt(-8, 17), pt(8, 17), pt(8, 36), pt(-8, 36)]);
    }
    panel.setAttribute("d", pd);
    let sp = "";
    for (let k = 0; k < 4; k++) {
      const a = r + (k * Math.PI) / 2;
      sp += seg(P(Math.cos(a) * 24, Math.sin(a) * 24, ZP), P(Math.cos(a) * 40, Math.sin(a) * 40, ZP));
    }
    spokes.setAttribute("d", sp);
    place(index, P(Math.cos(r) * 43, Math.sin(r) * 43, ZP));
  }

  function mark(k) {
    if (k === shot) return;
    shot = k;
    ticks.forEach((t, i) => t.setAttribute("class", i === k ? "dot m" : "dot off"));
    body.sil.classList.toggle("hi", k < 0);
    cbody.sil.classList.toggle("hi", k >= 0); lens.classList.toggle("hi", k >= 0);
    read.textContent = k < 0 ? "rest" : "shot " + (k + 1);
  }

  const B = register(stage, (dt) => {
    const still = reducedMotion();
    if (settling) {
      const m = stepS(settling, dt);
      th = settling.x;
      if (!m) { th = settling.t; settling = null; }
    } else {
      if (!over) w += ((still ? 0 : IDLE) - w) * (1 - Math.exp(-dt / coast));
      else w *= Math.exp(-dt / coast);
      th += w * dt;
      if (over && Math.abs(w) < SETTLE) {
        settling = spring(th);
        settling.t = Math.round(th / STEP) * STEP;
        w = 0;
      }
    }
    th = ((th % 360) + 360) % 360;
    draw();
    if (over) mark(((Math.round(th / STEP) % SHOTS) + SHOTS) % SHOTS);
    return !!settling || Math.abs(w) > 0.01 || (!over && !still);
  });
  bag.add(B.unregister);

  bag.add(pointer(stage, {
    move: (p) => {
      if (last && over) {
        const dx = p[0] - last[0];
        if (Math.abs(dx) > 0.2) { w = clamp(w + dx * GAIN, -WMAX, WMAX); if (settling) { th = settling.x; settling = null; } }
      }
      over = true; last = p;
      if (shot < 0) mark(((Math.round(th / STEP) % SHOTS) + SHOTS) % SHOTS);
      B.wake();
    },
    leave: () => { over = false; last = null; if (settling) { th = settling.x; settling = null; } mark(-1); B.wake(); },
  }));
  bag.add(() => svg.replaceChildren());

  draw(); mark(-1);
  return {
    set: (v) => { coast = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "studio",
  means: "A product on a turntable, watched by a camera: push it round, and it coasts, then clicks onto one of eight shots.",
  rules: [3, 5, 7, 8],
  range: [0.5, 1.1, 2.2],
  mount,
});
