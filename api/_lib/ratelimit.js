/* ============================================================
   Rate limiting and the headers that let agents self-throttle.

   Every /api response carries the IETF RateLimit header fields
   (draft-ietf-httpapi-ratelimit-headers):

     RateLimit-Policy: "read";q=60;w=60     ← the quota: 60 requests per 60 s
     RateLimit:        "read";r=57;t=41     ← 57 left, window resets in 41 s

   plus the widely recognised X-RateLimit-Limit / -Remaining / -Reset
   (Reset in seconds, not a timestamp), and Retry-After on a 429.

   Counting is per client IP and per serverless instance: instances are
   ephemeral and not shared, so this is a courtesy limit that stops a
   runaway loop, not a guarantee. Documented in /developers.html and
   /openapi.json — change a quota here and the docs follow from POLICIES.
   ============================================================ */

const crypto = require('node:crypto');
const { sendError } = require('./errors.js');

const POLICIES = {
  read:    { name: 'read',    quota: 60, window: 60 },     /* GET endpoints */
  enquiry: { name: 'enquiry', quota: 5,  window: 600 }     /* accepted enquiries only */
};

const hits = new Map();          /* "policy|ip" → timestamps (ms) */

/* Keyed on a hash of the client IP, held in memory for at most one window
   and never logged, so the raw address is not kept (see privacy.html). */
const clientIp = req => {
  const ip = (String((req.headers && req.headers['x-forwarded-for']) || '').split(',')[0].trim()) || 'unknown';
  return crypto.createHash('sha256').update(ip).digest('base64url').slice(0, 22);
};

function recent(policy, ip, now){
  const key = policy.name + '|' + ip, ms = policy.window * 1000;
  if(hits.size > 1000) for(const [k, v] of hits) if(!v.some(t => now - t < ms)) hits.delete(k);
  const list = (hits.get(key) || []).filter(t => now - t < ms);
  hits.set(key, list);
  return list;
}

/** Current standing without counting a request. */
function status(policy, ip, now = Date.now()){
  const list = recent(policy, ip, now);
  const remaining = Math.max(0, policy.quota - list.length);
  const reset = list.length ? Math.max(1, Math.ceil((list[0] + policy.window * 1000 - now) / 1000)) : policy.window;
  return { policy, remaining, reset, limited: list.length >= policy.quota };
}

/** Count one request against the policy. */
function record(policy, ip, now = Date.now()){
  recent(policy, ip, now).push(now);
}

function setHeaders(res, s){
  const p = s.policy;
  res.setHeader('RateLimit-Policy', '"' + p.name + '";q=' + p.quota + ';w=' + p.window);
  res.setHeader('RateLimit', '"' + p.name + '";r=' + s.remaining + ';t=' + s.reset);
  res.setHeader('X-RateLimit-Limit', String(p.quota));
  res.setHeader('X-RateLimit-Remaining', String(s.remaining));
  res.setHeader('X-RateLimit-Reset', String(s.reset));
}

function tooMany(res, s, message, hint){
  setHeaders(res, s);
  res.setHeader('Retry-After', String(s.reset));
  return sendError(res, 429, 'rate_limited', message, hint, { retryAfter: s.reset });
}

/* For read endpoints: count the request, set the headers, and answer
   429 when the quota is spent. Returns true when the request may go on. */
function guardRead(req, res){
  const ip = clientIp(req), p = POLICIES.read;
  const before = status(p, ip);
  if(before.limited){
    tooMany(res, before, 'Too many requests.', 'Wait ' + before.reset + ' seconds (see Retry-After), then retry. The read quota is ' + p.quota + ' requests per ' + p.window + ' seconds.');
    return false;
  }
  record(p, ip);
  setHeaders(res, status(p, ip));
  return true;
}

module.exports = { POLICIES, clientIp, status, record, setHeaders, tooMany, guardRead, _hits: hits };
