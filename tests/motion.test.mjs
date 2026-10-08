/* Motion & material rules from the design pass (css/site.css, js/site.js).
   Static checks: they stop a later edit from quietly reintroducing a slow-start
   curve, a layout-property animation, a reachable hidden menu or a left/top
   cursor follower. Behaviour was verified in a real browser when added. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './helpers/load.mjs';

const css = fs.readFileSync(path.join(ROOT, 'css/site.css'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'js/site.js'), 'utf8');
const rule = sel => { const i = css.indexOf(sel + '{'); assert.ok(i >= 0, sel); return css.slice(i, css.indexOf('}', i)); };

test('house curve is a strong ease-out; UI hover speed stays under 300ms', () => {
  assert.match(css, /--ease:cubic-bezier\(\.23,1,\.32,1\);/);
  assert.match(css, /--ease-drawer:cubic-bezier\(\.32,\.72,0,1\);/);
  assert.match(css, /--dur-fast:\.25s;/);
  assert.doesNotMatch(css, /cubic-bezier\(\.6,\.01,\.05,1\)/, 'old slow-start curve is gone');
  assert.doesNotMatch(css, /\bease-in\b(?!-out)/, 'no ease-in on UI');
});

test('nav underline animates transform, not width', () => {
  const r = rule('nav.primary a::after');
  assert.match(r, /transform:scaleX\(0\)/);
  assert.match(r, /transition:transform/);
  assert.doesNotMatch(r, /transition:width/);
});

test('mobile menu: sheet timing, hidden from keyboard while closed, staggered links', () => {
  const closed = rule('.mobile-menu');
  assert.match(closed, /visibility:hidden/);
  assert.match(closed, /transform \.45s var\(--ease-drawer\)/);
  assert.match(rule('.mobile-menu.open'), /visibility:visible/);
  assert.match(css, /transition-delay:calc\(120ms \+ var\(--i,0\) \* 40ms\)/);
  assert.match(js, /menu\.querySelectorAll\(':scope > a, \.mm-foot'\)/);
});

test('press feedback eases back on release, and the play pill keeps its centring', () => {
  assert.match(rule('.btn'), /transform \.16s var\(--ease\)/);
  assert.match(css, /\.c-play:active \.pb\{transform:translate\(-50%,-50%\) scale\(\.97\)/);
});

test('hover transforms are reset on touch; reduced transparency and contrast handled', () => {
  assert.match(css, /@media \(hover:none\),\(pointer:coarse\)\{[\s\S]*?\.btn:hover \.arw[\s\S]*?\{transform:none\}/);
  assert.match(css, /@media \(prefers-reduced-transparency:reduce\)\{\s*header\.site\{background:var\(--bg\);-webkit-backdrop-filter:none;backdrop-filter:none\}/);
  assert.match(css, /@media \(prefers-contrast:more\)/);
});

test('reduced motion: the menu cross-fades rather than cutting to instant', () => {
  const block = css.slice(css.lastIndexOf('@media (prefers-reduced-motion:reduce){'));
  assert.match(block, /\.mobile-menu\{transform:none!important;opacity:0;transition:opacity \.2s ease/);
});

test('theme switch cross-fades via View Transitions, skipped for reduced motion', () => {
  assert.match(js, /document\.startViewTransition&&!matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches/);
  assert.match(css, /::view-transition-old\(root\),::view-transition-new\(root\)\{animation-duration:\.28s/);
});

test('work-index preview moves with `translate`, not left/top', () => {
  assert.doesNotMatch(js, /hoverimg\.style\.(left|top)=/);
  assert.match(js, /hoverimg\.style\.translate=/);
  assert.match(js, /if\(s!==side\)/, '--hx only written when the side changes');
});
