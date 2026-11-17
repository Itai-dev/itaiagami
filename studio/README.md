# Sanity: Itai Agami Portfolio (`c8rr77b1`)

The Sanity Studio for itaiagami.com, hosted at https://itai-agami.sanity.studio.
It is where films are uploaded: each video field is a Mux upload, and the site
plays it from Mux.

## The site reads from here

The home page (`index.html`, `js/home.js`) has no project content of its own.
It asks `/api/cms`, which reads this dataset and answers with the cases, the
service filters and the info text. Publish here and the site shows it within a
minute; no code change, no rebuild.

- **A case** is a group (Partner: TV, Kids, Series) or a project with no group.
  The member with the one-liner and case text leads; the others follow it as
  films and images. Order: the lowest `order` in the group.
- **Services** (Card tab) drive the filters: Real Estate, Broadcast, Tech,
  Exhibitions & Interactive. Until a case has any ticked, `api/cms.js` falls
  back to a short list by slug (`SECTOR_FALLBACK`); a value set here wins.
  Run `npm run schema:deploy` and `npm run deploy` once so the field appears.
- **Films** are Mux uploads in a Video field. Nothing else to wire.
- **Info** is the Site settings document.

## Commands (need your Sanity login)

```sh
cd studio
npm install
npm run dev              # local Studio at http://localhost:3333
npm run schema:deploy    # after changing the schema
npm run deploy           # update the hosted Studio
```
