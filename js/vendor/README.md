# Vendored libraries

Served as static files; the site has no build step.

| File | Package | Version | Licence |
| --- | --- | --- | --- |
| `gsap.min.js`, `ScrollTrigger.min.js` | gsap | 3.15.1 | GSAP standard "no charge" licence, https://gsap.com/standard-license |
| `lenis.min.js` | lenis | 1.3.27 | MIT |
| `three.module.min.js` | three | 0.187.0 | MIT |
| `hairline-kernel.js` | @lucasmarkes/hairline | see file | see file |

GSAP, ScrollTrigger and Lenis are copied from each package's `dist/`.
Three.js ships no minified ES module, so it is bundled from the package:

    npx esbuild node_modules/three/build/three.module.js --bundle --minify --format=esm --outfile=js/vendor/three.module.min.js

It is imported only by `js/hero-plate.js`, on the home page, when the plate will run.
Lenis is the site's only smooth-scroll engine (see `js/motion.js`).
