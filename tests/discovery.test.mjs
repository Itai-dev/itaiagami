import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, require, loadMiddleware } from './helpers/load.mjs';

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const spec = JSON.parse(read('openapi.json'));

test('openapi.json is current with tools/build-openapi.cjs', () => {
  assert.equal(read('openapi.json'), require('./tools/build-openapi.cjs').text,
    'run: node tools/build-openapi.cjs');
});

test('openapi.json is a self-describing OpenAPI 3.1 document', () => {
  assert.equal(spec.openapi, '3.1.0');
  assert.ok(spec.info.title.includes('Itai Agami'));
  assert.equal(spec.servers[0].url, 'https://itaiagami.com');
  assert.deepEqual(spec.security, [], 'explicitly public');
  const ids = new Set();
  for(const [p, item] of Object.entries(spec.paths)){
    for(const [method, op] of Object.entries(item)){
      assert.ok(/^[a-z][A-Za-z]+$/.test(op.operationId), p + ' ' + method);
      assert.ok(!ids.has(op.operationId), 'unique ' + op.operationId);
      ids.add(op.operationId);
      assert.ok(op.summary && op.description && op.description.length > 40, op.operationId + ' described');
      for(const prm of op.parameters || []) assert.ok(prm.schema && prm.schema.type && prm.description, op.operationId + ' ' + prm.name);
      for(const [code, resp] of Object.entries(op.responses)){
        assert.ok(resp.description, op.operationId + ' ' + code);
        assert.ok(resp.content && resp.content['application/json'].schema, op.operationId + ' ' + code + ' schema');
        if(+code >= 400) assert.equal(resp.content['application/json'].schema.$ref, '#/components/schemas/Error');
      }
    }
  }
  assert.deepEqual([...ids].sort(), ['getProject', 'getVisitorCountry', 'listProjects', 'listServices', 'submitEnquiry']);
});

test('every $ref in openapi.json resolves', () => {
  const refs = [...JSON.stringify(spec).matchAll(/"\$ref":"#\/components\/schemas\/([A-Za-z]+)"/g)].map(m => m[1]);
  assert.ok(refs.length > 10);
  for(const r of refs) assert.ok(spec.components.schemas[r], r);
});

test('every documented path is routed by middleware.js to a real function', async () => {
  const mw = await loadMiddleware();
  for(const p of Object.keys(spec.paths)){
    const concrete = p.replace('{slug}', 'channel-13');
    const to = mw.route('GET', new URL(concrete, 'https://itaiagami.com'), 'application/json');
    const fnPath = (to ? to.pathname : concrete) + '.js';
    assert.notEqual(fnPath, '/api/not-found.js', p);
    assert.ok(fs.existsSync(path.join(ROOT, fnPath)), fnPath);
  }
});

test('.well-known/api-catalog is an RFC 9727 linkset pointing at the spec', () => {
  const cat = JSON.parse(read('.well-known/api-catalog'));
  const entry = cat.linkset[0];
  assert.equal(entry['service-desc'][0].href, 'https://itaiagami.com/openapi.json');
  assert.ok(entry.anchor.startsWith('https://itaiagami.com'));
});

test('llms.txt keeps its format and gives agents when-to-use guidance', () => {
  const t = read('llms.txt');
  assert.match(t, /^# Itai Agami\n\n> /);
  assert.match(t, /\n## When to use this site \(for agents\)\n/);
  assert.match(t, /\n## API and agent resources\n/);
  for(const l of ['https://itaiagami.com/openapi.json', 'https://itaiagami.com/api/services', 'POST https://itaiagami.com/api/enquiry', 'Accept: text/markdown'])
    assert.ok(t.includes(l), l);
});

test('vercel.json wires the function files and headers', () => {
  const v = JSON.parse(read('vercel.json'));
  assert.match(v.functions['api/markdown.js'].includeFiles, /\*\.html/);
  const h = src => (v.headers.find(x => x.source === src) || { headers: [] }).headers;
  assert.ok(h('/').some(x => x.key === 'Vary' && x.value === 'Accept'));
  assert.ok(h('/(.*)\\.html').some(x => x.key === 'Vary' && x.value === 'Accept'));
  assert.ok(h('/openapi.json').some(x => x.key === 'Content-Type' && /openapi\+json/.test(x.value)));
  assert.ok(h('/.well-known/api-catalog').some(x => x.key === 'Content-Type' && /^application\/linkset\+json/.test(x.value)));
  assert.ok(!read('.vercelignore').split('\n').includes('data'), 'data/ must deploy: the API reads data/projects.json');
});
