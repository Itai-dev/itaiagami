/* ============================================================
   GET /api/markdown?path=/some/page — the Markdown version of a page.

   Not called directly: middleware.js rewrites any page request whose
   Accept header prefers text/markdown to this function, so
     curl -H 'Accept: text/markdown' https://itaiagami.com/
   returns Markdown at the page's own URL (acceptmarkdown.com). Browsers,
   which never ask for text/markdown, keep getting the HTML untouched.

   Unknown paths answer 404 with a Markdown body that points to the
   places an agent can recover from (llms.txt, sitemap, API spec).
   The pages are bundled with the function via includeFiles in vercel.json.
   ============================================================ */

const fs = require('node:fs');
const path = require('node:path');
const { htmlToMarkdown } = require('./_lib/html-to-markdown.js');

const SITE = 'https://itaiagami.com';
const ROOT = path.join(__dirname, '..');
/* private or non-content pages are never converted */
const EXCLUDE = new Set(['404.html', 'stats.html']);

/* Map a URL path onto one of the site's own .html files, or null. */
function resolvePage(urlPath){
  let p = String(urlPath || '/');
  try{ p = decodeURIComponent(p); }catch{ return null; }
  p = p.split(/[?#]/)[0];
  if(!p.startsWith('/') || p.includes('..') || p.includes('\\') || p.includes('\0')) return null;
  if(!/^[a-z0-9/._-]*$/i.test(p)) return null;
  p = p.replace(/\/+$/, '') || '/';
  const candidates = p === '/' ? ['index.html']
    : p.endsWith('.html') ? [p.slice(1)]
    : [p.slice(1) + '.html', p.slice(1) + '/index.html'];
  for(const rel of candidates){
    if(EXCLUDE.has(rel) || rel.split('/').length > 2) continue;
    const file = path.join(ROOT, rel);
    if(!file.startsWith(ROOT + path.sep)) continue;
    try{ if(fs.statSync(file).isFile()) return { rel, file }; }catch{}
  }
  return null;
}

function notFoundMarkdown(urlPath){
  const shown = String(urlPath || '').slice(0, 200).replace(/[`<>]/g, '');
  return [
    '# 404: page not found',
    '',
    'There is no page at `' + shown + '` on itaiagami.com. It may have moved or never existed.',
    '',
    'Where to go instead:',
    '',
    '- [llms.txt](' + SITE + '/llms.txt): a summary of the site and links to every important page, with guidance for agents',
    '- [Sitemap](' + SITE + '/sitemap.xml): every public page',
    '- [Home](' + SITE + '/): Itai Agami, independent Creative Director',
    '- [Work](' + SITE + '/work.html), [Services](' + SITE + '/services.html), [Contact](' + SITE + '/contact.html)',
    '- [OpenAPI description](' + SITE + '/openapi.json): the public JSON API',
    ''
  ].join('\n');
}

module.exports = (req, res) => {
  const urlPath = String((req.query && req.query.path) || '/');
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Vary', 'Accept');
  res.setHeader('X-Robots-Tag', 'noindex');

  if(req.method !== 'GET' && req.method !== 'HEAD'){
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).end('# 405: method not allowed\n\nUse GET to read a page as Markdown. See ' + SITE + '/llms.txt\n');
  }

  const page = resolvePage(urlPath);
  if(!page){
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
    return res.status(404).end(req.method === 'HEAD' ? undefined : notFoundMarkdown(urlPath));
  }

  const pageUrl = SITE + '/' + (page.rel === 'index.html' ? '' : page.rel);
  const md = htmlToMarkdown(fs.readFileSync(page.file, 'utf8'), pageUrl);
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  res.setHeader('Link', '<' + pageUrl + '>; rel="canonical"');
  return res.status(200).end(req.method === 'HEAD' ? undefined : md);
};

module.exports.resolvePage = resolvePage;
module.exports.notFoundMarkdown = notFoundMarkdown;
