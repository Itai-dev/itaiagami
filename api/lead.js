/* ============================================================
   POST /api/lead — the /nadlan questionnaire → Sanity → email (→ sheet)

   Every valid lead goes to:
     1. Sanity      — a "lead" document, listed under Leads in the Studio.
                      Needs SANITY_WRITE_TOKEN. The document id starts
                      "leads." so the public dataset never serves it.
     2. notification — emailed to ENQUIRY_TO through Resend, with the brief
     3. backup copy  — the Google Sheet (LEAD_WEBHOOK_URL), if it is set
   The visitor is told "received" only if at least one of them succeeded.

   The brief is rebuilt here from the answers (js/nadlan-config.js), so
   what is stored never depends on what the browser claims it showed.

   Env vars: SANITY_WRITE_TOKEN (a Sanity API token with Editor rights),
   plus the ones api/enquiry.js already uses — RESEND_API_KEY,
   LEAD_WEBHOOK_URL, LEAD_WEBHOOK_SECRET, ENQUIRY_TO, ENQUIRY_FROM.
   ============================================================ */

const NADLAN = require('../js/nadlan-config.js');
const CONTACT = require('../js/contact-config.js');
const { sendError, setApiHeaders } = require('./_lib/errors.js');
const RL = require('./_lib/ratelimit.js');
/* shares the enquiry quota: 5 accepted leads per IP per 10 minutes */
const POLICY = RL.POLICIES.enquiry;

const TO   = process.env.ENQUIRY_TO   || CONTACT.CONTACT_EMAIL;
const FROM = process.env.ENQUIRY_FROM || 'Itai Agami <enquiries@itaiagami.com>';

