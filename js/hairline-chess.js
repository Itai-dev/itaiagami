/**
 * Chess: a board that plays itself. From the position after 1.e4 e5 2.Bc4 Bc5
 * it plays 3.Qh5 d6 4.Qxf7#, the taken pawn sliding off to the board's side,
 * then sweeps every piece home again, staggered outwards from the mate, and
 * goes round once more. The piece that last moved holds the bright stroke.
 * The pointer is a hand over the set: it pauses the game, and the pieces near
 * it rise off their squares, the nearest highest, each on its own spring. The
 * slider is the hand's reach, in squares.
 *
 * The pattern: a field (Terrain's answer) over discrete items that move on
 * the 700ms clock, with a hit test on the ground plane, which never moves.
 */
const {
  Cam, circ, clamp, facing, fit, hull, open, poly, prism, proj, rings, ringAt, rrect, run, seg, unproj,
  spring, stepS, tween, tset, tval, tdone, reducedMotion, mk, solid, put, pointer, register, disposer,
} = HL;

const SQ = 13, B = 8 * SQ, LIFT = 16, HOP = 7, HOLD = 1.5, MATE = 2.6, S = 1.85;
const FILES = "abcdefgh";
/** Square name to the world centre of that square: files run along x, rank 1 is the near (large y) edge. */
const at = (sq) => [(FILES.indexOf(sq[0]) + 0.5) * SQ, (8 - Number(sq[1]) + 0.5) * SQ];
const OFF = [B + 11, 2.2 * SQ];

// Each kind: a list of parts from the foot up. c: a tapered solid [r0, r1, z0, z1]; b: a ball [r, z].
const KINDS = {
  pawn: [["c", 3.9, 3.9, 0, 1.8], ["c", 2.9, 1.5, 1.8, 7], ["b", 2.4, 8.8]],
  rook: [["c", 4.2, 4.2, 0, 1.8], ["c", 3.3, 2.7, 1.8, 9.5], ["c", 3.5, 3.5, 9.5, 12.5]],
  bishop: [["c", 4, 4, 0, 1.8], ["c", 3, 1.4, 1.8, 10.5], ["b", 2.3, 12.4], ["b", 0.8, 15.2]],
  queen: [["c", 4.4, 4.4, 0, 2], ["c", 3.3, 1.6, 2, 12.5], ["c", 1.9, 3.2, 12.5, 15.5], ["b", 1.1, 16.8]],
  king: [["c", 4.4, 4.4, 0, 2], ["c", 3.4, 1.7, 2, 13.5], ["c", 2, 3, 13.5, 16.5], ["x", 16.5, 21.5]],
};
const SET = [
  ["rook", "a1"], ["queen", "d1"], ["king", "e1"], ["rook", "h1"], ["bishop", "c4"],
  ["pawn", "c2"], ["pawn", "d2"], ["pawn", "e4"], ["pawn", "f2"], ["pawn", "g2"],
  ["rook", "a8"], ["queen", "d8"], ["king", "e8"], ["rook", "h8"], ["bishop", "c5"],
  ["pawn", "c7"], ["pawn", "d7"], ["pawn", "e5"], ["pawn", "f7"], ["pawn", "g7"],
];
// the game: [from, to]; a move onto an occupied square takes that piece off the board
const GAME = [["d1", "h5"], ["d7", "d6"], ["h5", "f7"]];

