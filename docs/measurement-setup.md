# Measurement & discoverability setup

Internal document. Not deployed — `docs` and `*.md` are both in `.vercelignore`.

This lists only the steps that **cannot** be done from the repository. Everything
that could be shipped in code already has been (see `docs/CHANGELOG-positioning.md`).

---

## What analytics exists

| Thing | Status |
| --- | --- |
| Vercel Web Analytics | Loaded in `js/site.js` (Vercel block). Cookieless, runs without consent. Left untouched. |
| GA4 | In `js/site.js` → *consent + analytics*. Loads **only after "Accept analytics"**. Off until `GA_MEASUREMENT_ID` is set. |
| Microsoft Clarity | Same block. Loads only after consent. Off until `CLARITY_PROJECT_ID` is set. |
| Consent banner | Native, built in `js/site.js`, styled in `css/site.css` (`.consent`). Choice stored in `localStorage` `ia-consent` for 12 months. "Privacy settings" in every footer reopens it. Google Consent Mode v2 (basic): all four signals default `denied`, only `analytics_storage` is granted on accept. |
| Privacy page | `privacy.html`. Lines needing a lawyer are marked `<!-- LAWYER REVIEW -->` in the source. |

### Config — the only lines to edit

Top of `js/site.js`:

```js
const GA_MEASUREMENT_ID   = 'G-XXXXXXXXXX';
const CLARITY_PROJECT_ID  = 'XXXXXXXXXX';
const ANALYTICS_DEBUG     = false;
```

A placeholder value means that tool never loads. Debug can also be switched on
per browser without a deploy: open any page with `?analytics_debug=1`
(`?analytics_debug=0` turns it off). Events are then logged to the console as
`[analytics] event_name {params}` and GA4 receives `debug_mode`, so they appear
in **GA4 → Admin → DebugView**. Form contents are never logged or sent.

### Events

| Event | When | Params |
| --- | --- | --- |
| `page_view` | every page load (GA4 config) | standard |
| `project_view` | any `/work/*.html` page | `project_name`, `page_path`, `page_title` |
| `contact_view` | contact section (`#contact`) scrolls into view | `page_path`, `lead_source` |
| `contact_form_start` | first focus/input in the form, once per page | `form_id`, `page_path` |
| `contact_form_submit` | **only** after `/api/enquiry` returns ok — the key event | `project_type`, `budget`, `timeline`, `self_reported_source`, `lead_source`, `landing_page`, `pages_viewed_count` |
| `contact_form_error` | submission not accepted | `error_type` (validation / rate_limit / server / network / timeout), `http_status` |
| `book_call_click` (+ `book_call_click_from_contact` / `book_call_click_after_submission`) | a "Book a call" link | `booking_context`, `page_path`, `source`, `referrer` (host only), `utm_source`, `utm_medium`, `utm_campaign`, `landing_page` |
| `external_link_click` | email, LinkedIn, Instagram, Behance, Vimeo, other off-site links | `link_type`, `link_domain`, `link_url`, `link_text`, `link_location` |
| `portfolio_cta_click` | any link to `contact.html` from another page | `cta_text`, `cta_location`, `page_path` |

Events fired before the visitor chooses are held for that page and sent only if
they accept. If the server falls back to the visitor's mail app (Resend not
configured or down), `contact_form_submit` does **not** fire — that is not a
confirmed submission. See `docs/lead-backup.md` for the full lead flow.

## What the enquiry email carries

`api/enquiry.js` emails the form plus these rows, each only when it has a value:

