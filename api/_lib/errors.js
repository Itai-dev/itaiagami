/* ============================================================
   One JSON error shape for every /api endpoint, so an agent can
   branch on `code` and act on `hint` instead of parsing prose:

     { "ok": false,
       "error": "That email address does not look right.",   ← human message
       "code":  "invalid_email",                              ← stable, machine-readable
       "hint":  "Send a full address such as name@company.com.",
       "status": 400,
       "docs":  "https://itaiagami.com/openapi.json" }

   `error` stays a plain string because js/site.js shows it to visitors.
   The shape is published as the Error schema in /openapi.json.
   ============================================================ */

const DOCS = 'https://itaiagami.com/openapi.json';

/* The API's major version. Every response says which version answered it;
   /api/v1/... is the stable versioned path and the unversioned /api/...
   paths are aliases of it. The versioning and deprecation policy is in
   /developers.html and the info.description of /openapi.json. */
const API_VERSION = '1';
const setApiHeaders = res => res.setHeader('API-Version', API_VERSION);

function sendError(res, status, code, message, hint, extra){
  setApiHeaders(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).json(Object.assign(
    { ok: false, error: message, code, hint: hint || '', status, docs: DOCS },
    extra || {}
  ));
}

module.exports = { sendError, setApiHeaders, API_VERSION, DOCS };
