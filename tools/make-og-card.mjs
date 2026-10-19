// Renders the default share card (assets/og/itai-agami-cd.jpg, 1200x630) used by
// the home, About, Contact, Services, Notes, Privacy and Developers pages.
// It reuses the hero's shipped facts and one frame from the Simply case.
// Not deployed (tools/ is in .vercelignore). Needs Playwright installed globally.
// Run: node tools/make-og-card.mjs
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');

const root = new URL('..', import.meta.url).pathname;
const frame = 'data:image/webp;base64,' + readFileSync(join(root, 'assets/opt/15b0b9d98c42.webp')).toString('base64');
const out = join(root, 'assets/og/itai-agami-cd.jpg');

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Inter+Tight:wght@700&family=IBM+Plex+Mono:wght@500&display=block" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1200px;height:630px;overflow:hidden}
body{background:#ffffff;color:#000;font-family:Inter,sans-serif;position:relative;-webkit-font-smoothing:antialiased}
.frame{position:absolute;inset:28px;border:1px solid rgba(0,0,0,.12)}
.name{position:absolute;left:72px;top:92px;font:700 64px/1 'Inter Tight',sans-serif;letter-spacing:-0.04em}
.role{position:absolute;left:72px;top:170px;font:500 20px/1.2 'IBM Plex Mono',monospace;color:rgba(0,0,0,.64)}
.low{position:absolute;left:72px;bottom:110px;width:568px}
.line{font:700 44px/1.05 'Inter Tight',sans-serif;letter-spacing:-0.04em;max-width:12ch}
.jobs{margin-top:22px;font:500 18px/1.2 'IBM Plex Mono',monospace;color:rgba(0,0,0,.64)}
.pic{position:absolute;left:680px;top:64px;width:464px;height:502px;border-radius:10px;overflow:hidden}
.pic img{width:100%;height:100%;object-fit:cover;display:block}
</style></head><body>
<div class="frame"></div>
<div class="name">Itai Agami</div>
<div class="role">Independent Creative Director · Tel Aviv</div>
<div class="low">
  <div class="line">One creative director, from first idea to launch day.</div>
  <div class="jobs">Brand refreshes · Launch campaigns · Launch websites</div>
</div>
<div class="pic"><img src="${frame}" alt=""></div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() => document.querySelector('.pic img').complete);
await page.screenshot({ path: out, type: 'jpeg', quality: 86 });
await browser.close();
console.log('built assets/og/itai-agami-cd.jpg');
