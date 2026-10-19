/* Site-wide drift checks. Every round so far found the same kinds of drift by
   hand (headings, share cards, snippets, dashes and spellings, broken tool
   paths, skip links); this test catches them automatically.
   Content checks run over every indexable page (root, work/, notes/); the
   structural ones (assets resolve, skip link, footer headings) over all pages. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './helpers/load.mjs';

const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(ROOT, rel));
const decode = s => s.replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const meta = (h, attr, name) => {
  const m = new RegExp('<meta ' + attr + '="' + name.replace(/[.:]/g, '\\$&') + '" content="([^"]*)"').exec(h);
  return m ? decode(m[1]) : null;
};

const ALL = ['.', 'work', 'notes'].flatMap(d =>
  fs.readdirSync(path.join(ROOT, d)).filter(f => f.endsWith('.html')).map(f => d === '.' ? f : d + '/' + f));
const noindex = h => /<meta name="robots" content="[^"]*noindex/i.test(h);
const PAGES = ALL.filter(f => !noindex(read(f)));
const CARD = 'assets/og/itai-agami-cd.jpg';

/* Strip what a reader never sees; keep the attribute text a reader or a
   screen reader does get (alt, title, aria-label, meta content). */
const visibleText = h => {
  const attrs = [...h.matchAll(/\s(?:alt|title|aria-label|content)="([^"]*)"/g)].map(m => m[1]);
  const body = h
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<pre[\s\S]*?<\/pre>/gi, ' ')
    .replace(/<code[\s\S]*?<\/code>/gi, ' ')
    .replace(/<[^>]*>/g, ' ');
  return decode([body, ...attrs].join(' ')).replace(/\s+/g, ' ');
};
const ALLOW = ['Claude - Showreel 2026', '/enquiry', 'submitEnquiry'];

test('pages exist to check', () => {
  assert.ok(PAGES.length >= 25, PAGES.length + ' indexable pages');
  assert.ok(!PAGES.includes('404.html') && !PAGES.includes('stats.html'), 'noindex pages are left out');
});

test('each indexable page has exactly one h1', () => {
  for(const f of PAGES){
    const h = read(f).replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/gi, '');
    assert.equal((h.match(/<h1[\s>]/g) || []).length, 1, f);
  }
});

test('meta description is 110–170 characters and equals og:description', () => {
  for(const f of PAGES){
    const h = read(f);
    const d = meta(h, 'name', 'description');
    assert.ok(d, f + ' has a meta description');
    assert.ok(d.length >= 110 && d.length <= 170, f + ': description is ' + d.length + ' characters');
    assert.equal(meta(h, 'property', 'og:description'), d, f + ': og:description equals the description');
  }
});

test('og:image points at a real file, and the default card always has alt text', () => {
  for(const f of PAGES){
    const h = read(f);
    const img = meta(h, 'property', 'og:image');
    assert.ok(img, f + ' has og:image');
    const m = /^https:\/\/itaiagami\.com\/(assets\/.+)$/.exec(img);
    assert.ok(m, f + ': og:image is under assets/ (' + img + ')');
    assert.ok(exists(m[1]), f + ': ' + m[1] + ' exists');
    if(m[1] === CARD){
      const alt = meta(h, 'property', 'og:image:alt');
      assert.ok(alt && alt.length > 20, f + ' describes the share card in og:image:alt');
    }
  }
});

test('titles use a pipe, not a spaced hyphen', () => {
  for(const f of PAGES){
    const h = read(f);
    const t = decode((/<title>([\s\S]*?)<\/title>/.exec(h) || [])[1] || '');
    assert.ok(t, f + ' has a title');
    assert.ok(!t.includes(' - '), f + ' <title>: ' + t);
    const og = meta(h, 'property', 'og:title');
    if(og) assert.ok(!og.includes(' - '), f + ' og:title: ' + og);
  }
});

test('visible text has no spaced hyphens and no UK spellings', () => {
  const uk = /\b\w*(organis|enquir|recognis|colour|centre|labelled|maths|aeroplane|greyscale)\w*/i;
  for(const f of PAGES){
    let t = visibleText(read(f));
    for(const a of ALLOW) t = t.split(a).join(' ');
    const dash = /\S - \S/.exec(t);
    assert.ok(!dash, f + ': spaced hyphen in "…' + (dash ? t.slice(Math.max(0, dash.index - 40), dash.index + 40) : '') + '…"');
    const sp = uk.exec(t);
    assert.ok(!sp, f + ': UK spelling "' + (sp && sp[0]) + '"');
  }
});

