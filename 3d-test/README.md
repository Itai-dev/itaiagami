# /3d-test — spatial homepage prototype

The homepage as a walk through a dark exhibition. Scrolling the page moves
the camera through five compositions; the work is unlit image and video planes
in fog. Isolated from the live site: nothing else links here, and the page is
`noindex`.

Open `/3d-test`. `?debug` shows a frame/memory readout; `?static` forces the
plain page.

## Files

| | |
|---|---|
| `index.html` | The content: chapters (`section[data-chapter]`) of projects (`article[data-slug]`) with names, disciplines, descriptions, links, alt text and JSON-LD. Readable with no JS and no WebGL. |
| `style.css` | The plain page, then `html.has3d`: the same HTML as sticky captions over the scene. |
| `src/layout.js` | Every coordinate: the desktop and phone compositions and their camera keys. |
| `src/world.js` | Screens, progressive textures, video, faked reflections and light. |
| `src/main.js` | Renderer, scroll → camera, hover, click-to-focus, adaptive quality, fallback. |
| `src/textures.js` | Generated: each image's size and average colour. |
| `app.js` | The bundle (three.js tree-shaken in). Committed, so the site stays static. |
| `tex/`, `video/` | Generated texture tiers and WebM loops. |

```sh
npm run textures:3d   # tools/make-3d-textures.mjs → tex/, video/, src/textures.js
npm run build:3d      # tools/build-3d.mjs → app.js   (--watch while working)
```

## How it decides

- **3D or plain:** an inline head script adds `has3d` only with WebGL and
  without `prefers-reduced-motion`. If the renderer can't start, the context is
  lost, or `app.js` fails to load, the class flips to `no3d` and the plain page
  is all there is. No JS: plain page.
- **Camera:** each key is pinned to a fraction of a chapter, so captions and
  camera can't drift apart. Scroll progress is damped (~0.4 s) and each stretch
  eases in and out, so the camera settles on each composition.
- **Loading:** first paint is an `<img>` of the opening screen placed where the
  camera will show it; the canvas fades in over it. Every screen starts as its
  average colour, takes a 48px placeholder at once, and its full image only
  within `loadRadius`; images far behind are released again. Video plays only
  near and in view, WebM where supported, MP4 otherwise.
- **Rendering:** on demand (zero frames while nothing changes), DPR capped at
  1.75 desktop / 1.5 phone and stepped down if frames run long, no lights,
  no post-processing, ~50–70 draw calls.
