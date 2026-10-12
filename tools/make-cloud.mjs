/* Builds the Work page cloud: a 240px thumbnail of every case-study image
   (hero, thumb and gallery) in assets/opt/cloud/, and cloud.json listing them
   with their project. Needs ImageMagick (`convert`). Run: node tools/make-cloud.mjs */
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'assets/opt/cloud');
const projects = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/projects.json'), 'utf8'));
fs.mkdirSync(OUT, { recursive: true });
const items = [];
for (const p of projects) {
  const gallery = (p.gallery || []).map(g => (typeof g === 'string' ? g : g.src));
  const srcs = [...new Set([p.hero, p.thumb, ...gallery].filter(s => s && s.endsWith('.webp')))];
  for (const src of srcs) {
    const file = path.join(ROOT, src); if (!fs.existsSync(file)) continue;
    const name = path.basename(src);
    const out = path.join(OUT, name);
    if (!fs.existsSync(out)) execFileSync('convert', [file, '-resize', '240x240>', '-quality', '62', '-define', 'webp:method=6', out]);
    const [w, h] = execFileSync('identify', ['-format', '%w %h', out]).toString().split(' ').map(Number);
    items.push({ src: '/assets/opt/cloud/' + name, slug: p.slug, name: p.name, tag: p.cat, w, h });
  }
}
fs.writeFileSync(path.join(OUT, 'cloud.json'), JSON.stringify(items) + '\n');
console.log(items.length, 'tiles');
