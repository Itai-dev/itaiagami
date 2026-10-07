/* ============================================================
   GET /api/stats?days=7|28|90 — the private analytics summary
   behind /stats.html. Vercel serverless function, no npm
   dependencies (global fetch + node:crypto).

   Pulls, in one call:
     - Google Analytics 4, through the GA4 Data API, read-only
     - Microsoft Clarity, through its Data Export API
       (Clarity only serves the last 1-3 days and allows 10 calls
       a day, so its answer is kept for 3 hours)

   The page sends the password in an x-stats-key header; nothing is
   returned without it, and nothing is ever cached publicly.

   Env vars (Vercel → Settings → Environment Variables):
     STATS_PASSWORD     the password the page asks for (required)
     GA_PROPERTY_ID     GA4 → Admin → Property details → Property ID
                        (the number, not the G-… measurement ID)
     GA_CREDENTIALS     the whole JSON key of a Google Cloud service
                        account, pasted as-is; add that account's
                        email to the GA4 property as a Viewer
     CLARITY_TOKEN      Clarity → Settings → Data Export → API token
   See docs/stats.md for the step by step.
   ============================================================ */

const crypto = require('node:crypto');
const { sendError } = require('./_lib/errors.js');

const FUNNEL = ['contact_view', 'contact_form_start', 'contact_form_submit', 'book_call_click', 'portfolio_cta_click', 'project_view'];
const GA_TTL = 10 * 60 * 1000, CLARITY_TTL = 3 * 60 * 60 * 1000;
const cache = new Map();
let token = null;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return sendError(res, 405, 'method_not_allowed', 'Method not allowed.', 'Use GET.'); }

  const pass = process.env.STATS_PASSWORD;
  if (!pass) return sendError(res, 503, 'not_configured', 'STATS_PASSWORD is not set.', 'This private endpoint is not configured on this deployment.');
  if (!same(String(req.headers['x-stats-key'] || ''), pass)) {
    await new Promise((r) => setTimeout(r, 600));
    return sendError(res, 401, 'unauthorized', 'Wrong password.', 'This is the site owner\'s private analytics endpoint; it is not part of the public API.');
  }

  const days = [7, 28, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 28;
  const [ga, clarity] = await Promise.all([
    cached('ga:' + days, GA_TTL, () => gaSummary(days)),
    cached('clarity', CLARITY_TTL, clarityInsights),
  ]);
  return res.status(200).json({ days, generated: new Date().toISOString(), ga, clarity });
};

/* ---------- helpers ---------- */

function same(a, b) {
  const x = crypto.createHash('sha256').update(a).digest(), y = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(x, y);
}

/** Runs fn at most once per ttl; errors are returned as { error } and not cached. */
async function cached(key, ttl, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.value;
  try {
    const value = await fn();
    if (!value.error) cache.set(key, { at: Date.now(), value });
    return value;
  } catch (e) {
    console.error('stats:', key, e.message);
    return { error: e.message };
  }
}

/* ---------- Google Analytics 4 ---------- */

async function gaToken() {
  if (token && token.exp > Date.now() + 60000) return token.value;
  let sa;
  try { sa = JSON.parse(process.env.GA_CREDENTIALS || ''); } catch (e) { throw new Error('GA_CREDENTIALS is missing or not valid JSON.'); }
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const body = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  });
  const sig = crypto.createSign('RSA-SHA256').update(body).sign(sa.private_key, 'base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: body + '.' + sig }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error('Google sign-in failed: ' + (j.error_description || j.error || r.status));
  token = { value: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return token.value;
}

async function gaBatch(requests) {
  const id = String(process.env.GA_PROPERTY_ID || '').replace(/\D/g, '');
  if (!id) throw new Error('GA_PROPERTY_ID is not set.');
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${id}:batchRunReports`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + await gaToken(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('GA4: ' + ((j.error && j.error.message) || r.status));
  return j.reports || [];
}

const rows = (rep) => (rep && rep.rows) || [];
const num = (v) => Number(v && v.value) || 0;

async function gaSummary(days) {
  const cur = { startDate: days + 'daysAgo', endDate: 'today' };
  const prev = { startDate: (2 * days) + 'daysAgo', endDate: (days + 1) + 'daysAgo' };
  const M = ['activeUsers', 'newUsers', 'sessions', 'screenPageViews', 'engagementRate', 'averageSessionDuration'];
  const top = (dim, metric, limit, extra) => Object.assign({
    dateRanges: [cur], dimensions: [{ name: dim }], metrics: [{ name: metric }],
    orderBys: [{ metric: { metricName: metric }, desc: true }], limit,
  }, extra || {});

  const [a, b] = await Promise.all([
    gaBatch([
      { dateRanges: [cur, prev], metrics: M.map((name) => ({ name })) },
      { dateRanges: [cur], dimensions: [{ name: 'date' }], metrics: [{ name: 'activeUsers' }], orderBys: [{ dimension: { dimensionName: 'date' } }], limit: 100 },
      { dateRanges: [cur], dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }], orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 10 },
      top('sessionSource', 'sessions', 8),
      top('eventName', 'eventCount', 10, { dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: FUNNEL } } } }),
    ]),
    gaBatch([
      top('country', 'activeUsers', 8),
      top('deviceCategory', 'activeUsers', 5),
      top('sessionDefaultChannelGroup', 'sessions', 8),
    ]),
  ]);

  // totals: with two date ranges GA adds a dateRange dimension (date_range_0 = current)
  const totals = { current: {}, previous: {} };
  for (const r of rows(a[0])) {
    const which = r.dimensionValues && r.dimensionValues[0] && r.dimensionValues[0].value === 'date_range_1' ? 'previous' : 'current';
    M.forEach((m, i) => { totals[which][m] = num(r.metricValues[i]); });
  }
  const pairs = (rep) => rows(rep).map((r) => ({ name: r.dimensionValues[0].value || '(not set)', value: num(r.metricValues[0]) }));
  const events = Object.fromEntries(FUNNEL.map((e) => [e, 0]));
  for (const p of pairs(a[4])) events[p.name] = p.value;

  return {
    totals,
    daily: rows(a[1]).map((r) => ({ date: r.dimensionValues[0].value, users: num(r.metricValues[0]) })),
    pages: rows(a[2]).map((r) => ({ path: r.dimensionValues[0].value, views: num(r.metricValues[0]), users: num(r.metricValues[1]) })),
    sources: pairs(a[3]),
    channels: pairs(b[2]),
    events,
    countries: pairs(b[0]),
    devices: pairs(b[1]),
  };
}

/* ---------- Microsoft Clarity ---------- */

async function clarityInsights() {
  const t = process.env.CLARITY_TOKEN;
  if (!t) return { error: 'CLARITY_TOKEN is not set.' };
  const r = await fetch('https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=3', {
    headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
  });
  if (r.status === 429) return { error: 'Clarity’s daily limit (10 calls) is used up; it resets tomorrow.' };
  const j = await r.json().catch(() => null);
  if (!r.ok || !Array.isArray(j)) return { error: 'Clarity: ' + r.status };
  // one entry per metric: { metricName, information: [ { ...fields } ] }
  const metrics = {};
  for (const m of j) if (m && m.metricName) metrics[m.metricName] = (m.information && m.information[0]) || {};
  return { days: 3, metrics };
}
