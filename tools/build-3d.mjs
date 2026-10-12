/* Bundles the /3d-test prototype: 3d-test/src/main.js and the parts of three.js
   it imports, tree-shaken and minified, into 3d-test/app.js (committed, so the
   site still deploys as static files with no build step).
   Run: npm run build:3d   (add --watch while working on it) */
import * as esbuild from 'esbuild';
const watch = process.argv.includes('--watch');
const opts = {
  entryPoints: ['3d-test/src/main.js'],
  outfile: '3d-test/app.js',
  bundle: true, minify: true, format: 'esm', target: ['es2020', 'safari15'],
  legalComments: 'eof', logLevel: 'info',
};
if (watch) await (await esbuild.context(opts)).watch();
else await esbuild.build(opts);
