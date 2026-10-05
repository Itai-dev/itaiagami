// Builds 1200x630 JPEG Open Graph images from each page's og:image source and
// rewrites the og:image tags to point at them. LinkedIn and some messaging apps
// do not reliably render WebP previews, so shares get a JPEG at the size they expect.
// Run: node tools/make-og.mjs
import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const pages = [
  ...readdirSync(root).filter(f => f.endsWith('.html')),
  ...['work', 'services', 'notes'].flatMap(d => readdirSync(join(root, d)).filter(f => f.endsWith('.html')).map(f => `${d}/${f}`)),
];
// logos and type-led images are letterboxed rather than cropped
const CONTAIN = new Map([['ni-logo', '#ffffff']]); // name → letterbox colour
const re = /<meta property="og:image" content="https:\/\/itaiagami\.com\/assets\/(?:opt|og)\/([^".]+)\.(?:webp|jpg)" \/>(\n<meta property="og:image:(?:width|height|type)" content="[^"]*" \/>)*/;

for (const p of pages) {
  const file = join(root, p);
  let s = readFileSync(file, 'utf8');
  const m = s.match(re);
  if (!m) continue;
  const name = m[1];
  const src = join(root, 'assets/opt', name + '.webp');
  const out = join(root, 'assets/og', name + '.jpg');
  if (!existsSync(out)) {
    const img = sharp(src);
    const fit = CONTAIN.has(name)
      ? { fit: 'contain', background: CONTAIN.get(name) }
      : { fit: 'cover', position: 'attention' };
    await img.resize(1200, 630, fit).flatten({ background: CONTAIN.get(name) || '#0d0d0d' }).jpeg({ quality: 82, mozjpeg: true }).toFile(out);
    console.log('built assets/og/' + basename(out));
  }
  s = s.replace(re,
    `<meta property="og:image" content="https://itaiagami.com/assets/og/${name}.jpg" />\n` +
    `<meta property="og:image:type" content="image/jpeg" />\n` +
    `<meta property="og:image:width" content="1200" />\n` +
    `<meta property="og:image:height" content="630" />`);
  writeFileSync(file, s);
}
