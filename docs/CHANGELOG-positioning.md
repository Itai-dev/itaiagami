# Positioning, qualification & discoverability pass

Internal. Not deployed.

Goal: make it unambiguous — to a person, to Google, and to an AI assistant —
that Itai Agami is a senior independent Creative Director for complex,
high-value brand, launch and experience projects, and qualify enquiries so the
inbox fills with those rather than with isolated production requests.

No visual redesign. No framework change. Nothing invented: every claim on the
site traces to something the repository already stated. Facts that would have
strengthened the work but were not available are listed in
`docs/case-study-content-todo.md` rather than guessed at.

---

## New pages

| Page | Purpose |
| --- | --- |
| `services.html` | Engagement hub: four offers, how an engagement works, budget, FAQ. |
| `services/brand-strategy-identity-systems.html` | Identity systems. |
| `services/creative-direction-product-launches.html` | Launches and campaigns. |
| `services/interactive-immersive-experiences.html` | Museums, installations, spatial media. |
| `services/fractional-creative-direction.html` | Retained creative leadership and creative systems. |

Each service page states: when to bring him in, the business problem, what he
leads, how collaborators are assembled, relevant case studies, the difference
between creative leadership and isolated production, the ₪30,000 starting point,
and a CTA.

## Modified

**Positioning**
- `index.html` — kicker now names the practice and the sectors; supporting copy replaced with the positioning line; a third CTA to Services; the Practice items now link to the four service pages; new "Where I help most" qualification section carrying the ₪30,000 line.
- `about.html` — explicit on: most useful when the challenge is unclear; works directly with leadership and internal teams; leads strategy → concept → execution; assembles specialists; Tel Aviv and worldwide; not a performance-marketing Art Director. New "Good fit" section (six organisational moments), engagement note in the sidebar.
- `contact.html` — qualification copy, ₪ budget bands, "How did you find me?", hidden attribution fields, links to Services and the FAQ.

**Lead capture**
- `js/site.js` — first-touch attribution (session-scoped, no cookies): `utm_source`, `utm_medium`, `utm_campaign`, landing page, external referrer. Written on the first page of a visit, carried into the contact form's hidden fields.
- `api/enquiry.js` — budget bands changed to ₪, `source` added and validated, `type` now reported (it was collected and silently dropped before), attribution rows appended when present. Honeypot, throttle, validation and mailto fallback all unchanged.

**Case studies (all 17)**
- 56 instances of `alt="… project image"` replaced with descriptions of what is actually in the frame, plus a caption on every gallery image saying why it matters.
- 16 hero images given real alt text.
- 13 film embeds given a paragraph of context, so the work is understandable without playing the video.
- `Role & contribution` added to the four case studies that lacked it (Kan 11 elections, 10 Facts, Tidhar, SodaStream).
- Each project now links to the engagement it exemplifies.
- Channel 13 reframed to carry the scale of a complete national broadcast identity; Simply — Vision Pro reframed as emerging-technology launch direction; Tower of David and Museum of Natural History made explicit about installed, multidisciplinary leadership; Natural Intelligence leads with the creative system rather than with a wall of ads.

**Technical**
- `vercel.json` — 308 `www` → apex redirect, and `/index.html` → `/`. (`https://www.itaiagami.com/` was returning 200 with a full duplicate of the site.)
- `robots.txt` — explicit allows for Googlebot, Bingbot, OAI-SearchBot and ChatGPT-User. GPTBot and other training-specific agents deliberately left to the existing `User-agent: *` rule; nothing about training permission was changed.
- `sitemap.xml` — regenerated; 29 URLs, every public page.
- Structured data on every page: `Person` + `WebSite` + `ProfilePage` (home), `ProfilePage` (about), `ContactPage`, `Service` ×4, `ItemList` + `FAQPage` (services hub), `CreativeWork` ×17, `Article` ×2, `Blog`, `CollectionPage`, and `BreadcrumbList` throughout. `sameAs` contains LinkedIn only — the one profile the site actually references.
- Unique title, description and canonical on all 29 pages.
- `index.html` — closed the `div.selected` that was left open. The browser already inferred the close at that exact point, so nothing moved.
- `css/site.css` — additions only, all using the existing tokens: `.fit-*`, `.svc-*`, `.faq`, `.c-gallery figcaption`, `.c-film .note`, `.c-service`, `.a-rel`.
- `server.ps1` — added `.mp4`, `.xml`, `.txt` MIME types so the local dev server can serve the Natural Intelligence videos and the sitemap. Dev-only file.

## Verified

- 29 pages: 29 JSON-LD blocks, 0 parse errors; no duplicate titles, descriptions or canonicals; 0 broken internal links; 0 images without alt; no `noindex`/`nosnippet`; sitemap and file tree agree exactly.
- All 29 pages have balanced tags.
- `api/enquiry.js`: 13/13 validation cases pass, including rejection of the old dollar bands and of unknown sources. Email payload confirmed to carry the new rows — verified against a stubbed `fetch`, so no mail was sent and no fake lead was created.
- Attribution verified end to end in the browser: `?utm_source=chatgpt.com…` → `sessionStorage` → hidden form fields.
- Desktop (1440, 1280) and mobile (375) checked on home, services hub, all service pages, about, contact, case studies and notes. No horizontal overflow anywhere. Light and dark themes both correct. Hero canvas, marquees, scroll reveals, work-index filters and the mobile menu all still behave.

## Still requires manual action

See `docs/measurement-setup.md`. The short version: confirm the `www` redirect in
the Vercel dashboard, and verify + submit the sitemap in Google Search Console.
