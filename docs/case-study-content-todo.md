# Case studies — missing facts

Internal. Not deployed.

Everything on the site is drawn from what the repository already stated. The
items below would materially strengthen the case studies but **were not
available**, so nothing was written to cover the gap — no placeholders, no
estimated figures, no invented credits.

Ordered by how much each would improve the commercial signal.

---

## High value — these change how senior the work reads

**Channel 13** — the strongest scale story on the site, and the thinnest evidence.
- Which year the identity launched, and whether it is still on air.
- The contents of the brand book: how many pages, which sections.
- What was inside the "channel kit" — news package, promo templates, continuity, endboards?
- Was this a full network rebrand or a refresh of an existing mark?
- Itai's exact remit versus Shortcut Playground's. The page currently says he shaped strategy and designed the identity; the division of labour is not stated.

**Simply — Vision Pro**
- Where the visualisation was actually used: App Store, Apple channels, PR, the company's own marketing?
- Was it made before or after the hardware was available to the team?
- Was Simply's product team involved in defining the environments, or was this led from the creative side?
- Confirmation that no other collaborators should be credited (Collaborators currently reads "—").

**Natural Intelligence**
- Duration of the engagement, and whether it was a retained/embedded role or project-based. This is the site's only evidence for the fractional-creative-direction offer, so it matters more than any other missing fact.
- One creative territory, described end to end: the audience tension, the concept, the variations.
- What the AI-assisted resizing MVP did technically, and what it deliberately did not automate.
- Any results that can be published. If none can, that is fine — nothing has been implied.
- Team size he worked with or directed.

**Museum of Natural History**
- Which museum, formally. The page names it only as "Museum of Natural History", which is ambiguous internationally and weakens the credential.
- Which exhibition or gallery, and whether it is permanent.
- Opening year, and whether it is still installed.
- Size of the multidisciplinary team he led.
- Names of the environmental-science advisers, if creditable.

**Tower of David**
- Which specific exhibitions or rooms — the page describes the approach but names no exhibit.
- Year(s) of the work, and whether it forms part of the museum's renewed permanent display.
- Number of installed pieces.
- Which technology partners built the applications (only "Shortcut Playground — Digital Media" is credited).

---

## Medium value — completes the picture

**Every case study**
- **Year.** Not one case study carries a date. Dates are the cheapest possible signal of a career's arc and their absence is conspicuous. Adding a `Year` row to the `.c-meta` block on each page would be a small change with a real effect — and would let `datePublished` / `dateCreated` be added to the `CreativeWork` structured data, which is currently omitted for exactly this reason.
- **Scale of deployment.** Where the work ran, for how long, in how many places.

**Interactive Elections — Kan 11**
- Whether he worked with a broadcast-graphics team or alone (Collaborators reads "—", which reads as implausible for a live national broadcast at this scale).
- Whether the system was reused for later elections.
- Which real-time or broadcast platform drove the screens.

**10 Facts — Kan 11**
- How many episodes, and over what period.
- Where it was distributed — broadcast, social, both.
- Whether he designed the kit only, or animated the episodes too.

**Tidhar**
- Which development or project the film was made for.
- Where the film ran — sales suite, digital, broadcast.

**SodaStream**
- Agency, director and production company. Collaborators reads "—", which is unlikely for a produced TV spot, and the missing credits make the entry look weaker than the work.
- Which markets it ran in.

**Amdocs — Make It Amazing**
- Where the film was released and how it performed, if anything is publishable.
- The precise boundary between Itai's visual concept and the director's contribution — the page says he defined the look and logic for the director to build from, which is good, but a sharper line would help.

**National Library of Israel**
- Whether this is installed in the new National Library building.
- Which exhibition or programme it belongs to.
- Whether it is still running.

**Google Shopping IL / SkyMax / Mako 12+ / Partner TV / Community Lights / Taormina**
- Years.
- For Community Lights: which year's Hanukkah, and whether it recurred.
- For Taormina: which event or festival the projection was made for.

---

## Structural gaps

- **No client quotes or testimonials anywhere on the site.** Two or three, attributed by name and role, would do more for senior credibility than any additional case study. None have been invented.
- **No awards or press.** If any exist, an `Awards` or `Press` line on the relevant case studies (and `award` in the Person structured data) would be well worth adding.
- **Vimeo and Behance profiles.** Only LinkedIn is currently linked, so only LinkedIn is in `sameAs`. If public Vimeo / Behance profiles exist, add them to the footer and to the `sameAs` array in `index.html` and `about.html` — this is one of the cheaper ways to help an AI assistant confirm the site describes a real, verifiable person.
- **Collaborators reading "—"** on five case studies. Where a project genuinely was solo, saying so ("Independent") reads better than a dash; where it was not, the credits should be filled in.
- **Amdocs `Role` reads "Visual Concept Development"**, which undersells relative to the other entries. If the actual remit was broader, the label should say so.
