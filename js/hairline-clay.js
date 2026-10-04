/**
 * Clay: a potter's wheel, a vessel being thrown on it. Left alone, the wheel
 * turns and the clay slowly finds one form after another: a vase, a bowl, a
 * bottle, a jar. The pointer becomes the hands: its height picks where on the
 * wall to press, and how far it is from the clay sets how far the wall goes
 * in or out there, each ring of the wall on its own spring. The ring under
 * the hands takes the bright edge; at rest, the lip has it. The slider is the
 * width of the hands, as a share of the height.
 *
 * The pattern: a field along one axis. Springs, a falloff by distance, and a
 * hit test on the axis of the wheel, which never moves.
 */
const {
  Cam, circ, clamp, facing, fit, open, poly, prism, proj, ringAt,
  spring, stepS, reducedMotion, flatDot, mk, place, pointer, put, reflect, register, disposer, solid,
} = HL;

const K = 16, Z0 = 13, H = 74, RMIN = 6, RMAX = 40, SPIN = 40, CYCLE = 3.4;
// forms as radius at t = 0 (foot) .. 1 (lip), sampled at K + 1 rings
const FORMS = [
  (t) => 15 + 17 * Math.sin(Math.PI * Math.min(1, t / 0.75)) ** 1.4 - 8 * Math.max(0, t - 0.7) / 0.3 + 6 * Math.max(0, t - 0.88) / 0.12, // vase
  (t) => 13 + 30 * Math.pow(t, 0.55) * (t < 0.55 ? 1 : 1),                                                                               // bowl
  (t) => (t < 0.55 ? 16 + 12 * Math.sin((Math.PI * t) / 0.55) ** 0.6 : 8 + 2 * (t > 0.9 ? 1 : 0)),                                      // bottle
  (t) => 20 + 3 * Math.sin(Math.PI * t) - 2 * (t > 0.93 ? 0 : 0),                                                                         // jar
];
const NAMES = (t) => (t < 0.18 ? "foot" : t < 0.55 ? "belly" : t < 0.82 ? "neck" : "lip");
const rad = (d) => (d * Math.PI) / 180, SQ = Math.SQRT1_2;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let reach = value;

  const C = Cam(45, 0.5, 2.05);
  fit(C, [[-58, -58, -2], [58, 58, -2], [58, -58, -2], [-58, 58, -2], [0, 0, Z0 + H + 6], [RMAX, -RMAX, Z0 + H]], 200, 164);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  // the splash pan and the wheel head
  reflect(svg, g, P, front, circ(56, 48), -2, 10);
  put(solid(g), prism(P, front, circ(56, 48), circ(53.6, 48), -2, 8));
  mk("path", { class: "nf lo", d: poly(ringAt(P, circ(48, 48), 8)) }, g);
  put(solid(g), prism(P, front, circ(34, 40), circ(32.4, 40), 8, Z0));
  const marks = [0, 1, 2, 3].map(() => flatDot(g, C, 0.9, "dot off"));

  const wall = mk("path", { class: "sil" }, g);
  const rim = mk("path", { class: "nf hi" }, g), mouth = mk("path", { class: "nf lo" }, g);
  const lines = mk("path", { class: "nf lo" }, g), hands = mk("path", { class: "nf hi" }, g);

  const rings = [];
  for (let k = 0; k <= K; k++) rings.push(spring(FORMS[0](k / K), { eps: 0.03 }));

  let over = null, form = 0, clock = 0, spin = 0, drawn = "";
  const ring = (r) => circ(r, 40);
  const half = (r, z, nearSide) => {
    const c = P(0, 0, z), pts = ringAt(P, ring(r), z).filter(([, y]) => (nearSide ? y >= c[1] - 0.01 : y <= c[1] + 0.01));
    return pts.sort((a, b) => a[0] - b[0]);
  };

  function draw() {
    const rs = rings.map((s) => clamp(s.x, RMIN, RMAX + 6)), key = rs.map((r) => r.toFixed(2)).join(",") + (over ? over[0].toFixed(3) : "-");
    if (key !== drawn) {
      drawn = key;
      const zs = rs.map((_, k) => Z0 + (H * k) / K);
      // the wall's outline: up the left side, over the back of the lip, down the right, along the front of the foot
      // a ring's side on screen: the point at right angles to the view, (r, -r)/√2 at the default camera
      const side = (r, z) => P(r * SQ, -r * SQ, z)[0] - P(0, 0, z)[0];
      const left = rs.map((r, k) => { const c = P(0, 0, zs[k]); return [c[0] - side(r, zs[k]), c[1]]; });
      const right = rs.map((r, k) => { const c = P(0, 0, zs[k]); return [c[0] + side(r, zs[k]), c[1]]; });
      const back = half(rs[K], zs[K], false), foot = half(rs[0], zs[0], true);
      wall.setAttribute("d", poly([...left, ...back, ...right.slice().reverse(), ...foot.slice().reverse()]));
      rim.setAttribute("d", poly(ringAt(P, ring(rs[K]), zs[K])));
      mouth.setAttribute("d", poly(ringAt(P, ring(Math.max(2, rs[K] - 2.6)), zs[K])));
      let d = "";
      for (const k of [4, 8, 12]) d += open(half(rs[k], zs[k], true));
      lines.setAttribute("d", d);
      if (over) {
        const k = Math.round(over[0] * K);
        hands.setAttribute("d", open(half(rs[k], zs[k], true)));
      } else hands.setAttribute("d", "");
      rim.classList.toggle("hi", !over);
    }
    marks.forEach((m, i) => { const a = rad(spin + i * 90); place(m, P(Math.cos(a) * 28, Math.sin(a) * 28, Z0)); });
  }

  function retarget() {
    const base = FORMS[form];
    rings.forEach((s, k) => {
      const t = k / K, r0 = base(t);
      s.t = over ? r0 + (over[1] - r0) * Math.exp(-(((t - over[0]) / reach) ** 2)) : r0;
    });
  }

  const B = register(stage, (dt) => {
    const still = reducedMotion();
    let m = false;
    if (!still) {
      spin = (spin + SPIN * dt) % 360;
      if (!over) { clock += dt; if (clock >= CYCLE) { clock = 0; form = (form + 1) % FORMS.length; retarget(); } }
    }
    for (const s of rings) if (stepS(s, dt)) m = true;
    draw();
    return m || !still;
  });
  bag.add(B.unregister);

  // hit: on the wheel's axis, which never moves. Height from the pointer's y along the axis, press from its distance off it.
  const a0 = P(0, 0, Z0), a1 = P(0, 0, Z0 + H), unit = P(SQ, -SQ, Z0)[0] - a0[0];
  bag.add(pointer(stage, {
    move: ([x, y]) => {
      const t = (y - a0[1]) / (a1[1] - a0[1]);
      if (t < -0.15 || t > 1.15 || Math.abs(x - a0[0]) > 70 * unit) { if (over) { over = null; read.textContent = "rest"; retarget(); B.wake(); } return; }
      over = [clamp(t, 0, 1), clamp(Math.abs(x - a0[0]) / unit, RMIN, RMAX)];
      read.textContent = NAMES(over[0]);
      retarget();
      B.wake();
    },
    leave: () => { over = null; clock = 0; read.textContent = "rest"; retarget(); B.wake(); },
  }));
  bag.add(() => svg.replaceChildren());

  read.textContent = "rest";
  draw();
  return { set: (v) => { reach = v; retarget(); B.wake(); }, destroy: bag.dispose };
}

hairline({
  name: "clay",
  means: "Clay on a potter's wheel: it turns and finds new forms on its own, and the pointer, as the hands, shapes the wall.",
  rules: [1, 3, 5, 9],
  range: [0.12, 0.2, 0.32],
  mount,
});
