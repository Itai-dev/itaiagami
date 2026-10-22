# Flagship case study — template for independent engagements

Internal. Not deployed (`*.md` and `/docs` are in `.vercelignore`).

The portfolio is moving from agency/team work toward engagements where a client
hires Itai directly and he owns the whole problem. When one of those can be
published (first candidate: **Inch Models** — brand refresh, positioning, digital
direction, website, implementation), it should become the top flagship. This is
how to add it without restructuring anything.

Do not publish until the client has approved and the work is live.

---

## 1. Data — `data/projects.json`

Add the entry **first** in the array (array order = Work index order).

```json
{
  "slug": "inch-models",
  "name": "Inch Models",
  "client": "Inch Models",
  "cat": "Brand",
  "tags": ["Brand", "Technology"],
  "role": "Creative direction — positioning, brand, website",
  "disciplines": "Positioning / Brand Refresh / Digital Direction / Website",
  "collab": "",
  "engagement": "independent",
  "flagship": true,
  "homeRank": 1,
  "oneline": "",
  "challenge": "",
  "idea": "",
  "system": "",
  "result": "",
  "contribution": "",
  "thumb": "", "hero": "", "gallery": [], "vimeo": null, "credits": []
}
```

`engagement` is one of `independent`, `agency`, `studio`, `in-house`,
`self-initiated` (blank when unknown). `homeRank` is the position on the homepage
(null = not featured). Shift the other `homeRank` values down by one.

## 2. Case page — `work/inch-models.html`

Copy `work/channel-13.html` (it has the lead film, contribution line, meta,
story, gallery, credits, related service and next-project blocks) and replace
the content. For an independent engagement:

- **`<title>`**: `Inch Models — Brand Refresh &amp; Website | Itai Agami` —
  client, then what was made, in words someone would search.
- **Contribution line** (`.c-contrib`): say it plainly — *"Independent engagement.
  I led positioning, brand, digital direction and the website, and brought in
  …"* — naming the collaborators actually used.
- **`.c-meta`**: add a fifth item; the grid is `auto-fit`, so it lays out by itself:
  `<div class="m"><div class="l">Engagement</div><div class="v">Independent — client direct</div></div>`
- **Story**: keep The challenge / The idea / The system / The outcome /
  Role & contribution.
- **The outcome**: scope evidence first (what launched, where, which touchpoints,
  which markets, which teams adopted it), numbers only if the client has
  approved them. Never "launched successfully".
- **JSON-LD**: `CreativeWork` with `creator` → `#itai`, plus `dateCreated`
  (the year) — independent work should carry dates.

## 3. Wire it in

1. `index.html` → Selected work: add the `<article class="swork obs">` block
   at the top, renumber the `NN / 07` badges (or `/ 08`), give it
   `loading="eager" fetchpriority="high"` and set the next image to `lazy`.
2. `work.html` → add the `<li class="prow">` first, renumber `p-idx`, and add
   the item to the `ItemList` in the JSON-LD.
3. Every case page: crumbs read `NN / 18` → bump the total, renumber, and point
   the last page's `c-next` at the new first page. (The reorder script used in
   the October 2026 pass is the quickest way; see git history.)
4. `sitemap.xml` and `llms.txt` → add the URL.
5. Relevant `services/*.html` → put it first in "Selected work".

## 4. What makes it a flagship

The homepage orders work by how much of the problem Itai owned. An independent
engagement where he set the positioning and carried it to launch outranks any
agency project, whatever the client's size. Present it that way: the business
problem first, the decision he made about it second, the work third.