/** 1 under the hand, half way at half the reach, nothing at the reach: a smoothstep turned over. */
const falloff = (u) => (u >= 1 ? 0 : 1 - u * u * (3 - 2 * u));
const shift = (ring, x, y) => ring.map((q) => ({ ...q, u: q.u + x, v: q.v + y }));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let reach = value, over = null;
  const C = Cam(45, 0.5, S);
  const top = 21.5 + LIFT + HOP;
  fit(C, [[-5, -5, -6], [B + 5, B + 5, -6], [B + 5, -5, -6], [-5, B + 5, -6], [0, 0, top], [OFF[0], OFF[1], 0], [B, 0, top]], 200, 166);
  const P = proj(C), front = facing(C);

  // the board: a plinth, the playing field's edge, and the dark squares inset into it
  const g = mk("g", {}, svg);
  const [pr, pi] = rings(-5, -5, B + 5, B + 5, 6, 1.8);
  put(solid(g), prism(P, front, pr, pi, -6, 0));
  mk("path", { d: poly(ringAt(P, rrect(-1, -1, B + 1, B + 1, 1.5, 3), 0)), class: "nf lo" }, g);
  for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) {
    if ((f + r) % 2) continue;
    const x = f * SQ, y = (7 - r) * SQ;
    mk("path", { d: poly(ringAt(P, rrect(x + 1.4, y + 1.4, x + SQ - 1.4, y + SQ - 1.4, 1.6, 3), 0)), class: "nf lo" }, g);
  }

  const RING = {};
  const ring = (r) => (RING[r] ||= circ(r, 28));
  const pieces = SET.map(([kind, sq], id) => {
    const grp = mk("g", {}, g), [x, y] = at(sq);
    // the square it left: a dashed footprint on the board, painted first, shown only while the piece is lifted
    const foot = mk("path", { class: "nf lo dash" }, grp);
    const parts = KINDS[kind].map((p) => p[0] === "b"
      ? { p, el: mk("ellipse", { class: "sil" }, grp) }
      : p[0] === "x" ? { p, el: mk("path", { class: "nf sil" }, grp) } : { p, el: solid(grp) });
    return { id, kind, home: sq, sq, grp, foot, parts, x: tween(x), y: tween(y), h: tween(1), lift: spring(0, { eps: 0.05 }), drawn: "" };
  });

  /** Writes a piece's paths at its current place; skips it when nothing changed. */
  function draw(pc, now) {
    const x = tval(pc.x, now), y = tval(pc.y, now), z = pc.lift.x + HOP * Math.sin(Math.PI * tval(pc.h, now));
    const key = `${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`;
    if (key === pc.drawn) return false;
    pc.drawn = key;
    pc.foot.setAttribute("d", pc.lift.x > 1 ? poly(ringAt(P, shift(ring(3.9), x, y), 0)) : "");
    for (const { p, el } of pc.parts) {
      if (p[0] === "b") {
        const [sx, sy] = P(x, y, z + p[2]);
        el.setAttribute("cx", sx.toFixed(2)); el.setAttribute("cy", sy.toFixed(2));
        el.setAttribute("rx", (p[1] * S).toFixed(2)); el.setAttribute("ry", (p[1] * S).toFixed(2));
      } else if (p[0] === "x") {
        const m = (p[1] + p[2]) / 2 + 1;
        el.setAttribute("d", seg(P(x, y, z + p[1]), P(x, y, z + p[2])) + seg(P(x - 1.8, y, z + m), P(x + 1.8, y, z + m)));
      } else {
        const [, r0, r1, z0, z1] = p, foot = shift(ring(r0), x, y), cap = shift(ring(r1), x, y);
        put(el, r0 === r1
          ? prism(P, front, foot, shift(ring(r1 - 0.6), x, y), z + z0, z + z1)
          : { sil: poly(hull(ringAt(P, foot, z + z0).concat(ringAt(P, cap, z + z1)))), crease: open(ringAt(P, run(shift(ring(Math.max(0.4, r1 - 0.6)), x, y), front), z + z1)) });
      }
    }
    return true;
  }

  /** Paint order follows depth: re-append only when the order changes. */
  let order = "";
  function sortDepth(now) {
    const by = pieces.slice().sort((a, b) => (tval(a.x, now) + tval(a.y, now)) - (tval(b.x, now) + tval(b.y, now)));
    const k = by.map((p) => p.id).join(",");
    if (k !== order) { order = k; by.forEach((p) => g.append(p.grp)); }
  }

  let lit = null;
  function light(pc) {
    if (pc === lit) return;
    for (const q of [lit, pc]) if (q) q.parts.forEach(({ p, el }) => (p[0] === "c" ? el.sil : el).classList.toggle("hi", q === pc));
    lit = pc;
  }

  function move(pc, sq, now, delay = 0) {
    const [x, y] = at(sq);
    pc.sq = sq; pc.h = tween(0); tset(pc.h, 1, now, delay);
    tset(pc.x, x, now, delay); tset(pc.y, y, now, delay);
  }
  const bySq = (sq) => pieces.find((p) => p.sq === sq);

  // the game clock: one move every HOLD seconds while nobody's hand is over the board
  let ply = 0, wait = 0;
  function playNext(now) {
    if (ply < GAME.length) {
      const [from, to] = GAME[ply++], pc = bySq(from), taken = bySq(to);
      if (taken) { const [x, y] = OFF; taken.sq = "off"; taken.h = tween(0); tset(taken.h, 1, now, 120); tset(taken.x, x, now, 120); tset(taken.y, y, now, 120); }
      move(pc, to, now); light(pc);
      wait = ply === GAME.length ? MATE : HOLD;
    } else {
      // new game: every piece goes home, staggered outwards from where the game ended
      const [ex, ey] = at(GAME[GAME.length - 1][1]);
      for (const pc of pieces) if (pc.sq !== pc.home) {
        const [hx, hy] = at(pc.home);
        move(pc, pc.home, now, Math.hypot(hx - ex, hy - ey) / SQ * 45);
      }
      light(bySq("c5")); ply = 0; wait = HOLD * 1.6;
    }
  }
  light(bySq("c5"));

  const L = register(stage, (dt, now) => {
    let moving = false;
    for (const pc of pieces) {
      if (stepS(pc.lift, dt)) moving = true;
      if (!tdone(pc.x, now) || !tdone(pc.y, now) || !tdone(pc.h, now)) moving = true;
      draw(pc, now);
    }
    sortDepth(now);
    if (over || reducedMotion()) return moving;
    wait -= dt;
    if (wait <= 0) playNext(now);
    return true;
  });
  bag.add(L.unregister);

  function retarget() {
    let near = null, best = Infinity;
    for (const pc of pieces) {
      if (!over || pc.sq === "off") { pc.lift.t = 0; continue; }
      const [x, y] = at(pc.sq), d = Math.hypot(x - over[0], y - over[1]) / SQ;
      pc.lift.t = clamp(LIFT * falloff(d / reach), 0, LIFT);
      if (d < best && d < reach) { best = d; near = pc; }
    }
    if (over) {
      const f = Math.floor(over[0] / SQ), r = 8 - Math.floor(over[1] / SQ);
      const onBoard = f >= 0 && f < 8 && r >= 1 && r <= 8;
      light(near || lastMoved);
      read.textContent = near ? `${near.kind} ${near.sq}` : onBoard ? FILES[f] + r : "rest";
    } else { light(lastMoved); read.textContent = "rest"; }
    L.wake();
  }
  let lastMoved = lit;

  bag.add(pointer(stage, {
    move: (p) => { if (!over) lastMoved = lit; over = unproj(C, p[0], p[1], 0); retarget(); },
    leave: () => { over = null; wait = Math.max(wait, HOLD); retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  read.textContent = "rest";

  return {
    set: (v) => { reach = v; if (over) retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "chess",
  means: "A chess set that plays itself: the pieces near the pointer lift off their squares, the nearest highest.",
  rules: [1, 3, 5, 6],
  range: [1.2, 2.2, 3.5],
  mount,
});
