/* Shared test helpers: load middleware.js (ESM syntax in a CommonJS
   package) and fake the small part of Vercel's req/res the API uses. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const require = createRequire(path.join(ROOT, 'package.json'));

export async function loadMiddleware(){
  const src = fs.readFileSync(path.join(ROOT, 'middleware.js'), 'utf8');
  return import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
}

export function fakeRes(){
  const res = {
    statusCode: 200, headers: {}, body: undefined, ended: false,
    setHeader(k, v){ this.headers[k.toLowerCase()] = String(v); return this; },
    getHeader(k){ return this.headers[k.toLowerCase()]; },
    status(c){ this.statusCode = c; return this; },
    json(o){ if(!this.headers['content-type']) this.setHeader('Content-Type', 'application/json; charset=utf-8'); this.body = JSON.stringify(o); this.ended = true; return this; },
    end(b){ if(b !== undefined) this.body = String(b); this.ended = true; return this; }
  };
  return res;
}

export async function call(handler, { method = 'GET', query = {}, body, headers = {} } = {}){
  const res = fakeRes();
  await handler({ method, query, body, headers }, res);
  return res;
}
