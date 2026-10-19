/* The offer, kept in one shape everywhere: the three sizes' names, their
   anchors on services.html, the retired services/ pages and their redirects,
   FAQ text vs its JSON-LD, the Launch Sprint floors and budget bands, and the
   enquiry form's enums. These facts are hand-copied across about ten files;
   this test is what stops them drifting apart again. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT, require } from './helpers/load.mjs';

const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(ROOT, rel));
const decode = s => s.replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const text = s => decode(s.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
const jsonLd = h => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
const find = (o, pred) => {
  if(!o || typeof o !== 'object') return null;
  if(pred(o)) return o;
  for(const v of Object.values(o)){ const r = find(v, pred); if(r) return r; }
  return null;
};
const options = (h, id) => {
  const m = h.match(new RegExp('<select id="' + id + '"[^>]*>([\\s\\S]*?)</select>'));
  assert.ok(m, '#' + id + ' exists');
  return [...m[1].matchAll(/<option([^>]*)>([\s\S]*?)<\/option>/g)].map(o => ({ attrs: o[1], text: text(o[2]) }));
};

const { SERVICES, PRICING } = require('./api/_lib/catalog.js');
const { BUDGETS, TIMELINES, SOURCES } = require('./api/enquiry.js');
const MARKETS = (() => {
  const m = read('js/site.js').match(/const MARKETS = (\{[\s\S]*?\});/);
  assert.ok(m, 'js/site.js declares MARKETS');
  /* JSON round trip: objects from another vm realm fail deepStrictEqual */
  return JSON.parse(JSON.stringify(vm.runInNewContext('(' + m[1] + ')')));
})();

const NAMES = ['Launch Sprint', 'Full Launch', 'Creative Director on call'];
const services = read('services.html');
const home = read('index.html');
const ids = new Set([...services.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
const htmlFiles = ['.', 'work', 'notes'].flatMap(d =>
  fs.readdirSync(path.join(ROOT, d)).filter(f => f.endsWith('.html')).map(f => d === '.' ? f : d + '/' + f));
const offerH3s = h => {
  const i = h.indexOf('<div class="caps three offer"');
  assert.ok(i >= 0, 'has a .caps.three.offer grid');
  const block = h.slice(i, h.indexOf('</section>', i));
  return [...block.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/g)].map(m => text(m[1]));
};

test('offer names are the same three sizes everywhere', () => {
  assert.deepEqual(SERVICES.map(s => s.name), NAMES);
  assert.deepEqual(offerH3s(services), NAMES, 'services.html offer cards');
  assert.deepEqual(offerH3s(home), NAMES, 'index.html offer cards');

  const catalog = jsonLd(services).map(o => find(o, n => n['@type'] === 'OfferCatalog')).find(Boolean);
  assert.ok(catalog, 'services.html has an OfferCatalog');
  assert.equal(catalog.name, 'One offer, three sizes');
  assert.deepEqual(catalog.itemListElement.map(o => o.name), NAMES, 'services.html OfferCatalog');

  const homeCatalog = jsonLd(home).map(o => find(o, n => n.hasOfferCatalog)).find(Boolean);
  assert.ok(homeCatalog, 'index.html has a hasOfferCatalog');
  assert.deepEqual(homeCatalog.hasOfferCatalog.itemListElement.map(o => o.itemOffered.name), NAMES, 'index.html hasOfferCatalog');

  const llms = read('llms.txt');
  const after = llms.slice(llms.indexOf('One offer, three sizes'));
  const bullets = [...after.matchAll(/^- \[([^\]]+)\]/gm)].slice(0, 3).map(m => m[1]);
  assert.deepEqual(bullets, NAMES, 'llms.txt offer bullets');
});

test('every services.html anchor link has a target', () => {
  for(const id of ['sprint', 'full-launch', 'on-call', 'capabilities']) assert.ok(ids.has(id), 'services.html#' + id);
  for(const s of SERVICES){
    const frag = s.url.split('#')[1];
    assert.ok(frag && ids.has(frag), s.name + ' url ' + s.url);
  }
  for(const f of htmlFiles){
    const h = read(f);
    for(const m of h.matchAll(/href="(?:\.\.\/|https:\/\/itaiagami\.com\/)?services\.html#([a-z-]+)"/g))
      assert.ok(ids.has(m[1]), f + ' links to services.html#' + m[1]);
    for(const m of h.matchAll(/"https:\/\/itaiagami\.com\/services\.html#([a-z-]+)"/g))
      assert.ok(ids.has(m[1]) || m[1] === 'offers', f + ' JSON-LD url services.html#' + m[1]);
  }
});

