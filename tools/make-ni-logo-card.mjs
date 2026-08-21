// Build the Natural Intelligence logo cards from `ni logo.jpg`.
// The source already sits on pure white, so the logo is composited straight onto a
// white card — no keying or recolouring, which keeps the wordmark and the gradient
// mark exactly as supplied.
// Run from project root:  node tools/make-ni-logo-card.mjs
import sharp from 'sharp';

const SRC = 'ni logo.jpg';
const BG = { r: 255, g: 255, b: 255, alpha: 1 };
const CARD = { w: 1600, h: 900 };
const THUMB = { w: 800, h: 450 };
const LOGO_WIDTH_RATIO = 0.4;   // logo occupies 40% of the card width

const { width: W, height: H } = await sharp(SRC).metadata();

async function card({ w, h }, dest) {
  const lw = Math.round(w * LOGO_WIDTH_RATIO);
  const lh = Math.round(lw * H / W);
  const logo = await sharp(SRC).resize(lw, lh, { kernel: 'lanczos3', fit: 'fill' }).toBuffer();
  await sharp({ create: { width: w, height: h, channels: 4, background: BG } })
    .composite([{ input: logo, left: Math.round((w - lw) / 2), top: Math.round((h - lh) / 2) }])
    .webp({ quality: 82 })
    .toFile(dest);
  console.log(`wrote ${dest}  (${w}x${h}, logo ${lw}x${lh})`);
}

await card(CARD, 'assets/opt/ni-logo.webp');
await card(THUMB, 'assets/opt/ni-logo-thumb.webp');
