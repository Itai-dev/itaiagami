import sharp from 'sharp';
import { writeFileSync } from 'fs';

const OUT = 'C:/Users/Itaia/OneDrive/Desktop/Itai-Agami-Portfolio/assets/opt/';
const PNG = 'C:/Users/Itaia/AppData/Local/Temp/claude/C--Users-Itaia-OneDrive-Desktop/54fd9c41-9a9b-48a6-b33b-92e1d1f8096a/scratchpad/';
const BG = '#0d0d0d', FG = '#ececec', DIM = 'rgba(236,236,236,.55)', FAINT = 'rgba(236,236,236,.28)',
      LINE = 'rgba(236,236,236,.14)', MARK = '#F25C05';
const FF = "Inter,Segoe UI,Arial,sans-serif";

const micro = (x, y, t, fill = FAINT, anchor = 'start', size = 13) =>
  `<text x="${x}" y="${y}" font-family="${FF}" font-size="${size}" font-weight="500" letter-spacing="1.9" fill="${fill}" text-anchor="${anchor}">${t}</text>`;
const txt = (x, y, t, size, fill = FG, weight = 400, anchor = 'start', ls = 0) =>
  `<text x="${x}" y="${y}" font-family="${FF}" font-size="${size}" font-weight="${weight}" letter-spacing="${ls}" fill="${fill}" text-anchor="${anchor}">${t}</text>`;

/* ---------------- HERO 1600x900 — the experimentation loop ---------------- */
function hero() {
  const W = 1600, H = 900;
  const steps = ['Audience tension', 'Hypothesis', 'Creative territory', 'Concept', 'Variation', 'Test &amp; learn', 'Scale'];
  const n = steps.length, x0 = 152, x1 = W - 152, span = (x1 - x0) / (n - 1), cy = 516, box = 88;
  let s = '';
  for (let i = 0; i < n; i++) {
    const cx = x0 + span * i, on = (i === 4);
    s += `<rect x="${cx - box / 2}" y="${cy - box / 2}" width="${box}" height="${box}" fill="${on ? 'rgba(242,92,5,.08)' : 'none'}" stroke="${on ? MARK : LINE}" stroke-width="1"/>`;
    // frame lines — a nod to the creative-asset frames the system produces
    const fl = on ? 'rgba(242,92,5,.4)' : 'rgba(236,236,236,.13)';
    s += `<line x1="${cx - box / 2 + 16}" y1="${cy + 18}" x2="${cx - box / 2 + 16 + (box - 32) * 0.72}" y2="${cy + 18}" stroke="${fl}" stroke-width="1"/>`;
    s += `<line x1="${cx - box / 2 + 16}" y1="${cy + 27}" x2="${cx - box / 2 + 16 + (box - 32) * 0.42}" y2="${cy + 27}" stroke="${fl}" stroke-width="1"/>`;
    s += micro(cx, cy - box / 2 - 20, String(i + 1).padStart(2, '0'), on ? MARK : FAINT, 'middle', 12);
    const w = steps[i].split(' ');
    const lines = steps[i].length > 11 && w.length > 1 ? [w[0], w.slice(1).join(' ')] : [steps[i]];
    lines.forEach((l, li) => { s += txt(cx, cy + box / 2 + 36 + li * 22, l, 16, on ? FG : DIM, on ? 500 : 400, 'middle'); });
    if (i < n - 1) {
      const a = cx + box / 2 + 16, b = x0 + span * (i + 1) - box / 2 - 16;
      s += `<line x1="${a}" y1="${cy}" x2="${b - 7}" y2="${cy}" stroke="${LINE}" stroke-width="1"/>`;
      s += `<path d="M${b - 7} ${cy - 4} L${b} ${cy} L${b - 7} ${cy + 4}" fill="none" stroke="${LINE}" stroke-width="1"/>`;
    }
  }
  const ax = x0 + span * (n - 1), bx = x0, ay = cy + box / 2, top = ay + 82, low = ay + 132;
  s += `<path d="M${ax} ${ay + 52} L${ax} ${low - 24} Q ${ax} ${low}, ${ax - 24} ${low} L${bx + 24} ${low} Q ${bx} ${low}, ${bx} ${low - 24} L${bx} ${top}" fill="none" stroke="${MARK}" stroke-width="1" stroke-dasharray="3 5" opacity=".85"/>`;
  s += `<path d="M${bx - 4.5} ${top + 10} L${bx} ${top} L${bx + 4.5} ${top + 10}" fill="none" stroke="${MARK}" stroke-width="1"/>`;
  s += `<rect x="${W / 2 - 214}" y="${low - 13}" width="428" height="26" fill="${BG}"/>`;
  s += txt(W / 2, low + 5, 'Performance signal informs the next round of concepts', 16, MARK, 400, 'middle');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  ${micro(152, 208, 'NATURAL INTELLIGENCE — 2025–2026')}
  ${txt(152, 290, 'The creative experimentation system', 52, FG, 400, 'start', '-1.2')}
  ${txt(152, 340, 'From audience tension to measurable learning — and back again.', 20, DIM)}
  <line x1="152" y1="390" x2="${W - 152}" y2="390" stroke="${LINE}" stroke-width="1"/>
  ${s}
  </svg>`;
}

/* ---------------- THUMB 800x450 — variation matrix ---------------- */
function thumb() {
  const W = 800, H = 450;
  let s = '';
  const frames = [
    { w: 44, h: 78, l: '9:16' }, { w: 78, h: 78, l: '1:1' }, { w: 120, h: 68, l: '16:9' }, { w: 62, h: 78, l: '4:5' },
    { w: 78, h: 44, l: '16:9' }, { w: 44, h: 78, l: '9:16' }, { w: 78, h: 78, l: '1:1' }, { w: 120, h: 68, l: '16:9' },
  ];
  const cols = 4, gx = 152, gy = 112, ox = 96, oy = 208, on = 5;
  frames.forEach((f, i) => {
    const cx = ox + (i % cols) * gx, cy = oy + Math.floor(i / cols) * gy, hi = (i === on);
    s += `<rect x="${cx}" y="${cy - f.h / 2}" width="${f.w}" height="${f.h}" fill="${hi ? 'rgba(242,92,5,.1)' : 'rgba(236,236,236,.02)'}" stroke="${hi ? MARK : LINE}" stroke-width="1"/>`;
    s += micro(cx + f.w + 10, cy - f.h / 2 + 11, f.l, hi ? MARK : 'rgba(236,236,236,.22)', 'start', 10);
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  ${micro(96, 78, 'PERFORMANCE CREATIVE')}
  ${txt(96, 128, 'One concept. Many testable variables.', 27, FG, 400, 'start', '-0.5')}
  <line x1="96" y1="158" x2="${W - 96}" y2="158" stroke="${LINE}" stroke-width="1"/>
  ${s}
  ${micro(96, 402, 'HOOK / FIRST FRAME / TONE / PROOF POINT / FORMAT / CTA', 'rgba(236,236,236,.3)', 'start', 11)}
  </svg>`;
}

