// one-off: append the Natural Intelligence case to data/projects.json
// Textual splice so the rest of the file keeps its original formatting.
import { readFileSync, writeFileSync } from 'fs';

const path = new URL('../data/projects.json', import.meta.url);
let raw = readFileSync(path, 'utf8');

if (raw.includes('"natural-intelligence"')) {
  console.log('already present — nothing to do');
  process.exit(0);
}

const q = s => JSON.stringify(s);

const entry = [
  '  {',
  `    "slug": ${q('natural-intelligence')},`,
  `    "name": ${q('Natural Intelligence')},`,
  `    "client": ${q('Natural Intelligence')},`,
  `    "cat": ${q('Technology')},`,
  '    "tags": ["Technology", "Brand"],',
  `    "role": ${q('Creative Direction, Art Direction')},`,
  `    "disciplines": ${q('Creative Direction / Art Direction / Performance Creative / Motion')},`,
  `    "collab": ${q('In-house creative, growth, performance and product teams')},`,
  '    "flagship": true,',
  `    "oneline": ${q('Turning creative production into a system that generates, tests and scales ideas.')},`,
  `    "challenge": ${q('Natural Intelligence runs digital comparison platforms across some of the most competitive consumer categories in the US market — car insurance, pet insurance, mortgage, home equity, business loans and home security. Every creative decision lived inside a measurable acquisition system: the work had to stop attention in crowded feeds, explain complex products quickly, build trust around high-consideration decisions and still produce enough variation to learn from. The challenge was never to produce more assets. It was to create conditions in which creative thinking could generate repeatable learning.')},`,
  `    "idea": ${q('Treat creative as a system rather than a run of campaigns. Build distinct creative territories — each with its own point of view, tone and visual language — then translate them into testable variables, so every execution answers a question instead of decorating one. A variation should test an idea, not the colour of a button.')},`,
  `    "system": ${q('A repeatable loop: audience tension → hypothesis → creative territory → concept → variation → test and learn → scale, with the performance signal feeding the next round of concepts. The process stayed constant while each category was entered through its own human tension — urgency and savings in car insurance, care and trust in pet insurance, opportunity and complexity in mortgage and lending. As volume grew, I initiated an AI-assisted resizing MVP to take repetitive format adaptation out of the workflow while keeping composition, hierarchy and creative intent under a designer’s judgment.')},`,
  `    "result": ${q('Creative directions used across several competitive US consumer categories, including leading work in the car insurance and pet insurance verticals; creative support for the launch and development of mortgage-related verticals; a repeatable experimentation process connecting concept, variation and learning; and a production prototype that reduced repetitive adaptation work without loss of creative intent.')},`,
  `    "contribution": ${q('I worked across concept development, art direction, motion, design, production and creative experimentation — developing creative territories, translating audience and product tensions into concepts, building platform-specific hooks and narrative structures, producing static, motion and video assets, designing test variations with real hypotheses, and reading performance signals alongside the growth and performance teams to decide what to make next. I also initiated and developed the AI-assisted resizing MVP.')},`,
  '    "thumb": "/assets/opt/ni-thumb.webp",',
  '    "hero": "/assets/opt/ni-hero.webp",',
  '    "gallery": [',
  '      {"src": "/assets/opt/ni-g1.webp", "half": false},',
  '      {"src": "/assets/opt/ni-g3.webp", "half": false},',
  '      {"src": "/assets/opt/ni-g2.webp", "half": false}',
  '    ],',
  '    "vimeo": null,',
  '    "credits": []',
  '  }'
].join('\r\n');

const tail = '\r\n  }\r\n]';
const at = raw.lastIndexOf(tail);
if (at === -1) throw new Error('could not find the end of the projects array');

raw = raw.slice(0, at) + '\r\n  },\r\n' + entry + '\r\n]' + raw.slice(at + tail.length);
writeFileSync(path, raw, 'utf8');

const parsed = JSON.parse(raw);
console.log('appended — ' + parsed.length + ' projects, last is ' + parsed[parsed.length - 1].slug);
