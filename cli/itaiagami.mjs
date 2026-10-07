#!/usr/bin/env node
/* ============================================================
   itaiagami — command-line client for the Itai Agami API
   (https://itaiagami.com/openapi.json). No dependencies; Node 18+.

     node itaiagami.mjs services
     node itaiagami.mjs projects --category Culture
     node itaiagami.mjs project channel-13
     node itaiagami.mjs page /about            (any page, as Markdown)
     node itaiagami.mjs enquire --name "Ada" --email ada@example.com \
         --project "Launching a new product in March" --dry-run

   Add --json to any command for the raw API response. Set
   ITAIAGAMI_API_BASE to point it at another deployment.
   Exit codes: 0 ok, 1 API or network error, 2 usage error.
   ============================================================ */

import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const VERSION = '1.0.0';
const DEFAULT_BASE = 'https://itaiagami.com';

const HELP = `itaiagami ${VERSION} — Itai Agami, independent Creative Director (https://itaiagami.com)

Usage: itaiagami <command> [options]

Commands
  services                     Services and starting prices per market
  projects [--category <c>]    Case studies (Brand, Culture or Technology)
  project <slug>               One case study, e.g. channel-13
  page [path]                  Any page of the site as Markdown (default /)
  enquire                      Send a project enquiry (asks to confirm)
      --name <name> --email <email> --project <text>    required
      --org <org> --type <type> --budget <band> --timeline <t> --source <s>
      --dry-run                validate only, send nothing (sandbox)
      --yes                    do not ask for confirmation

Options
  --json                       print the raw JSON response
  --base <url>                 API origin (default ${DEFAULT_BASE}, or $ITAIAGAMI_API_BASE)
  -h, --help / -v, --version

Docs: https://itaiagami.com/developers.html`;

export function parseArgs(argv){
  const out = { _: [], flags: {} };
  for(let i = 0; i < argv.length; i++){
    const a = argv[i];
    if(a === '-h') out.flags.help = true;
    else if(a === '-v') out.flags.version = true;
    else if(a.startsWith('--')){
      const [k, inline] = a.slice(2).split(/=(.*)/s);
      const boolean = ['json', 'dry-run', 'yes', 'help', 'version'].includes(k);
      out.flags[k] = boolean ? true : inline !== undefined ? inline : argv[++i];
      if(!boolean && out.flags[k] === undefined) throw new UsageError('--' + k + ' needs a value');
    }else out._.push(a);
  }
  return out;
}

export class UsageError extends Error {}
export class ApiError extends Error {
  constructor(status, body){
    super((body && body.error) || ('HTTP ' + status));
    this.status = status; this.body = body;
  }
}

async function request(base, path, opts = {}){
  const res = await fetch(base.replace(/\/+$/, '') + path, {
    ...opts,
    headers: { 'User-Agent': 'itaiagami-cli/' + VERSION, ...(opts.headers || {}) }
  });
  const type = res.headers.get('content-type') || '';
  const body = type.includes('json') ? await res.json().catch(() => null) : await res.text();
  if(!res.ok) throw new ApiError(res.status, typeof body === 'object' ? body : null);
  return body;
}

const fmtServices = j => j.services.map(s => `${s.name}\n  ${s.summary}\n  Best for: ${s.bestFor}\n  ${s.url}`).join('\n\n')
  + '\n\nStarting at: ' + j.pricing.startingAt.map(p => `${p.display} (${p.market})`).join(', ')
  + `\nEnquire: itaiagami enquire …   Book a call: ${j.contact.bookCall}`;

const fmtProjects = j => j.projects.map(p => `${p.slug.padEnd(30)} ${p.name} (${p.category}): ${p.summary}`).join('\n')
  + `\n\n${j.count} case studies. Details: itaiagami project <slug>`;

const fmtProject = p => [
  `${p.name} (${p.client})`, p.summary, '',
  `Role: ${p.role}`, p.collaboration ? `With: ${p.collaboration}` : '', '',
  `Challenge: ${p.challenge}`, `Idea: ${p.idea}`, `Result: ${p.result}`, '',
  `Contribution: ${p.contribution}`, '', p.url
].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');

/** Runs one command. Returns the text to print; throws UsageError or ApiError. */
export async function run(argv, { env = process.env, confirm } = {}){
  const { _: [cmd, ...rest], flags } = parseArgs(argv);
  if(flags.version) return VERSION;
  if(flags.help || !cmd) return HELP;
  const base = flags.base || env.ITAIAGAMI_API_BASE || DEFAULT_BASE;
  const out = (j, fmt) => flags.json ? JSON.stringify(j, null, 2) : fmt(j);

  switch(cmd){
    case 'services': return out(await request(base, '/api/v1/services'), fmtServices);
    case 'projects': {
      const q = flags.category ? '?category=' + encodeURIComponent(flags.category) : '';
      return out(await request(base, '/api/v1/projects' + q), fmtProjects);
    }
    case 'project': {
      if(!rest[0]) throw new UsageError('project needs a slug, e.g. itaiagami project channel-13');
      return out(await request(base, '/api/v1/projects/' + encodeURIComponent(rest[0])), fmtProject);
    }
    case 'page': {
      const p = rest[0] || '/';
      return request(base, p.startsWith('/') ? p : '/' + p, { headers: { Accept: 'text/markdown' } });
    }
    case 'enquire': {
      for(const k of ['name', 'email', 'project']) if(!flags[k]) throw new UsageError('enquire needs --' + k);
      const body = { lead_source: 'itaiagami-cli' };
      for(const k of ['name', 'email', 'project', 'org', 'type', 'budget', 'timeline', 'source']) if(flags[k]) body[k] = flags[k];
      if(flags['dry-run']) body.dry_run = true;
      else if(!flags.yes){
        const ok = confirm && await confirm(`Send this enquiry to Itai Agami as ${body.name} <${body.email}>? [y/N] `);
        if(!ok) return 'Not sent.';
      }
      const j = await request(base, '/api/v1/enquiry', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      return out(j, r => r.dryRun ? 'Valid. Nothing was sent (dry run).' : 'Sent. Itai will reply to ' + body.email + '.');
    }
    default: throw new UsageError('unknown command "' + cmd + '". Try itaiagami --help');
  }
}

async function ask(question){
  const { createInterface } = await import('node:readline/promises');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try{ return /^y(es)?$/i.test((await rl.question(question)).trim()); }finally{ rl.close(); }
}

/* run only when executed, not when imported (npm's bin is a symlink, hence realpath) */
const isMain = (() => {
  try{ return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href; }
  catch{ return false; }
})();

if(isMain){
  run(process.argv.slice(2), { confirm: ask }).then(text => { if(text) console.log(text); }, err => {
    if(err instanceof UsageError){ console.error('itaiagami: ' + err.message); process.exitCode = 2; return; }
    if(err instanceof ApiError){
      const b = err.body || {};
      console.error(`itaiagami: ${err.message}${b.code ? ' (' + b.code + ')' : ''}${b.hint ? '\n  ' + b.hint : ''}`);
    }else console.error('itaiagami: ' + (err && err.message || err));
    process.exitCode = 1;
  });
}
