/* ============================================================
   POST /api/enquiry — project enquiry form → email
   Vercel serverless function. No npm dependencies (uses global
   fetch), so nothing needs installing at build time.

   Required env var (set in Vercel → Settings → Environment Variables):
     RESEND_API_KEY   from resend.com
   Optional:
     ENQUIRY_TO       defaults to itaiagami@gmail.com
     ENQUIRY_FROM     defaults to enquiries@itaiagami.com
                      (must be on a domain verified in Resend)
   ============================================================ */

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
   honeypot below does the heavier lifting against bots. */
const seen = new Map();
const WINDOW = 10 * 60 * 1000, MAX = 5;
function throttled(ip){
  const now = Date.now();
  const hits = (seen.get(ip) || []).filter(t => now - t < WINDOW);
  hits.push(now);
  seen.set(ip, hits);
  if(seen.size > 500) for(const [k,v] of seen) if(!v.some(t => now - t < WINDOW)) seen.delete(k);
  return hits.length > MAX;
}

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

  /* Attribution — filled by the page, never typed, so it is reported rather
     than validated. Kept short so a crafted request cannot bloat the email. */
  const attribution = {
    'utm_source':   clean(body.utm_source, 120),
    'utm_medium':   clean(body.utm_medium, 120),
    'utm_campaign': clean(body.utm_campaign, 160),
    'Landing page': clean(body.landing_page, 300),
    'Referrer':     clean(body.referrer, 300)
  };

  if(!name)                          return res.status(400).json({ ok:false, error:'Please add your name.' });
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
                                     return res.status(400).json({ ok:false, error:'That email address does not look right.' });
  if(project.length < 10)            return res.status(400).json({ ok:false, error:'Please say a little more about the project.' });
  if(budget   && !BUDGETS.includes(budget))     return res.status(400).json({ ok:false, error:'Invalid budget value.' });
  if(timeline && !TIMELINES.includes(timeline)) return res.status(400).json({ ok:false, error:'Invalid timeline value.' });
  if(source   && !SOURCES.includes(source))     return res.status(400).json({ ok:false, error:'Invalid source value.' });

  /* `fallback:true` tells the page to hand the finished message to the visitor's
     own mail client instead of dropping it — so the form still works before the
     mail service is configured, and if it ever goes down afterwards. */
  const key = process.env.RESEND_API_KEY;
  if(!key){
    console.error('enquiry: RESEND_API_KEY is not set — sending client to mailto fallback');
    return res.status(503).json({ ok:false, fallback:true, error:'Direct sending is not switched on yet.' });
  }

  const rows = [
    ['Name', name], ['Email', email], ['Organisation', org || '—'],
    ['Project type', type || '—'],
    ['Budget', budget || '—'], ['Timeline', timeline || '—'],
    ['Found via', source || '—']
  ].concat(Object.entries(attribution).filter(([, v]) => v));   /* only what is actually known */

  const text = rows.map(([k,v]) => k + ': ' + v).join('\n') + '\n\nProject:\n' + project;
  const html =
    '<div style="font:15px/1.6 -apple-system,Segoe UI,sans-serif;color:#111">'
    + '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px">'
    + rows.map(([k,v]) =>
        '<tr><td style="padding:4px 18px 4px 0;color:#777;white-space:nowrap">' + esc(k) + '</td>'
      + '<td style="padding:4px 0"><strong>' + esc(v) + '</strong></td></tr>').join('')
    + '</table>'
    + '<div style="padding:16px 18px;background:#f6f6f6;border-radius:6px;white-space:pre-wrap">'
    + esc(project) + '</div></div>';

  try{
    const r = await fetch('https://api.resend.com/emails', {
      method:'POST',
      headers:{ Authorization:'Bearer ' + key, 'Content-Type':'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: email,            /* replying in your inbox goes straight to them */
        subject: 'New enquiry — ' + name + (org ? ' · ' + org : ''),
        text, html
      })
    });
    if(!r.ok){
      console.error('enquiry: resend responded', r.status, await r.text().catch(()=> ''));
      return res.status(502).json({ ok:false, fallback:true, error:'Could not send just now.' });
    }
  }catch(err){
    console.error('enquiry: send failed', err);
    return res.status(502).json({ ok:false, error:'Could not send just now.' });
  }

  return res.status(200).json({ ok:true });
};
