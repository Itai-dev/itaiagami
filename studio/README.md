# Sanity: Itai Agami Portfolio (`c8rr77b1`)

```
itaiagami/            repo root = project folder
├── studio/           Sanity Studio (standalone, TypeScript)
├── web/              Next.js app that renders the Sanity content
└── (static site)     the current homepage cloud, also reads Sanity via js/cms.js
```

## Content model

- **Project**: name, slug, client, category (Brand / Culture / Technology), order,
  card image, optional card video loop (short mp4), one-liner, role, idea, outcome,
  challenge, system, contribution, disciplines, credits, film (Mux), hero, images.
- **Site settings** (single document): about lines, email, LinkedIn, CV.

## One-time setup (needs your Sanity login)

```sh
cd studio
npm install
npx sanity login
npm run schema:deploy        # upload the schema to the Content Lake
npm run seed                 # import the 18 current projects, images, loops and CV (run once)
npx sanity cors add http://localhost:3000 --credentials
npx sanity cors add https://itaiagami.com
npm run deploy               # hosted Studio at https://itai-agami.sanity.studio
```

Also add your Vercel URLs as CORS origins (sanity.io/manage → project → API).

## Day to day

- Studio: `cd studio && npm run dev` → http://localhost:3333
- Web app: `cd web && npm run dev` → http://localhost:3000
- After changing the schema or a query: `cd studio && npm run typegen`
  (writes `web/sanity.types.ts`), and `npm run schema:deploy` for schema changes.

Published edits reach the web app instantly via Sanity Live, and the static
homepage within about a minute.

## Deploying the web app

Create a second Vercel project from this repo with **Root Directory = `web`**.
The existing Vercel project keeps deploying the static site from the root
(`web/`, `studio/` and `.agents/` are in `.vercelignore`).

The project ID is pinned to `c8rr77b1` in `web/src/sanity/env.ts` and `js/cms.js`
on purpose, so a `NEXT_PUBLIC_SANITY_PROJECT_ID` meant for another project can't
redirect the site.

Drafts and Visual Editing need a server-only `SANITY_API_READ_TOKEN` (Viewer role)
in the web app's environment; without it the app shows published content only.
