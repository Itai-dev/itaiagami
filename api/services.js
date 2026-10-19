/* ============================================================
   GET /api/v1/services (alias: /api/services) — the three offer sizes,
   the capabilities, and the Launch Sprint's starting price per market.
   Public, read-only, rate limited (policy "read"). Described in /openapi.json
   (operationId listServices).
   ============================================================ */

const { sendError, setApiHeaders } = require('./_lib/errors.js');
const { guardRead } = require('./_lib/ratelimit.js');
const { SITE, SERVICES, CAPABILITIES, PRICING } = require('./_lib/catalog.js');

module.exports = (req, res) => {
  setApiHeaders(res);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Expose-Headers', 'API-Version, RateLimit, RateLimit-Policy, Retry-After');
  if(req.method !== 'GET' && req.method !== 'HEAD'){
    res.setHeader('Allow', 'GET, HEAD');
    return sendError(res, 405, 'method_not_allowed', 'Method not allowed.', 'Use GET.');
  }
  if(!guardRead(req, res)) return;
  /* browser caching only: a shared CDN copy would replay stale RateLimit headers */
  res.setHeader('Cache-Control', 'public, max-age=60');
  return res.status(200).json({
    services: SERVICES,
    capabilities: CAPABILITIES,
    pricing: {
      note: 'The Launch Sprint is a fixed price starting at these amounts, set per market rather than converted. A Full Launch is scoped per project, usually after a Sprint; Creative Director on call is a monthly retainer.',
      startingAt: PRICING
    },
    contact: {
      enquiry: SITE + '/api/v1/enquiry',
      bookCall: 'https://calendar.app.google/qAYhVo928FsVE6PP7',
      email: 'itaiagami@gmail.com'
    }
  });
};
