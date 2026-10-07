/* ============================================================
   Vercel Routing Middleware — runs before the static files.

   1. Markdown for agents (acceptmarkdown.com). A page request whose
      Accept header prefers text/markdown over text/html is rewritten
      to /api/markdown, which answers with the same page as Markdown
      (Content-Type: text/markdown, Vary: Accept), or a Markdown 404.
      Browsers never prefer text/markdown, so they get the HTML as before.
   2. API routing. /api/projects/{slug} goes to /api/projects?slug=,
      and any /api path that is not an endpoint goes to /api/not-found
      so it answers with a JSON error instead of the HTML 404 page.

   No dependencies: a rewrite is just the x-middleware-rewrite header
   (what @vercel/functions' rewrite() sets), and returning nothing lets
   the request continue untouched.
   ============================================================ */

export const config = {
  /* skip static assets: nothing there has a Markdown form */
  matcher: '/((?!assets/|css/|js/|favicon\\.svg|.*\\.(?:png|jpe?g|webp|gif|svg|mp4|pdf|css|js|ico|woff2?)$).*)'
};

const API = new Set(['/api/enquiry', '/api/geo', '/api/stats', '/api/projects', '/api/services', '/api/markdown', '/api/not-found']);
/* Files that are already machine-readable keep their own type. */
const RAW = /\.(?:txt|xml|json|md)$/i;

/** q-value of the best Accept entry matching `type` (exact, then type/*, then *\/*). */
function quality(accept, type){
  const [major] = type.split('/');
  let exact = -1, partial = -1, any = -1;
  for(const part of String(accept || '').split(',')){
    const [range, ...params] = part.trim().toLowerCase().split(';').map(s => s.trim());
    if(!range) continue;
    let q = 1;
    for(const p of params){ const m = /^q=([0-9.]+)$/.exec(p); if(m) q = Math.min(1, parseFloat(m[1]) || 0); }
    if(range === type) exact = Math.max(exact, q);
    else if(range === major + '/*') partial = Math.max(partial, q);
    else if(range === '*/*') any = Math.max(any, q);
  }
  return exact >= 0 ? exact : partial >= 0 ? partial : any >= 0 ? any : 0;
}

/** True when the client explicitly asks for Markdown at least as strongly as HTML. */
export function prefersMarkdown(accept){
  const a = String(accept || '').toLowerCase();
  if(!/(^|,)\s*text\/markdown\s*(;|,|$)/.test(a)) return false;   /* wildcards alone never select Markdown */
  const md = quality(a, 'text/markdown');
  return md > 0 && md >= quality(a, 'text/html');
}

const rewrite = url => new Response(null, { headers: { 'x-middleware-rewrite': url.toString() } });

/** Returns the URL to rewrite to, or null to let the request through. */
export function route(method, url, accept){
  const { pathname } = url;

  if(pathname === '/api' || pathname.startsWith('/api/')){
    const clean = pathname.replace(/\/+$/, '');
    const one = /^\/api\/projects\/([^/]+)$/.exec(clean);
    if(one){
      const to = new URL('/api/projects', url);
      to.searchParams.set('slug', decodeURIComponentSafe(one[1]));
      return to;
    }
    if(API.has(clean)) return clean === pathname ? null : new URL(clean + url.search, url);
    const to = new URL('/api/not-found', url);
    to.searchParams.set('path', pathname);
    return to;
  }

  if((method === 'GET' || method === 'HEAD') && !RAW.test(pathname) && !pathname.startsWith('/.well-known/')
     && prefersMarkdown(accept)){
    const to = new URL('/api/markdown', url);
    to.searchParams.set('path', pathname);
    return to;
  }
  return null;
}

function decodeURIComponentSafe(s){ try{ return decodeURIComponent(s); }catch{ return s; } }

export default function middleware(request){
  const to = route(request.method, new URL(request.url), request.headers.get('accept'));
  if(to) return rewrite(to);
}
