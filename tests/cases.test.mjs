/* Case studies: one ownership order everywhere (data, work index, crumbs,
   Next chain; the selected cases first, then the Also list), one honest
   header and one booking close per case. The pages in work/ are the source
   of truth; data/projects.json must stay in sync. */
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

const selected = projects.filter(p => p.selected === true).map(p => p.slug);
const also = projects.filter(p => p.selected === false).map(p => p.slug);

test('every project is either selected or Also, selected first', () => {
  assert.equal(selected.length + also.length, slugs.length, 'each entry has selected: true or false');
  assert.deepEqual([...selected, ...also], slugs, 'the selected entries come first, in projects.json order');
  for(const p of projects) if(!p.selected) assert.equal(p.flagship, false, p.slug + ' is Also, so not flagship');
});

test('work.html grid rows and ItemList are the selected projects; the Also list is the rest', () => {
  const rows = [...workHtml.matchAll(/<li class="prow"[^>]*>\s*<a href="work\/([a-z0-9-]+)\.html">/g)].map(m => m[1]);
  assert.deepEqual(rows, selected);
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
  assert.deepEqual(items.map(i => i.position), selected.map((_, i) => i + 1));
  assert.deepEqual(items.map(i => /\/work\/([a-z0-9-]+)\.html$/.exec(i.url)[1]), selected);
  const alsoList = /<ul class="also-list">([\s\S]*?)<\/ul>/.exec(workHtml);
  assert.ok(alsoList, 'work.html has an Also list');
  assert.deepEqual([...alsoList[1].matchAll(/href="work\/([a-z0-9-]+)\.html"/g)].map(m => m[1]), also);
  assert.ok(!/<img/.test(alsoList[1]), 'the Also list has no thumbnails');
});

test('crumbs count the selected order and Next walks it, wrapping to the first; Also cases point back to the first', () => {
  slugs.forEach(slug => {
    const h = page(slug);
    const crumb = /<p class="crumb">[\s\S]*?<span>([^<]+)<\/span><\/p>/.exec(h);
    assert.ok(crumb, slug + ' has a crumb');
    const next = /<div class="c-next">[\s\S]*?<a href="([^"]+)"/.exec(h);
    assert.ok(next, slug + ' has a Next link');
    const i = selected.indexOf(slug);
    if(i >= 0){
      assert.equal(crumb[1], pad(i + 1) + ' / ' + selected.length, slug);
      assert.equal(next[1], selected[(i + 1) % selected.length] + '.html', slug);
    }else{
      assert.equal(crumb[1], 'Also', slug);
      assert.equal(next[1], selected[0] + '.html', slug);
    }
  });
});

test('all case pages stay in the sitemap', () => {
  const sitemap = read('sitemap.xml');
  for(const slug of slugs) assert.ok(sitemap.includes('<loc>https://itaiagami.com/work/' + slug + '.html</loc>'), slug);
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
