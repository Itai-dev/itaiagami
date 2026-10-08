/* Homepage client strip: logos instead of names (index.html, assets/logos). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './helpers/load.mjs';

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const track = /<div class="cs-track">([\s\S]*?)<\/div>/.exec(html)[1];
const links = [...track.matchAll(/<a href="([^"]+)"([^>]*)><img ([^>]+)><\/a>/g)]
  .map(([, href, attrs, img]) => ({ href, dup: /aria-hidden="true"/.test(attrs) && /tabindex="-1"/.test(attrs), img }));
const attr = (img, k) => (new RegExp(k + '="([^"]*)"').exec(img) || [])[1];

test('every client is a logo image linking to its case study', () => {
  const visible = links.filter(l => !l.dup);
  assert.equal(visible.length, 11);
  assert.ok(!/<a [^>]*>[^<]/.test(track), 'no plain-text names left');
  for(const l of visible){
    assert.ok(fs.existsSync(path.join(ROOT, l.href)), l.href);
    const src = attr(l.img, 'src');
    assert.match(src, /^\/assets\/logos\/[a-z0-9-]+\.webp$/);
    const file = path.join(ROOT, src);
    assert.ok(fs.existsSync(file), src);
    assert.ok(fs.statSync(file).size < 20000, src + ' stays small');
    assert.ok(attr(l.img, 'alt').length > 1, 'alt names the client');
    const h = +attr(l.img, 'height');
    assert.equal(attr(l.img, 'style'), '--h:' + h + 'px', 'display height drives the balancing');
    assert.ok(h >= 18 && h <= 34, src + ' height within the balanced range');
    assert.ok(+attr(l.img, 'width') > 0);
  }
});

test('the marquee loop copy is hidden from assistive tech and the keyboard', () => {
  const dups = links.filter(l => l.dup);
  assert.equal(dups.length, links.length / 2);
  for(const l of dups) assert.equal(attr(l.img, 'alt'), '');
  assert.deepEqual(dups.map(l => l.href), links.filter(l => !l.dup).map(l => l.href), 'same order, seamless loop');
});

test('logos are greyed and themed in CSS', () => {
  const css = fs.readFileSync(path.join(ROOT, 'css/site.css'), 'utf8');
  assert.match(css, /\.cs-track img\{display:block;height:calc\(var\(--h\) \* var\(--logo-k,1\)\);width:auto;opacity:\.42/);
  assert.match(css, /:root:not\(\[data-theme="light"\]\) \.cs-track img\{filter:invert\(1\)/);
});
