// one-off: append the four 2022–23 Behance projects to data/projects.json
// Textual splice so the rest of the file keeps its original CRLF formatting.
// Source galleries (no written description existed on either platform):
//   behance.net/gallery/164683965  ·  164681603  ·  164680685  ·  162550925
import { readFileSync, writeFileSync } from 'fs';

const path = new URL('../data/projects.json', import.meta.url);
let raw = readFileSync(path, 'utf8');
const q = s => JSON.stringify(s);

const KAN = 'Kan 11 — Israeli Public Broadcasting Corporation';

const PROJECTS = [
  {
    slug: 'interactive-elections-kan-11',
    name: 'Interactive Elections — Kan 11',
    client: KAN,
    cat: 'Technology',
    tags: ['Technology', 'Interactive'],
    role: 'Art Direction, Design',
    disciplines: 'Art Direction / Data Visualisation / Broadcast Graphics',
    collab: '',
    flagship: false,
    oneline: 'Election night as a live interface — results, polls and coalition maths readable at a glance.',
    challenge: 'Election night gives a broadcast no second takes. Exit polls, real counts, seat projections and coalition blocs all arrive at once, keep changing for hours, and have to stay legible to a viewer who has just switched the television on.',
    idea: 'Treat the whole broadcast as one interface rather than a run of separate slides. Every screen shares the same geometry, glow and hierarchy, so the audience learns to read the system once and then follows the numbers instead of the graphics.',
    system: 'A touch-driven screen set for the 25th Knesset election: title sequence, exit polls, real results against the counted-ballot percentage, per-party seat counts carrying candidate portraits, regional breakdowns mapped over territory, and live windows to reporters in the field.',
    result: 'Produced for Kan 11 coverage of Israel’s 25th Knesset election, November 2022.',
    contribution: '',
    thumb: '/assets/opt/elections-thumb.webp',
    hero: '/assets/opt/elections-hero.webp',
    gallery: [
      { src: '/assets/opt/elections-g1.webp', half: false },
      { src: '/assets/opt/elections-g2.webp', half: false },
      { src: '/assets/opt/elections-g3.webp', half: true },
      { src: '/assets/opt/elections-g4.webp', half: true },
    ],
    vimeo: '797380111',
    credits: [],
  },
  {
    slug: 'ten-facts-kan-11',
    name: '10 Facts — Kan 11',
    client: KAN,
    cat: 'Culture',
    tags: ['Culture', 'Brand'],
    role: 'Art Direction, Design',
    disciplines: 'Art Direction / Motion / Archival Collage',
    collab: '',
    flagship: false,
    oneline: 'A history explainer series built out of the archive itself — photographs, posters and maps cut into motion.',
    challenge: 'Turn dense historical subjects into short episodes that hold attention on a feed, without flattening the history into decoration or losing the weight of the source material.',
    idea: 'Build each episode from the archive rather than around it. Period photographs, propaganda posters, maps and postcards are cut against flat graphic shapes and heavy Hebrew type, so the original material carries the story and the design only sets its pace.',
    system: 'A consistent kit across episodes: paper-grain grounds, a cyan-and-black accent palette, hard-edged colour blocks, numbered markers and typographic call-outs that hold a collage together while it moves.',
    result: 'Produced as an episodic explainer series for Kan 11.',
    contribution: '',
    thumb: '/assets/opt/tenfacts-thumb.webp',
    hero: '/assets/opt/tenfacts-hero.webp',
    gallery: [
      { src: '/assets/opt/tenfacts-g1.webp', half: false },
      { src: '/assets/opt/tenfacts-g2.webp', half: false },
      { src: '/assets/opt/tenfacts-g3.webp', half: true },
      { src: '/assets/opt/tenfacts-g4.webp', half: true },
      { src: '/assets/opt/tenfacts-g5.webp', half: false },
    ],
    vimeo: '802381495',
    credits: [],
  },
  {
    slug: 'tidhar',
    name: 'Tidhar',
    client: 'Tidhar',
    cat: 'Brand',
    tags: ['Brand', 'Technology'],
    role: 'Art Direction, Design',
    disciplines: 'Art Direction / Motion / Architectural Visualisation',
    collab: '',
    flagship: false,
    oneline: 'Making the thinking behind a development visible — architecture with its reasoning drawn back on top.',
    challenge: 'Most of a developer’s work disappears into the finished building. The planning, the light studies, the green space and the density decisions are all invisible by the time anyone walks through a completed apartment.',
    idea: 'Draw the reasoning back on. Keep the aerial photography and interior CGI real, then overlay the language of the drawing board — dashed setbacks, sun angles, flow arrows, measured spans and highlighted volumes — so the audience sees the decisions and not only the result.',
    system: 'A short film moving between scales: an aerial masterplan with the park read as a single green figure, tower elevations with units and circulation called out, and interiors annotated for light, orientation and materials.',
    result: 'Produced as a brand film for Tidhar.',
    contribution: '',
    thumb: '/assets/opt/tidhar-thumb.webp',
    hero: '/assets/opt/tidhar-hero.webp',
    gallery: [
      { src: '/assets/opt/tidhar-g1.webp', half: false },
      { src: '/assets/opt/tidhar-g2.webp', half: false },
    ],
    vimeo: '800267589',
    credits: [],
  },
  {
    slug: 'sodastream',
    name: 'SodaStream',
    client: 'SodaStream',
    cat: 'Brand',
    tags: ['Brand'],
    role: 'Art Direction',
    disciplines: 'Art Direction / Film',
    collab: '',
    flagship: false,
    oneline: 'Push for Better — the brand line played straight, with one guest nobody in the room acknowledges.',
    challenge: 'Carry the Push for Better platform in a spot short enough to run as pre-roll, without spending its few seconds explaining the product.',
    idea: 'Bring the desert indoors. A camel stands in a bright domestic kitchen and nobody in frame reacts to it — the restraint is what makes it land, and the machine stays the only thing actually being demonstrated.',
    system: 'A warm, daylit set built around the product, with the brand lockup resolving over the scene rather than interrupting it.',
    result: 'Produced for the SodaStream Push for Better platform.',
    contribution: '',
    thumb: '/assets/opt/sodastream-thumb.webp',
    hero: '/assets/opt/sodastream-hero.webp',
    gallery: [],
    vimeo: '794136290',
    credits: [],
  },
];

