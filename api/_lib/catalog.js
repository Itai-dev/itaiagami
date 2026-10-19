/* ============================================================
   The public catalogue behind /api/services and /api/projects.

   Case studies come straight from data/projects.json, the same file
   tools/build-cases.ps1 builds work/<slug>.html from, so the API and
   the pages never disagree. Services are the three sizes of the one
   offer (Launch Sprint, Full Launch, Creative Director on call), each
   linking to its anchor on services.html, plus the capabilities a launch
   can include. The floors are the Launch Sprint's starting prices; they
   mirror MARKETS in js/site.js and the budget bands in api/enquiry.js —
   change one, change all three.
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
  { slug:'launch-sprint', name:'Launch Sprint', format:'Fixed price, about 2 weeks',
    summary:'Two weeks to find the idea a launch rests on, and to see it: the central idea, two or three creative routes with one chosen, the look and key visuals, and a plan for the full launch.',
    bestFor:'Marketing and brand leaders with a launch, refresh or campaign whose central idea is still open.',
    url: SITE + '/services.html#sprint' },
  { slug:'full-launch', name:'Full Launch', format:'Scoped per project, usually after a Sprint',
    summary:'The idea carried through identity and brand system, campaign, film, motion and 3D, the launch website and production, led hands-on with the specialists it needs and one point of accountability to launch day.',
    bestFor:'Launches, refreshes and campaigns that need one senior creative director accountable from first idea to launch day.',
    url: SITE + '/services.html#full-launch' },
  { slug:'creative-director-on-call', name:'Creative Director on call', format:'Monthly retainer',
    summary:'A fractional Creative Director: a set number of days a month to own the idea, hold one standard and keep the work coherent, including AI-assisted workflows the team can run.',
    bestFor:'In-house teams with good people and no Creative Director.',
    url: SITE + '/services.html#on-call' }
];
const CAPABILITIES = ['Brand, identity & refresh','Campaign, film & 3D','Website & digital','Interactive & spaces'];

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

module.exports = { SITE, PRICING, SERVICES, CAPABILITIES, CATEGORIES, projects: projects.map(project) };
