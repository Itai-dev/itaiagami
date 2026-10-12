/* Homepage clients: a quiet, static list of logos (index.html, assets/logos). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './helpers/load.mjs';

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const list = /<ul class="cl-list">([\s\S]*?)<\/ul>/.exec(html)[1];
const links = [...list.matchAll(/<li><a href="([^"]+)"><img ([^>]+)><\/a><\/li>/g)].map(([, href, img]) => ({ href, img }));
const attr = (img, k) => (new RegExp(k + '="([^"]*)"').exec(img) || [])[1];

test('every client is a logo image linking to its case study', () => {
  assert.equal(links.length, 13);
  assert.ok(!/<a [^>]*>[^<]/.test(list), 'no plain-text names left');
  for(const l of links){
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

test('no marquee: the list is static and not duplicated', () => {
  assert.ok(!html.includes('cs-track'));
  assert.ok(!/aria-hidden="true" tabindex="-1"/.test(list));
});

test('logos are greyed and themed in CSS', () => {
  const css = fs.readFileSync(path.join(ROOT, 'css/site.css'), 'utf8');
  assert.match(css, /\.cl-list img\{display:block;height:calc\(var\(--h\) \* var\(--logo-k,1\)\);width:auto;opacity:\.42/);
  assert.match(css, /:root:not\(\[data-theme="light"\]\) \.cl-list img\{filter:invert\(1\)/);
});
