# Sanity: Itai Agami Portfolio (`c8rr77b1`)

The Sanity Studio for itaiagami.com, hosted at https://itai-agami.sanity.studio.
It is where films are uploaded: each video field is a Mux upload, and the site
plays it from Mux.

## Case-study films

Upload a film in the project's **Video** field (type: Video). Then give its Mux
playback ID to the case page in `work/<slug>.html` (`data-mux` on the film
frame), and in `data/projects.json` (`mux.playbackId`). An optional
`data-loop="start-end"` (seconds) plays that slice silently behind the
"Play film" button.

## Commands (need your Sanity login)

```sh
cd studio
npm install
npm run dev              # local Studio at http://localhost:3333
npm run schema:deploy    # after changing the schema
npm run deploy           # update the hosted Studio
```
