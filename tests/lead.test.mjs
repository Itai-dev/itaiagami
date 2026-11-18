/* /api/lead and the questionnaire's shared rules (js/nadlan-config.js). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { require, call } from './helpers/load.mjs';

const lead = require('./api/lead.js');
const N = require('./js/nadlan-config.js');
const parse = r => JSON.parse(r.body);

const good = () => ({
  type: 'בניין בוטיק', units: '21–50', stage: 'בשיווק', has: ['הדמיות', 'סרט'], timeline: 'מיד',
  name: 'דנה לוי', company: 'לוי יזמות', phone: '052-123 4567', consent: true
});
const post = (body, ip) => call(lead, { method: 'POST', body, headers: { 'x-forwarded-for': ip || '203.0.113.50', 'user-agent': 'test-agent' } });

test('phone: Israeli mobile and landline numbers, with or without +972', () => {
  for(const ok of ['0521234567', '052-123-4567', '+972 52 123 4567', '972521234567', '03-1234567', '02 123 4567', '0771234567'])
    assert.ok(N.phone(ok), ok);
  assert.equal(N.phone('+972 52 123 4567'), '0521234567');
  for(const bad of ['', '12345', '052123456', '05212345678', '+1 415 555 0100', '0121234567', 'abc'])
    assert.equal(N.phone(bad), '', bad);
});

test('brief: everything not chosen in step 4 becomes a recommended deliverable', () => {
  const b = N.brief({ type: 'מגדל מגורים', units: 'מעל 150', stage: 'בשיווק', has: ['הדמיות', 'סרט'], timeline: 'מיד' });
  assert.deepEqual(b.missing, [N.DELIVERABLES['שם ומיתוג'], N.DELIVERABLES['אתר או דף נחיתה'], N.DELIVERABLES['קמפיינים פעילים']]);
  assert.match(b.text, /מה חסר להשקה/);
  assert.equal(N.brief({ has: [N.NOTHING] }).missing.length, 5);
  assert.equal(N.brief({ has: Object.keys(N.DELIVERABLES) }).missing.length, 0);
});

test('/api/lead: only POST', async () => {
  const r = await call(lead, { method: 'GET' });
  assert.equal(r.statusCode, 405);
  assert.equal(parse(r).code, 'method_not_allowed');
});

test('/api/lead: every field is validated on the server', async () => {
  const cases = [
    [{ type: 'טירה' }, 'invalid_type'],
    [{ units: '' }, 'invalid_units'],
    [{ stage: undefined }, 'invalid_stage'],
    [{ has: [] }, 'invalid_has'],
    [{ has: 'הדמיות' }, 'invalid_has'],
    [{ has: ['הדמיות', 'משהו אחר'] }, 'invalid_has'],
    [{ timeline: 'מחר' }, 'invalid_timeline'],
    [{ name: '' }, 'missing_name'],
    [{ company: ' ' }, 'missing_company'],
    [{ phone: '12345' }, 'invalid_phone'],
    [{ email: 'not-an-email' }, 'invalid_email'],
    [{ consent: false }, 'missing_consent'],
    [{ consent: 'true' }, 'missing_consent']
  ];
  for(const [change, code] of cases){
    const r = await post(Object.assign(good(), change));
    assert.equal(r.statusCode, 400, code);
    const j = parse(r);
    assert.equal(j.code, code);
    assert.ok(j.error.length > 0 && j.hint.length > 0);
  }
});

test('/api/lead: a valid dry run sends nothing', async () => {
  const r = await post(Object.assign(good(), { email: 'dana@example.com', city: 'תל אביב', dry_run: true }));
  assert.equal(r.statusCode, 200);
  assert.deepEqual(parse(r), { ok: true, dryRun: true });
});

test('/api/lead: the honeypot answers ok and stores nothing', async () => {
  const r = await post(Object.assign(good(), { website: 'http://spam.example' }));
  assert.equal(r.statusCode, 200);
  assert.deepEqual(parse(r), { ok: true });
});

test('/api/lead: stores the lead with the brief, click ids and user agent, then rate-limits', async () => {
  const saved = [process.env.RESEND_API_KEY, process.env.LEAD_WEBHOOK_URL, global.fetch];
  delete process.env.RESEND_API_KEY;
  process.env.LEAD_WEBHOOK_URL = 'https://sheet.example/hook';
  const seen = [];
  global.fetch = async (url, opts) => { seen.push([String(url), JSON.parse(opts.body)]); return { ok: true, status: 200, text: async () => '{"ok":true}' }; };
  const errLog = console.error; console.error = () => {};
  try{
    const ip = '198.51.100.77';
    const r = await post(Object.assign(good(), { has: ['כלום עדיין', 'סרט'], utm_source: 'instagram', utm_campaign: 'nadlan', fbclid: 'abc123', gclid: 'g1', city: 'חיפה' }), ip);
    assert.equal(r.statusCode, 200);
    assert.deepEqual(parse(r), { ok: true });
    assert.equal(seen.length, 1);
    const row = seen[0][1];
    assert.equal(row.phone, '0521234567');
    assert.equal(row.has, 'כלום עדיין');                       /* "nothing yet" stands alone */
    assert.equal(row.missing.split(' | ').length, 5);
    assert.match(row.brief, /מה חסר להשקה/);
    assert.equal(row.utm_source, 'instagram');
    assert.equal(row.fbclid, 'abc123');
    assert.equal(row.gclid, 'g1');
    assert.equal(row.user_agent, 'test-agent');
    assert.match(row.timestamp, /^\d{4}-\d\d-\d\dT/);
    assert.match(row.project, /טלפון: 0521234567/);            /* readable in the existing sheet columns */
    assert.equal(row.org, 'לוי יזמות');

    for(let i = 0; i < 4; i++) assert.equal((await post(good(), ip)).statusCode, 200);
    const limited = await post(good(), ip);
    assert.equal(limited.statusCode, 429);
    assert.ok(limited.headers['retry-after']);
  }finally{
    console.error = errLog;
    global.fetch = saved[2];
    if(saved[0] !== undefined) process.env.RESEND_API_KEY = saved[0];
    if(saved[1] !== undefined) process.env.LEAD_WEBHOOK_URL = saved[1]; else delete process.env.LEAD_WEBHOOK_URL;
  }
});

