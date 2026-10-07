/* ============================================================
   JSON 404 for any /api path that is not an endpoint. middleware.js
   rewrites unknown /api/* requests here, so agents get a parseable
   error rather than the HTML 404 page.
   ============================================================ */

const { sendError } = require('./_lib/errors.js');

module.exports = (req, res) => {
  const path = String((req.query && req.query.path) || '').slice(0, 200);
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
  return sendError(res, 404, 'endpoint_not_found',
    'There is no API endpoint at ' + (path || 'this path') + '.',
    'See https://itaiagami.com/openapi.json for the available endpoints: /api/services, /api/projects, /api/projects/{slug}, /api/enquiry and /api/geo.');
};