- **Found via** — the visitor's own answer to "How did you find me?"
- **Source (detected)** — `ChatGPT`, `Perplexity`, `Gemini`, `Claude`, `Copilot`, `Google`, `Bing`, `LinkedIn`, `Instagram`, `Facebook`, `Behance`, `Campaign: <utm_source>`, `Referral: <host>` or `Direct` (see `classifySource` in `js/site.js`)
- **Landing page**, **Pages viewed** (paths, in order, this session), **Referrer**
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`

First touch is kept in `sessionStorage` (`ia-attr`, first touch wins; page list
in `ia-path`). If the visitor accepted analytics, a non-direct first touch is
also kept 30 days in `localStorage` (`ia-attr-keep`) so a direct return visit
is still credited to the original source; rejecting deletes it. GA4's own
attribution is not touched.

The self-reported "Found via" answer is the more reliable of the two. Referrers
from AI assistants are inconsistent: ChatGPT usually sends `chatgpt.com` (and
adds `utm_source=chatgpt.com`), but answers rendered inside an app, or links
copied out of a chat, arrive with no referrer at all. Treat the referrer as a
lower bound.

---

## Setup checklist (external accounts only)

1. **Create the GA4 property** — <https://analytics.google.com> → Admin → Create → Property → add a **Web** data stream for `https://itaiagami.com`. Leave Enhanced measurement on.
2. **Paste the Measurement ID** (`G-…`, shown on the data stream) into `GA_MEASUREMENT_ID` at the top of `js/site.js`. Deploy.
3. **Create the Clarity project** — <https://clarity.microsoft.com> → New project → `itaiagami.com`.
4. **Paste the Clarity Project ID** (Settings → Overview, ~10 chars) into `CLARITY_PROJECT_ID` at the top of `js/site.js`. Deploy. Skip Clarity's "install tracking code" step — the site already loads it, after consent. (Optional: connect Clarity to GA4 in Clarity → Settings → Setup.)
5. **Search Console** — see *Manual steps → 1* below (Domain property + DNS TXT is recommended). If you prefer the HTML-tag method, paste Google's value into the commented `GOOGLE_SITE_VERIFICATION` meta tag in the `<head>` of `index.html` and uncomment it. Then submit `sitemap.xml` and link Search Console to GA4 (GA4 → Admin → Product links → Search Console).
6. **Key event** — GA4 → Admin → Events (after the first real submission arrives, or create it in advance under Admin → Key events → New key event) → mark **`contact_form_submit`** as a key event. Optionally `contact_form_start` as a secondary signal.
   Also register event-scoped **custom dimensions** (Admin → Custom definitions) for `project_name`, `lead_source`, `landing_page`, `link_type`, `cta_location` so they appear in reports.
7. **Test ChatGPT referral detection** — open a new private window, then `https://itaiagami.com/work/natural-intelligence.html?utm_source=chatgpt.com&analytics_debug=1`. The console shows `lead_source: ChatGPT`. (To test the referrer path alone, click a link to the site from a real chatgpt.com chat.) Accept, go to Contact and send a `[test]` enquiry: the email shows **Source (detected): ChatGPT**, landing page and pages viewed. In GA4, Reports → Acquisition → Traffic acquisition shows `chatgpt.com / referral`.
8. **Test UTM tracking** — private window → `https://itaiagami.com/?utm_source=linkedin&utm_medium=social&utm_campaign=launch_test&utm_content=post1&utm_term=cd&analytics_debug=1`. Browse a few pages, accept, submit a `[test]` enquiry. The email carries all five `utm_*` values; GA4 Realtime / DebugView shows the session under `linkedin / social`, campaign `launch_test`.
9. **Test Accept vs Reject** — private window with `?analytics_debug=1`. *Reject*: console says GA4 and Clarity will not load; events log as "not sent". *Accept*: console shows `consent: granted`, events log without a suffix and appear in GA4 DebugView and (within ~2 h) Clarity recordings. Footer → **Privacy settings** switches between them; switching to Reject reloads the page with no analytics.
10. **Verify nothing loads before consent** — private window, DevTools → Network, filter `google|clarity`, load any page without clicking the banner: zero requests. Application → Cookies: no `_ga*`, `_clck`, `_clsk`. Click Reject and navigate: still zero. Click Accept: `gtag/js` and `clarity.ms/tag` appear.

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

### 4. GA4

Installed — see *Setup checklist* above. In GA4, `utm_source=chatgpt.com` shows
up under **Reports → Acquisition → Traffic acquisition → Session source/medium**.
To see it without campaign tags, add a comparison on **Session source** containing `chatgpt`.

### 5. Tracking `utm_source=chatgpt.com`

Nothing to build — this arrives on its own when ChatGPT links out with the
parameter attached. What to do:

- In GA4 (Traffic acquisition) or Vercel Analytics, filter by **Referrer** / session source for `chatgpt.com`, `perplexity.ai`, `gemini.google.com`, `google.com` (AI Overviews are not separable from ordinary Google traffic).
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
