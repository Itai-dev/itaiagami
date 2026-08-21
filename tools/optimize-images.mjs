// Self-host + optimize: download every framerusercontent URL referenced across
// the site, convert to WebP, and rewrite all references to local /assets/opt paths.
// Run from project root:  node tools/optimize-images.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const ROOT = process.cwd();
const OUT_DIR = `${ROOT}/assets/opt`;
const DOMAIN = 'https://itaiagami.com';
const URL_RE = /https:\/\/framerusercontent\.com\/images\/[^"'\s)]+/g;

// Files that reference images
const files = [
  'index.html', 'work.html', 'about.html', 'contact.html',
  'data/projects.json',
  ...readdirSync(`${ROOT}/work`).filter(f => f.endsWith('.html')).map(f => `work/${f}`),
];

// 1. Collect unique URLs
const urls = new Set();
for (const rel of files) {
  const txt = readFileSync(`${ROOT}/${rel}`, 'utf8');
  for (const m of txt.matchAll(URL_RE)) urls.add(m[0]);
}
console.log(`Found ${urls.size} unique image URLs across ${files.length} files`);

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// 2. Download + convert each -> webp
const map = {};        // originalUrl -> /assets/opt/<hash>.webp
const failed = [];
let origBytes = 0, newBytes = 0;
for (const url of urls) {
  const hash = createHash('md5').update(url).digest('hex').slice(0, 12);
  const outRel = `/assets/opt/${hash}.webp`;
  const outAbs = `${ROOT}${outRel}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (image-optimizer)' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    origBytes += buf.length;
    await sharp(buf).webp({ quality: 82 }).toFile(outAbs);
    newBytes += statSync(outAbs).size;
    map[url] = outRel;
    process.stdout.write('.');
  } catch (e) {
    failed.push([url, e.message]);
    process.stdout.write('x');
  }
}
console.log('');
console.log(`Converted ${Object.keys(map).length} images`);
console.log(`Size: ${(origBytes/1048576).toFixed(1)}MB -> ${(newBytes/1048576).toFixed(1)}MB (${Math.round(100-newBytes/origBytes*100)}% smaller)`);
if (failed.length) { console.log('FAILED (left as original Framer URL):'); failed.forEach(([u,e]) => console.log(`  ${e}  ${u}`)); }

// 3. Rewrite files. og:image -> absolute; everything else -> root-relative.
for (const rel of files) {
  const path = `${ROOT}/${rel}`;
  let txt = readFileSync(path, 'utf8');
  // og:image first (needs absolute URL for social scrapers)
  txt = txt.replace(/(<meta property="og:image" content=")([^"]+)(")/g,
    (whole, a, url, c) => map[url] ? a + DOMAIN + map[url] + c : whole);
  // all remaining visible references -> root-relative
  for (const [url, local] of Object.entries(map)) {
    txt = txt.split(url).join(local);
  }
  writeFileSync(path, txt);
}
console.log(`Rewrote ${files.length} files`);
