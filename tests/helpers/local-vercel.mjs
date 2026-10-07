/* ============================================================
   A small local stand-in for Vercel's routing, close enough to test
   the agent-facing behaviour end to end over real HTTP:
     vercel.json redirects → middleware.js → /api functions or static
     files → 404.html, with vercel.json headers on every response.
   Not a replacement for `vercel dev`; it covers what this site uses.

   Run directly to browse:  node tests/helpers/local-vercel.mjs 8472
   ============================================================ */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, require, loadMiddleware } from './load.mjs';

const TYPES = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.json':'application/json',
  '.txt':'text/plain; charset=utf-8', '.xml':'application/xml', '.svg':'image/svg+xml', '.webp':'image/webp', '.jpg':'image/jpeg', '.png':'image/png' };

/* the subset of path-to-regexp vercel.json uses here: :name, :name*, :name(regex), (regex) */
function toRegex(source){
  let re = '', i = 0;
  while(i < source.length){
    const c = source[i];
    if(c === ':'){
      const m = /^:([A-Za-z]+)(\([^)]*\))?(\*)?/.exec(source.slice(i));
      re += m[2] ? m[2] : m[3] ? '(.*)' : '([^/]+)';
      i += m[0].length;
    }else if(c === '('){
      const j = source.indexOf(')', i); re += source.slice(i, j + 1); i = j + 1;
    }else if(c === '\\'){ re += source.slice(i, i + 2); i += 2; }
    else { re += /[.*+?^${}|[\]]/.test(c) ? '\\' + c : c; i++; }
  }
  return new RegExp('^' + re + '$');
}
const names = source => [...source.matchAll(/:([A-Za-z]+)/g)].map(m => m[1]);

export async function createServer(){
  const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  const mw = await loadMiddleware();

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'https://itaiagami.com');
    for(const h of vercel.headers || []) if(toRegex(h.source).test(url.pathname)) for(const { key, value } of h.headers) res.setHeader(key, value);

    for(const r of vercel.redirects){
      if(r.has) continue;
      const m = toRegex(r.source).exec(url.pathname);
      if(!m) continue;
      let dest = r.destination;
      names(r.source).forEach((n, i) => { dest = dest.replace(':' + n, m[i + 1]); });
      res.writeHead(r.permanent ? 308 : 307, { Location: dest }); return res.end();
    }

    let target = url;
    const mwRes = mw.default(new Request(url, { method: req.method, headers: req.headers }));
    if(mwRes) target = new URL(mwRes.headers.get('x-middleware-rewrite'));

    if(target.pathname.startsWith('/api/')){
      const file = path.join(ROOT, target.pathname + '.js');
      if(fs.existsSync(file)){
        const chunks = []; for await (const c of req) chunks.push(c);
        let body = Buffer.concat(chunks).toString();
        if(/json/.test(req.headers['content-type'] || '')){ try{ body = JSON.parse(body); }catch{} }
        res.status = c => { res.statusCode = c; return res; };
        res.json = o => { if(!res.getHeader('content-type')) res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); return res; };
        return require(file)({ method: req.method, headers: req.headers, body,
          query: Object.fromEntries(target.searchParams), url: target.pathname + target.search }, res);
      }
    }

    let rel = decodeURIComponent(url.pathname);
    if(rel.endsWith('/')) rel += 'index.html';
    const file = path.join(ROOT, rel);
    if(file.startsWith(ROOT) && fs.existsSync(file) && fs.statSync(file).isFile()){
      if(!res.getHeader('content-type')) res.setHeader('Content-Type', TYPES[path.extname(file)] || (rel.includes('.well-known') ? 'application/json' : 'application/octet-stream'));
      res.statusCode = 200;
      return res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(file));
    }
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(fs.readFileSync(path.join(ROOT, '404.html')));
  });
}

if(import.meta.url === 'file://' + process.argv[1]){
  const port = +process.argv[2] || 8472;
  (await createServer()).listen(port, () => console.log('http://localhost:' + port));
}
