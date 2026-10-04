/**
 * Swatches: a brand's colour fan deck. Eight blades turn on one rivet, each
 * split into chips. Left alone, the deck fans open, holds, and closes again.
 * The pointer opens it and picks the blade nearest its angle, which slides
 * out and takes the bright edge; the others part, staggered outwards. The
 * slider is the stagger, in ms.
 *
 * The pattern: one of many, on a pivot. Tweens, a stagger by distance, and a
 * hit test on the blades' target angles on the ground, which never moves.
 */
const {
  Cam, clamp, circ, facing, fit, poly, prism, proj, rrect, seg, unproj,
  tdone, tset, tval, tween, reducedMotion, mk, put, reflect, register, disposer, solid,
} = HL;

const N = 8, L = 118, W = 20, T = 1.6, A0 = -118, A1 = -12, SHUT = -22, OUT = 12;
const CYCLE = 5.2, OPEN_AT = 0.4, SHUT_AT = 3.4;
const rad = (d) => (d * Math.PI) / 180;
/** A ring turned by a degrees about the pivot and pushed out along its own length by o. */
const turn = (ring, a, o = 0) => {
  const c = Math.cos(rad(a)), s = Math.sin(rad(a));
  return ring.map((q) => ({ u: (q.u + o) * c - q.v * s, v: (q.u + o) * s + q.v * c, nu: q.nu * c - q.nv * s, nv: q.nu * s + q.nv * c }));
};
const fan = (i) => A0 + ((A1 - A0) * i) / (N - 1);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  const C = Cam(45, 0.5, 2.0);
  const ends = [];
  for (const a of [A0, A1, SHUT, (A0 + A1) / 2]) ends.push([Math.cos(rad(a)) * (L + OUT), Math.sin(rad(a)) * (L + OUT), 0]);
  fit(C, [[-14, -14, -6], [14, 14, -6], ...ends, [0, 0, N * T + 4]], 200, 160);
  const P = proj(C), front = facing(C);

  const blade = rrect(-12, -W / 2, L, W / 2, 5, 4), crease = rrect(-11, -W / 2 + 1.1, L - 1.1, W / 2 - 1.1, 3.9, 4);
  const g = mk("g", {}, svg);
  reflect(svg, g, P, front, circ(12, 24), -6, 10);
  put(solid(g), prism(P, front, circ(12, 24), circ(10.6, 24), -6, 0));

  const blades = [];
  for (let i = 0; i < N; i++) {
    const el = solid(g), chips = mk("path", { class: "nf lo" }, g);
    el.sil.classList.add("sil");
    blades.push({ el, chips, a: tween(SHUT), o: tween(0), z: i * T, drawn: "" });
  }
  const rivet = solid(g);
  put(rivet, prism(P, front, circ(4.2, 16), circ(3, 16), N * T, N * T + 2.4));

  function drawBlade(b, now) {
    const a = tval(b.a, now), o = tval(b.o, now), key = a.toFixed(3) + "," + o.toFixed(3);
    if (key === b.drawn) return;
    b.drawn = key;
    put(b.el, prism(P, front, turn(blade, a, o), turn(crease, a, o), b.z, b.z + T));
    // the chips: three printed patches across the blade, the last one the largest
    const c = Math.cos(rad(a)), s = Math.sin(rad(a)), zt = b.z + T;
    const at = (u, v) => P((u + o) * c - v * s, (u + o) * s + v * c, zt);
    let d = "";
    for (const [u0, u1] of [[44, 64], [68, 88], [92, L - 5]]) d += poly([at(u0, -W / 2 + 3.5), at(u1, -W / 2 + 3.5), at(u1, W / 2 - 3.5), at(u0, W / 2 - 3.5)]);
    d += seg(at(10, 0), at(34, 0));
    b.chips.setAttribute("d", d);
  }

  let over = false, act = -2, clock = 0, open = false;
  const B = register(stage, (dt, now) => {
    let moving = false;
    for (const b of blades) { drawBlade(b, now); if (!tdone(b.a, now) || !tdone(b.o, now)) moving = true; }
    if (over || reducedMotion()) return moving;
    clock += dt;
    if (!open && clock >= OPEN_AT && clock < SHUT_AT) { open = true; setFan(-1, true); }
    if (open && clock >= SHUT_AT) { open = false; setFan(-2, true); }
    if (clock >= CYCLE) clock = 0;
    return true;
  });
  bag.add(B.unregister);

  /** a ≥ 0 opens the deck and pulls blade a; -1 opens it; -2 shuts it. */
  function setFan(a, auto = false) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act >= 0 ? act : 0;
    act = a;
    blades.forEach((b, i) => {
      const delay = Math.abs(i - from) * stag;
      tset(b.a, a === -2 ? SHUT : fan(i), now, delay);
      tset(b.o, i === a ? OUT : 0, now, delay);
      b.el.sil.classList.toggle("hi", a >= 0 ? i === a : i === N - 1);
    });
    read.textContent = a >= 0 && !auto ? "chip " + (i2n(a)) : "rest";
    B.wake();
  }
  const i2n = (a) => String(a + 1).padStart(2, "0");

  /** The blade whose target angle is nearest the pointer's, on the ground. */
  function hit([x, y]) {
    const [u, v] = unproj(C, x, y, 0);
    if (Math.hypot(u, v) > L + OUT + 10) return -1;
    const ang = (Math.atan2(v, u) * 180) / Math.PI;
    if (ang < A0 - 14 || ang > A1 + 14) return -1;
    return clamp(Math.round(((ang - A0) / (A1 - A0)) * (N - 1)), 0, N - 1);
  }

  bag.add(pointer(stage, {
    move: (p) => { over = true; setFan(hit(p)); },
    leave: () => { over = false; clock = OPEN_AT; open = true; setFan(-1, true); },
  }));
  bag.add(() => svg.replaceChildren());

  blades[N - 1].el.sil.classList.add("hi");
  read.textContent = "rest";
  return { set: (v) => { stag = v; }, destroy: bag.dispose };
}
const { pointer } = HL;

hairline({
  name: "swatches",
  means: "A brand's swatch fan: it fans open and shut on its own, and the blade under the pointer slides out.",
  rules: [1, 2, 4, 8],
  range: [0, 40, 90],
  mount,
});
