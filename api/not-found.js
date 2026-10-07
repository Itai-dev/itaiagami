/* ============================================================
   JSON 404 for any /api path that is not an endpoint. middleware.js
   rewrites unknown /api/* requests here, so agents get a parseable
   error rather than the HTML 404 page. An unknown version
   (/api/v2/...) gets its own code so a client can tell the difference.
   ============================================================ */

const { sendError, API_VERSION } = require('./_lib/errors.js');

const ENDPOINTS = '/api/v1/services, /api/v1/projects, /api/v1/projects/{slug}, /api/v1/enquiry and /api/v1/geo';

module.exports = (req, res) => {
  const path = String((req.query && req.query.path) || '').slice(0, 200);
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
  const v = /^\/api\/v(\d+)(\/|$)/.exec(path);
  if(v && v[1] !== API_VERSION)
    return sendError(res, 404, 'unsupported_api_version',
      'API version ' + v[1] + ' does not exist.',
      'The current version is v' + API_VERSION + ': use ' + ENDPOINTS + '. See https://itaiagami.com/developers.html#versioning.');
  return sendError(res, 404, 'endpoint_not_found',
    'There is no API endpoint at ' + (path || 'this path') + '.',
    'See https://itaiagami.com/openapi.json for the available endpoints: ' + ENDPOINTS + '.');
};
