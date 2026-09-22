const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const site = read('js/site.js');
const css = read('css/site.css');

// These are source and behavior regressions, not a substitute for viewport QA.
function section(start, end) {
  const from = site.indexOf(start), to = site.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `Missing script section: ${start}`);
  return site.slice(from, to);
}

function menuFixture() {
  let document;
  function element() {
    const classes = new Set();
    return {
      inert: false, attrs: {}, events: {}, textContent: '',
      classList: {
        contains: name => classes.has(name),
        toggle(name, on) { if (on) classes.add(name); else classes.delete(name); }
      },
      setAttribute(name, value) { this.attrs[name] = value; },
      addEventListener(name, fn) { this.events[name] = fn; },
      focus() { document.activeElement = this; },
      blur() { document.activeElement = null; }
    };
  }
  const btn = element(), menu = element(), main = element(), footer = element();
  const links = Array.from({ length: 5 }, element), theme = element();
  const controls = [...links, theme];
  menu.querySelectorAll = selector => selector === 'a' ? links : controls;
  const pageEvents = {}, documentEvents = {};
  document = {
    activeElement: null, body: element(), documentElement: element(),
    getElementById: id => ({ menuBtn: btn, mobileMenu: menu })[id],
    querySelectorAll: () => [main, footer],
    addEventListener: (name, fn) => { documentEvents[name] = fn; }
  };
  const media = { matches: true, addEventListener: (name, fn) => { media.change = fn; } };
  vm.runInNewContext(section('/* ---------- mobile menu', '/* ---------- hero reveal'), {
    document, matchMedia: () => media,
    addEventListener: (name, fn) => { pageEvents[name] = fn; }
  });
  function key(key, shiftKey = false) {
    const event = { key, shiftKey, prevented: false, preventDefault() { this.prevented = true; } };
    documentEvents.keydown(event);
    return event;
  }
  return { btn, menu, main, footer, links, theme, document, media, pageEvents, key };
}

test('closed navigation is hidden and excluded from keyboard focus', () => {
  const f = menuFixture();
  assert.equal(f.menu.inert, true);
  assert.equal(f.menu.attrs['aria-hidden'], 'true');
  assert.equal(f.main.inert, false);
  assert.equal(f.document.body.classList.contains('locked'), false);
});

test('menu opens, isolates content, and closes through its button', () => {
  const f = menuFixture();
  f.btn.events.click();
  assert.equal(f.menu.inert, false);
  assert.equal(f.menu.attrs['aria-hidden'], 'false');
  assert.equal(f.btn.attrs['aria-expanded'], 'true');
  assert.equal(f.btn.textContent, 'Close');
  assert.equal(f.main.inert, true);
  assert.equal(f.footer.inert, true);
  assert.equal(f.document.documentElement.classList.contains('menu-open'), true);
  assert.equal(f.document.activeElement, f.links[0]);
  f.btn.events.click();
  assert.equal(f.menu.inert, true);
  assert.equal(f.btn.attrs['aria-expanded'], 'false');
  assert.equal(f.btn.textContent, 'Menu');
  assert.equal(f.main.inert, false);
  assert.equal(f.footer.inert, false);
  assert.equal(f.document.body.classList.contains('locked'), false);
  assert.equal(f.document.documentElement.classList.contains('menu-open'), false);
  assert.equal(f.document.activeElement, f.btn);
});

test('Escape closes and Tab stays within the open navigation', () => {
  const f = menuFixture();
  f.btn.events.click();
  f.theme.focus();
  assert.equal(f.key('Tab').prevented, true);
  assert.equal(f.document.activeElement, f.btn);
  assert.equal(f.key('Tab', true).prevented, true);
  assert.equal(f.document.activeElement, f.theme);
  assert.equal(f.key('Escape').prevented, true);
  assert.equal(f.menu.inert, true);
  assert.equal(f.document.activeElement, f.btn);
});

test('link navigation, desktop resize, and back-forward restore unlock scrolling', () => {
  for (const close of [f => f.links[0].events.click(), f => {
    f.media.matches = false;
    f.media.change();
  }, f => f.pageEvents.pageshow()]) {
    const f = menuFixture();
    f.btn.events.click();
    close(f);
    assert.equal(f.menu.classList.contains('open'), false);
    assert.equal(f.document.body.classList.contains('locked'), false);
    assert.equal(f.main.inert, false);
  }
});

