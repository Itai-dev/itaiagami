import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { require, call } from './helpers/load.mjs';

const RL = require('./api/_lib/ratelimit.js');
const services = require('./api/services.js');
const projects = require('./api/projects.js');
const enquiry = require('./api/enquiry.js');
const geo = require('./api/geo.js');

const ip = n => ({ 'x-forwarded-for': '192.0.2.' + n });
beforeEach(() => RL._hits.clear());

test('read endpoints send the IETF RateLimit fields and the X-RateLimit fields', async () => {
  const r = await call(services, { headers: ip(1) });
  assert.equal(r.statusCode, 200);
  assert.equal(r.headers['ratelimit-policy'], '"read";q=60;w=60');
  assert.match(r.headers.ratelimit, /^"read";r=59;t=\d+$/);
  assert.equal(r.headers['x-ratelimit-limit'], '60');
  assert.equal(r.headers['x-ratelimit-remaining'], '59');
  assert.match(r.headers['x-ratelimit-reset'], /^\d+$/);
  assert.equal(r.headers['api-version'], '1');
  assert.doesNotMatch(r.headers['cache-control'], /s-maxage/, 'no shared CDN copy of per-client headers');

  const r2 = await call(projects, { headers: ip(1) });
  assert.match(r2.headers.ratelimit, /^"read";r=58;/, 'one budget across read endpoints');
});

test('over the read quota: 429 rate_limited with Retry-After, other clients unaffected', async () => {
  for(let i = 0; i < 60; i++) assert.equal((await call(services, { headers: ip(2) })).statusCode, 200);
  const r = await call(projects, { headers: ip(2) });
  assert.equal(r.statusCode, 429);
  const j = JSON.parse(r.body);
  assert.equal(j.code, 'rate_limited');
  assert.ok(j.hint.includes('Retry-After'));
  assert.match(r.headers['retry-after'], /^\d+$/);
  assert.ok(+r.headers['retry-after'] >= 1 && +r.headers['retry-after'] <= 60);
  assert.match(r.headers.ratelimit, /^"read";r=0;t=\d+$/);
  assert.equal(j.retryAfter, +r.headers['retry-after']);
  assert.equal((await call(services, { headers: ip(3) })).statusCode, 200);
});

test('the window slides: quota returns once old requests age out', () => {
  const p = { name: 't', quota: 2, window: 10 };
  const t0 = 1_000_000;
  RL.record(p, 'k', t0); RL.record(p, 'k', t0 + 4000);
  assert.equal(RL.status(p, 'k', t0 + 5000).limited, true);
  assert.equal(RL.status(p, 'k', t0 + 5000).reset, 5);
  const later = RL.status(p, 'k', t0 + 10_001);
  assert.equal(later.limited, false);
  assert.equal(later.remaining, 1);
});

test('client keys are hashed, never the raw IP', () => {
  const key = RL.clientIp({ headers: ip(9) });
  assert.ok(!key.includes('192.0.2'));
  assert.equal(key, RL.clientIp({ headers: { 'x-forwarded-for': '192.0.2.9, 10.0.0.1' } }));
});

test('enquiry: dry run validates, sends nothing and does not count', async () => {
  const body = { name: 'Ada', email: 'ada@example.com', project: 'A product launch in March.', dry_run: true };
  for(let i = 0; i < 8; i++){
    const r = await call(enquiry, { method: 'POST', body, headers: ip(4) });
    assert.equal(r.statusCode, 200);
    assert.deepEqual(JSON.parse(r.body), { ok: true, dryRun: true, message: 'Valid enquiry. Nothing was sent: remove "dry_run" to send it.' });
    assert.match(r.headers.ratelimit, /^"enquiry";r=5;/);
  }
  const viaQuery = await call(enquiry, { method: 'POST', query: { dry_run: '1' }, body: { ...body, dry_run: undefined }, headers: ip(4) });
  assert.equal(JSON.parse(viaQuery.body).dryRun, true);
  const bad = await call(enquiry, { method: 'POST', body: { ...body, email: 'x' }, headers: ip(4) });
  assert.equal(JSON.parse(bad.body).code, 'invalid_email', 'dry runs return the same validation errors');
});

test('enquiry: 5 accepted per window, then 429 with Retry-After', async () => {
  const saved = { key: process.env.RESEND_API_KEY, fetch: globalThis.fetch };
  process.env.RESEND_API_KEY = 'test';
  globalThis.fetch = async () => new Response('{}', { status: 200 });
  try{
    const body = { name: 'Ada', email: 'ada@example.com', project: 'A product launch in March.' };
    for(let i = 0; i < 5; i++){
      const r = await call(enquiry, { method: 'POST', body, headers: ip(5) });
      assert.equal(r.statusCode, 200, 'accepted ' + i);
      assert.match(r.headers.ratelimit, new RegExp('^"enquiry";r=' + (4 - i) + ';t=\\d+$'));
    }
    const r = await call(enquiry, { method: 'POST', body, headers: ip(5) });
    assert.equal(r.statusCode, 429);
    assert.equal(JSON.parse(r.body).code, 'rate_limited');
    assert.ok(+r.headers['retry-after'] > 0 && +r.headers['retry-after'] <= 600);
    assert.equal(r.headers['ratelimit-policy'], '"enquiry";q=5;w=600');
  }finally{
    globalThis.fetch = saved.fetch;
    if(saved.key === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = saved.key;
  }
});

test('geo stays unmetered (it is called on every page view) but is versioned', async () => {
  const r = await call(geo, { headers: ip(6) });
  assert.equal(r.statusCode, 200);
  assert.equal(r.headers['api-version'], '1');
  assert.equal(r.headers.ratelimit, undefined);
});
