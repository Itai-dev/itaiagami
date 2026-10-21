// Builds assets/docs/Itai_Agami_Credentials.pdf from tools/credentials/credentials.html.
// Needs Playwright with Chromium (not a site dependency):  node tools/make-credentials.mjs
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
// local install first, then a global one
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire(execSync('npm root -g').toString().trim() + '/')('playwright')); }
const root = new URL('..', import.meta.url);
const src = new URL('tools/credentials/credentials.html', root);
const out = fileURLToPath(new URL('assets/docs/Itai_Agami_Credentials.pdf', root));
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(src.href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: out, format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
await browser.close();
console.log('wrote', out);