test('desktop cannot open the mobile overlay', () => {
  const f = menuFixture();
  f.media.matches = false;
  f.btn.events.click();
  assert.equal(f.menu.inert, true);
  assert.equal(f.menu.classList.contains('open'), false);
});

test('Close button header stays above the menu overlay', () => {
  const header = css.match(/header\.site\{([^}]+)\}/)[1];
  const menu = css.match(/\.mobile-menu\{([^}]+)\}/)[1];
  assert.ok(Number(header.match(/z-index:(\d+)/)[1]) > Number(menu.match(/z-index:(\d+)/)[1]));
  assert.match(menu, /visibility:hidden/);
  assert.match(menu, /overflow-y:auto/);
  assert.match(css, /\.mobile-menu\.open\{[^}]*visibility:visible/);
});

test('home CTA reaches selected work and featured case images precede long details', () => {
  const home = read('index.html');
  assert.match(home, /href="#selected-work"/);
  assert.equal((home.match(/id="selected-work"/g) || []).length, 1);
  for (const name of ['channel-13', 'museum-of-natural-history', 'partner-tv', 'simply-vision-pro']) {
    const html = read(`work/${name}.html`);
    const positions = ['c-open', 'c-hero', 'c-meta', 'project-facts', 'c-story']
      .map(className => html.indexOf(`class="${className}"`));
    assert.ok(positions.every((position, index) => position >= 0 && (!index || position > positions[index - 1])), name);
    assert.equal((html.match(/class="c-hero"/g) || []).length, 1);
  }
});

const marketsSource = site.match(/const MARKETS = (\{[\s\S]*?\n\});/)[1];
const markets = vm.runInNewContext(`(${marketsSource})`);
const contact = read('contact.html');
const defaultBands = [...contact.matchAll(/<option data-band="(\d+)">([^<]+)<\/option>/g)];

test('every market updates all four budget options without leaving mixed currencies', () => {
  assert.equal(defaultBands.length, 4);
  assert.deepEqual(defaultBands.map(match => match[2]), Array.from(markets.ILS.bands));
  for (const [currency, market] of Object.entries(markets)) {
    const bands = defaultBands.map(match => ({ dataset: { band: match[1] }, textContent: match[2] }));
    const document = { documentElement: { dataset: {} }, querySelectorAll: selector => selector === '[data-band]' ? bands : [] };
    vm.runInNewContext(section('/* ---------- engagement budgets', '/* ---------- theme'), {
      document, URLSearchParams, location: { search: `?cur=${currency}` }
    });
    assert.equal(market.bands.length, 4);
    assert.deepEqual(bands.map(band => band.textContent), Array.from(market.bands));
    assert.equal(document.documentElement.dataset.currency, currency);
  }
});

function enquiryFixture() {
  const module = { exports: {} }, sent = [];
  vm.runInNewContext(read('api/enquiry.js'), {
    module, process: { env: { RESEND_API_KEY: 'local-test-only' } },
    console: { error() {} },
    fetch: async (url, options) => { sent.push({ url, body: JSON.parse(options.body) }); return { ok: true }; }
  });
  async function submit(budget, id) {
    const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, setHeader() {} };
    await module.exports({ method: 'POST', headers: { 'x-forwarded-for': `192.0.2.${id}` }, body: {
      name: 'Local test', email: 'test@example.test', project: 'Local regression test only.', budget
    } }, res);
    return res;
  }
  return { submit, sent };
}

test('API accepts every displayed budget, including defaults with no JavaScript', async () => {
  const f = enquiryFixture();
  const budgets = [...new Set([...Object.values(markets).flatMap(market => Array.from(market.bands)), ...defaultBands.map(match => match[2]), 'Not sure yet', ''])];
  for (const [index, budget] of budgets.entries()) {
    const response = await f.submit(budget, index + 1);
    assert.equal(response.code, 200, budget);
    assert.equal(response.body.ok, true, budget);
  }
  assert.equal(f.sent.length, budgets.length);
});

test('API still rejects invalid budget options before attempting email delivery', async () => {
  const f = enquiryFixture();
  const response = await f.submit('Not an offered budget', 1);
  assert.equal(response.code, 400);
  assert.equal(f.sent.length, 0);
});
