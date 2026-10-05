# SEO intent map

Internal. Not deployed.

One page per search intent, so pages don't compete with each other. When you
add copy, keep it on the page that owns the intent; link to that page from
everywhere else rather than repeating the pitch.

| Page | Owns (primary) | Supports (secondary) |
| --- | --- | --- |
| `/` | independent creative director; creative director for brand & product launches | senior creative direction, creative director Tel Aviv |
| `/services/creative-direction-product-launches.html` | product / brand / app launch creative director; creative direction for product launch | creative director for startups and tech companies, campaign creative director |
| `/services/brand-strategy-identity-systems.html` | brand strategy and identity; brand strategy and creative direction | startup branding, rebrand |
| `/services/fractional-creative-direction.html` | fractional creative director; fractional creative leadership | outsourced creative leadership, creative systems, AI creative workflows |
| `/services/interactive-immersive-experiences.html` | interactive / immersive experience creative direction | museum exhibition design, projection mapping, branded digital experiences |
| `/services.html` | creative direction services (hub) | pricing, FAQ |
| `/work.html` + `/work/*` | proof for the service pages | client + project names |
| `/about.html` | who Itai Agami is | Creative Director Tel Aviv / Israel, background |
| `/contact.html` | hire / start a project | — |

Rules:

- Location (Tel Aviv / Israel) appears in the About page, descriptions, schema and
  contact — not in titles of service pages.
- Each case page links to its service (`.c-service`); each service page lists
  its proof cases in "Selected work" and in the `Service.workExample` schema.
  Keep the two in sync when adding a project.
- New landing pages only for an intent no page owns yet. The likeliest
  candidate is "creative director for startups" — create it only once there
  are two or more startup engagements to show; until then the launches page
  carries it ("Who it's for").

## Checklist for a new page

- Unique `<title>` (service + role + name) and meta description.
- One `<h1>`; section headings as `<h2>` (case and service pages use
  `h2.st` — same look as before).
- Canonical, `og:*`, then `node tools/make-og.mjs` for a 1200×630 JPEG preview.
- Header/footer markup copied from a sibling page (sub-pages carry it as static
  HTML; `js/site.js` only injects it as a fallback).
- Add to `sitemap.xml` and `llms.txt`.
