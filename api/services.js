/* ============================================================
   GET /api/services — the four engagement types and where pricing
   starts in each market. Public, read-only, cacheable.
   Described in /openapi.json (operationId listServices).
   ============================================================ */

const { sendError } = require('./_lib/errors.js');
const { SITE, SERVICES, PRICING } = require('./_lib/catalog.js');

module.exports = (req, res) => {
  if(req.method !== 'GET' && req.method !== 'HEAD'){
    res.setHeader('Allow', 'GET, HEAD');
    return sendError(res, 405, 'method_not_allowed', 'Method not allowed.', 'Use GET.');
  }
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).json({
    services: SERVICES,
    pricing: {
      note: 'Independent engagements typically begin at these amounts. Larger multidisciplinary projects are scoped separately.',
      startingAt: PRICING
    },
    contact: {
      enquiry: SITE + '/api/enquiry',
      bookCall: 'https://calendar.app.google/qAYhVo928FsVE6PP7',
      email: 'itaiagami@gmail.com'
    }
  });
};
