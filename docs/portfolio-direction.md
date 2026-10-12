# Portfolio direction (homepage simplification)

Internal. Not deployed (`*.md` and `/docs` are in `.vercelignore`).

Goal: the site reads first as a Creative Director's portfolio, not a services
funnel. Visible copy is reduced; machine-readable context is kept or added.

## What changed visually

- **Homepage**: identity hero (name, "Creative Director", one line) → 10 large
  project cards (name + disciplines, each to its case study) → short about →
  static client logos → one contact moment (email, LinkedIn, one booking link).
- **Navigation**: Work / About / Contact on every page. The header "Book a call"
  button is gone. Services, Notes and the developer portal are in the footer.
- **About**: three paragraphs; "Good fit" and pricing removed; "Open to" lists
  Creative Director roles, freelance direction and studio collaborations.
- **Contact**: same invitation as the homepage, email first; the form is the
  default tab, booking is the second; no pricing copy. Form gained "Studio or
  agency collaboration" and "Creative Director role" project types.
- Removed: CTA border-beam animation, hero Hairline figure, word-scrub effect,
  client marquee, section-title rules, pill-style work filters.

## Where the commercial content went

`/services.html` (also reachable at `/work-with-me`) now holds, in addition to
the four engagements, budget and FAQ: "How a project runs" (the four steps from
the homepage) and "Where I help most" (the homepage fit block and the six
moments from About). The `ProfessionalService` node with `priceRange` and the
offer catalog moved there with it. Case studies still link to their related
service page.

## Machine-readable layer

- Homepage JSON-LD: `Person` gains `hasOccupation`, broader `knowsAbout` and a
  description that names the opportunity types; a `#selected-work` `ItemList`
  of `CreativeWork` items mirrors the cards. About uses the same description.
- Titles and descriptions for home, about, contact and work updated to lead
  with "Creative Director"; canonicals, OG and sitemap unchanged apart from
  lastmod.
- `llms.txt` leads with the broader positioning and no longer says full-time
  roles are not a fit.
- Markdown negotiation, API, OpenAPI, redirects, robots and analytics untouched.
- Guarded by `tests/portfolio.test.mjs`.

## Version 2: the frame (from the Figma wireframe)

Homepage rebuilt on a five-column grid on white, after the Figma frame
`aArdk3QdaZxqawQUZgnRUt` node 2:2. One type size (Inter 24px at 1920 wide,
scaling with the viewport), bold caps for the name and menu.

- Fixed: name (col 1) and Work / About / Contact (cols 2–4) across the top,
  email / LinkedIn / Book a call in col 1, one about sentence in col 5, and a
  01 / 10 counter bottom-left.
- Scrolling through cols 2–4: the ten projects, one per screen, then the
  client logos and a small footer.
- Motion (`js/home.js`, `css/home.css`): CSS-only arrival; each piece opens
  upward as it arrives; slight parallax inside the frame; the piece in focus
  is full strength while the others step back; the counter rolls to the
  piece in focus; a "View" disc trails the pointer over the work. All of it
  is off for reduced motion, and without JS the work is simply visible.
- Below 1024px the frame lets go and everything stacks.
- The name, contact and about live inside `<main>` (positioned fixed), so the
  Markdown view for agents still carries them.