test('local scripts and stylesheets resolve to files', () => {
  for(const f of ALL){
    const h = read(f);
    const refs = [
      ...[...h.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(m => m[1]),
      ...[...h.matchAll(/<link\b[^>]*>/g)].map(m => m[0]).filter(l => /rel="stylesheet"/.test(l))
        .map(l => (/href="([^"]+)"/.exec(l) || [])[1]).filter(Boolean),
    ];
    for(const r of refs){
      if(/^(https?:)?\/\//.test(r)) continue;
      const clean = r.split(/[?#]/)[0];
      const rel = clean.startsWith('/') ? clean.slice(1) : path.posix.join(path.posix.dirname(f), clean);
      assert.ok(exists(rel), f + ' → ' + r);
    }
  }
});

test('every directory tools/make-og.mjs reads exists', () => {
  const src = read('tools/make-og.mjs');
  const m = /\[((?:\s*'[^']+'\s*,?)+)\]\.flatMap/.exec(src);
  assert.ok(m, 'make-og.mjs lists its page directories');
  const dirs = [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
  assert.ok(dirs.length > 0);
  for(const d of dirs) assert.ok(exists(d) && fs.statSync(path.join(ROOT, d)).isDirectory(), 'tools/make-og.mjs reads ' + d + '/');
});

test('one @id, one summary: the Person description matches on home and About', () => {
  const person = f => {
    const out = [];
    const walk = o => {
      if(!o || typeof o !== 'object') return;
      if(o['@id'] === 'https://itaiagami.com/#itai' && typeof o.description === 'string') out.push(o.description);
      Object.values(o).forEach(walk);
    };
    for(const m of read(f).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) walk(JSON.parse(m[1]));
    return out;
  };
  const home = person('index.html'), about = person('about.html');
  assert.equal(home.length, 1, 'index.html Person description');
  assert.ok(about.length >= 1, 'about.html Person description');
  for(const d of about) assert.equal(d, home[0]);
});

test('every page starts with a skip link to main#main', () => {
  for(const f of ALL){
    const h = read(f);
    assert.match(h, /<body[^>]*>\s*<a class="skip" href="#main">/, f + ': a.skip is the first element in <body>');
    assert.match(h, /<main\b[^>]*\bid="main"/, f + ': has main#main');
  }
});

test('no footer uses h4', () => {
  for(const f of ALL){
    for(const m of read(f).matchAll(/<footer[\s\S]*?<\/footer>/g)) assert.ok(!/<h4[\s>]/.test(m[0]), f);
  }
  const js = read('js/site.js');
  for(const m of js.matchAll(/<footer[\s\S]*?<\/footer>/g)) assert.ok(!/<h4[\s>]/.test(m[0]), 'js/site.js footer template');
});

/* ---------- Round 5 ---------- */

/* every text file we ship or build from, outside .git, .claude and node_modules */
const TEXT = /\.(html|js|mjs|cjs|json|txt|xml|md|css)$/;
const walk = dir => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap(e => {
  const rel = dir === '.' ? e.name : dir + '/' + e.name;
  if(e.isDirectory()) return ['.git', '.claude', 'node_modules'].includes(e.name) ? [] : walk(rel);
  return TEXT.test(e.name) ? [rel] : [];
});

test('one job order everywhere: launch campaigns first', () => {
  const old = ['brand refreshes', 'launch campaigns'].join(', ');
  for(const f of walk('.')) assert.ok(!read(f).toLowerCase().includes(old), f + ' still says "' + old + '"');
});

test('the hero folders riffle the home picks first, and every still exists', () => {
  const src = read('js/hairline-cases.js');
  const m = /const WORK = \[([\s\S]*?)\n\];/.exec(src);
  assert.ok(m, 'js/hairline-cases.js declares WORK');
  const work = [...m[1].matchAll(/\["([a-z0-9-]+)", "([a-z0-9-]+)", "[^"]+"\]/g)].map(x => ({ slug: x[1], still: x[2] }));
  assert.equal(work.length, 7, 'seven cards');
  const projects = JSON.parse(read('data/projects.json'));
  const picks = projects.filter(p => p.homeRank >= 1 && p.homeRank <= 4).sort((a, b) => a.homeRank - b.homeRank).map(p => p.slug);
  assert.equal(picks.length, 4);
  assert.deepEqual(work.slice(0, 4).map(w => w.slug), picks, 'the home picks lead, in homeRank order');
  for(const w of work){
    assert.ok(exists('work/' + w.slug + '.html'), w.slug + ' case exists');
    assert.ok(exists('assets/opt/hero/' + w.still + '.webp'), 'assets/opt/hero/' + w.still + '.webp');
  }
});

test('the first row of the Work grid loads eagerly, the first image with high priority', () => {
  const imgs = [...read('work.html').matchAll(/<div class="p-thumb"><img ([^>]*)>/g)].map(m => m[1]);
  assert.ok(imgs.length >= 3);
  imgs.slice(0, 3).forEach((a, i) => {
    assert.match(a, /loading="eager"/, 'grid image ' + (i + 1));
    assert.match(a, /decoding="async"/, 'grid image ' + (i + 1));
    assert.equal(/fetchpriority="high"/.test(a), i === 0, 'only the first has fetchpriority=high');
  });
});

test('one CTA voice and one footer: no "Book a call with Itai", no "Studio" heading', () => {
  const sources = [...ALL, 'js/site.js'];
  for(const f of sources){
    const h = read(f);
    assert.ok(!h.includes('Book a call with Itai'), f);
    assert.ok(!/<p class="fh">\s*Studio\s*<\/p>/.test(h), f + ' footer heading reads Studio');
  }
});

test('every booking band carries the one-line expectation', () => {
  for(const f of ALL){
    for(const m of read(f).matchAll(/<section class="[^"]*\bband\b[^"]*"[\s\S]*?<\/section>/g)){
      if(!m[0].includes('data-booking')) continue;
      assert.match(m[0], /<p class="cta-note">/, f + ': a booking band without p.cta-note');
      if(/\bc-close\b/.test(m[0].slice(0, 80))) assert.ok(!/\sstyle="/.test(m[0]), f + ': c-close uses inline styles');
    }
  }
});

test('the one-owner promise is said once on Services', () => {
  const n = (visibleText(read('services.html')).match(/one point of accountability/gi) || []).length;
  assert.equal(n, 1);
});

test('US spelling: no "personalisation" in visible text', () => {
  for(const f of PAGES) assert.ok(!/personalis/i.test(visibleText(read(f))), f);
});

test('display titles size by em, not ch, so they do not reflow when the font swaps', () => {
  const css = read('css/site.css');
  for(const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
    const sel = m[1], body = m[2];
    if(!/\.about-title|\.hero h1|\.band h2/.test(sel)) continue;
    assert.ok(!/max-width:\s*[\d.]+ch/.test(body), sel.trim() + ' uses a ch max-width');
  }
});

test('every internal #fragment link resolves to an id in its target', () => {
  const ids = new Map();
  const idsOf = f => {
    if(!ids.has(f)) ids.set(f, new Set([...read(f).matchAll(/\sid="([^"]+)"/g)].map(m => m[1])));
    return ids.get(f);
  };
  for(const f of ALL){
    const h = read(f).replace(/<!--[\s\S]*?-->/g, '');
    for(const m of h.matchAll(/\shref="([^"]*#[^"]*)"/g)){
      let [url, frag] = m[1].split('#');
      if(!frag) continue;
      if(/^https?:\/\//.test(url)){
        if(!url.startsWith('https://itaiagami.com/')) continue;
        url = '/' + url.slice('https://itaiagami.com/'.length);
      }
      if(/^[a-z]+:/i.test(url)) continue;
      let target = !url ? f : url.startsWith('/') ? url.slice(1) : path.posix.join(path.posix.dirname(f), url);
      target = target.split('?')[0];
      if(target === '' || target.endsWith('/')) target += 'index.html';
      assert.ok(exists(target), f + ' → ' + m[1] + ': no such file');
      assert.ok(idsOf(target).has(decodeURIComponent(frag)), f + ' → ' + m[1] + ': no id="' + frag + '" in ' + target);
    }
  }
});

test('every code block on developers.html can take keyboard focus', () => {
  const pres = [...read('developers.html').matchAll(/<pre\b([^>]*)>/g)];
  assert.ok(pres.length > 0);
  for(const p of pres) assert.match(p[1], /tabindex="0"/, '<pre' + p[1] + '>');
});