/* ---------------- G1 1600x900 — three categories, three tensions ---------------- */
function g1() {
  const W = 1600, H = 900;
  const cats = [
    { n: '01', t: 'Car insurance', a: 'Low attention', b: 'Immediate action', k: 'Urgency, savings and risk' },
    { n: '02', t: 'Pet insurance', a: 'Emotion', b: 'Information', k: 'Care, emotion and trust' },
    { n: '03', t: 'Mortgage &amp; lending', a: 'Complexity', b: 'Clarity', k: 'Opportunity and long-term value' },
  ];
  const colW = (W - 304 - 120) / 3;
  let s = '';
  cats.forEach((c, i) => {
    const x = 152 + i * (colW + 60);
    s += `<line x1="${x}" y1="380" x2="${x + colW}" y2="380" stroke="${LINE}" stroke-width="1"/>`;
    s += micro(x, 360, c.n, MARK, 'start', 12);
    s += txt(x, 442, c.t, 30, FG, 400, 'start', '-0.6');
    s += txt(x, 484, c.k, 16, DIM);
    const ay = 590;
    s += `<line x1="${x}" y1="${ay}" x2="${x + colW - 40}" y2="${ay}" stroke="${LINE}" stroke-width="1"/>`;
    s += `<circle cx="${x}" cy="${ay}" r="3.5" fill="${MARK}"/>`;
    s += `<circle cx="${x + colW - 40}" cy="${ay}" r="3.5" fill="${MARK}"/>`;
    s += txt(x, ay + 32, c.a, 15, FAINT);
    s += txt(x + colW - 40, ay + 32, c.b, 15, FAINT, 400, 'end');
    s += micro(x + (colW - 40) / 2, ay - 18, 'TENSION', 'rgba(236,236,236,.3)', 'middle', 10);
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  ${micro(152, 160, 'SELECTED CREATIVE TERRITORIES')}
  ${txt(152, 242, 'One process. Different human tensions.', 52, FG, 400, 'start', '-1.2')}
  ${txt(152, 292, 'Each category required its own reading of audience psychology.', 20, DIM)}
  ${s}
  ${txt(152, 762, 'Six categories in market — car insurance, pet insurance, mortgage, home equity, business loans, home security.', 17, FAINT)}
  </svg>`;
}

/* ---------------- G2 1600x900 — AI-assisted production pipeline ---------------- */
function g2() {
  const W = 1600, H = 900;
  const steps = [
    { n: '01', t: 'Master asset', d: 'Primary creative at highest quality' },
    { n: '02', t: 'Platform specs', d: 'Formats, safe zones, constraints' },
    { n: '03', t: 'Automated adaptation', d: 'Composition and hierarchy preserved' },
    { n: '04', t: 'Creative review', d: 'Designer judgment on intent' },
    { n: '05', t: 'Final refinement', d: 'Targeted quality adjustments' },
  ];
  const x0 = 152, W2 = W - 304, gap = 26, cw = (W2 - gap * 4) / 5, y = 400, ch = 214;
  let s = '';
  steps.forEach((p, i) => {
    const x = x0 + i * (cw + gap), auto = (i === 2);
    s += `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="${auto ? 'rgba(242,92,5,.06)' : 'none'}" stroke="${auto ? MARK : LINE}" stroke-width="1"/>`;
    s += micro(x + 26, y + 44, p.n, auto ? MARK : FAINT, 'start', 12);
    s += txt(x + 26, y + 96, p.t, 19, FG, 500);
    const w = p.d.split(' '); const mid = Math.ceil(w.length / 2);
    s += txt(x + 26, y + 132, w.slice(0, mid).join(' '), 15, DIM);
    s += txt(x + 26, y + 154, w.slice(mid).join(' '), 15, DIM);
    if (i < 4) { const axx = x + cw + gap / 2; s += `<path d="M${axx - 5} ${y + ch / 2 - 5} L${axx + 2} ${y + ch / 2} L${axx - 5} ${y + ch / 2 + 5}" fill="none" stroke="${LINE}" stroke-width="1"/>`; }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  ${micro(152, 160, 'AI-ASSISTED PRODUCTION — MVP')}
  ${txt(152, 242, 'Removing repetition, not responsibility.', 52, FG, 400, 'start', '-1.2')}
  ${txt(152, 292, 'An adaptation prototype that keeps composition, hierarchy and creative intent intact.', 20, DIM)}
  <line x1="152" y1="342" x2="${W - 152}" y2="342" stroke="${LINE}" stroke-width="1"/>
  ${s}
  ${txt(152, 712, 'The purpose was never to replace designers — it was to return their time to ideas, judgment and iteration.', 17, FAINT)}
  </svg>`;
}

/* ---------------- G3 1600x900 — variation logic ---------------- */
function g3() {
  const W = 1600, H = 900;
  const rows = [
    ['Core concept', 'Price-discrepancy hook'],
    ['Format adaptation', '9:16  /  1:1  /  16:9'],
    ['Hook variation', 'Statement / question / comparison'],
    ['Proof point', 'Savings figure / time to switch / trust signal'],
    ['Performance signal', 'Informs the next round of concepts'],
  ];
  let s = '';
  rows.forEach((r, i) => {
    const y = 420 + i * 88, last = (i === rows.length - 1);
    s += `<line x1="152" y1="${y - 30}" x2="${W - 152}" y2="${y - 30}" stroke="${LINE}" stroke-width="1"/>`;
    s += micro(152, y - 8, String(i + 1).padStart(2, '0'), last ? MARK : FAINT, 'start', 12);
    s += txt(250, y + 2, r[0], 21, last ? MARK : FG, 500);
    s += txt(660, y + 2, r[1], 19, DIM);
    if (last) s += `<line x1="152" y1="${y + 58}" x2="${W - 152}" y2="${y + 58}" stroke="${LINE}" stroke-width="1"/>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  ${micro(152, 160, 'DESIGNING FOR VARIATION')}
  ${txt(152, 242, 'A variation should test an idea, not decorate it.', 52, FG, 400, 'start', '-1.2')}
  ${txt(152, 292, 'Change the strategic variable — not the colour of the button.', 20, DIM)}
  ${s}
  </svg>`;
}

const jobs = [['ni-hero', hero()], ['ni-thumb', thumb()], ['ni-g1', g1()], ['ni-g2', g2()], ['ni-g3', g3()]];
for (const [name, svg] of jobs) {
  writeFileSync(new URL('./ni-svg/' + name + '.svg', import.meta.url), svg); // sources kept out of assets/opt (deployed)
  await sharp(Buffer.from(svg)).webp({ quality: 88 }).toFile(OUT + name + '.webp');
  await sharp(Buffer.from(svg)).png().toFile(PNG + name + '.png');
  console.log('wrote', name);
}