test('the old services/ pages are gone and nothing links to them', () => {
  assert.ok(!exists('services'), 'services/ directory is removed');
  const old = /\/services\/[a-z-]+\.html|href="services\/|href="\.\.\/services\//;
  for(const f of [...htmlFiles, 'llms.txt', 'openapi.json', 'api/_lib/catalog.js'])
    assert.doesNotMatch(read(f), old, f);
  const locs = [...read('sitemap.xml').matchAll(/<loc>https:\/\/itaiagami\.com\/([^<]*)<\/loc>/g)].map(m => m[1]);
  assert.ok(locs.length > 0);
  for(const loc of locs){
    assert.ok(!loc.startsWith('services/'), 'sitemap lists ' + loc);
    assert.ok(exists(loc === '' ? 'index.html' : loc), 'sitemap <loc> ' + loc + ' maps to a file');
  }
});

test('the old service URLs redirect permanently to the offer', () => {
  const { redirects } = JSON.parse(read('vercel.json'));
  const OLD = ['creative-direction-product-launches', 'fractional-creative-direction',
    'brand-strategy-identity-systems', 'interactive-immersive-experiences'];
  for(const slug of OLD) for(const src of ['/services/' + slug, '/services/' + slug + '.html']){
    const r = redirects.find(x => x.source === src);
    assert.ok(r, 'redirect for ' + src);
    assert.equal(r.permanent, true, src);
    const m = r.destination.match(/^\/services\.html#([a-z-]+)$/);
    assert.ok(m && ids.has(m[1]), src + ' → ' + r.destination);
  }
  assert.ok(!redirects.some(x => /^\/services\/:/.test(x.source)), 'no generic /services/:slug rule remains');
});

test('FAQ JSON-LD says exactly what the visible FAQ says', () => {
  const faq = jsonLd(services).map(o => find(o, n => n['@type'] === 'FAQPage')).find(Boolean);
  assert.ok(faq, 'services.html has a FAQPage');
  const ld = faq.mainEntity.map(q => [q.name, q.acceptedAnswer.text].map(t => t.replace(/\s+/g, ' ').trim()));
  const visible = [...services.matchAll(/<details>\s*<summary>([\s\S]*?)<\/summary>\s*<div class="a">([\s\S]*?)<\/div>\s*<\/details>/g)]
    .map(m => [text(m[1]), text(m[2])]);
  assert.ok(visible.length > 0);
  assert.deepEqual(ld, visible);
});

test('prices: one set of floors and bands across site.js, the API and the form', () => {
  const displays = PRICING.map(p => p.display);
  for(const [cur, m] of Object.entries(MARKETS)) assert.ok(displays.includes(m.floor), cur + ' floor ' + m.floor + ' in PRICING');
  const bands = Object.values(MARKETS).flatMap(m => m.bands).concat('Not sure yet');
  assert.deepEqual([...new Set(bands)].sort(), [...new Set(BUDGETS)].sort());
  assert.equal(bands.length, BUDGETS.length);
  const contact = read('contact.html');
  assert.deepEqual(options(contact, 'f-budget').filter(o => /data-band/.test(o.attrs)).map(o => o.text), MARKETS.ILS.bands);
  const sprint = services.match(/<div class="cap" id="sprint">([\s\S]*?)<div class="cap" id="full-launch">/);
  assert.ok(sprint, 'Sprint card');
  assert.match(sprint[1], /<strong data-floor>₪30,000<\/strong>/);
});

test('form enums match what the enquiry API accepts', () => {
  const contact = read('contact.html');
  const opts = id => options(contact, id).filter(o => o.text !== 'Select').map(o => o.text);
  assert.deepEqual(opts('f-timeline'), TIMELINES);
  assert.deepEqual(opts('f-source'), SOURCES);
});
