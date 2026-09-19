#!/usr/bin/env node
/* ============================================================
   Cut a product shot out of its flat backdrop.

     node tools/cutout.js <in.png> <out.webp> [maxPx]

   Written for candy shots that arrive on a white or chequerboard
   backdrop rather than on real alpha. It floods in from the edges,
   so a white highlight inside the subject is kept — only backdrop
   that reaches the border is removed. The mask is then pulled in a
   pixel and feathered, which is what stops a pale fringe showing
   when the cutout sits on a dark page.
   ============================================================ */
const sharp = require('sharp');

const BRIGHT = 222;   /* a backdrop pixel is at least this light   */
const FLAT   = 16;    /* ...and this close to grey                 */

async function cutout(src, dest, max = 640){
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const n = w * h;

  const isBack = i => {
    const r = data[i*4], g = data[i*4+1], b = data[i*4+2];
    const hi = Math.max(r, g, b), lo = Math.min(r, g, b);
    return hi >= BRIGHT && (hi - lo) <= FLAT;
  };

  /* flood in from every border pixel */
  const back = new Uint8Array(n);
  const stack = [];
  for(let x = 0; x < w; x++){ stack.push(x, (h-1)*w + x); }
  for(let y = 0; y < h; y++){ stack.push(y*w, y*w + w-1); }
  while(stack.length){
    const i = stack.pop();
    if(back[i] || !isBack(i)) continue;
    back[i] = 1;
    const x = i % w, y = (i / w) | 0;
    if(x > 0)   stack.push(i - 1);
    if(x < w-1) stack.push(i + 1);
    if(y > 0)   stack.push(i - w);
    if(y < h-1) stack.push(i + w);
  }

  /* grow the backdrop by one pixel, eating the antialiased rim with it */
  const grown = Uint8Array.from(back);
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){
    const i = y*w + x;
    if(back[i]) continue;
    if((x > 0 && back[i-1]) || (x < w-1 && back[i+1]) || (y > 0 && back[i-w]) || (y < h-1 && back[i+w])) grown[i] = 1;
  }

  /* soften what is left, so the edge is not a staircase */
  const alpha = new Float32Array(n);
  for(let i = 0; i < n; i++) alpha[i] = grown[i] ? 0 : 255;
  const blur = new Float32Array(n);
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){
    let s = 0, c = 0;
    for(let dy = -1; dy <= 1; dy++) for(let dx = -1; dx <= 1; dx++){
      const nx = x+dx, ny = y+dy;
      if(nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      s += alpha[ny*w + nx]; c++;
    }
    blur[y*w + x] = s / c;
  }
  for(let i = 0; i < n; i++) data[i*4 + 3] = Math.round(blur[i]);

  await sharp(Buffer.from(data), { raw: { width: w, height: h, channels: 4 } })
    .trim()                                     /* crop to what is left */
    .resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 88, alphaQuality: 92, effort: 6 })
    .toFile(dest);

  const out = await sharp(dest).metadata();
  console.log(dest, out.width + 'x' + out.height, 'alpha:', out.hasAlpha);
}

const [,, src, dest, max] = process.argv;
if(!src || !dest){ console.error('usage: node tools/cutout.js <in> <out.webp> [maxPx]'); process.exit(1); }
cutout(src, dest, max ? +max : 640).catch(e => { console.error(e.message); process.exit(1); });
