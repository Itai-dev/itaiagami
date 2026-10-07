import { test } from 'node:test';
import assert from 'node:assert/strict';
import { require, call, loadMiddleware } from './helpers/load.mjs';

const mw = await loadMiddleware();
const notFound = require('./api/not-found.js');
const u = p => new URL(p, 'https://itaiagami.com');

test('/api/v1/<endpoint> maps onto the same functions as the unversioned alias', () => {
  for(const name of ['services', 'projects', 'enquiry', 'geo']){
    const to = mw.route('GET', u('/api/v1/' + name), '*/*');
    assert.equal(to.pathname, '/api/' + name, name);
  }
  const q = mw.route('GET', u('/api/v1/projects?category=Brand'), '*/*');
  assert.equal(q.pathname + q.search, '/api/projects?category=Brand');
  const one = mw.route('GET', u('/api/v1/projects/channel-13'), '*/*');
  assert.equal(one.pathname, '/api/projects');
  assert.equal(one.searchParams.get('slug'), 'channel-13');
  const dry = mw.route('POST', u('/api/v1/enquiry?dry_run=1'), '*/*');
  assert.equal(dry.searchParams.get('dry_run'), '1');
});

test('unknown versions and private endpoints are not under /api/v1', () => {
  for(const p of ['/api/v2/services', '/api/v0/projects', '/api/v1', '/api/v1/stats', '/api/v1/markdown', '/api/v1/nope'])
    assert.equal(mw.route('GET', u(p), '*/*').pathname, '/api/not-found', p);
});

test('not-found distinguishes an unsupported version', async () => {
  const v2 = JSON.parse((await call(notFound, { query: { path: '/api/v2/services' } })).body);
  assert.equal(v2.code, 'unsupported_api_version');
  assert.match(v2.hint, /\/api\/v1\/services/);
  const other = await call(notFound, { query: { path: '/api/v1/nope' } });
  assert.equal(JSON.parse(other.body).code, 'endpoint_not_found');
  assert.equal(other.headers['api-version'], '1', 'errors carry API-Version too');
});
