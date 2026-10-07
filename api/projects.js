/* ============================================================
   GET /api/v1/projects          — every case study (filter: ?category=)
   GET /api/v1/projects/{slug}   — one case study
   (/api/projects... are unversioned aliases of the same thing)
   middleware.js maps the versioned and /{slug} forms onto this file.
   Public, read-only, rate limited (policy "read"). Described in
   /openapi.json (operationIds listProjects and getProject).
   ============================================================ */

const { sendError, setApiHeaders } = require('./_lib/errors.js');
const { guardRead } = require('./_lib/ratelimit.js');
const { projects, CATEGORIES } = require('./_lib/catalog.js');

/* Browser caching only: a shared CDN copy would replay stale RateLimit headers. */
const CACHE = 'public, max-age=60';

module.exports = (req, res) => {
  setApiHeaders(res);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Expose-Headers', 'API-Version, RateLimit, RateLimit-Policy, Retry-After');
  if(req.method !== 'GET' && req.method !== 'HEAD'){
    res.setHeader('Allow', 'GET, HEAD');
    return sendError(res, 405, 'method_not_allowed', 'Method not allowed.', 'Use GET.');
  }
  if(!guardRead(req, res)) return;
  const q = req.query || {};
  const slug = String(q.slug || '').toLowerCase();

  if(slug){
    const p = projects.find(x => x.slug === slug);
    if(!p) return sendError(res, 404, 'project_not_found', 'No case study with the slug "' + slug.slice(0, 80) + '".',
      'List valid slugs with GET /api/v1/projects.');
    res.setHeader('Cache-Control', CACHE);
    return res.status(200).json(p);
  }

  let list = projects;
  const cat = String(q.category || '');
  if(cat){
    const match = CATEGORIES.find(c => c.toLowerCase() === cat.toLowerCase());
    if(!match) return sendError(res, 400, 'invalid_category', 'Unknown category "' + cat.slice(0, 40) + '".',
      'Use one of: ' + CATEGORIES.join(', ') + ', or omit "category".');
    list = projects.filter(p => p.category === match);
  }
  res.setHeader('Cache-Control', CACHE);
  return res.status(200).json({ count: list.length, categories: CATEGORIES, projects: list });
};