const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, max);
const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const handler = async (req, res) => {
  setApiHeaders(res);
  const ip = RL.clientIp(req);
  RL.setHeaders(res, RL.status(POLICY, ip));
  if(req.method !== 'POST'){
    res.setHeader('Allow', 'POST');
    return sendError(res, 405, 'method_not_allowed', 'Method not allowed.', 'Send the questionnaire as POST with a JSON body.');
  }

  let body = req.body;
  if(typeof body === 'string'){
    try{ body = JSON.parse(body || '{}'); }
    catch{ return sendError(res, 400, 'invalid_json', 'The request body is not valid JSON.', 'Send Content-Type: application/json and a JSON object.'); }
  }
  if(!body || typeof body !== 'object' || Array.isArray(body)) body = {};

  /* honeypot — a person never sees this field. Answer 200 so a bot does not retry. */
  if(clean(body.website, 200)) return res.status(200).json({ ok: true });

  const dryRun = body.dry_run === true;
  const standing = RL.status(POLICY, ip);
  if(!dryRun && standing.limited)
    return RL.tooMany(res, standing, 'יותר מדי פניות כרגע. נסו שוב בעוד כמה דקות.',
      'Wait ' + standing.reset + ' seconds (see Retry-After) before sending again.');

  const invalid = (code, message, hint) => sendError(res, 400, code, message, hint);

  /* the five answers: each must be one of the options the page offers */
  const answers = {};
  for(const step of NADLAN.STEPS){
    const raw = body[step.id];
    if(step.multi){
      const list = Array.isArray(raw) ? Array.from(new Set(raw.map(v => clean(v, 80)))) : [];
      if(!list.length || list.some(v => !step.options.includes(v)))
        return invalid('invalid_' + step.id, 'חסרה תשובה לשאלה: ' + step.q, 'Set "' + step.id + '" to an array of one or more of: ' + step.options.join(' | '));
      /* "nothing yet" cannot sit beside something that exists */
      answers[step.id] = list.includes(NADLAN.NOTHING) ? [NADLAN.NOTHING] : list;
    }else{
      const v = clean(raw, 80);
      if(!step.options.includes(v))
        return invalid('invalid_' + step.id, 'חסרה תשובה לשאלה: ' + step.q, 'Set "' + step.id + '" to one of: ' + step.options.join(' | '));
      answers[step.id] = v;
    }
  }

  const name    = clean(body.name, 120);
  const company = clean(body.company, 160);
  const phone   = NADLAN.phone(clean(body.phone, 40));
  const email   = clean(body.email, 200);
  const city    = clean(body.city, 80);
  if(name.length < 2)    return invalid('missing_name', 'נא למלא שם מלא.', 'Set "name" to the sender\'s full name.');
  if(company.length < 2) return invalid('missing_company', 'נא למלא את שם החברה.', 'Set "company" to the company name.');
  if(!phone)             return invalid('invalid_phone', 'מספר הטלפון לא תקין.', 'Set "phone" to an Israeli mobile or landline number, e.g. 052-1234567.');
  if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
                         return invalid('invalid_email', 'כתובת האימייל לא תקינה.', 'Set "email" to a full address, or leave it out.');
  if(body.consent !== true) return invalid('missing_consent', 'נדרש אישור ליצירת קשר.', 'Set "consent" to true.');

  if(dryRun) return res.status(200).json({ ok: true, dryRun: true });

  const brief = NADLAN.brief(Object.assign({ city }, answers));
  const lead = {
    timestamp: new Date().toISOString(),
    name, company, phone, email, city,
    project_type: answers.type, units: answers.units, stage: answers.stage,
    has: answers.has.join(', '), start: answers.timeline,
    missing: brief.missing.join(' | '),
    brief: brief.text,
    consent: 'yes',
    /* attribution — filled by the page, so it is recorded, not validated */
    utm_source:   clean(body.utm_source, 120),
    utm_medium:   clean(body.utm_medium, 120),
    utm_campaign: clean(body.utm_campaign, 160),
    utm_content:  clean(body.utm_content, 160),
    utm_term:     clean(body.utm_term, 160),
    fbclid:       clean(body.fbclid, 300),
    gclid:        clean(body.gclid, 300),
    referrer:     clean(body.referrer, 300),
    landing_page: clean(body.landing_page, 300),
    user_agent:   clean(req.headers && req.headers['user-agent'], 300)
  };

  lead.ref = clean(body.ref, 20).replace(/[^\w-]/g, '');
  const [saved, emailed, stored] = await Promise.all([saveToSanity(lead), notify(lead, brief), storeLead(lead)]);

  if(!saved && !emailed && !stored){
    /* nothing holds this lead: keep it in the runtime logs as a last resort */
    console.error('lead: NOT DELIVERED — lead follows', JSON.stringify(lead));
    return sendError(res, 502, 'delivery_failed', 'לא הצלחנו לשלוח כרגע. נסו שוב.', 'Retry in a few minutes.', { fallback: true });
  }
  RL.record(POLICY, ip);
  RL.setHeaders(res, RL.status(POLICY, ip));
  if(!saved && process.env.SANITY_WRITE_TOKEN) console.error('lead: Sanity save failed', lead.timestamp);
  if(!emailed) console.error('lead: email failed', lead.timestamp);
  if(!stored && process.env.LEAD_WEBHOOK_URL) console.error('lead: backup store failed but email was sent', lead.timestamp);

  return res.status(200).json({ ok: true });
};

module.exports = handler;

/* ---------- helpers ---------- */

function withTimeout(url, opts, ms){
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  return fetch(url, Object.assign({}, opts, { signal: ctl.signal })).finally(() => clearTimeout(t));
}

/* The lead as a Sanity document. The id is in the "leads." path: in a
   public dataset a document whose id has a dot is only readable with a
   token, so these never reach the public API the site reads from. */
const SANITY_MUTATE = 'https://c8rr77b1.api.sanity.io/v2024-01-01/data/mutate/production';
async function saveToSanity(l){
  const token = process.env.SANITY_WRITE_TOKEN;
  if(!token){ console.error('lead: SANITY_WRITE_TOKEN is not set'); return false; }
  const doc = {
    _id: 'leads.' + require('node:crypto').randomUUID(),
    _type: 'lead',
    status: 'new',
    receivedAt: l.timestamp,
    source: 'nadlan',
    ref: l.ref,
    name: l.name, company: l.company, phone: l.phone, email: l.email, city: l.city,
    projectType: l.project_type, units: l.units, stage: l.stage,
    has: l.has ? l.has.split(', ') : [], start: l.start,
    missing: l.missing ? l.missing.split(' | ') : [],
    brief: l.brief,
    consent: true,
    attribution: {
      utmSource: l.utm_source, utmMedium: l.utm_medium, utmCampaign: l.utm_campaign,
      utmContent: l.utm_content, utmTerm: l.utm_term, fbclid: l.fbclid, gclid: l.gclid,
      referrer: l.referrer, landingPage: l.landing_page, userAgent: l.user_agent
    }
  };
  try{
    const r = await withTimeout(SANITY_MUTATE, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mutations: [{ create: doc }] })
    }, 6000);
    if(r.ok) return true;
    console.error('lead: Sanity responded', r.status, (await r.text().catch(() => '')).slice(0, 200));
  }catch(err){
    console.error('lead: Sanity save failed', err && err.message);
  }
  return false;
}

