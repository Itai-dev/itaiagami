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

---

# Launch positioning & conversion pass (October 2026)

Goal: read as a senior independent Creative Director who owns a launch or a
business problem, not as an archive or a designer for hire. No redesign; nothing
invented.

- **Home hero** — "Creative direction for brands launching something new."
  "Brands, campaigns and visual worlds people remember" kept as the first line
  of the supporting copy. Eyebrow (existing `.hero .eyebrow` style) names the
  practice. CTAs: Start a project + Book a 20-minute intro call.
- **Home proposition** — the old point-of-view block moved above the work and
  rewritten: projects arrive as a problem, not a brief; four things he defines
  (message, central idea, brand behaviour, rollout + team).
- **Selected work** reordered by ownership: Channel 13, Museum of Natural
  History, Partner TV, SkyMax, Simply — Vision Pro, Tower of David, Amdocs.
  Natural Intelligence left the homepage; stays in Work, reframed around creative
  systems and AI workflow. Work index and all case-page crumbs / next links
  follow the same logic. `data/projects.json` reordered, with `engagement` and
  `homeRank` fields.
- **Accountability** — Practice note, About, Services: one senior creative
  owner; team assembled per project; no fictional "we".
- **Outcomes** — nine case studies now carry scope evidence (touchpoints,
  channels, team, deployment) drawn only from what the pages already stated.
- **CTAs** — "Start a project" + "Book a 20-minute intro call" on home, about,
  services hub and all four service pages (booking links reuse
  `js/contact-config.js`; hidden if no URL). Contact form project types now
  lead with "Brand or product launch".
- **Title** — "Creative Director & Designer" → "Creative Director" /
  "Independent Creative Director" in titles, schema and footers.
- **SEO** — new homepage title/description/OG; `ProfessionalService` with
  `OfferCatalog` and `priceRange`; Person schema updated; `ItemList` on Work;
  two new FAQ entries (+ FAQPage schema); descriptive case-page titles;
  `og:site_name` everywhere; `llms.txt`; Claude and Perplexity search agents
  listed in `robots.txt`; sitemap lastmod refreshed.
- **Future flagships** — `docs/flagship-case-template.md`.

---

# Creative Builder pass (October 2026)

Goal: Creative Builder replaces "Independent Creative Director" as the public
title. Creative direction, design, storytelling and technology are the
capabilities; AI is a tool; the work is the proof. No redesign, no new
sections, no new facts.

## Audit: where the old copy conflicted

