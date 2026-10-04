/* ============================================================
   POST /api/enquiry — project enquiry form → backup store → email
   Vercel serverless function. No npm dependencies (uses global
   fetch), so nothing needs installing at build time.

   Order of work for every valid enquiry:
     1. backup copy  — POSTed to LEAD_WEBHOOK_URL (a Google Sheet via
                       Apps Script — see docs/lead-backup.md), if set
     2. notification — emailed to ENQUIRY_TO through Resend
     3. confirmation — a short receipt to the visitor (best effort)
   The visitor is told "received" only if step 1 OR step 2 succeeded.
   If both fail the page gets fallback:true and offers retry + email.

   Env vars (Vercel → Settings → Environment Variables):
     RESEND_API_KEY       from resend.com — needed for steps 2 and 3
     LEAD_WEBHOOK_URL     optional backup store (Apps Script web app URL)
     LEAD_WEBHOOK_SECRET  optional shared secret the Apps Script checks
     ENQUIRY_TO           defaults to itaiagami@gmail.com
     ENQUIRY_FROM         defaults to enquiries@itaiagami.com
                          (must be on a domain verified in Resend)
     ENQUIRY_CONFIRM      set to "off" to stop the visitor receipt
   ============================================================ */

/* BOOKING_URL is shared with the page — one place to paste it */
let CONTACT = { BOOKING_URL:'', bookingEnabled: () => false };
try{ CONTACT = require('../js/contact-config.js'); }catch(e){ console.error('enquiry: contact-config not found', e.message); }

const TO   = process.env.ENQUIRY_TO   || 'itaiagami@gmail.com';
const FROM = process.env.ENQUIRY_FROM || 'Itai Agami <enquiries@itaiagami.com>';

/* Must match the <option> text in contact.html exactly — including the en
   dashes — or a genuine submission is rejected as invalid.

   The budget options are rewritten client-side for the visitor's market, so
   every currency's bands have to be accepted here. This table mirrors MARKETS
   in js/site.js — change a number in one and change it in the other. */
const BUDGETS   = [
  '₪30,000 – ₪60,000', '₪60,000 – ₪120,000', '₪120,000+',
  '$10,000 – $20,000', '$20,000 – $40,000', '$40,000+',
  '€10,000 – €20,000', '€20,000 – €40,000', '€40,000+',
  '£8,000 – £16,000',  '£16,000 – £32,000',  '£32,000+',
  'Not sure yet'
];
const TIMELINES = ['As soon as possible','1–3 months','3–6 months','Not defined yet'];
const SOURCES   = ['ChatGPT','Gemini','Google Search','LinkedIn','Referral','Other'];

/* Best-effort throttle. Serverless instances are ephemeral and not shared,
   so this stops a burst from one source, not a distributed flood. The
   honeypot below does the heavier lifting against bots.
   Only ACCEPTED enquiries count, so someone retrying after a validation
   error or a delivery failure can never lock themselves out. */
const seen = new Map();
const WINDOW = 10 * 60 * 1000, MAX = 5;
function recent(ip){
  const now = Date.now();
  if(seen.size > 500) for(const [k,v] of seen) if(!v.some(t => now - t < WINDOW)) seen.delete(k);
  return (seen.get(ip) || []).filter(t => now - t < WINDOW);
}
const throttled = ip => recent(ip).length >= MAX;
const countHit  = ip => seen.set(ip, recent(ip).concat(Date.now()));

const clean = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

