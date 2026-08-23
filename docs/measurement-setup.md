# Measurement & discoverability setup

Internal document. Not deployed — `docs` and `*.md` are both in `.vercelignore`.

This lists only the steps that **cannot** be done from the repository. Everything
that could be shipped in code already has been (see `docs/CHANGELOG-positioning.md`).

---

## What analytics already exists

| Thing | Status |
| --- | --- |
| Vercel Web Analytics | **Already installed** — loaded in `js/site.js`, first block, via `/_vercel/insights/script.js`. Cookieless. Left untouched. |
| GA4 | **Not installed.** No GA4 or GTM tag exists anywhere in the repo. |
| Enquiry form | `POST /api/enquiry` → Resend → inbox. No analytics event is fired on submit. |

No measurement IDs have been invented. If GA4 is wanted, it has to be created in
the Google account first and the real ID pasted in — see *Optional: GA4* below.

## What the enquiry email now carries

`api/enquiry.js` emails these rows. The last five appear only when they have a value:

- Name, Email, Organisation, Project type, Budget, Timeline
- **Found via** — the visitor's own answer to "How did you find me?" (ChatGPT / Gemini / Google Search / LinkedIn / Referral / Other)
- `utm_source`, `utm_medium`, `utm_campaign`
- **Landing page** — the first page of the visit
- **Referrer** — the external referring URL (internal referrers are dropped)

The last five are captured by `js/site.js` on the first page of a session
(`sessionStorage`, key `ia-attr`, first touch wins) and carried in hidden fields
on the contact form. Nothing is stored beyond the tab session and nothing leaves
the browser unless the form is sent.

The self-reported "Found via" answer is the more reliable of the two. Referrers
from AI assistants are inconsistent: ChatGPT usually sends `chatgpt.com`, but
answers rendered inside an app, or links copied out of a chat, arrive with no
referrer at all. Treat the referrer as a lower bound.

---

## Manual steps

### 1. Google Search Console

1. Go to <https://search.google.com/search-console> and add a **Domain property** for `itaiagami.com` (domain, not URL-prefix — it covers `www`, non-`www` and both protocols in one).
2. Verify by DNS TXT record. The domain's DNS is managed wherever `itaiagami.com` is registered/pointed for Vercel — add the TXT record there.
3. Submit the sitemap: **Indexing → Sitemaps → Add a new sitemap →** `sitemap.xml`.
4. Under **Indexing → Pages**, confirm the four new `/services/…` pages and `/services.html` get indexed. Use **URL Inspection → Request indexing** on `/services.html` to speed up the first crawl.
5. Once the `www` redirect is live (below), check **Pages → Alternate page with proper canonical** shrinks rather than grows.

### 2. Confirm the www → apex redirect actually took effect

At the time of writing, `https://www.itaiagami.com/` returned **200**, serving a
full duplicate of the site instead of redirecting. A redirect rule is now in
`vercel.json`, but **Vercel's own domain settings can also handle this and are
worth checking**:

1. Vercel → project → **Settings → Domains**.
2. If both `itaiagami.com` and `www.itaiagami.com` are listed as separate served domains, set `www.itaiagami.com` to **Redirect to `itaiagami.com`**, status **308 Permanent**.
3. After deploying, verify:
   ```bash
   curl -sSI https://www.itaiagami.com/work.html | head -3
   ```
   Expect `HTTP/1.1 308` (or 301) and a `location:` of `https://itaiagami.com/work.html`.
4. Also verify `https://itaiagami.com/index.html` now redirects to `/`.

If the dashboard redirect is configured, the `vercel.json` rule is harmless
belt-and-braces. If it is not, the `vercel.json` rule is what does the job.

### 3. Bing / Microsoft (feeds Copilot)

Add the site at <https://www.bing.com/webmasters>, import from Search Console,
and submit the same sitemap.

### 4. Optional: GA4

Only if you want session-level reporting beyond Vercel Analytics.

1. Create a GA4 property, get the real `G-XXXXXXXXXX` measurement ID.
2. Add the gtag snippet to `js/site.js` (top of file, beside the Vercel block) so every page gets it — do not paste it into 25 HTML files.
3. Fire a conversion event on a successful enquiry. In `js/site.js`, inside the
   form handler where `r.ok && j.ok` is true, add:
   ```js
   if (window.gtag) gtag('event', 'enquiry_submitted', {
     budget: data.budget || '', source: data.source || ''
   });
   ```
4. Mark `enquiry_submitted` as a **key event** in GA4 → Admin → Events.
5. In GA4, `utm_source=chatgpt.com` shows up under **Reports → Acquisition →
   Traffic acquisition → Session source/medium**. To see it without campaign
   tags, add a comparison on **Session source** containing `chatgpt`.

### 5. Tracking `utm_source=chatgpt.com`

Nothing to build — this arrives on its own when ChatGPT links out with the
parameter attached. What to do:

- In Vercel Analytics, filter by **Referrer** for `chatgpt.com`, `perplexity.ai`, `gemini.google.com`, `google.com` (AI Overviews are not separable from ordinary Google traffic).
- Cross-read against the **Found via** answer on enquiries. When the two disagree, believe the human.
- Do **not** put UTM parameters on your own site's internal links — it resets the session and corrupts attribution.

### 6. Recommendation queries worth re-running monthly

Run these in ChatGPT, Gemini and Google, logged out, and record whether the site
is cited. Keep the list stable so the readings are comparable month to month.

- independent creative director Tel Aviv
- freelance creative director for a product launch, Israel
- creative director for a museum interactive exhibition
- who can lead a brand identity system for a TV network
- fractional creative director for a tech company
- creative director for an Apple Vision Pro launch
- מנהל קריאייטיב עצמאי תל אביב

Log: date, query, engine, cited yes/no, which page was cited. A plain
spreadsheet is enough. Movement over three months is the signal; a single
reading is noise.

### 7. Lead-quality review

Once a month, over the enquiries received:

- How many named a budget band at or above ₪30,000?
- How many were isolated production requests (single logo, single animation)? If this share is not falling, the qualification copy needs to be firmer, not louder.
- Which **Found via** answers produced the best-fit projects?
- Which landing page did the good ones arrive on? If `/services/…` pages dominate, expand them. If case studies dominate, the Work index is doing the selling and the services pages need better internal links into them.

---

## Testing the contact form without sending a fake lead

The API validates before it sends, so a deliberately invalid submission
exercises the whole path without producing an email:

```bash
curl -s -X POST https://itaiagami.com/api/enquiry -H 'Content-Type: application/json' -d '{"name":"","email":"x","project":"short"}'
```

Expect `400` with `{"ok":false,"error":"Please add your name."}` — which proves
the function is deployed and reachable.

To test a real send end to end, submit the form once with your own name and
`[test]` in the message, then delete the email. Budget values must match the
`<option>` text in `contact.html` exactly — including the `₪` sign and the en
dashes — or the API returns *Invalid budget value*.
