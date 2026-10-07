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

function sendError(res, status, code, message, hint, extra){
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).json(Object.assign(
    { ok: false, error: message, code, hint: hint || '', status, docs: DOCS },
    extra || {}
  ));
}

module.exports = { sendError, DOCS };
