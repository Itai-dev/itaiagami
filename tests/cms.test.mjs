/* /api/cms: Sanity projects shaped into the cases the home page draws. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, require, call, stubCms } from './helpers/load.mjs';

stubCms();
const handler = require('./api/cms.js');
const sample = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'helpers', 'cms-fixture.json'), 'utf8'));

test('a group becomes one case, led by its written case study, in CMS order', () => {
  const { cases } = handler.shape(sample);
  assert.deepEqual(cases.map(c => c.slug), ['channel-13', 'partner-tv', 'tidhar']);
  const partner = cases[1];
  assert.equal(partner.name, 'Partner TV');
  assert.ok(partner.line && partner.hero.src && partner.thumb.src);
  assert.ok(partner.media.some(m => m.kind === 'video' && m.title === 'Partner Kids'), 'other members follow as titled films');
  assert.equal(new Set(partner.media.map(m => m.mux || m.src)).size, partner.media.length, 'nothing shown twice');
  assert.ok(!partner.media.some(m => m.src === partner.hero.src), 'the hero is not repeated');
});

test('services: the Studio field wins, the fallback fills in, only used filters are listed', () => {
  const base = handler.shape(sample);
  assert.deepEqual(base.sectors.map(s => s.id), ['real-estate', 'broadcast']);
  assert.deepEqual(base.cases.find(c => c.slug === 'tidhar').sectors, ['real-estate']);

  const edited = structuredClone(sample);
  edited.projects.find(p => p.slug === 'tidhar').sectors = ['tech', 'not-a-service'];
  const next = handler.shape(edited);
  assert.deepEqual(next.cases.find(c => c.slug === 'tidhar').sectors, ['tech']);
  assert.deepEqual(next.sectors.map(s => s.id), ['broadcast', 'tech']);
});

test('GET answers JSON the CDN may hold for a minute; other methods are refused', async () => {
  const r = await call(handler);
  assert.equal(r.statusCode, 200);
  assert.match(r.headers['cache-control'], /s-maxage=60/);
  assert.equal(JSON.parse(r.body).cases.length, 3);
  assert.equal((await call(handler, { method: 'POST' })).statusCode, 405);
});

test('the home page ships no project content of its own', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /<script src="js\/home\.js" defer><\/script>/);
  assert.doesNotMatch(html.slice(html.indexOf('<body>')), /Channel 13|Tidhar/);
});

test('shape(): a case carries its Hebrew alongside the English', () => {
  const { shape } = require('./api/cms.js');
  const d = shape({ projects: [{
    _id: 'p1', name: 'Tower of David', slug: 'tower-of-david', oneliner: 'English line', challenge: 'English challenge',
    nameHe: 'מגדל דוד', onelinerHe: 'שורה בעברית', challengeHe: 'האתגר בעברית', creditsHe: ['במאי: יואב כהן'],
    hero: 'image-aaa-1600x900-jpg',
    gallery: [{ _type: 'galleryImage', image: 'image-bbb-1600x900-jpg', caption: 'Mockup', captionHe: 'הדמיה' }]
  }] });
  const c = d.cases[0];
  assert.equal(c.name, 'Tower of David');
  assert.equal(c.he.name, 'מגדל דוד');
  assert.equal(c.he.line, 'שורה בעברית');
  assert.deepEqual(c.he.sections, [{ label: 'האתגר', text: 'האתגר בעברית' }]);
  assert.deepEqual(c.he.credits, ['במאי: יואב כהן']);
  assert.equal(c.media[0].titleHe, 'הדמיה');
  assert.ok(d.sectors.every(s => s.labelHe));
});