test('/api/lead: with nowhere to deliver it, the visitor is told it failed', async () => {
  const saved = [process.env.RESEND_API_KEY, process.env.LEAD_WEBHOOK_URL];
  delete process.env.RESEND_API_KEY; delete process.env.LEAD_WEBHOOK_URL;
  const errLog = console.error; console.error = () => {};
  try{
    const r = await post(good(), '198.51.100.78');
    assert.equal(r.statusCode, 502);
    assert.equal(parse(r).code, 'delivery_failed');
  }finally{
    console.error = errLog;
    if(saved[0] !== undefined) process.env.RESEND_API_KEY = saved[0];
    if(saved[1] !== undefined) process.env.LEAD_WEBHOOK_URL = saved[1];
  }
});

test('/nadlan: the page is Hebrew, right to left, standalone, and holds no secrets', () => {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const html = fs.readFileSync(path.join(root, 'nadlan/index.html'), 'utf8');
  assert.match(html, /<html lang="he" dir="rtl">/);
  assert.match(html, /name="robots" content="noindex"/);
  assert.ok(!/site\.js|home\.js/.test(html), 'no main site scripts or nav');
  const client = fs.readFileSync(path.join(root, 'js/nadlan.js'), 'utf8') + fs.readFileSync(path.join(root, 'js/nadlan-config.js'), 'utf8');
  assert.ok(!/RESEND|WEBHOOK|SECRET|process\.env/.test(client));
  for(const ev of ['quiz_start', "'quiz_step_'", 'quiz_submit', 'meeting_booked', 'whatsapp_click']) assert.ok(client.includes(ev), ev);
});