module.exports = async (req, res) => {
  if(req.method !== 'POST'){
    res.setHeader('Allow','POST');
    return res.status(405).json({ ok:false, error:'Method not allowed.' });
  }

  let body = req.body;
  if(typeof body === 'string'){ try{ body = JSON.parse(body || '{}'); }catch{ body = {}; } }
  body = body || {};

  /* honeypot — a real person never sees this field, so anything in it is a bot.
     Answer 200 so the bot believes it succeeded and does not retry. */
  if(clean(body.website, 200)) return res.status(200).json({ ok:true });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if(throttled(ip)) return res.status(429).json({ ok:false, error:'Too many messages just now — please try again shortly.' });

  const name     = clean(body.name, 120);
  const email    = clean(body.email, 200);
  const org      = clean(body.org, 160);
  const type     = clean(body.type, 80);
  const project  = clean(body.project, 5000);
  const budget   = clean(body.budget, 40);
  const timeline = clean(body.timeline, 40);
  const source   = clean(body.source, 40);


  if(!name)                          return res.status(400).json({ ok:false, error:'Please add your name.' });
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
                                     return res.status(400).json({ ok:false, error:'That email address does not look right.' });
  if(project.length < 10)            return res.status(400).json({ ok:false, error:'Please say a little more about the project.' });
  if(budget   && !BUDGETS.includes(budget))     return res.status(400).json({ ok:false, error:'Invalid budget value.' });
  if(timeline && !TIMELINES.includes(timeline)) return res.status(400).json({ ok:false, error:'Invalid timeline value.' });
  if(source   && !SOURCES.includes(source))     return res.status(400).json({ ok:false, error:'Invalid source value.' });

  /* Attribution — filled by the page, never typed, so it is reported rather
     than validated. Kept short so a crafted request cannot bloat the email. */
  const lead = {
    timestamp:    new Date().toISOString(),
    name, email, org, type, budget, timeline, project,
    found_via:    source,
    lead_source:  clean(body.lead_source, 120),
    referrer:     clean(body.referrer, 300),
    utm_source:   clean(body.utm_source, 120),
    utm_medium:   clean(body.utm_medium, 120),
    utm_campaign: clean(body.utm_campaign, 160),
    utm_content:  clean(body.utm_content, 160),
    utm_term:     clean(body.utm_term, 160),
    landing_page: clean(body.landing_page, 300),
    pages_viewed: clean(body.pages_viewed, 800)
  };

  /* 1 — backup copy first, so a mail outage cannot lose the lead */
  const stored = await storeLead(lead);

  /* 2 — the notification email */
  const emailed = await notify(lead);

  if(!stored && !emailed){
    /* Nothing holds this lead. Log it so it can still be recovered from the
       Vercel runtime logs (short retention), and tell the page to keep the
       visitor's answers on screen and offer retry / email. */
    console.error('enquiry: NOT DELIVERED — lead follows', JSON.stringify(lead));
    return res.status(502).json({ ok:false, fallback:true, error:'Could not send just now.' });
  }
  countHit(ip);
  if(!emailed) console.error('enquiry: email failed but lead is stored in the backup sheet', lead.timestamp);
  if(!stored && process.env.LEAD_WEBHOOK_URL) console.error('enquiry: backup store failed but email was sent', lead.timestamp);

  /* 3 — receipt to the visitor; never affects the answer the page gets */
  await confirm(lead).catch(err => console.error('enquiry: confirmation failed', err && err.message));

  return res.status(200).json({ ok:true });
};

/* ---------- helpers ---------- */

function withTimeout(url, opts, ms){
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  return fetch(url, Object.assign({}, opts, { signal:ctl.signal })).finally(() => clearTimeout(t));
}

async function storeLead(lead){
  const url = process.env.LEAD_WEBHOOK_URL;
  if(!url) return false;
  try{
    const r = await withTimeout(url, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(Object.assign({ secret: process.env.LEAD_WEBHOOK_SECRET || '' }, lead)),
      redirect:'follow'                                /* Apps Script answers through a redirect */
    }, 6000);
    const text = await r.text().catch(() => '');
    if(r.ok && /"ok"\s*:\s*true/.test(text)) return true;
    console.error('enquiry: backup store responded', r.status, text.slice(0, 200));
  }catch(err){
    console.error('enquiry: backup store failed', err && err.message);
  }
  return false;
}

async function sendMail(payload, ms){
  const key = process.env.RESEND_API_KEY;
  if(!key) return false;
  const r = await withTimeout('https://api.resend.com/emails', {
    method:'POST',
    headers:{ Authorization:'Bearer ' + key, 'Content-Type':'application/json' },
    body: JSON.stringify(Object.assign({ from: FROM }, payload))
  }, ms);
  if(!r.ok){ console.error('enquiry: resend responded', r.status, await r.text().catch(() => '')); return false; }
  return true;
}

