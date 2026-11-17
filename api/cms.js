/* ============================================================
   GET /api/cms — everything the site shows, read from Sanity.

   The home page is drawn from this one answer: the cases in the strip,
   what each opens into, the service filters and the info text. Nothing
   about a project lives in the HTML; publish in the Studio and it is on
   the site within a minute.

   Read server-side so it works on every domain (Sanity only allows
   browser reads from itaiagami.com) and so the CDN can hold the answer.

   A case is a group of projects (e.g. Partner: TV, Kids, Series) or a
   project with no group. Its lead is the member with the written case
   study; the other members follow it as films and images.
   ============================================================ */

const { sendError, setApiHeaders } = require('./_lib/errors.js');

const PROJECT = 'c8rr77b1';
const DATASET = 'production';
const API = 'https://' + PROJECT + '.apicdn.sanity.io/v2024-01-01/data/query/' + DATASET;

/* The filters, in the order they show. A project's `sectors` field holds ids. */
const SECTORS = [
  { id: 'real-estate', label: 'Real Estate' },
  { id: 'broadcast', label: 'Broadcast' },
  { id: 'tech', label: 'Tech' },
  { id: 'exhibitions-interactive', label: 'Exhibitions & Interactive' }
];

/* Until `sectors` is filled in the Studio, cases fall back to this (by case
   slug). A value set in the Studio always wins. */
const SECTOR_FALLBACK = {
  'tidhar': ['real-estate'],
  'channel-13': ['broadcast'],
  'partner-tv': ['broadcast'],
  'mako-12': ['broadcast'],
  'hot': ['broadcast'],
  '888sport-nfl-ident': ['broadcast'],
  'interactive-elections-kan-11': ['broadcast', 'exhibitions-interactive'],
  'simply-vision-pro': ['tech'],
  'amdocs-make-it-amazing': ['tech'],
  'natural-intelligence': ['tech'],
  'museum-of-natural-history': ['exhibitions-interactive'],
  'tower-of-david': ['exhibitions-interactive'],
  'national-library-of-israel': ['exhibitions-interactive'],
  'community-lights': ['exhibitions-interactive'],
  'taormina-sicily': ['exhibitions-interactive']
};

const VIDEO = '{"mux": asset->playbackId, "aspect": asset->data.aspect_ratio}';
const QUERY = `{
  "projects": *[_type == "project" && !(_id in path("drafts.**"))]{
    _id, name, "slug": slug.current, order, groupOrder, sectors,
    client, role, disciplines, oneliner, text, siteUrl,
    challenge, idea, system, outcome, contribution, credits,
    "group": group->{_id, name, text},
    "thumbnail": thumbnail.asset._ref, "hero": hero.asset._ref, "image": image.asset._ref,
    "moreImages": moreImages[].asset._ref,
    "film": film${VIDEO}, "moreVideos": moreVideos[]${VIDEO},
    "gallery": gallery[]{_type, half, alt, "image": image.asset._ref, "video": video${VIDEO}}
  },
  "settings": *[_id == "settings"][0]{about, offerLine, offer, bookingUrl, email, linkedin, "cv": cv.asset->url}
}`;

/* image-<id>-<w>x<h>-<ext>  →  a CDN url the page sizes with ?w= */
function image(ref){
  const m = /^image-([a-f0-9]+)-(\d+)x(\d+)-(\w+)$/.exec(ref || '');
  return m ? { src: 'https://cdn.sanity.io/images/' + PROJECT + '/' + DATASET + '/' + m[1] + '-' + m[2] + 'x' + m[3] + '.' + m[4], w: +m[2], h: +m[3] } : null;
}
function video(v){
  if(!v || !v.mux) return null;
  const [w, h] = String(v.aspect || '16:9').split(':').map(Number);
  return { mux: v.mux, w: w || 16, h: h || 9 };
}
const slugify = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const rank = (n, d) => (typeof n === 'number' ? n : d);

