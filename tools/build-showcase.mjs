// Builds the showcase home page (index.html) from data/projects.json.
// The page is static HTML so it reads fine without JS and for crawlers;
// js/showcase.js adds the motion and the in-page project viewer.
// Run from the project root:  node tools/build-showcase.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const require = createRequire(import.meta.url);
const CONTACT = require(path.join(ROOT, 'js/contact-config.js'));
const SITE = 'https://itaiagami.com';
const LINKEDIN = 'https://www.linkedin.com/in/itai-agami-237353189/';
const projects = JSON.parse(readFileSync(path.join(ROOT, 'data/projects.json'), 'utf8'));

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = n => String(n).padStart(2, '0');

/* Selected work: ranked home picks first, then the other flagships, in data order. */
const selected = [
  ...projects.filter(p => p.homeRank).sort((a, b) => a.homeRank - b.homeRank),
  ...projects.filter(p => !p.homeRank && p.flagship),
];

/* Alt text lives with the images in each case study page. */
function alts(slug) {
  const f = path.join(ROOT, 'work', slug + '.html');
  const map = new Map();
  if (!existsSync(f)) return map;
  for (const [, tag] of readFileSync(f, 'utf8').matchAll(/<img\b([^>]*)>/g)) {
    const src = /\bsrc="([^"]+)"/.exec(tag)?.[1], alt = /\balt="([^"]*)"/.exec(tag)?.[1];
    if (src && alt && !map.has(src)) map.set(src, alt);
  }
  return map;
}

async function dims(src) {
  const m = await sharp(path.join(ROOT, src)).metadata();
  return { w: m.width, h: m.height };
}

async function img(src, altMap, fallback) {
  return { src, alt: altMap.get(src) || fallback, ...(await dims(src)) };
}

/* Layout rhythm for the gallery, repeating: full, right, left, centre, left-offset. */
const SHAPES = ['full', 'right', 'left', 'centre', 'offset'];

const items = [];
for (const [i, p] of selected.entries()) {
  const altMap = alts(p.slug);
  const hero = await img(p.hero, altMap, p.name);
  const gallery = [];
  for (const g of p.gallery || []) gallery.push({ ...(await img(g.src, altMap, p.name)), half: !!g.half });
  items.push({ i, p, hero, gallery, shape: SHAPES[i % SHAPES.length] });
}

const clients = [...new Set(projects.map(p => p.client).filter(c => c && !/fictional/i.test(c)))];

const viewerData = items.map(({ p, hero, gallery }) => ({
  slug: p.slug, name: p.name, client: p.client, cat: p.cat, disciplines: p.disciplines,
  line: p.oneline, href: 'work/' + p.slug + '.html', hero, gallery,
}));

const article = ({ i, p, hero, shape }) => `
    <article class="sc-item sc-${shape}" data-slug="${esc(p.slug)}">
      <a class="sc-link" href="work/${esc(p.slug)}.html" data-open="${esc(p.slug)}" tabindex="-1" aria-hidden="true"><span class="sc-frame" style="aspect-ratio:${hero.w}/${hero.h}" data-flip-id="p-${esc(p.slug)}"><img src="${esc(hero.src)}" width="${hero.w}" height="${hero.h}" alt="${esc(hero.alt)}" ${i < 1 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></span></a>
      <h2 class="sc-cap"><span class="sc-no">${pad(i + 1)}</span> <a class="sc-name" href="work/${esc(p.slug)}.html" data-open="${esc(p.slug)}">${esc(p.name)}</a> <span class="sc-cat">${esc(p.cat)}</span></h2>
    </article>`;

const ld = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Person', '@id': SITE + '/#itai', name: 'Itai Agami', jobTitle: 'Creative Builder',
      hasOccupation: [{ '@type': 'Occupation', name: 'Creative Director' }, { '@type': 'Occupation', name: 'Art Director' }, { '@type': 'Occupation', name: 'Creative Technologist' }],
      description: 'Creative director and designer in Tel Aviv, working across brand identity, campaigns, film, 3D, interactive and spaces.',
      url: SITE + '/', image: SITE + '/assets/opt/15b0b9d98c42.webp', email: CONTACT.CONTACT_EMAIL, sameAs: [LINKEDIN],
      address: { '@type': 'PostalAddress', addressLocality: 'Tel Aviv', addressCountry: 'IL' },
      alumniOf: { '@type': 'CollegeOrUniversity', name: 'Shenkar College of Engineering, Design and Art' },
      knowsLanguage: ['en', 'he'],
    },
    {
      '@type': 'WebSite', '@id': SITE + '/#website', url: SITE + '/', name: 'Itai Agami',
      alternateName: ['Itai Agami, Creative Builder', 'Itai Agami, Creative Director', 'itaiagami.com'],
      inLanguage: 'en', publisher: { '@id': SITE + '/#itai' }, about: { '@id': SITE + '/#itai' },
    },
    {
      '@type': 'ProfilePage', '@id': SITE + '/#profilepage', url: SITE + '/', name: 'Itai Agami, selected work',
      isPartOf: { '@id': SITE + '/#website' }, mainEntity: { '@id': SITE + '/#itai' },
    },
    {
      '@type': 'ItemList', '@id': SITE + '/#selected', name: 'Selected work',
      itemListElement: selected.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.name, url: SITE + '/work/' + p.slug + '.html' })),
    },
  ],
};