async function notify(l){
  if(!process.env.RESEND_API_KEY){ console.error('enquiry: RESEND_API_KEY is not set'); return false; }
  const enquiry = [
    ['Name', l.name], ['Email', l.email], ['Organisation', l.org || '—'],
    ['Project type', l.type || '—'], ['Budget', l.budget || '—'], ['Timeline', l.timeline || '—']
  ];
  const origin = [
    ['Source', l.lead_source || '—'],
    ['Found via (their answer)', l.found_via || '—'],
    ['Referrer', l.referrer || '—'],
    ['UTM source', l.utm_source || '—'],
    ['UTM medium', l.utm_medium || '—'],
    ['UTM campaign', l.utm_campaign || '—']
  ].concat(l.utm_content ? [['UTM content', l.utm_content]] : [])
   .concat(l.utm_term    ? [['UTM term', l.utm_term]]       : [])
   .concat([['Landing page', l.landing_page || '—']])
   .concat(l.pages_viewed ? [['Pages viewed', l.pages_viewed]] : []);

  const txt = rows => rows.map(([k, v]) => k + ': ' + v).join('\n');
  const text = txt(enquiry) + '\n\nMessage:\n' + l.project + '\n\n— Where they came from —\n' + txt(origin);

  const table = rows =>
    '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px">'
    + rows.map(([k, v]) =>
        '<tr><td style="padding:4px 18px 4px 0;color:#777;white-space:nowrap;vertical-align:top">' + esc(k) + '</td>'
      + '<td style="padding:4px 0"><strong>' + esc(v) + '</strong></td></tr>').join('')
    + '</table>';
  const html =
    '<div style="font:15px/1.6 -apple-system,Segoe UI,sans-serif;color:#111;max-width:640px">'
    + table(enquiry)
    + '<div style="padding:16px 18px;background:#f6f6f6;border-radius:6px;white-space:pre-wrap;margin-bottom:28px">'
    + esc(l.project) + '</div>'
    + '<div style="font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#999;margin-bottom:8px">Where they came from</div>'
    + table(origin) + '</div>';

  try{
    return await sendMail({
      to: [TO],
      reply_to: l.email,                         /* replying in your inbox goes straight to them */
      subject: 'New enquiry - ' + l.name + (l.type ? ' - ' + l.type : ''),
      text, html
    }, 7000);
  }catch(err){
    console.error('enquiry: send failed', err && err.message);
    return false;
  }
}

/* A short receipt. Deliberately carries none of what they typed except a
   cleaned first name, so the form cannot be used to send arbitrary text to
   arbitrary addresses. */
async function confirm(l){
  if(!process.env.RESEND_API_KEY || process.env.ENQUIRY_CONFIRM === 'off') return;
  const first = (l.name.split(/\s+/)[0] || '').replace(/[^\p{L}'-]/gu, '').slice(0, 30);
  const hi = 'Hi ' + (first || 'there') + ',';
  const booking = CONTACT.bookingEnabled() ? CONTACT.BOOKING_URL : '';
  const text = hi + '\n\nThanks for reaching out. I received your enquiry and will get back to you shortly.'
    + (booking ? '\n\nIf you prefer, you can also book a short intro call here:\n' + booking : '')
    + '\n\nItai';
  const html = '<div style="font:15px/1.6 -apple-system,Segoe UI,sans-serif;color:#111;max-width:560px">'
    + '<p>' + esc(hi) + '</p>'
    + '<p>Thanks for reaching out. I received your enquiry and will get back to you shortly.</p>'
    + (booking ? '<p>If you prefer, you can also <a href="' + esc(booking) + '" style="color:#111">book a short intro call here</a>.</p>' : '')
    + '<p>Itai</p></div>';
  await sendMail({ to:[l.email], reply_to: TO, subject:'Thanks — I received your enquiry', text, html }, 5000);
}