function shape(data){
  const groups = new Map();
  for(const p of data.projects || []){
    const key = p.group ? p.group._id : p._id;
    if(!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  const cases = [];
  for(const members of groups.values()){
    members.sort((a, b) => rank(a.groupOrder, 99) - rank(b.groupOrder, 99) || rank(a.order, 999) - rank(b.order, 999));
    const lead = members.find(p => p.oneliner) || members.find(p => p.hero) || members[0];
    const group = lead.group;
    const written = !!lead.oneliner;
    const name = written || !group ? lead.name : group.name;
    const slug = (written || !group ? lead.slug : '') || slugify(name);

    /* films and images, the lead's first, each once */
    const media = [], seen = new Set();
    const add = (item, extra) => {
      if(!item) return;
      const id = item.mux || item.src;
      if(seen.has(id)) return;
      seen.add(id);
      media.push(Object.assign({ kind: item.mux ? 'video' : 'image' }, item, extra));
    };
    const addProject = (p, title) => {
      add(video(p.film), { title });
      for(const g of p.gallery || []) add(g._type === 'galleryVideo' ? video(g.video) : image(g.image), { half: !!g.half, alt: g.alt || '' });
      add(image(p.image), { title });
      for(const r of p.moreImages || []) add(image(r), { title });
      for(const v of p.moreVideos || []) add(video(v), { title });
    };
    addProject(lead, '');
    for(const p of members) if(p !== lead) addProject(p, p.name === name ? '' : p.name);

    const firstVideo = media.find(m => m.kind === 'video');
    const firstImage = media.find(m => m.kind === 'image');
    const still = v => (v ? { mux: v.mux, w: v.w, h: v.h } : null);
    const hero = image(lead.hero) || image(lead.image) || (firstImage && { src: firstImage.src, w: firstImage.w, h: firstImage.h }) || still(firstVideo);
    /* the card image, unless it is too small to stay sharp as a tall tile */
    const card = image(lead.thumbnail);
    const thumb = card && (card.h >= 600 || !hero || !hero.src || hero.h <= card.h) ? card : hero;
    /* the hero is not repeated right under itself */
    const body = media.filter(m => !(hero && m.kind === 'image' && m.src === hero.src));

    const sections = [['Challenge', lead.challenge], ['Idea', lead.idea], ['System', lead.system], ['Outcome', lead.outcome], ['My part', lead.contribution]]
      .filter(s => s[1]).map(s => ({ label: s[0], text: s[1] }));

    const ids = new Set(SECTORS.map(s => s.id));
    const own = members.flatMap(p => p.sectors || []).filter(s => ids.has(s));
    const sectors = own.length ? Array.from(new Set(own)) : (SECTOR_FALLBACK[slug] || []);

    cases.push({
      slug, name,
      client: lead.client || (group && group.name) || '',
      role: lead.role || '',
      disciplines: lead.disciplines || '',
      line: lead.oneliner || lead.text || (group && group.text) || '',
      sectors, thumb, hero, sections,
      /* the case's own film, played silently on its tile while it is in focus */
      film: (body.find(m => m.kind === 'video' && !m.title) || {}).mux || '',
      credits: lead.credits || [],
      siteUrl: (members.find(p => p.siteUrl) || {}).siteUrl || '',
      media: body,
      order: Math.min(...members.map(p => rank(p.order, 999)))
    });
  }
  cases.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  cases.forEach(c => { delete c.order; });

  const used = new Set(cases.flatMap(c => c.sectors));
  return { sectors: SECTORS.filter(s => used.has(s.id)), cases: cases.filter(c => c.thumb), settings: data.settings || {} };
}

async function load(){
  const r = await fetch(API + '?query=' + encodeURIComponent(QUERY));
  if(!r.ok) throw new Error('Sanity answered ' + r.status);
  return shape((await r.json()).result || {});
}

module.exports = async (req, res) => {
  setApiHeaders(res);
  if(req.method !== 'GET' && req.method !== 'HEAD'){
    res.setHeader('Allow', 'GET, HEAD');
    return sendError(res, 405, 'method_not_allowed', 'Method not allowed.', 'Use GET.');
  }
  try{
    const body = await load();
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=600');
    return res.status(200).json(body);
  }catch(e){
    return sendError(res, 502, 'cms_unavailable', 'The content could not be loaded.', 'Try again in a moment.');
  }
};
module.exports.load = load;
module.exports.shape = shape;
module.exports.SECTORS = SECTORS;
