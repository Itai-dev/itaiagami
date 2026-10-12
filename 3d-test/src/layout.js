/* The compositions. Everything the scene places is listed here, once for
   desktop and once for phones; nothing else in the code knows a coordinate.

   Units are loose metres. The camera starts near the origin looking down -z.
   Each screen names its project (the slug of an <article> in the page), the
   texture key it shows (src/textures.js), where it floats, how it is turned,
   and one dimension: w (width) or h (height). The other comes from the image.

   Camera keys are tied to the page: each sits at a fraction of one chapter
   (<section data-chapter>), so the text and the camera always agree on where
   the visitor is, however tall the chapters end up. */

export const DESKTOP = {
  fov: 40,
  floorY: -3.2,
  fog: 0.0085,
  loadRadius: 95,   // a screen this close (or closer) gets its full-size image
  videoRadius: 48,  // a video screen this close starts playing
  screens: [
    // 01 — one screen, enormous, already there when the page opens
    { slug: 'partner-tv', tex: 'partner', pos: [0, 6.6, -34], w: 30, tier: 'lg', reflect: true, glow: true },

    // 02 — campaign pieces at different depths; the camera threads between them
    { slug: 'sky-max', tex: 'skymax', pos: [58.6, 2.6, -36], rot: [0, 0.35, 0], w: 10 },
    { slug: 'natural-intelligence', tex: 'ni-storm', pos: [70.4, 1.5, -38], rot: [0, -0.45, 0], h: 7.5 },
    { slug: 'natural-intelligence', tex: 'ni-street', pos: [61.2, 0.2, -49], rot: [0, 0.55, 0], h: 3.4 },
    { slug: 'channel-13', tex: 'ch13', pos: [53.2, 7.4, -64], rot: [0, 0.3, 0], w: 12 },
    { slug: 'google-shopping-il', tex: 'google', pos: [74, -0.4, -60], rot: [0, -0.35, 0], w: 7 },
    { slug: 'sky-max', tex: 'skymax-2', pos: [81, 9.5, -96], rot: [0, -0.6, 0], w: 4.2 },
    // the far one: enormous, half lost in the fog, seen from every room of the walk
    { slug: 'mako-12', tex: 'mako', pos: [128, 26, -205], rot: [0, -0.55, 0], w: 84, tier: 'lg' },

    // 03 — one project as an installation: several screens standing on a floor
    { slug: 'museum-of-natural-history', tex: 'mnh-1', pos: [66, 1.35, -106], w: 13, tier: 'lg', reflect: true, glow: true },
    { slug: 'museum-of-natural-history', tex: 'mnh-2', pos: [56.6, 0.3, -101.5], rot: [0, 0.62, 0], w: 8, reflect: true, glow: true },
    { slug: 'museum-of-natural-history', tex: 'mnh-3', pos: [75.2, 0.9, -101.5], rot: [0, -0.58, 0], h: 8, reflect: true, glow: true },
    { slug: 'museum-of-natural-history', tex: 'mnh-4', pos: [60.2, 5.4, -97.5], rot: [0, 0.3, 0], h: 2.6 },
    { slug: 'museum-of-natural-history', tex: 'mnh-5', pos: [71, -2.25, -95.5], rot: [-1.05, -0.25, 0], w: 4.2 },

    // passage — the camera rises over the installation, through a gate, past three pieces
    { slug: 'simply-vision-pro', tex: 'simply', pos: [58.2, 8.6, -132], rot: [0, 0.38, 0], w: 7.5 },
    { slug: 'national-library-of-israel', tex: 'nli', pos: [69.8, 5.0, -127], rot: [0, -0.35, 0], w: 3.8 },
    { slug: 'tower-of-david', tex: 'tod', pos: [75, 11.8, -140], rot: [0, -0.42, 0], w: 9.5 },

    // 04 — a single image that fills the field of view
    { slug: 'amdocs-make-it-amazing', tex: 'amdocs', pos: [66, 6, -192], w: 48, tier: 'lg' },
  ],
  // matte floor, only where something stands on it; elsewhere the space has no floor
  floors: [
    { pos: [0, -24], r: 46 },
    { pos: [66, -103], r: 32 },
    { pos: [40, -178], r: 30 },
  ],
  // two monoliths: a gate the camera passes through after the installation
  slabs: [
    { pos: [56.5, 10.8, -118], w: 9, h: 28 },
    { pos: [75.5, 10.8, -118], w: 9, h: 28 },
  ],
  // a single lit line on the floor of the last, empty room
  lines: [{ pos: [34, -3.17, -188], w: 64 }],
  keys: [
    { ch: 0, at: 0, pos: [0, 0.6, 18], look: [0, 6.6, -34] },
    { ch: 0, at: 0.6, pos: [0, 1.0, 6], look: [0, 6.4, -34] },
    { ch: 1, at: 0, pos: [52.5, 1.0, -14], look: [66, 1.8, -52] },
    { ch: 1, at: 0.5, pos: [63.6, 0.9, -42], look: [65, 1.8, -76] },
    { ch: 2, at: 0, pos: [65.6, 0.9, -70], look: [66, 1.8, -104] },
    { ch: 2, at: 0.6, pos: [66.8, 0.7, -84], look: [66, 1.4, -104] },
    { ch: 3, at: 0, pos: [66, 8.6, -106], look: [66, 5.5, -190] },
    { ch: 3, at: 0.6, pos: [66, 7.2, -128], look: [66, 5.6, -190] },
    { ch: 4, at: 0, pos: [66, 5.2, -140], look: [66, 6, -192] },
    { ch: 4, at: 0.6, pos: [66, 5.6, -154], look: [66, 6, -192] },
    { ch: 5, at: 0, pos: [61, 2.6, -163], look: [20, 1.6, -176] },
    { ch: 5, at: 1, pos: [57, 1.6, -166], look: [20, 1.2, -178] },
  ],
};

