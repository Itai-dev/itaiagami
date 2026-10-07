/* ============================================================
   GET /api/projects            — every case study (filter: ?category=)
   GET /api/projects/{slug}     — one case study
   The /{slug} form is rewritten to ?slug= by middleware.js.
   Public, read-only, cacheable. Described in /openapi.json
   (operationIds listProjects and getProject).
   ============================================================ */

const { sendError } = require('./_lib/errors.js');
const { projects, CATEGORIES } = require('./_lib/catalog.js');

module.exports = (req, res) => {
  if(req.method !== 'GET' && req.method !== 'HEAD'){
    res.setHeader('Allow', 'GET, HEAD');
    return sendError(res, 405, 'method_not_allowed', 'Method not allowed.', 'Use GET.');
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  const q = req.query || {};
  const slug = String(q.slug || '').toLowerCase();

  if(slug){
    const p = projects.find(x => x.slug === slug);
    if(!p) return sendError(res, 404, 'project_not_found', 'No case study with the slug "' + slug.slice(0, 80) + '".',
      'List valid slugs with GET /api/projects.');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
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
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
  return res.status(200).json({ count: list.length, categories: CATEGORIES, projects: list });
};
