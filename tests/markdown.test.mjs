import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, require, call } from './helpers/load.mjs';

const handler = require('./api/markdown.js');
const { htmlToMarkdown } = require('./api/_lib/html-to-markdown.js');

test('homepage as Markdown: 200, text/markdown, Vary: Accept, real content', async () => {
  const r = await call(handler, { query: { path: '/' } });
  assert.equal(r.statusCode, 200);
  assert.match(r.headers['content-type'], /^text\/markdown; charset=utf-8$/);
  assert.equal(r.headers.vary, 'Accept');
  assert.match(r.body, /^# Itai Agami \| Independent Creative Director/);
  assert.match(r.body, /## Creative direction for your next big move\./);
  assert.match(r.body, /\[Channel 13\]\(https:\/\/itaiagami\.com\/work\/channel-13\.html\)/);
  assert.doesNotMatch(r.body, /<(?!https:)[a-z][^>]*>/i, 'no HTML tags left');
});

test('unknown path: 404 with a Markdown body that links to recovery points', async () => {
  const r = await call(handler, { query: { path: '/__ora-404-probe-73llkbol' } });
  assert.equal(r.statusCode, 404);
  assert.match(r.headers['content-type'], /^text\/markdown/);
  assert.equal(r.headers.vary, 'Accept');
  assert.ok(r.body.length >= 20);
  assert.match(r.body, /^# 404/);
  for(const l of ['/llms.txt', '/sitemap.xml', '/openapi.json']) assert.ok(r.body.includes('https://itaiagami.com' + l), l);
});

test('HEAD returns headers only', async () => {
  const r = await call(handler, { method: 'HEAD', query: { path: '/' } });
  assert.equal(r.statusCode, 200);
  assert.equal(r.body, undefined);
});

test('resolvePage maps clean URLs and refuses traversal and private pages', () => {
  const { resolvePage } = handler;
  assert.equal(resolvePage('/').rel, 'index.html');
  assert.equal(resolvePage('/about').rel, 'about.html');
  assert.equal(resolvePage('/about/').rel, 'about.html');
  assert.equal(resolvePage('/work/channel-13').rel, 'work/channel-13.html');
  assert.equal(resolvePage('/work/channel-13.html').rel, 'work/channel-13.html');
  for(const bad of ['/../package.json', '/%2e%2e/vercel.json', '/stats.html', '/stats', '/404.html', '/api/enquiry.js',
    '/vercel.json', '/node_modules/x/index.html', '/a\\b', '/%ZZ', 'relative.html'])
    assert.equal(resolvePage(bad), null, bad);
});

test('every page in the sitemap converts to non-empty Markdown', async () => {
  const urls = [...fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8').matchAll(/<loc>https:\/\/itaiagami\.com([^<]*)<\/loc>/g)].map(m => m[1]);
  assert.ok(urls.length > 20);
  for(const p of urls){
    const r = await call(handler, { query: { path: p } });
    assert.equal(r.statusCode, 200, p);
    assert.ok(r.body.length > 200, p);
    assert.match(r.body, /\n## /, p + ' has its page heading');
  }
});

test('converter: links absolute, decorative and hidden markup dropped, forms explained', () => {
  const md = htmlToMarkdown(`<html><head><title>T &amp; U</title><meta name="description" content="D"></head><body>
    <nav><a href="/x">nav</a></nav>
    <main><h1>Hello <em>there</em></h1><div aria-hidden="true">decor</div><script>var x = "<p>no</p>";</script>
    <p>See <a href="work/a.html">case A</a> and <strong>this</strong>.<br>Next line</p>
    <ul><li>One</li><li><a href="/b">Two</a></li></ul>
    <details><summary>Q?</summary><div><p>A.</p></div></details>
    <div><span>Label</span><span>Value</span></div>
    <img src="/i.webp" alt="An image"><img src="/d.webp" alt="">
    <form><input name="a"></form></main></body></html>`, 'https://itaiagami.com/sub/page.html');
  assert.match(md, /^# T & U\n\n> D\n/);
  assert.match(md, /## Hello \*there\*/);
  assert.match(md, /\[case A\]\(https:\/\/itaiagami\.com\/sub\/work\/a\.html\)/);
  assert.match(md, /\*\*this\*\*\.\\\nNext line/);
  assert.match(md, /- One\n- \[Two\]\(https:\/\/itaiagami\.com\/b\)/);
  assert.match(md, /#### Q\?\n\nA\./);
  assert.match(md, /Label · Value/);
  assert.match(md, /!\[An image\]\(https:\/\/itaiagami\.com\/i\.webp\)/);
  assert.match(md, /POST https:\/\/itaiagami\.com\/api\/enquiry/);
  for(const gone of ['nav', 'decor', 'no</p>', 'd.webp']) assert.ok(!md.includes(gone), gone);
});