const present = PROJECTS.filter(p => raw.includes('"' + p.slug + '"'));
if (present.length) {
  console.log('already present — nothing to do: ' + present.map(p => p.slug).join(', '));
  process.exit(0);
}

function render(p) {
  const L = [];
  L.push('  {');
  L.push('    "slug": ' + q(p.slug) + ',');
  L.push('    "name": ' + q(p.name) + ',');
  L.push('    "client": ' + q(p.client) + ',');
  L.push('    "cat": ' + q(p.cat) + ',');
  L.push('    "tags": [' + p.tags.map(q).join(', ') + '],');
  L.push('    "role": ' + q(p.role) + ',');
  L.push('    "disciplines": ' + q(p.disciplines) + ',');
  L.push('    "collab": ' + q(p.collab) + ',');
  L.push('    "flagship": ' + p.flagship + ',');
  L.push('    "oneline": ' + q(p.oneline) + ',');
  L.push('    "challenge": ' + q(p.challenge) + ',');
  L.push('    "idea": ' + q(p.idea) + ',');
  L.push('    "system": ' + q(p.system) + ',');
  L.push('    "result": ' + q(p.result) + ',');
  L.push('    "contribution": ' + q(p.contribution) + ',');
  L.push('    "thumb": ' + q(p.thumb) + ',');
  L.push('    "hero": ' + q(p.hero) + ',');
  if (p.gallery.length) {
    L.push('    "gallery": [');
    p.gallery.forEach((g, i) => {
      L.push('      {"src": ' + q(g.src) + ', "half": ' + g.half + '}' + (i < p.gallery.length - 1 ? ',' : ''));
    });
    L.push('    ],');
  } else {
    L.push('    "gallery": [],');
  }
  L.push('    "vimeo": ' + (p.vimeo === null ? 'null' : q(p.vimeo)) + ',');
  L.push('    "credits": [' + p.credits.map(q).join(', ') + ']');
  L.push('  }');
  return L.join('\r\n');
}

const tail = '\r\n  }\r\n]';
const at = raw.lastIndexOf(tail);
if (at === -1) throw new Error('could not find the end of the projects array');

const block = PROJECTS.map(render).join(',\r\n');
raw = raw.slice(0, at) + '\r\n  },\r\n' + block + '\r\n]' + raw.slice(at + tail.length);
writeFileSync(path, raw, 'utf8');

const parsed = JSON.parse(raw);
console.log('appended — ' + parsed.length + ' projects total');
PROJECTS.forEach(p => console.log('  + ' + p.slug));
