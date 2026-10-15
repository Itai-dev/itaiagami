/* ============================================================
   Vercel Routing Middleware — runs before the static files.

   1. Markdown for agents (acceptmarkdown.com). A page request whose
      Accept header prefers text/markdown over text/html is rewritten
      to /api/markdown, which answers with the same page as Markdown
      (Content-Type: text/markdown, Vary: Accept), or a Markdown 404.
      Browsers never prefer text/markdown, so they get the HTML as before.
   2. API routing. /api/v1/<endpoint> (the versioned public API) maps onto
      the same functions as its alias /api/<endpoint>; any other /api/vN
      answers a JSON 404. /api/projects/{slug} goes to /api/projects?slug=,
      and any /api path that is not an endpoint goes to /api/not-found
      so it answers with a JSON error instead of the HTML 404 page.

   No dependencies: a rewrite is just the x-middleware-rewrite header
   (what @vercel/functions' rewrite() sets), and returning nothing lets
   the request continue untouched.
   ============================================================ */

export const config = {
  /* skip static assets: nothing there has a Markdown form */
  matcher: '/((?!assets/|css/|js/|favicon\\.svg|.*\\.(?:png|jpe?g|webp|gif|svg|mp4|pdf|css|js|mjs|ico|woff2?)$).*)'
};

const API = new Set(['/api/enquiry', '/api/geo', '/api/stats', '/api/projects', '/api/services', '/api/markdown', '/api/not-found']);
/* endpoints published under /api/v1 (the private and internal ones are not) */
const PUBLIC = new Set(['/enquiry', '/geo', '/projects', '/services']);

function notFound(url){
  const to = new URL('/api/not-found', url);
  to.searchParams.set('path', url.pathname);
  return to;
}
/* Files that are already machine-readable keep their own type. */
const RAW = /\.(?:txt|xml|json|md|mjs)$/i;

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
    let clean = pathname.replace(/\/+$/, '');
    /* /api/v1/<endpoint> is the versioned public surface; /api/<endpoint> is its alias */
    const v1 = /^\/api\/v1(\/[^/]+)(\/.*)?$/.exec(clean);
    if(v1 && PUBLIC.has(v1[1])) clean = '/api' + v1[1] + (v1[2] || '');
    else if(/^\/api\/v\d+(\/|$)/.test(clean)) return notFound(url);
    const one = /^\/api\/projects\/([^/]+)$/.exec(clean);
    if(one){
      const to = new URL('/api/projects' + url.search, url);
      to.searchParams.set('slug', decodeURIComponentSafe(one[1]));
      return to;
    }
    if(API.has(clean)) return clean === pathname ? null : new URL(clean + url.search, url);
    return notFound(url);
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

/** The homepage cloud replaces the work index, services and about pages: a browser
    (or search engine) asking for one is sent permanently to the cloud or the matching
    panel. Case studies (/work/<slug>.html) stay pages of their own; the cloud opens
    them in its window. Requests for Markdown still get the page (route() runs first). */
export function moved(pathname){
  if(pathname === '/work.html') return '/';
  if(pathname === '/services.html' || /^\/services\/[a-z0-9-]+\.html$/.test(pathname)) return '/?panel=offer';
  if(pathname === '/about.html') return '/?panel=about';
  return null;
}

export default function middleware(request){
  const url = new URL(request.url);
  const to = route(request.method, url, request.headers.get('accept'));
  if(to) return rewrite(to);
  const dest = (request.method === 'GET' || request.method === 'HEAD') && moved(url.pathname);
  if(dest) return new Response(null, { status: 308, headers: { Location: new URL(dest, url).toString() } });
}
