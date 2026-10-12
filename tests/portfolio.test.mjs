/* Portfolio direction (homepage simplification): the homepage stays quiet for
   people and complete for machines; the commercial content lives on services.html. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './helpers/load.mjs';

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const graph = html => JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)[1])['@graph'];
const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'))
  .concat(...['work', 'services', 'notes'].map(d => fs.readdirSync(path.join(ROOT, d)).filter(f => f.endsWith('.html')).map(f => d + '/' + f)));
const PRIVATE = new Set(['404.html', 'stats.html']);

test('homepage: the frame (name, contact, about) and the work, with no sales sections', () => {
  const html = read('index.html');
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
  assert.match(html, /<h1 class="hf-name[^"]*">Itai Agami<\/h1>/);
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  for(const s of ['hf-name', 'hf-contact', 'hf-about', 'mailto:itaiagami@gmail.com', 'Creative Director'])
    assert.ok(main.includes(s), s + ' sits inside <main>, so the Markdown view keeps it');
  assert.ok((html.match(/<li class="hf-item">/g) || []).length >= 8, 'selected work is the main content');
  for(const gone of ['₪', 'data-floor', 'not a brief', 'Where I help most', 'Send a brief', 'nav-cta', 'class="pov', 'class="fit'])
    assert.ok(!html.includes(gone), gone);
  assert.equal((html.match(/data-booking=/g) || []).length, 1, 'booking is one quiet link');
  assert.ok(html.includes('<script src="js/home.js" defer></script>'));
});

test('homepage motion stays optional: arrival is CSS, reduced motion is respected', () => {
  const css = read('css/home.css');
  const js = read('js/home.js');
  assert.match(css, /@media \(prefers-reduced-motion:no-preference\)\{\s*\.hf-in/);
  assert.match(css, /\.hf-live \.hf-item:nth-child\(n\+3\) \.hf-media\{clip-path/, 'hidden-until-seen only once JS is live');
  assert.match(js, /if\(still\.matches\) return;\s*root\.classList\.add\('hf-live'\)/, 'reduced motion never turns the live layer on');
  assert.ok(!/style\.(left|top)=/.test(js), 'cursor and parallax move with transforms');
});

test('homepage structured data: person, occupation and the selected work list', () => {
  const g = graph(read('index.html'));
  const person = g.find(n => n['@type'] === 'Person');
  assert.equal(person.hasOccupation.name, 'Creative Director');
  assert.match(person.description, /Creative Director roles/);
  const list = g.find(n => n['@id'] === 'https://itaiagami.com/#selected-work');
  assert.equal(list.itemListElement.length, list.numberOfItems);
  for(const li of list.itemListElement){
    const slug = li.item.url.replace('https://itaiagami.com/', '');
    assert.ok(fs.existsSync(path.join(ROOT, slug)), slug);
  }
  assert.ok(!g.some(n => n.priceRange), 'pricing schema lives on services.html');
});

test('services.html carries the moved commercial content and the pricing schema', () => {
  const html = read('services.html');
  for(const s of ['How a project runs', 'Where I help most', 'Building or rebuilding a brand', 'data-floor']) assert.ok(html.includes(s), s);
  const svc = graph(html).find(n => n['@type'] === 'ProfessionalService');
  assert.match(svc.priceRange, /₪30,000/);
  assert.equal(svc.hasOfferCatalog.itemListElement.length, 4);
  const v = JSON.parse(read('vercel.json'));
  assert.ok(v.redirects.some(r => r.source === '/work-with-me' && r.destination === '/services.html'));
});

test('every page: simple nav, canonical, indexable unless private, services still linked', () => {
  for(const f of pages){
    const html = read(f);
    if(f === 'stats.html') continue;
    const nav = /<nav class="(?:primary|hf-nav)"[^>]*>([\s\S]*?)<\/nav>/.exec(html)[1];
    assert.deepEqual([...nav.matchAll(/>([A-Za-z]+)<\/a>/g)].map(m => m[1]), ['Work', 'About', 'Contact'], f);
    assert.ok(!html.includes('nav-cta'), f);
    assert.ok(/services\.html">Services &amp; engagements</.test(html), f + ' footer links services');
    if(PRIVATE.has(f)) continue;
    assert.ok(!/name="robots" content="[^"]*noindex/.test(html), f + ' indexable');
    assert.match(html, /<link rel="canonical" href="https:\/\/itaiagami\.com\/[^"]*" \/>/, f);
  }
});
