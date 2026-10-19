/* Case studies: one ownership order everywhere (data, work index, crumbs,
   Next chain), one honest header and one booking close per case. The pages
   in work/ are the source of truth; data/projects.json must stay in sync. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './helpers/load.mjs';

const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const projects = JSON.parse(read('data/projects.json'));
const slugs = projects.map(p => p.slug);
const workHtml = read('work.html');
const page = slug => read('work/' + slug + '.html');
const pad = n => String(n).padStart(2, '0');
const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const caseFiles = fs.readdirSync(path.join(ROOT, 'work')).filter(f => f.endsWith('.html'));

test('every case page has a projects.json entry and vice versa', () => {
  assert.deepEqual([...caseFiles].sort(), slugs.map(s => s + '.html').sort());
});

test('projects.json order equals the work.html rows and its ItemList', () => {
  const rows = [...workHtml.matchAll(/<li class="prow"[^>]*>\s*<a href="work\/([a-z0-9-]+)\.html">/g)].map(m => m[1]);
  assert.deepEqual(rows, slugs);
  const ld = [...workHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
  const findList = o => {
    if(!o || typeof o !== 'object') return null;
    if(o['@type'] === 'ItemList') return o;
    for(const v of Object.values(o)){ const r = findList(v); if(r) return r; }
    return null;
  };
  const list = ld.map(findList).find(Boolean);
  assert.ok(list, 'work.html has an ItemList');
  const items = [...list.itemListElement].sort((a, b) => a.position - b.position);
  assert.deepEqual(items.map(i => /\/work\/([a-z0-9-]+)\.html$/.exec(i.url)[1]), slugs);
});

test('crumbs count the same order and Next walks it, wrapping to the first', () => {
  slugs.forEach((slug, i) => {
    const h = page(slug);
    const crumb = /<p class="crumb">[\s\S]*?<span>(\d\d \/ \d\d)<\/span><\/p>/.exec(h);
    assert.ok(crumb, slug + ' has a crumb');
    assert.equal(crumb[1], pad(i + 1) + ' / ' + slugs.length, slug);
    const next = /<div class="c-next">[\s\S]*?<a href="([^"]+)"/.exec(h);
    assert.ok(next, slug + ' has a Next link');
    assert.equal(next[1], slugs[(i + 1) % slugs.length] + '.html', slug);
  });
});

test('no case links to the retired service pages', () => {
  for(const f of caseFiles){
    const h = read('work/' + f);
    assert.ok(!h.includes('href="../services/'), f);
    assert.ok(!h.includes('Related service'), f);
  }
});

test('each case ends on exactly one booking close for its own slug', () => {
  for(const slug of slugs){
    const h = page(slug);
    const closes = [...h.matchAll(/<section class="[^"]*\bc-close\b[^"]*"/g)];
    assert.equal(closes.length, 1, slug);
    assert.ok(h.includes('data-booking="case_' + slug + '"'), slug);
    assert.ok(h.includes('href="../contact.html#brief"'), slug);
    assert.ok(h.indexOf('c-close') < h.indexOf('class="c-next"'), slug + ': close sits before Next');
    assert.ok(!h.includes('₪'), slug + ': no price on case pages');
  }
});

test('films load no third-party player before a click', () => {
  for(const f of caseFiles){
    const h = read('work/' + f).replace(/<noscript>[\s\S]*?<\/noscript>/g, '');
    assert.ok(!/<iframe/i.test(h), f);
  }
});

test('no case uses the old "The outcome" heading', () => {
  for(const f of caseFiles) assert.ok(!read('work/' + f).includes('The outcome'), f);
});

test('the "My role" meta matches projects.json role, with the standard labels', () => {
  for(const p of projects){
    const h = page(p.slug);
    const meta = /<div class="c-meta">([\s\S]*?)\n    <\/div>/.exec(h);
    assert.ok(meta, p.slug + ' has a meta block');
    const labels = [...meta[1].matchAll(/<div class="l">([^<]+)<\/div>/g)].map(m => m[1]);
    for(const old of ['Role', 'Title', 'Collaborators', 'Team']) assert.ok(!labels.includes(old), p.slug + ' uses ' + old);
    const role = /<div class="l">My role<\/div><div class="v">([^<]*)<\/div>/.exec(meta[1]);
    assert.ok(role, p.slug + ' has My role');
    assert.equal(decode(role[1]), p.role, p.slug);
  }
});

test('every JSON-LD block on the case pages parses', () => {
  for(const f of caseFiles){
    const blocks = [...read('work/' + f).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    assert.ok(blocks.length >= 1, f);
    for(const b of blocks) assert.doesNotThrow(() => JSON.parse(b[1]), f);
  }
});
