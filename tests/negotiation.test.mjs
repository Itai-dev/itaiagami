import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadMiddleware } from './helpers/load.mjs';

const mw = await loadMiddleware();
const u = p => new URL(p, 'https://itaiagami.com');

test('prefersMarkdown follows the Accept header', () => {
  const yes = ['text/markdown', 'text/markdown, text/html;q=0.9', 'text/markdown;q=0.9, text/html;q=0.5',
    'text/html, text/markdown', 'TEXT/MARKDOWN', 'text/markdown; charset=utf-8', 'text/plain, text/markdown'];
  const no = ['', '*/*', 'text/*', 'text/html', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'text/html, text/markdown;q=0.5', 'text/markdown;q=0', 'application/json', 'text/markdownx'];
  for(const a of yes) assert.equal(mw.prefersMarkdown(a), true, a);
  for(const a of no) assert.equal(mw.prefersMarkdown(a), false, a);
});

test('page requests that prefer Markdown are rewritten to /api/markdown', () => {
  for(const p of ['/', '/about.html', '/work/channel-13.html', '/__ora-404-probe-73llkbol', '/about']){
    const to = mw.route('GET', u(p), 'text/markdown');
    assert.equal(to.pathname, '/api/markdown', p);
    assert.equal(to.searchParams.get('path'), p);
  }
  assert.equal(mw.route('HEAD', u('/'), 'text/markdown').pathname, '/api/markdown');
});

test('browsers and non-page files are left alone', () => {
  assert.equal(mw.route('GET', u('/'), 'text/html,*/*;q=0.8'), null);
  assert.equal(mw.route('GET', u('/'), null), null);
  assert.equal(mw.route('POST', u('/'), 'text/markdown'), null);
  for(const p of ['/llms.txt', '/sitemap.xml', '/openapi.json', '/robots.txt', '/.well-known/api-catalog'])
    assert.equal(mw.route('GET', u(p), 'text/markdown'), null, p);
});

test('API routing: endpoints pass, slugs rewrite, unknown paths get the JSON 404', () => {
  for(const p of ['/api/enquiry', '/api/geo', '/api/stats', '/api/projects', '/api/services'])
    assert.equal(mw.route('GET', u(p), 'application/json'), null, p);
  const one = mw.route('GET', u('/api/projects/channel-13'), '*/*');
  assert.equal(one.pathname, '/api/projects');
  assert.equal(one.searchParams.get('slug'), 'channel-13');
  assert.equal(mw.route('GET', u('/api/projects/'), '*/*').pathname, '/api/projects');
  for(const p of ['/api', '/api/nope', '/api/projects/a/b', '/api/_lib/errors']){
    const to = mw.route('GET', u(p), 'text/markdown');
    assert.equal(to.pathname, '/api/not-found', p);
    assert.equal(to.searchParams.get('path'), p);
  }
});

test('the default export rewrites with x-middleware-rewrite, or passes through', () => {
  const r = mw.default(new Request('https://itaiagami.com/', { headers: { accept: 'text/markdown' } }));
  assert.equal(r.headers.get('x-middleware-rewrite'), 'https://itaiagami.com/api/markdown?path=%2F');
  assert.equal(mw.default(new Request('https://itaiagami.com/', { headers: { accept: 'text/html' } })), undefined);
});

test('old project, service and about pages send browsers into the homepage cloud', () => {
  assert.equal(mw.moved('/work/channel-13.html'), '/?p=channel-13');
  assert.equal(mw.moved('/work.html'), '/');
  assert.equal(mw.moved('/services/fractional-creative-direction.html'), '/?panel=offer');
  assert.equal(mw.moved('/about.html'), '/?panel=about');
  for(const p of ['/', '/notes.html', '/notes/how-to-brief-a-creative-director.html', '/contact.html', '/privacy.html']) assert.equal(mw.moved(p), null, p);
  const r = mw.default(new Request('https://itaiagami.com/work/channel-13.html', { headers: { accept: 'text/html' } }));
  assert.equal(r.status, 308);
  assert.equal(r.headers.get('location'), 'https://itaiagami.com/?p=channel-13');
  /* agents asking for Markdown still get the page itself */
  assert.match(mw.default(new Request('https://itaiagami.com/work/channel-13.html', { headers: { accept: 'text/markdown' } })).headers.get('x-middleware-rewrite'), /\/api\/markdown/);
});
