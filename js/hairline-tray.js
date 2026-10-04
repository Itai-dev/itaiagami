/**
 * Tray: the enquiry as an index card over an in-tray that already holds a
 * few. Left alone, the card floats and turns a little above the tray. The
 * page tells it how far the form is filled in (an "enquiry:progress" event):
 * each field filled writes one line on the card. When the enquiry is sent
 * ("enquiry:sent"), the card drops into the tray and the tray takes the
 * bright edge. The pointer lifts the card towards the reader. The slider is
 * that lift, in world units.
 *
 * The pattern: one object answering the page and the pointer. Springs for
 * the float and the lift, a tween for the drop, and the tray split in two so
 * the card is painted between its far and near walls.
 */
const {
  Cam, facing, fit, hull, open, poly, prism, proj, ringAt, rrect, run, seg,
  spring, stepS, tween, tset, tval, tdone, reducedMotion, mk, pointer, put, reflect, register, disposer, solid,
} = HL;

const TX = 66, TY = 46, WH = 16, WT = 2.6, R = 7, CW = 46, CD = 30, CT = 1.4, LINES = 5, FLOAT = 48;
const rad = (d) => (d * Math.PI) / 180;
const turn = (ring, a, ox = 0, oy = 0) => {
  const c = Math.cos(rad(a)), s = Math.sin(rad(a));
  return ring.map((q) => ({ u: ox + q.u * c - q.v * s, v: oy + q.u * s + q.v * c, nu: q.nu * c - q.nv * s, nv: q.nu * s + q.nv * c }));
};
const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let lift = value;

  const C = Cam(45, 0.5, 1.75);
  fit(C, [[-TX, -TY, 0], [TX, TY, -6], [TX, -TY, 0], [-TX, TY, 0], [0, 0, FLOAT + 54 + 8]], 200, 166);
  const P = proj(C), front = facing(C);
  const outer = rrect(-TX, -TY, TX, TY, R, 6), inner = rrect(-TX + WT, -TY + WT, TX - WT, TY - WT, R - WT, 6);

  const g = mk("g", {}, svg);
  reflect(svg, g, P, front, outer, 0, 12);
  // far half of the tray: body, rim's inner edge, the floor seam along the far walls
  mk("path", { class: "sil", d: poly(hull(ringAt(P, outer, 0).concat(ringAt(P, outer, WH)))) }, g);
  const rimIn = mk("path", { class: "nf", d: poly(ringAt(P, inner, WH)) }, g);
  mk("path", { class: "nf lo", d: open(ringAt(P, run(inner, (q) => !front(q)), 2.5)) }, g);

  // the cards already in the tray
  const card = rrect(-CW, -CD, CW, CD, 3, 4), crease = rrect(-CW + 1, -CD + 1, CW - 1, CD - 1, 2, 4);
  [[-6, 3, 2, -4], [4, 4.6, -3, 3]].forEach(([a, z, ox, oy]) => {
    const el = solid(g);
    put(el, prism(P, front, turn(card, a, ox, oy), turn(crease, a, ox, oy), z, z + CT));
  });

  // near half: one opaque piece from the rim's inner edge down to the floor
  const near = mk("g", {}, g);
  const iF = LR(ringAt(P, run(inner, front), WH)), oT = LR(ringAt(P, run(outer, front), WH)), oB = LR(ringAt(P, run(outer, front), 0));
  mk("path", { class: "fo", d: poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]) }, near);
  mk("path", { class: "nf lo", d: open(oT) }, near);
  const rimNear = mk("path", { class: "nf", d: open(iF) }, near);
  const wall = mk("path", { class: "nf sil", d: open([oT[0], ...oB, oT[oT.length - 1]]) }, near);
  // a label slot on the front, as an in-tray has
  const onFront = (rg) => rg.map((q) => P(q.u, TY, q.v));
  mk("path", { class: "nf lo", d: poly(onFront(rrect(-14, 5, 14, 11, 1.4, 4))) }, near);

  // the enquiry card, and its lines of writing
  const cg = mk("g", {}, g), cel = solid(cg), writing = mk("path", { class: "nf sil" }, cg), blank = mk("path", { class: "nf lo" }, cg);
  cel.sil.classList.add("hi");

  let filled = 0, sent = false, over = false, t = 0, drawn = "", inFront = true;
  const zf = spring(FLOAT), drop = tween(0);

  function draw(now) {
    const d = tval(drop, now), still = reducedMotion();
    const bob = sent || still ? 0 : 2 * Math.sin(t * 1.3), yaw = sent ? -6 * d + (1 - d) * -8 : -8 + (still ? 0 : 3 * Math.sin(t * 0.7));
    const z = (1 - d) * (zf.x + bob) + d * 6.2;
    const key = [z, yaw, filled].map((n) => n.toFixed(2)).join(",");
    if (key === drawn) return;
    drawn = key;
    put(cel, prism(P, front, turn(card, yaw), turn(crease, yaw), z, z + CT));
    const c = Math.cos(rad(yaw)), s = Math.sin(rad(yaw)), at = (u, v) => P(u * c - v * s, u * s + v * c, z + CT);
    let w = "", b = "";
    for (let i = 0; i < LINES; i++) {
      const v = -CD + 9 + i * 10.5, len = [62, 70, 48, 56, 74][i];
      const line = seg(at(-CW + 8, v), at(-CW + 8 + len, v));
      if (i < filled) w += line; else b += line;
    }
    writing.setAttribute("d", w);
    blank.setAttribute("d", b);
    // paint the card in front of the near wall while it is above the rim, behind it once it is in the tray
    const front2 = z > WH - 2;
    if (front2 !== inFront) { inFront = front2; if (front2) near.after(cg); else near.before(cg); }
  }

  const B = register(stage, (dt, now) => {
    t += dt;
    const m = stepS(zf, dt) || !tdone(drop, now);
    draw(now);
    return m || (!sent && !reducedMotion());
  });
  bag.add(B.unregister);

  function say() { read.textContent = sent ? "sent" : over ? `draft ${filled}/${LINES}` : "rest"; }

  bag.on(document, "enquiry:progress", (e) => { filled = Math.max(0, Math.min(LINES, e.detail?.filled | 0)); say(); B.wake(); });
  bag.on(document, "enquiry:sent", () => {
    if (sent) return;
    sent = true; filled = LINES;
    tset(drop, 1, performance.now(), 0);
    cel.sil.classList.remove("hi");
    [rimIn, rimNear, wall].forEach((el) => el.classList.add("hi"));
    say(); B.wake();
  });

  bag.add(pointer(stage, {
    move: () => { if (sent) return; over = true; zf.t = FLOAT + lift; say(); B.wake(); },
    leave: () => { over = false; zf.t = FLOAT; say(); B.wake(); },
  }));
  bag.add(() => svg.replaceChildren());

  say();
  return { set: (v) => { lift = v; if (over) { zf.t = FLOAT + lift; B.wake(); } }, destroy: bag.dispose };
}

hairline({
  name: "tray",
  means: "Your enquiry as an index card over an in-tray: each field you fill writes a line on it, and sending drops it in.",
  rules: [4, 5, 6, 8],
  range: [10, 18, 26],
  mount,
});