const html = `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Itai Agami | Selected Work</title>
<meta name="description" content="Selected work by Itai Agami, creative director and designer in Tel Aviv: brand identity, campaigns, film, 3D, interactive and spaces." />
<link rel="canonical" href="${SITE}/" />
<link rel="alternate" type="text/markdown" href="${SITE}/" title="This page as Markdown (send Accept: text/markdown)" />
<link rel="icon" href="favicon.svg" type="image/svg+xml" />
<meta name="theme-color" content="#e8e8e3" />
<meta property="og:type" content="website" />
<meta property="og:title" content="Itai Agami | Selected Work" />
<meta property="og:description" content="Brand, campaign, film, 3D, interactive and spaces." />
<meta property="og:url" content="${SITE}/" />
<meta property="og:image" content="${SITE}/assets/og/itai-agami.jpg" />
<meta property="og:image:type" content="image/jpeg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Itai Agami" />
<meta property="og:site_name" content="Itai Agami" />
<meta property="og:locale" content="en_US" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&amp;family=Inter+Tight:wght@500;600&amp;family=IBM+Plex+Mono:wght@400&amp;display=swap" />
<link rel="stylesheet" href="css/site.css" />
<link rel="stylesheet" href="css/showcase.css" />
<link rel="preload" as="image" href="${esc(items[0].hero.src)}" fetchpriority="high" />
<script type="application/ld+json">
${JSON.stringify(ld, null, 2)}
</script>
</head>
<body class="sc">
<!-- Generated by tools/build-showcase.mjs from data/projects.json. Edit the data or the script, not this file. -->
<header class="sc-top" id="siteHeader">
  <a href="/" class="sc-brand" aria-label="Itai Agami, home">Itai Agami</a>
  <nav class="sc-nav" aria-label="Primary">
    <a href="/" aria-current="page">Work</a>
    <a href="work.html">Archive</a>
    <a href="about.html" data-info>Info</a>
    <button id="themeToggle" class="sc-theme" type="button" aria-label="Toggle light or dark theme" title="Toggle theme"><span aria-hidden="true">◐</span></button>
  </nav>
</header>

<main>
  <section class="sc-intro" aria-label="Introduction">
    <h1 class="sc-title">Itai Agami</h1>
    <p class="sc-sub"><span>Creative direction &amp; design</span><span>Tel Aviv</span></p>
  </section>

  <section class="sc-gallery" aria-label="Selected work">${items.map(article).join('')}
  </section>

  <section class="sc-more" aria-label="Archive">
    <a href="work.html" class="sc-more-link"><span class="sc-more-l">Archive</span><span class="sc-more-n">${pad(projects.length)} projects</span><span class="sc-arw" aria-hidden="true">→</span></a>
  </section>
</main>

<footer class="sc-foot">
  <a href="mailto:${esc(CONTACT.CONTACT_EMAIL)}">Email</a>
  <a href="${LINKEDIN}" target="_blank" rel="noopener">LinkedIn</a>
  <span>© ${new Date().getFullYear()}</span>
  <span class="legal"><a href="privacy.html">Privacy</a><button type="button" data-consent-open>Privacy settings</button></span>
</footer>

<div class="sc-info" id="info" role="dialog" aria-modal="true" aria-label="Info" hidden>
  <button class="sc-close" type="button" data-close>Close</button>
  <div class="sc-info-in">
    <p class="sc-info-lead">Creative director and designer in Tel Aviv. Brand, campaign, film, 3D, interactive and spaces.</p>
    <dl class="sc-info-list">
      <div><dt>Contact</dt><dd><a href="mailto:${esc(CONTACT.CONTACT_EMAIL)}">${esc(CONTACT.CONTACT_EMAIL)}</a></dd></div>
      <div><dt>Elsewhere</dt><dd><a href="${LINKEDIN}" target="_blank" rel="noopener">LinkedIn</a> · <a href="/assets/docs/Itai_Agami_CV.pdf" target="_blank" rel="noopener">CV</a></dd></div>
      <div><dt>Clients</dt><dd>${clients.map(esc).join(', ')}</dd></div>
    </dl>
  </div>
</div>

<div class="sc-viewer" id="viewer" role="dialog" aria-modal="true" aria-labelledby="vTitle" hidden></div>
<script type="application/json" id="scData">${JSON.stringify(viewerData).replace(/</g, '\\u003c')}</script>

<div class="sc-cursor" aria-hidden="true"><span>View</span></div>

<script src="js/contact-config.js"></script>
<script src="js/vendor/gsap/gsap.min.js"></script>
<script src="js/vendor/gsap/ScrollTrigger.min.js"></script>
<script src="js/vendor/gsap/SplitText.min.js"></script>
<script src="js/vendor/gsap/Flip.min.js"></script>
<script src="js/site.js"></script>
<script src="js/showcase.js"></script>
</body>
</html>
`;

writeFileSync(path.join(ROOT, 'index.html'), html);
console.log('index.html: ' + items.length + ' selected of ' + projects.length + ' projects');
