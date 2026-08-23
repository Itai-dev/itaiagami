/* ============================================================
   GET /api/geo — the visitor's country, for regional pricing.

   Vercel already puts the geo-IP result on the request, so there is no
   third-party lookup, no API key and no rate limit. The IP itself is never
   read, stored or logged — only the two-letter country code is returned.

   Consumed by the engagement-floor block in js/site.js.
   ============================================================ */

module.exports = (req, res) => {
  if(req.method !== 'GET' && req.method !== 'HEAD'){
    res.setHeader('Allow','GET');
    return res.status(405).json({ error:'Method not allowed.' });
  }

  const raw = String(req.headers['x-vercel-ip-country'] || '').toUpperCase();
  const country = /^[A-Z]{2}$/.test(raw) ? raw : '';

  /* The answer differs per visitor, so it must never be cached and shared —
     by the CDN or by anything in between. */
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('Vary','x-vercel-ip-country');

  return res.status(200).json({ country });
};
