/* ============================================================
   The public catalogue behind /api/services and /api/projects.

   Case studies come straight from data/projects.json, the same file
   tools/build-cases.ps1 builds work/<slug>.html from, so the API and
   the pages never disagree. Services and engagement floors are short
   enough to live here; the floors mirror MARKETS in js/site.js and the
   budget bands in api/enquiry.js — change one, change all three.
   ============================================================ */

const SITE = 'https://itaiagami.com';
const projects = require('../../data/projects.json');

const PRICING = [
  { market:'IL', currency:'ILS', from:30000, display:'₪30,000' },
  { market:'US and Canada', currency:'USD', from:10000, display:'$10,000' },
  { market:'Europe', currency:'EUR', from:10000, display:'€10,000' },
  { market:'UK', currency:'GBP', from:8000, display:'£8,000' }
];

const SERVICES = [
  {
    slug:'brand-strategy-identity-systems',
    name:'Brand Strategy & Identity Systems',
    summary:'Positioning, the central idea, visual language and the brand system that keeps it coherent across every channel.',
    bestFor:'Startups, technology companies and organisations launching, rebuilding or unifying a brand.'
  },
  {
    slug:'creative-direction-product-launches',
    name:'Creative Direction for Product & Brand Launches',
    summary:'The idea a product, app or brand launch rests on, carried through identity, campaign, film, website and production.',
    bestFor:'Founders and marketing leads with one launch moment to make something land.'
  },
  {
    slug:'interactive-immersive-experiences',
    name:'Interactive & Immersive Experiences',
    summary:'Museum exhibitions, interactive installations, projection mapping, spatial media and branded digital experiences, from concept to installed experience.',
    bestFor:'Museums, cultural institutions and technology companies building something people walk into and use.'
  },
  {
    slug:'fractional-creative-direction',
    name:'Fractional Creative Direction & Creative Systems',
    summary:'Ongoing creative leadership and creative systems, including AI-assisted workflows, that let a team generate, test and scale ideas.',
    bestFor:'Companies with strong in-house teams and no Creative Director.'
  }
].map(s => Object.assign(s, { url: SITE + '/services/' + s.slug + '.html' }));

const absUrl = p => (p ? (/^https?:/.test(p) ? p : SITE + p) : null);

/* The fields an agent needs; internal ordering hints (homeRank) stay out. */
function project(p){
  return {
    slug: p.slug,
    name: p.name,
    client: p.client,
    category: p.cat,
    tags: p.tags || [],
    role: p.role,
    disciplines: p.disciplines,
    collaboration: p.collab || null,
    engagement: p.engagement || null,
    flagship: !!p.flagship,
    summary: p.oneline,
    challenge: p.challenge,
    idea: p.idea,
    system: p.system,
    result: p.result,
    contribution: p.contribution,
    credits: p.credits || [],
    url: SITE + '/work/' + p.slug + '.html',
    image: absUrl(p.hero),
    thumbnail: absUrl(p.thumb),
    video: p.vimeo ? 'https://vimeo.com/' + p.vimeo : null
  };
}

const CATEGORIES = Array.from(new Set(projects.map(p => p.cat))).sort();

module.exports = { SITE, PRICING, SERVICES, CATEGORIES, projects: projects.map(project) };
