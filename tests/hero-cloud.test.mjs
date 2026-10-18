/* Hero cloud (js/hero-cloud.js): static checks that keep it light and polite.
   three.js stays pinned to an exact version, the cloud is fetched only after the
   page load and the intro, never under reduced motion or without WebGL, and it
   never takes the page's scroll. Behaviour was verified in a real browser when added. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './helpers/load.mjs';

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const html = read('index.html');
const site = read('js/site.js');
const cloud = read('js/hero-cloud.js');
const block = site.slice(site.indexOf('/* ---------- hero cloud (home)'), site.indexOf('/* ---------- scroll reveals'));

test('three.js comes from an import map pinned to an exact version', () => {
  const map = /<script type="importmap">([\s\S]*?)<\/script>/.exec(html);
  assert.ok(map, 'index.html has an import map');
  assert.equal(JSON.parse(map[1]).imports.three, 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js');
  assert.match(cloud, /^import \* as THREE from 'three';$/m);
  assert.doesNotMatch(html, /src="js\/hero-cloud\.js"/, 'never a render-blocking script tag');
});

test('the cloud loads after the page load and the intro, never under reduced motion or without WebGL', () => {
  assert.ok(block.length > 0, 'site.js has the hero cloud block');
  assert.match(block, /addEventListener\('intro:done'/);
  assert.match(block, /classList\.contains\('intro-on'\)/);
  assert.match(block, /addEventListener\('load'/);
  assert.match(block, /prefers-reduced-motion: reduce\)'\)\.matches\)return/);
  assert.match(block, /getContext\('webgl2'\)\|\|c\.getContext\('webgl'\);if\(!g\)return/);
  assert.match(block, /import\('\/js\/hero-cloud\.js'\)/);
});

test('the cloud never takes the page scroll and stays light', () => {
  assert.doesNotMatch(cloud, /'wheel'/, 'no wheel handler: scrolling over the cloud scrolls the page');
  assert.match(read('css/site.css'), /\.hero-cloud \.hc-canvas\{[^}]*touch-action:pan-y/);
  assert.match(cloud, /setPixelRatio\(Math\.min\(devicePixelRatio \|\| 1, 2\)\)/);
  assert.match(cloud, /new IntersectionObserver/);
  assert.match(cloud, /document\.hidden/);
});
