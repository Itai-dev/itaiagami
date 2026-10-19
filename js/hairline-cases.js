/**
 * Cases: Riffle, adapted for a portfolio. A rounded tray holding seven case
 * cards, one per selected work. The card under the pointer
 * stands up and lifts; the ones in front lean forward and the ones behind lean
 * back, staggered outwards from it on the 700ms lift curve. Each card's number
 * is punched on its tab in a 4 × 2 grid, and goes to the read-out when the
 * card is pulled. The slider is the stagger, in ms.
 *
 * Left alone, it riffles through the cards by itself, front to back and back.
 *
 * Each card holds a still from one case study (WORK, card 01 at the front). It
 * shows only while the card is pulled, in a window under the card's head rule,
 * drifting slowly; clicking a pulled card opens its case study. The projection
 * is axonometric, so a card's plane is one affine matrix and the still is a
 * plain SVG <image> painted in the card's own place in the stack.
 *
 * The pattern: discrete items. Tweens, a stagger by distance, identity carried
 * by geometry, and a hit test on static bands along the resting top edges, so
 * a card moving out from under the pointer cannot flip the choice.
 */
const {
  Cam, clamp, facing, fillet, fit, hull, open, poly, proj, rad, ringAt, rrect, run, seg,
  tdone, tset, tval, tween, disposer, mk, place, pointer, reflect, register, reducedMotion,
} = HL;

const N = 7, W = 84, H = 54, G = 13, TW = 22, TH = 7, TABS = [6, 31, 56], TK = 1.4;
const REST = -12, BACK = -24, FWD = 20, LIFT = 16;
// the idle riffle: one card every HOLD seconds, back to front and back again; it waits AWAY seconds after the pointer leaves
const HOLD = 2.2, AWAY = 1.6;
// the still's window on a card, in the card's own units measured down from its top edge
const PX = 5, PT = 15, PB = H - 5, PR = 2.6;
const WORK = [
  ["simply-vision-pro", "simply", "Simply Vision Pro"],
  ["sky-max", "sky-max", "SkyMax"],
  ["google-shopping-il", "google", "Google Shopping IL"],
  ["museum-of-natural-history", "museum", "Museum of Natural History"],
  ["tower-of-david", "tower-of-david", "Tower of David"],
  ["partner-tv", "partner-tv", "Partner TV"],
  ["taormina-sicily", "taormina", "Taormina Sicily"],
];
const X0 = -5, X1 = W + 5, Y0 = -9, Y1 = (N - 1) * G + 9, WH = 20, WR = 6, WT = 2.4;

/** A run of points ordered left to right on screen. */
const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());

/** The tray, which never moves: `far` is painted before the cards, `near` after them; each entry is [d, class]. */
function tray(P, front, outer, inner) {
  // far half: body, the rim's inner edge, and the floor seam along the far walls
  const far = [
    [poly(hull(ringAt(P, outer, 0).concat(ringAt(P, outer, WH)))), "sil"],
    [poly(ringAt(P, inner, WH)), "nf"],
    [open(ringAt(P, run(inner, (q) => !front(q)), 2.5)), "nf lo"],
  ];
  // near half: one opaque piece from the rim's inner edge down to the floor
  const iF = LR(ringAt(P, run(inner, front), WH)), oT = LR(ringAt(P, run(outer, front), WH)), oB = LR(ringAt(P, run(outer, front), 0));
  // a finger pull, set into the front
  const hx = (X0 + X1) / 2, onFront = (ring) => ring.map((q) => P(q.u, Y1, q.v));
  const near = [
    [poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]), "fo"],
    [open(oT), "nf lo"],
    [open(iF), "nf"],
    [open([oT[0], ...oB, oT[oT.length - 1]]), "nf sil"],
    [poly(onFront(rrect(hx - 11, 6.5, hx + 11, 12.5, 3, 5))), "nf"],
    [poly(onFront(rrect(hx - 9.4, 8, hx + 9.4, 11, 1.5, 5))), "nf lo"],
  ];
  return { far, near };
}

/** Card i, back to front: its number (7 at the back), which of three tab positions it takes, and its filleted outline, upright in its own plane. */
function card(i) {
  const n = N - i, t0 = TABS[(N - 1 - i) % 3];
  const shape = fillet(
    [[0, 0], [W, 0], [W, H], [t0 + TW, H], [t0 + TW, H + TH], [t0, H + TH], [t0, H], [0, H]],
    [1, 1, 3.2, 1.8, 2.4, 2.4, 1.8, 3.2],
  );
  return { n, t0, shape };
}