/* The sheet's script (docs/lead-backup.md) writes the columns it knows.
   So the lead is also sent under the contact form's column names — the
   brief, with the phone, lands in "project" — and nothing is lost on a
   sheet that has not been given the questionnaire's own columns yet. */
async function storeLead(lead){
  const url = process.env.LEAD_WEBHOOK_URL;
  if(!url) return false;
  const row = Object.assign({
    secret: process.env.LEAD_WEBHOOK_SECRET || '',
    org: lead.company,
    type: lead.project_type,
    budget: '',
    timeline: lead.start,
    project: 'טלפון: ' + lead.phone + (lead.city ? '\nעיר: ' + lead.city : '') + '\n\n' + lead.brief,
    found_via: '',
    lead_source: 'Nadlan questionnaire' + (lead.utm_source ? ' / ' + lead.utm_source : ''),
    pages_viewed: '/nadlan'
  }, lead);
  try{
    const r = await withTimeout(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row), redirect: 'follow'
    }, 6000);
    const text = await r.text().catch(() => '');
    if(r.ok && /"ok"\s*:\s*true/.test(text)) return true;
    console.error('lead: backup store responded', r.status, text.slice(0, 200));
  }catch(err){
    console.error('lead: backup store failed', err && err.message);
  }
  return false;
}

async function notify(l, brief){
  const key = process.env.RESEND_API_KEY;
  if(!key){ console.error('lead: RESEND_API_KEY is not set'); return false; }
  const contact = [['שם', l.name], ['חברה', l.company], ['טלפון', l.phone], ['אימייל', l.email || '—'], ['עיר הפרויקט', l.city || '—']];
  const origin = [['UTM source', l.utm_source], ['UTM medium', l.utm_medium], ['UTM campaign', l.utm_campaign], ['UTM content', l.utm_content],
    ['UTM term', l.utm_term], ['fbclid', l.fbclid], ['gclid', l.gclid], ['Referrer', l.referrer], ['Landing page', l.landing_page], ['User agent', l.user_agent]]
    .filter(r => r[1]);
  const txt = rows => rows.map(([k, v]) => k + ': ' + v).join('\n');
  const text = txt(contact) + '\n\n' + l.brief + (origin.length ? '\n\n— מאיפה הגיעו —\n' + txt(origin) : '');

  const table = rows =>
    '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px">'
    + rows.map(([k, v]) =>
        '<tr><td style="padding:4px 0 4px 18px;color:#777;white-space:nowrap;vertical-align:top">' + esc(k) + '</td>'
      + '<td style="padding:4px 0"><strong>' + esc(NADLAN.show(v)) + '</strong></td></tr>').join('')
    + '</table>';
  const html =
    '<div dir="rtl" style="font:15px/1.6 -apple-system,Segoe UI,Arial,sans-serif;color:#111;max-width:640px;text-align:right">'
    + table(contact) + table(brief.rows)
    + '<div style="padding:16px 18px;background:#f6f6f6;border-radius:6px;margin-bottom:28px"><strong>מה חסר להשקה</strong>'
    + '<ul style="margin:8px 0 0;padding:0 18px 0 0">' + (brief.missing.length ? brief.missing : ['הבסיס קיים']).map(m => '<li>' + esc(m) + '</li>').join('') + '</ul></div>'
    + (origin.length ? '<div dir="ltr" style="text-align:left;font-size:13px;color:#555">' + table(origin) + '</div>' : '')
    + '</div>';

  try{
    const r = await withTimeout('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ from: FROM, to: [TO],
        subject: 'ליד נדל"ן - ' + l.company + ' - ' + l.project_type + (l.ref ? ' - ' + l.ref : ''), text, html },
        l.email ? { reply_to: l.email } : {}))
    }, 7000);
    if(!r.ok){ console.error('lead: resend responded', r.status, await r.text().catch(() => '')); return false; }
    return true;
  }catch(err){
    console.error('lead: send failed', err && err.message);
    return false;
  }
}
