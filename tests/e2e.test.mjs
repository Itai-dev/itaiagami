/* End to end over HTTP through tests/helpers/local-vercel.mjs: the same
   checks an agent-readiness audit makes, against the real files. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from './helpers/local-vercel.mjs';

let server, base;
before(async () => {
  server = await createServer();
  await new Promise(r => server.listen(0, r));
  base = 'http://localhost:' + server.address().port;
});
after(() => server.close());

const get = (p, accept, opts = {}) => fetch(base + p, { redirect: 'follow', ...opts, headers: { ...(accept ? { accept } : {}), ...(opts.headers || {}) } });

test('homepage: Markdown for Accept: text/markdown, HTML for Accept: text/html, both Vary: Accept', async () => {
  const md = await get('/', 'text/markdown');
  assert.equal(md.status, 200);
  assert.match(md.headers.get('content-type'), /^text\/markdown/);
  assert.match(md.headers.get('vary'), /Accept/);
  const body = await md.text();
  assert.ok(body.length > 500);
  assert.match(body, /^# Itai Agami/);

  const html = await get('/', 'text/html');
  assert.equal(html.status, 200);
  assert.match(html.headers.get('content-type'), /^text\/html/);
  assert.match(html.headers.get('vary'), /Accept/);
  assert.match(await html.text(), /^<!DOCTYPE html>/);
});

test('clean URLs redirect, then still negotiate', async () => {
  const r = await get('/about', 'text/markdown');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /^text\/markdown/);
  assert.match(await r.text(), /About Itai Agami/);
});

test('404: correct status for both, Markdown body for agents', async () => {
  const md = await get('/__ora-404-probe-73llkbol', 'text/markdown');
  assert.equal(md.status, 404);
  assert.match(md.headers.get('content-type'), /^text\/markdown/);
  const t = await md.text();
  assert.ok(t.length >= 20 && t.includes('https://itaiagami.com/llms.txt'));

  const html = await get('/__ora-404-probe-73llkbol', 'text/html');
  assert.equal(html.status, 404);
  assert.match(html.headers.get('content-type'), /^text\/html/);
});

test('machine-readable files', async () => {
  const spec = await get('/openapi.json');
  assert.equal(spec.status, 200);
  assert.match(spec.headers.get('content-type'), /application\/vnd\.oai\.openapi\+json/);
  assert.equal((await spec.json()).openapi, '3.1.0');

  const cat = await get('/.well-known/api-catalog');
  assert.match(cat.headers.get('content-type'), /^application\/linkset\+json/);
  assert.ok((await cat.json()).linkset);

  const llms = await get('/llms.txt', 'text/markdown');
  assert.equal(llms.status, 200);
  assert.match(llms.headers.get('content-type'), /^text\/plain/);
  assert.match(await llms.text(), /When to use this site/);
});

test('public API over HTTP, with JSON errors', async () => {
  const list = await get('/api/projects');
  assert.equal(list.status, 200);
  assert.ok((await list.json()).count > 0);

  const one = await get('/api/projects/channel-13');
  assert.equal((await one.json()).slug, 'channel-13');

  assert.equal((await get('/api/services')).status, 200);
  assert.equal((await get('/api/v1/services')).status, 200);

  for(const [p, status, code] of [['/api/projects/nope', 404, 'project_not_found'], ['/api/does-not-exist', 404, 'endpoint_not_found']]){
    const r = await get(p, 'text/markdown');
    assert.equal(r.status, status, p);
    assert.match(r.headers.get('content-type'), /^application\/json/);
    assert.equal((await r.json()).code, code);
  }

  const bad = await get('/api/enquiry', null, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'A', email: 'x' }) });
  assert.equal(bad.status, 400);
  const j = await bad.json();
  assert.equal(j.code, 'invalid_email');
  assert.ok(j.hint);
});

test('developer portal and CLI file are served', async () => {
  const r = await get('/developers', 'text/html');
  assert.equal(r.status, 200);
  assert.ok(r.url.endsWith('/developers.html'));
  assert.match(await r.text(), /Itai Agami API/);
  const md = await (await get('/developers', 'text/markdown')).text();
  assert.match(md, /```\n# services and starting prices\ncurl https:\/\/itaiagami\.com\/api\/v1\/services\n/);
  assert.match(md, /\| `GET \/api\/v1\/services` \| `listServices` \|/);
  const js = await get('/cli/itaiagami.mjs', 'text/markdown');
  assert.equal(js.status, 200);
  assert.match(js.headers.get('content-type'), /^text\/javascript/);
});

test('versioned API over HTTP with version and rate-limit headers', async () => {
  const r = await get('/api/v1/projects?category=Brand');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('api-version'), '1');
  assert.match(r.headers.get('ratelimit'), /^"read";r=\d+;t=\d+$/);
  assert.equal(r.headers.get('ratelimit-policy'), '"read";q=60;w=60');
  assert.ok((await r.json()).projects.every(p => p.category === 'Brand'));
  const v2 = await get('/api/v2/services');
  assert.equal(v2.status, 404);
  assert.equal((await v2.json()).code, 'unsupported_api_version');
});
