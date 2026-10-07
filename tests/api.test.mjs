import { test } from 'node:test';
import assert from 'node:assert/strict';
import { require, call } from './helpers/load.mjs';

const projects = require('./api/projects.js');
const services = require('./api/services.js');
const notFound = require('./api/not-found.js');
const enquiry = require('./api/enquiry.js');
const geo = require('./api/geo.js');
const stats = require('./api/stats.js');
const data = require('./data/projects.json');

const parse = r => JSON.parse(r.body);
function assertError(r, status, code){
  assert.equal(r.statusCode, status);
  assert.match(r.headers['content-type'], /^application\/json/);
  const j = parse(r);
  assert.equal(j.ok, false);
  assert.equal(j.code, code);
  assert.equal(j.status, status);
  assert.equal(typeof j.error, 'string');
  assert.ok(j.error.length > 0);
  assert.ok(j.hint.length > 0, 'has a resolution hint');
  assert.equal(j.docs, 'https://itaiagami.com/openapi.json');
  return j;
}

test('GET /api/projects lists every case study', async () => {
  const r = await call(projects);
  assert.equal(r.statusCode, 200);
  const j = parse(r);
  assert.equal(j.count, data.length);
  assert.deepEqual(j.categories, ['Brand', 'Culture', 'Technology']);
  const c13 = j.projects.find(p => p.slug === 'channel-13');
  assert.equal(c13.url, 'https://itaiagami.com/work/channel-13.html');
  assert.equal(c13.video, 'https://vimeo.com/1000322316');
  assert.match(c13.image, /^https:\/\/itaiagami\.com\/assets\//);
  assert.ok(!('homeRank' in c13));
  assert.equal(r.headers['access-control-allow-origin'], '*');
});

test('GET /api/projects?category= filters, and rejects unknown categories', async () => {
  const j = parse(await call(projects, { query: { category: 'culture' } }));
  assert.ok(j.count > 0);
  assert.ok(j.projects.every(p => p.category === 'Culture'));
  assertError(await call(projects, { query: { category: 'Food' } }), 400, 'invalid_category');
});

test('GET /api/projects/{slug}', async () => {
  const r = await call(projects, { query: { slug: 'tower-of-david' } });
  assert.equal(r.statusCode, 200);
  assert.equal(parse(r).name, 'Tower of David');
  assertError(await call(projects, { query: { slug: 'nope' } }), 404, 'project_not_found');
});

test('GET /api/services', async () => {
  const r = await call(services);
  assert.equal(r.statusCode, 200);
  const j = parse(r);
  assert.equal(j.services.length, 4);
  for(const s of j.services) assert.match(s.url, /^https:\/\/itaiagami\.com\/services\/[a-z-]+\.html$/);
  assert.deepEqual(j.pricing.startingAt.map(p => p.currency), ['ILS', 'USD', 'EUR', 'GBP']);
});

test('read-only endpoints reject other methods with JSON 405', async () => {
  for(const h of [projects, services, geo]){
    const r = await call(h, { method: 'POST' });
    assertError(r, 405, 'method_not_allowed');
    assert.ok(r.headers.allow);
  }
  assertError(await call(stats, { method: 'POST' }), 405, 'method_not_allowed');
  assertError(await call(enquiry, { method: 'GET' }), 405, 'method_not_allowed');
});

test('unknown API paths answer a JSON 404', async () => {
  const j = assertError(await call(notFound, { query: { path: '/api/nope' } }), 404, 'endpoint_not_found');
  assert.match(j.error, /\/api\/nope/);
});

test('/api/stats errors are JSON with codes', async () => {
  const saved = process.env.STATS_PASSWORD;
  delete process.env.STATS_PASSWORD;
  assertError(await call(stats), 503, 'not_configured');
  process.env.STATS_PASSWORD = 'secret';
  assertError(await call(stats, { headers: { 'x-stats-key': 'wrong' } }), 401, 'unauthorized');
  if(saved === undefined) delete process.env.STATS_PASSWORD; else process.env.STATS_PASSWORD = saved;
});

test('/api/enquiry validation errors carry a code and a fix hint', async () => {
  const base = { name: 'Ada', email: 'ada@example.com', project: 'A brand launch for a new product.' };
  const cases = [
    [{ ...base, name: '' }, 'missing_name'],
    [{ ...base, email: 'nope' }, 'invalid_email'],
    [{ ...base, project: 'short' }, 'project_too_short'],
    [{ ...base, budget: '1 dollar' }, 'invalid_budget'],
    [{ ...base, timeline: 'whenever' }, 'invalid_timeline'],
    [{ ...base, source: 'Fax' }, 'invalid_source'],
    ['{not json', 'invalid_json']
  ];
  for(const [body, code] of cases){
    const j = assertError(await call(enquiry, { method: 'POST', body, headers: { 'x-forwarded-for': '203.0.113.' + code.length } }), 400, code);
    if(code === 'invalid_budget') assert.match(j.hint, /\$10,000 – \$20,000/);
  }
});

test('/api/enquiry: undeliverable lead returns 502 delivery_failed with fallback', async () => {
  const saved = [process.env.RESEND_API_KEY, process.env.LEAD_WEBHOOK_URL];
  delete process.env.RESEND_API_KEY; delete process.env.LEAD_WEBHOOK_URL;
  const errLog = console.error; console.error = () => {};
  try{
    const r = await call(enquiry, { method: 'POST', headers: { 'x-forwarded-for': '198.51.100.7' },
      body: { name: 'Ada', email: 'ada@example.com', project: 'A brand launch for a new product.' } });
    const j = assertError(r, 502, 'delivery_failed');
    assert.equal(j.fallback, true);
  }finally{
    console.error = errLog;
    if(saved[0] !== undefined) process.env.RESEND_API_KEY = saved[0];
    if(saved[1] !== undefined) process.env.LEAD_WEBHOOK_URL = saved[1];
  }
});

test('/api/enquiry honeypot still answers ok', async () => {
  const r = await call(enquiry, { method: 'POST', body: { website: 'spam' } });
  assert.equal(r.statusCode, 200);
  assert.deepEqual(parse(r), { ok: true });
});
