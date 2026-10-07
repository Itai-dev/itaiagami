/* The CLI against the real handlers, through the local Vercel stand-in. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { ROOT, require } from './helpers/load.mjs';
import { createServer } from './helpers/local-vercel.mjs';
import * as cli from '../cli/itaiagami.mjs';

const exec = promisify(execFile);
const BIN = path.join(ROOT, 'cli/itaiagami.mjs');
let server, base;
before(async () => {
  require('./api/_lib/ratelimit.js')._hits.clear();
  server = await createServer();
  await new Promise(r => server.listen(0, r));
  base = 'http://localhost:' + server.address().port;
});
after(() => server.close());

const run = (...argv) => cli.run([...argv, '--base', base]);

test('help, version and usage errors', async () => {
  assert.match(await cli.run([]), /^itaiagami 1\.0\.0/);
  assert.match(await cli.run(['--help']), /enquire/);
  assert.equal(await cli.run(['-v']), cli.VERSION);
  await assert.rejects(cli.run(['frobnicate']), cli.UsageError);
  await assert.rejects(cli.run(['project']), cli.UsageError);
  await assert.rejects(cli.run(['enquire', '--name', 'A']), /--email/);
  assert.throws(() => cli.parseArgs(['--category']), /needs a value/);
  assert.deepEqual(cli.parseArgs(['projects', '--category=Brand', '--json']).flags, { category: 'Brand', json: true });
});

test('services, projects and project', async () => {
  assert.match(await run('services'), /Brand Strategy & Identity Systems[\s\S]*Starting at: ₪30,000 \(IL\)/);
  const list = await run('projects', '--category', 'Culture');
  assert.match(list, /tower-of-david\s+Tower of David \(Culture\)/);
  assert.doesNotMatch(list, /\(Brand\)/);
  assert.match(await run('project', 'channel-13'), /^Channel 13 \(Channel 13\)[\s\S]*Contribution: /);
  assert.equal(JSON.parse(await run('project', 'channel-13', '--json')).slug, 'channel-13');
});

test('page prints Markdown', async () => {
  assert.match(await run('page', '/about'), /^# About Itai Agami/);
});

test('enquire --dry-run validates without sending; API errors carry code and hint', async () => {
  assert.equal(await run('enquire', '--name', 'Ada', '--email', 'ada@example.com', '--project', 'A launch in March', '--dry-run'),
    'Valid. Nothing was sent (dry run).');
  const err = await run('enquire', '--name', 'Ada', '--email', 'nope', '--project', 'A launch in March', '--dry-run').catch(e => e);
  assert.ok(err instanceof cli.ApiError);
  assert.equal(err.status, 400);
  assert.equal(err.body.code, 'invalid_email');
});

test('enquire asks before sending, and sends nothing on no', async () => {
  let asked = '';
  const out = await cli.run(['enquire', '--name', 'Ada', '--email', 'ada@example.com', '--project', 'A launch in March', '--base', base],
    { confirm: async q => { asked = q; return false; } });
  assert.equal(out, 'Not sent.');
  assert.match(asked, /Ada <ada@example\.com>/);
});

test('as a process: exit codes 0, 1 and 2', async () => {
  const ok = await exec(process.execPath, [BIN, 'services', '--json', '--base', base]);
  assert.equal(JSON.parse(ok.stdout).services.length, 4);
  const apiErr = await exec(process.execPath, [BIN, 'project', 'nope', '--base', base]).catch(e => e);
  assert.equal(apiErr.code, 1);
  assert.match(apiErr.stderr, /project_not_found/);
  const usage = await exec(process.execPath, [BIN, 'nope']).catch(e => e);
  assert.equal(usage.code, 2);
});

test('cli/package.json publishes the same file as a bin', () => {
  const pkg = require('./cli/package.json');
  assert.equal(pkg.bin.itaiagami, 'itaiagami.mjs');
  assert.equal(pkg.version, cli.VERSION);
  assert.equal(pkg.type, 'module');
});
