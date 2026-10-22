/* One-time import of the current site content into Sanity.
   Reads data/projects.json and writes studio/seed.ndjson, with every image and
   video loop referenced as a local file so `sanity dataset import` uploads them.

   Run once, after `npx sanity login`:  cd studio && npm run seed
   Projects get random IDs (Sanity's recommendation), so running it twice
   creates duplicates; delete the projects in the Studio first if you re-run. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'studio', 'seed.ndjson');

// card video loops that live in the repo today
const LOOPS = {
  'natural-intelligence': '/assets/opt/ni-ad-home-options.mp4',
  riddle: '/assets/opt/riddle-logo.mp4',
};

const projects = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'projects.json'), 'utf8'));
const missing = [];

function asset(kind, src) {
  if (!src) return undefined;
  const file = path.join(ROOT, src.replace(/^\//, ''));
  if (!fs.existsSync(file)) { missing.push(src); return undefined; }
  return { _type: kind, _sanityAsset: `${kind}@${pathToFileURL(file).href}` };
}

const docs = projects.map((p, i) => ({
  _id: crypto.randomUUID(),
  _type: 'project',
  name: p.name,
  slug: { _type: 'slug', current: p.slug },
  client: p.client,
  category: p.cat,
  order: p.homeRank ?? i + 1,
  thumbnail: asset('image', p.thumb || p.hero),
  loop: asset('file', LOOPS[p.slug]),
  oneliner: p.oneline,
  role: p.role,
  idea: p.idea,
  outcome: p.result,
  challenge: p.challenge,
  system: p.system,
  contribution: p.contribution,
  disciplines: p.disciplines,
  credits: p.credits || [],
  hero: asset('image', p.hero),
  gallery: (p.gallery || []).map((g, k) => ({
    _key: `g${k}`,
    _type: 'galleryImage',
    image: asset('image', g.src),
    half: !!g.half,
  })).filter(g => g.image),
}));

docs.push({
  _id: 'settings',
  _type: 'settings',
  about: [
    'itai agami. independent creative director, tel aviv.',
    'i set the creative direction for launches: brand, campaign, digital.',
    'before: natural intelligence, elements, shortcut playground.',
  ],
  email: 'itaiagami@gmail.com',
  linkedin: 'https://www.linkedin.com/in/itai-agami-237353189/',
  cv: asset('file', '/assets/docs/Itai_Agami_CV.pdf'),
});

// drop undefined fields so the import stays clean
const clean = o => JSON.parse(JSON.stringify(o));
fs.writeFileSync(OUT, docs.map(d => JSON.stringify(clean(d))).join('\n') + '\n');
console.log(`wrote ${docs.length} documents to ${path.relative(ROOT, OUT)}`);
if (missing.length) console.warn(`missing files (skipped): ${missing.join(', ')}`);