/* Phones: the same idea, recomposed for a tall screen. The camera travels
   down, not forward; fewer screens, shallower depth, no floor, small textures. */
export const MOBILE = {
  fov: 52,
  floorY: null,
  fog: 0.016,
  loadRadius: 34,
  videoRadius: 22,
  screens: [
    { slug: 'partner-tv', tex: 'partner', pos: [0, 0, -6], w: 8.6 },
    { slug: 'sky-max', tex: 'skymax', pos: [-1.3, -11.5, -2.5], rot: [0, 0.2, 0], w: 5.4 },
    { slug: 'natural-intelligence', tex: 'ni-storm', pos: [1.7, -17, 1.5], rot: [0, -0.25, 0], h: 5.2 },
    { slug: 'mako-12', tex: 'mako', pos: [-2.4, -21.5, -15], rot: [0, 0.2, 0], w: 10 },
    { slug: 'museum-of-natural-history', tex: 'mnh-1', pos: [0, -33, -4], w: 7 },
    { slug: 'museum-of-natural-history', tex: 'mnh-3', pos: [2.9, -36.6, -1.4], rot: [0, -0.45, 0], h: 4.4 },
    { slug: 'museum-of-natural-history', tex: 'mnh-2', pos: [-2.8, -37.2, -2.2], rot: [0, 0.45, 0], w: 4.2 },
    { slug: 'simply-vision-pro', tex: 'simply', pos: [-1.3, -46.5, 0], w: 5 },
    { slug: 'national-library-of-israel', tex: 'nli', pos: [2, -50.5, 2.5], rot: [0, -0.3, 0], w: 2.6 },
    { slug: 'amdocs-make-it-amazing', tex: 'amdocs', pos: [0, -60, -8], w: 12 },
  ],
  floors: [],
  slabs: [],
  lines: [{ pos: [0, -76.5, -8], w: 14 }],
  keys: [
    { ch: 0, at: 0, pos: [0, 0.8, 16], look: [0, 0, -6] },
    { ch: 0, at: 0.6, pos: [0, 0.4, 12], look: [0, 0, -6] },
    { ch: 1, at: 0, pos: [0, -10, 13], look: [0, -12, -2] },
    { ch: 1, at: 0.5, pos: [0, -16, 12], look: [0, -18, -1] },
    { ch: 2, at: 0, pos: [0, -24, 13], look: [0, -26, -6] },
    { ch: 2, at: 0.6, pos: [0, -33.5, 11], look: [0, -34.6, -3] },
    { ch: 3, at: 0, pos: [0, -44, 12], look: [0, -46.5, -1] },
    { ch: 3, at: 0.6, pos: [0, -49, 12], look: [0, -50, 0] },
    { ch: 4, at: 0, pos: [0, -57, 13], look: [0, -60, -8] },
    { ch: 4, at: 0.6, pos: [0, -59.6, 12], look: [0, -60, -8] },
    { ch: 5, at: 0, pos: [0, -70, 12], look: [0, -74, -6] },
    { ch: 5, at: 1, pos: [0, -73.5, 12], look: [0, -76, -6] },
  ],
};
