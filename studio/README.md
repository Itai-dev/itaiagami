# Sanity CMS

The homepage cloud and its case-study pop-ups read projects and the about text
from Sanity. Until a project ID is set in `js/cms.js`, or whenever Sanity can't be
reached, the site uses `data/projects.json` instead, so nothing breaks.

## One-time setup

1. **Create the project.** Sign in at sanity.io/manage → *Create project* → dataset
   `production`, visibility **public**. Copy the project ID.
2. **Allow the site to read it.** Project → *API* → *CORS origins* → add
   `https://itaiagami.com` and your Vercel preview domain
   (`https://*.vercel.app` or the exact preview URL). No credentials needed.
3. **Import the current content** (images, video loops and the CV are uploaded):
   ```sh
   cd studio
   npm install
   npx sanity login
   SANITY_STUDIO_PROJECT_ID=<id> npm run seed
   ```
4. **Point the site at it.** In `js/cms.js` set `projectId: '<id>'`, commit, push.
5. **Open the editor.**
   - Locally: `SANITY_STUDIO_PROJECT_ID=<id> npm run dev` → http://localhost:3333
   - Hosted: `SANITY_STUDIO_PROJECT_ID=<id> npm run deploy` → https://itaiagami.sanity.studio

## Editing

- **Projects**: name, category (drives the filters), order, card image, optional card
  video loop (short mp4), one-liner, idea, outcome, Vimeo film ID, hero and images.
  The pop-up shows the one-liner plus the first sentence of idea and outcome, then
  the film and all images.
- **Site settings**: the about lines, email, LinkedIn and CV.

Published changes show on the site within about a minute (Sanity's API CDN cache);
no redeploy is needed.

## What still reads the repo

The static case-study pages under `/work/`, the sitemap, `llms.txt` and the API in
`api/` are built from `data/projects.json`. They stay as they are for search engines
and direct links; update `data/projects.json` if those need to change too.