- **Hero** led with a service pitch ("Creative direction for your next big
  move") and advertised AI ("AI lets me cover what used to take a studio").
- **Intro loader** landed on "I use AI. (creatively)", making AI the
  punchline of the identity.
- **Contact bands and Contact h1** ("Launching or changing something?") framed
  every enquiry as a corporate launch, which shut out studios, agencies and
  collaborators.
- **About** opened as a launch consultant and repeated the "range of a studio"
  claim; nothing said that he makes the thing as well as directing it.
- **Footer, titles, schema, llms.txt, CLI, OpenAPI** all said "Independent
  Creative Director".
- **Services FAQ schema** had drifted from the visible FAQ (missing two
  questions, one extra).

## Messaging direction

- Identity, stated once per surface: **Creative Builder**.
- Meaning, shown through the language: has the idea, sets how it looks, and
  takes it all the way to the finished thing.
- Hero speaks to the client, not about Itai. Label: **Creative Builder** ·
  Creative direction, design & technology. Headline: "Let's build your idea."
  Lead: "Bring the idea, or just the problem. Get back the brand, the film, the
  website or the space, from the first concept to the finished thing."
- Intro: the verb drum now lands on "I build. (creatively)", which introduces
  the title. "(creatively)" is drawn stroke by stroke in a single-line script
  (EMS Allure, SIL OFL); "prompt" sits among the rolling verbs as the only nod to AI.
- AI appears in About, the Sprint description and the FAQ only, as a tool for
  exploration, prototyping, storytelling and building. The FAQ and llms.txt
  say plainly that earlier projects only involved AI where the case study
  says so (Natural Intelligence, Taormina).
- CTA: "Let's build something." (closing bands and Contact).
  Building is the house verb: when in doubt, "build".

## Discoverability

- `Person.jobTitle` is "Creative Builder"; `hasOccupation` carries Creative
  Director, Art Director and Creative Technologist. `alternateName` keeps
  "Itai Agami, Creative Director" alongside "Itai Agami, Creative Builder".
- `knowsAbout` adds Brand Design, Digital Design, Web Design, Interactive
  Design, Creative Technology, AI-powered Creative Production, Prototyping.
- Titles and descriptions pair the new title with the searched terms:
  creative direction, art director, designer, digital experiences.
- Service pages, case studies and their titles are unchanged: they keep the
  "creative director" intents in `docs/seo-intent-map.md`.
- llms.txt, developers page, OpenAPI description (regenerated) and CLI help
  describe the practice the same way, and add studios/agencies and
  digital/interactive design to the "when to recommend" list.

## Full-site hierarchy pass (October 2026)

- Home: "Working together" and the proof section merged into one block:
  proof first, then the three offers, then pricing anchored on the full launch.
- Case studies (15): the hero image or reel now sits directly under the title,
  with the facts row after it, matching the three film-led pages.
  `tools/build-cases.ps1` follows the same order.
- Service pages (4): Selected work moved to the top; "Who it's for" folded into
  "When to bring me in"; team line folded into the offer list; the closing
  essay section removed. About 650 → 380 words each. Closing headings now
  "Let's build …". Pricing reframed as "full launches scoped; the Sprint that
  starts them begins at ₪30,000".
- Work index intro and About sidebar price line in the same voice.

## Design system v2, after the Awwwards UI (October 2026)

One layer at the end of css/site.css ("DESIGN SYSTEM v2"):
- Light theme: neutral #ededed ground, white surfaces, #111 ink panels for
  media; no grain; the vertical frame rules removed; 1px dividers.
- Radii: 10px media, 18px panels, full pills for buttons and tags.
- Display type: Inter Tight 800, uppercase, -0.055em, line-height .9, for
  the hero, case and service titles and closing bands. Section titles are
  small, bold, stacked, with a pill link.
- Home: centred hero; selected work as a two-column card grid; offers and
  proof on white cards.
- Case studies: centred uppercase title; key visual and gallery tiles in ink
  panels; facts on a white card with disciplines as pills; "See the
  highlights of this project." above the gallery; centred closing ask.

## Design system v3: Awwwards, measured
- The palette and the grey top stage now match Awwwards:
  - #f8f8f8 page, #e9e9e9 stage, #222 media panels
- Header: 64px tall, with the logo and links on the left and two 40px buttons with an 8px radius on the right ("Book a call" solid, "Send a brief" outlined).
- All buttons are 8px rounded rectangles with no arrows. The animated border beam is off.
- Display type is uppercase at medium weight (600) instead of 800.
- Labels: small plain labels (not mono) sit above two-line section titles. Page titles are huge and centred.
- Project cards have one-line captions ("Title — Client").
- Case pages:
  - a highlights gallery in pairs of dark panels
  - facts and story under hairline labels

## Design system v4: Awwwards type and margins, fitted
- Titles: Inter Tight 600, letter-spacing −0.01em (was −0.04em), ~8.8vw, line-height 1.
- Section titles: Inter Tight 500, ~3.1vw.
- Descriptions: Inter 400, ~2.45vw.
- These values were fitted by rendering candidates and matching text width and ink against the Awwwards screenshots.
- Full-width layout with 3.9vw side margins, with no 1440px cap.
- Line-art figures (Hairline) removed from every page, along with their scripts.
- Service and case openings are centred.

## Apple design pass (apple-design skill)
- Motion:
  - Reveals last 0.5s or less, ease out, and travel 8–16px. There is no rotation, no 3D tilt and no wipe.
  - Only page titles rise word by word.
  - Hover zooms are smaller (1.03), shorter (0.45s) and only fire on real pointers.
  - Every link and button gives instant press feedback.
  - The contribution line-draw and the unused CTA glow script are gone.
  - Reduced motion keeps gentle fades.
- Layout:
  - An 8pt spacing scale and one section rhythm (80–128px desktop, 72px phone). Inline section margins that doubled the gaps are removed.
  - Type scale:
    - 13px labels
    - 15px secondary
    - 17px body
    - 19–24px intro copy
  - Hero, case and service intros moved up to intro size.
  - Project captions are on a grid and aligned to the image.
  - Card titles are 20px. Card body text never exceeds the title.
  - Case stories and service steps share one label | text grid.
  - Touch targets are at least 44px on phones.