/** Card i leaning th degrees (negative leans back) and lifted by `lift`: its paths, and where its eight punches sit. */
function pose(P, i, t0, shape, th, lift) {
  const yb = i * G, s = Math.sin(rad(th)), c = Math.cos(rad(th));
  const w = (u, v) => P(u, yb + v * s, v * c + lift);
  // the card's plane as a matrix: x along the card, y down from its top edge
  const o = w(0, H), eu = w(1, H), ev = w(0, H - 1);
  const wb = (u, v) => P(u, yb + v * s - TK * c, v * c + TK * s + lift);
  const punch = [];
  for (let k = 0; k < 8; k++) punch.push(w(t0 + TW / 2 + ((k % 4) - 1.5) * 3.6, H + TH / 2 + (0.5 - Math.floor(k / 4)) * 2.8));
  return {
    back: poly(shape.map((p) => wb(p[0], p[1]))),
    face: poly(shape.map((p) => w(p[0], p[1]))),
    head: seg(w(6, H - 11), w(W - 6, H - 11)),
    rules: [H - 18, H - 25, H - 32, H - 39].map((v) => seg(w(6, v), w(W - 6, v))).join(""),
    punch,
    plane: `matrix(${[eu[0] - o[0], eu[1] - o[1], ev[0] - o[0], ev[1] - o[1], o[0], o[1]].map((x) => x.toFixed(4)).join(" ")})`,
  };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  // The camera is fitted to the tray with a card lifted, so nothing leaves the frame in any pose.
  const C = Cam(45, 0.5, 1.62);
  fit(C, [[X0, Y0, 0], [X1, Y1, -8], [X1, Y0, 0], [X0, Y1, 0], [X0, Y0, H + TH], [X1, Y0, H + TH + LIFT]], 200, 166);
  const P = proj(C), front = facing(C);
  const outer = rrect(X0, Y0, X1, Y1, WR, 6), inner = rrect(X0 + WT, Y0 + WT, X1 - WT, Y1 - WT, WR - WT, 6);
  const paths = tray(P, front, outer, inner);

  const g = mk("g", {}, svg);
  reflect(svg, g, P, front, outer, 0, 14);
  for (const [d, cls] of paths.far) mk("path", { d, class: cls }, g);

  // one clip for every still: the window, in card units
  const uid = "hc" + Math.random().toString(36).slice(2, 7);
  const defs = mk("defs", {}, svg), clip = mk("clipPath", { id: uid, clipPathUnits: "userSpaceOnUse" }, defs);
  mk("rect", { x: PX, y: PT, width: W - 2 * PX, height: PB - PT, rx: PR }, clip);

  const cards = [];
  for (let i = 0; i < N; i++) {
    const { n, t0, shape } = card(i);
    const grp = mk("g", {}, g);
    const back = mk("path", { class: "lo" }, grp), face = mk("path", { class: "sil" }, grp);
    const pic = mk("g", { class: "hc-pic" }, grp), win = mk("g", { "clip-path": `url(#${uid})` }, pic);
    const img = mk("image", { x: PX, y: PT, width: W - 2 * PX, height: PB - PT, preserveAspectRatio: "xMidYMid slice" }, win);
    mk("path", { d: poly(rrect(PX, PT, W - PX, PB, PR, 4).map((q) => [q.u, q.v])), class: "nf lo" }, pic);
    const head = mk("path", { class: "nf" }, grp), rules = mk("path", { class: "nf lo" }, grp);
    // the card's number, punched in a 4 × 2 grid on its tab
    const punch = [];
    for (let k = 0; k < 8; k++) punch.push(mk("circle", { r: 1.05, class: "dot " + (k === n - 1 ? "m" : "off") }, grp));
    rules.classList.add("hc-rules");
    cards.push({ n, t0, shape, back, face, head, rules, punch, pic, img, work: WORK[n - 1], a: tween(REST), z: tween(0) });
  }

  for (const [d, cls] of paths.near) mk("path", { d, class: cls }, g);

  // hit bands: oblique strips along the RESTING top edges. They never move, and nothing draws them.
  const top = (i) => P(W / 2, i * G + H * Math.sin(rad(REST)), H * Math.cos(rad(REST)));
  const c0 = top(0), c1 = top(1), d = [c1[0] - c0[0], c1[1] - c0[1]];
  const px0 = P(0, 0, 0), px1 = P(1, 0, 0), ex = [px1[0] - px0[0], px1[1] - px0[1]];
  const HALF = W / 2 + 6, det = d[0] * ex[1] - d[1] * ex[0];

  /** The card whose band holds the point, in the band's own (s, r) coordinates; -1 outside. */
  function hit([x, y]) {
    const qx = x - c0[0], qy = y - c0[1];
    const s = (qx * ex[1] - qy * ex[0]) / det, r = (d[0] * qy - d[1] * qx) / det;
    if (Math.abs(r) > HALF || s < -0.5 || s > N + 1) return -1;
    return clamp(Math.round(s), 0, N - 1);
  }

  function draw(i, th, lift) {
    const cd = cards[i], q = pose(P, i, cd.t0, cd.shape, th, lift);
    cd.back.setAttribute("d", q.back);
    cd.face.setAttribute("d", q.face);
    cd.head.setAttribute("d", q.head);
    cd.rules.setAttribute("d", q.rules);
    cd.punch.forEach((el, k) => place(el, q.punch[k]));
    cd.pic.setAttribute("transform", q.plane);
  }

  // the stills load once the page is idle, so they never hold up the first paint
  const load = () => cards.forEach((cd) => cd.img.setAttribute("href", `/assets/opt/hero/${cd.work[1]}.webp`));
  const later = window.requestIdleCallback || ((fn) => setTimeout(fn, 300));
  if (document.readyState === "complete") later(load); else addEventListener("load", () => later(load), { once: true });

  // the riffle starts at the front card, 01, and walks back to 07 before it turns
  let over = false, idle = 0, step = N, dir = -1;
  const B = register(stage, (dt, now) => {
    let moving = false;
    cards.forEach((cd, i) => { draw(i, tval(cd.a, now), tval(cd.z, now)); if (!tdone(cd.a, now) || !tdone(cd.z, now)) moving = true; });
    // ambient: with nobody pointing, riffle through the cards on its own, only while visible
    if (over || reducedMotion()) return moving;
    idle += dt;
    if (idle >= HOLD) {
      idle = 0;
      if (step + dir < 0 || step + dir >= N) dir = -dir;
      step += dir;
      setActive(step, true);
    }
    return true;
  });
  bag.add(B.unregister);

  let act = -1;
  const caption = (a) => (a < 0 ? "rest" : String(N - a).padStart(2, "0"));
  /** Pulls card a (-1 puts them all back). The stagger spreads out from the card pulled, or the one let go. */
  function setActive(a, auto = false) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act;
    act = a;
    cards.forEach((cd, i) => {
      const delay = Math.abs(i - from) * stag;
      const th = a < 0 ? REST : i < a ? BACK : i > a ? FWD : 0;
      tset(cd.a, th, now, delay); tset(cd.z, a === i ? LIFT : 0, now, delay);
      cd.face.classList.toggle("hi", i === a); cd.head.classList.toggle("hi", i === a); cd.punch[cd.n - 1].classList.toggle("m", i !== a);
      cd.pic.classList.toggle("on", i === a); cd.rules.classList.toggle("off", i === a);
    });
    stage.classList.toggle("hc-open", a >= 0 && !auto);
    stage.title = a >= 0 ? cards[a].work[2] : "";
    read.textContent = auto ? "rest" : caption(a);
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => { over = true; setActive(hit(p)); },
    leave: () => { over = false; idle = -AWAY; step = act; setActive(-1); },
  }));
  // a mouse click opens the pulled card's case study (touch has the selected work list below)
  const go = (e) => { if (act >= 0 && e.pointerType !== "touch") location.href = `/work/${cards[act].work[0]}.html`; };
  stage.addEventListener("click", go);
  bag.add(() => stage.removeEventListener("click", go));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "cases",
  means: "Seven case cards in a tray, each holding a still from a case study: the one under the pointer stands up and shows it, and its neighbours lean away in turn.",
  rules: [1, 2, 8, 10],
  range: [0, 40, 90],
  mount,
});
