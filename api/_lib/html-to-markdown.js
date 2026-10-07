/* ============================================================
   html-to-markdown — turns one of the site's own pages into Markdown
   for agents that send Accept: text/markdown (see middleware.js).

   Deliberately small and dependency-free: it only has to understand the
   markup this site writes, not arbitrary HTML. It reads the <title>, the
   meta description and the canonical URL from <head>, then converts the
   contents of <main>. Decorative markup is dropped: anything aria-hidden,
   scripts, styles, SVG, forms and the duplicated marquee links.
   ============================================================ */

const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','source','track','wbr']);
const SKIP = new Set(['script','style','svg','noscript','template','form','button','select','option','textarea','input','iframe','head']);
const BLOCK = new Set(['p','div','section','article','header','footer','nav','aside','main','figure','figcaption',
  'ul','ol','li','h1','h2','h3','h4','h5','h6','blockquote','details','summary','table','tr','dl','dt','dd','pre','hr','form']);

const ENT = { amp:'&', lt:'<', gt:'>', quot:'"', apos:"'", nbsp:' ', mdash:'—', ndash:'–', hellip:'…', rsquo:'’', lsquo:'‘', rdquo:'”', ldquo:'“', middot:'·', copy:'©', times:'×', rarr:'→', larr:'←' };
function decode(s){
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if(e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENT[e.toLowerCase()] != null ? ENT[e.toLowerCase()] : m;
  });
}

function attrs(src){
  const out = {};
  const re = /([^\s=\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let m;
  while((m = re.exec(src))) out[m[1].toLowerCase()] = decode(m[2] != null ? m[2] : m[3] != null ? m[3] : m[4] != null ? m[4] : '');
  return out;
}

/* A forgiving tokenizer → tree. Unclosed tags are closed by their parent. */
function parse(html){
  const root = { tag:'#root', attrs:{}, children:[] };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*?)(\/?)>|([^<]+|<)/g;
  let m;
  while((m = re.exec(html))){
    if(m[0].startsWith('<!--')) continue;
    const top = stack[stack.length - 1];
    if(m[5] != null){ top.children.push({ text: decode(m[5]) }); continue; }
    const tag = m[2].toLowerCase();
    if(m[1]){
      for(let i = stack.length - 1; i > 0; i--) if(stack[i].tag === tag){ stack.length = i; break; }
      continue;
    }
    const node = { tag, attrs: attrs(m[3]), children: [] };
    top.children.push(node);
    if(tag === 'script' || tag === 'style'){
      /* raw text: skip to the closing tag */
      const end = html.toLowerCase().indexOf('</' + tag, re.lastIndex);
      re.lastIndex = end < 0 ? html.length : end;
      continue;
    }
    if(!VOID.has(tag) && !m[4]) stack.push(node);
  }
  return root;
}

function find(node, tag){
  if(node.tag === tag) return node;
  for(const c of node.children || []){ const f = c.tag && find(c, tag); if(f) return f; }
  return null;
}
function all(node, pred, out = []){
  for(const c of node.children || []) if(c.tag){ if(pred(c)) out.push(c); all(c, pred, out); }
  return out;
}

const squash = s => s.replace(/[ \t\r\n\f]+/g, ' ');
const escMd = s => s.replace(/([\\`*_\[\]])/g, '\\$1');

function abs(href, base){
  if(!href) return '';
  try{ return new URL(href, base).href; }catch{ return href; }
}

/* Inline rendering: text, links, emphasis, code, images. */
function inline(node, ctx){
  if(node.text != null) return escMd(squash(node.text));
  const a = node.attrs || {};
  if(a['aria-hidden'] === 'true' || SKIP.has(node.tag)) return '';
  const kids = () => joinInline(node, ctx);
  switch(node.tag){
    case 'br': return '\\\n';
    case 'strong': case 'b': { const t = kids().trim(); return t ? '**' + t + '**' : ''; }
    case 'em': case 'i': { const t = kids().trim(); return t ? '*' + t + '*' : ''; }
    case 'code': { const t = textOf(node).trim(); return t ? '`' + t + '`' : ''; }
    case 'img': {
      if(!a.alt) return '';
      return '![' + escMd(squash(a.alt).trim()) + '](' + abs(a.src, ctx.base) + ')';
    }
    case 'video': {
      const label = squash(a['aria-label'] || a.title || 'Video').trim();
      return a.src ? '[' + escMd(label) + '](' + abs(a.src, ctx.base) + ')' : '';
    }
    case 'a': {
      /* image cards: the picture stands alone, the caption link follows on the page */
      /* service cards: a title span (.t) and a description span (.d) */
      const cls = c => ((c.attrs && c.attrs.class) || '').split(/\s+/);
      const t = (node.children || []).find(c => c.tag && cls(c).includes('t'));
      const d = (node.children || []).find(c => c.tag && cls(c).includes('d'));
      if(t && d) return '\n- [' + joinInline(t, ctx).trim() + '](' + abs(a.href, ctx.base) + '): ' + joinInline(d, ctx).trim() + '\n';
      const imgs = all(node, n => n.tag === 'img' && n.attrs.alt);
      if(imgs.length) return imgs.map(i => inline(i, ctx)).join(' ');
      const text = kids().replace(/\s+/g, ' ').trim();
      const href = abs(a.href, ctx.base);
      if(!text) return '';
      return href ? '[' + text + '](' + href + ')' : text;
    }
    default: return kids();
  }
}

/* Adjacent tags with no text between them (tag lists, link strips) would run
   together as "Channel 13Brand"; outside running prose, separate them. */
const PROSE = new Set(['p','h1','h2','h3','h4','h5','h6','li','a','strong','b','em','i','code','figcaption','dt','dd','summary','blockquote','label']);
function joinInline(node, ctx){
  const kids = node.children || [];
  const sep = PROSE.has(node.tag) ? '' : ' · ';
  let out = '', prevEl = false;
  for(const c of kids){
    const s = inline(c, ctx);
    if(!s) continue;
    const isEl = !!c.tag;
    if(sep && isEl && prevEl && !/\s$/.test(out) && !/^\s/.test(s)) out += sep;
    else if(!sep && (isEl || prevEl) && /[\p{L}\p{N}]$/u.test(out) && /^[\p{L}\p{N}]/u.test(s)) out += ' ';
    out += s;
    prevEl = isEl;
  }
  return out;
}

function textOf(node){
  if(node.text != null) return node.text;
  return (node.children || []).map(textOf).join('');
}

const hasBlockChild = n => (n.children || []).some(c => c.tag && (BLOCK.has(c.tag) || hasBlockChild(c)));

/* Block rendering: returns an array of Markdown blocks. */
function blocks(node, ctx, out){
  if(node.text != null){ const t = squash(node.text).trim(); if(t) out.push(escMd(t)); return out; }
  const a = node.attrs || {};
  if(a['aria-hidden'] === 'true' || SKIP.has(node.tag)){
    if(node.tag === 'form') out.push('*This page has a form. Agents can submit the same enquiry with `POST ' + abs('/api/enquiry', ctx.base) + '`, documented in [the OpenAPI description](' + abs('/openapi.json', ctx.base) + ').*');
    return out;
  }
  if(a['data-vimeo']){
    const title = a['data-title'] || 'Film';
    out.push('[' + escMd(title) + '](https://vimeo.com/' + encodeURIComponent(a['data-vimeo']) + ')');
    return out;
  }
  const tag = node.tag;
  const inl = () => inline(node, ctx).replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();

  if(tag === 'a' && hasBlockChild(node)){
    /* a whole card is one link: keep its structure, link its heading */
    const href = abs(a.href, ctx.base), inner = [];
    (node.children || []).forEach(c => blocks(c, ctx, inner));
    const h = inner.findIndex(b => /^#+ /.test(b));
    if(h >= 0) inner[h] = inner[h].replace(/^(#+) (.*)$/, (m, hs, t) => hs + ' [' + t + '](' + href + ')');
    else inner.push('[' + href + '](' + href + ')');
    out.push(...inner);
    return out;
  }
  if(/^h[1-6]$/.test(tag)){ const t = inl(); if(t) out.push('#'.repeat(+tag[1]) + ' ' + t); return out; }
  if(tag === 'hr'){ out.push('---'); return out; }
  if(tag === 'pre'){
    const code = textOf(node).replace(/^\n/, '').replace(/\s+$/, '');
    if(code) out.push('```\n' + code + '\n```');
    return out;
  }
  if(tag === 'summary'){ const t = inl(); if(t) out.push('### ' + t); return out; }
  if(tag === 'blockquote'){
    const inner = [];
    (node.children || []).forEach(c => blocks(c, ctx, inner));
    if(inner.length) out.push(inner.join('\n\n').split('\n').map(l => '> ' + l).join('\n'));
    return out;
  }
  if(tag === 'ul' || tag === 'ol'){
    let i = 0;
    const items = (node.children || []).filter(c => c.tag === 'li').map(li => {
      const inner = [];
      if(hasBlockChild(li)) (li.children || []).forEach(c => blocks(c, ctx, inner));
      else { const t = inline(li, ctx).replace(/\s+/g, ' ').trim(); if(t) inner.push(t); }
      if(!inner.length) return '';
      const mark = tag === 'ol' ? (++i) + '. ' : '- ';
      return mark + inner.join('\n\n').split('\n').join('\n' + ' '.repeat(mark.length));
    }).filter(Boolean);
    if(items.length) out.push(items.join('\n'));
    return out;
  }
  if(tag === 'table'){
    const rows = all(node, n => n.tag === 'tr').map(tr =>
      (tr.children || []).filter(c => c.tag === 'td' || c.tag === 'th').map(c => inline(c, ctx).replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim()));
    if(rows.length){
      const w = Math.max(...rows.map(r => r.length));
      const line = r => '| ' + Array.from({ length: w }, (_, i) => r[i] || '').join(' | ') + ' |';
      out.push([line(rows[0]), '|' + ' --- |'.repeat(w)].concat(rows.slice(1).map(line)).join('\n'));
    }
    return out;
  }
  if(tag === 'p' || tag === 'figcaption' || tag === 'dt' || tag === 'dd' || tag === 'pre' || !hasBlockChild(node)){
    const t = inl(); if(t) out.push(t); return out;
  }
  /* a container with block children: render children, gathering loose inline runs into paragraphs */
  let run = [];
  const flush = () => {
    const t = joinInline({ tag: node.tag, children: run }, ctx).split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
    if(t) out.push(t);
    run = [];
  };
  for(const c of node.children || []){
    if(c.tag && (BLOCK.has(c.tag) || hasBlockChild(c) || c.attrs['data-vimeo'])){ flush(); blocks(c, ctx, out); }
    else run.push(c);
  }
  flush();
  return out;
}

function htmlToMarkdown(html, pageUrl){
  const tree = parse(html);
  const head = find(tree, 'head') || tree;
  const title = squash(textOf(find(head, 'title') || { text:'' })).trim();
  const metas = all(head, n => n.tag === 'meta');
  const descMeta = metas.find(m => (m.attrs.name || '').toLowerCase() === 'description');
  const canon = all(head, n => n.tag === 'link' && /\bcanonical\b/i.test(n.attrs.rel || ''))[0];
  const url = canon && canon.attrs.href ? canon.attrs.href : pageUrl;
  const main = find(tree, 'main') || find(tree, 'body') || tree;

  const body = blocks(main, { base: pageUrl }, []);
  /* the page's own <h1> carries the headline; the <title> goes in front-matter-like lines */
  const lines = [];
  if(title) lines.push('# ' + escMd(title), '');
  if(descMeta && descMeta.attrs.content) lines.push('> ' + escMd(squash(descMeta.attrs.content).trim()), '');
  if(url) lines.push('Source: <' + url + '>', '');
  return lines.join('\n') + '\n' + body.map(b => b.replace(/^#(?=#* )/, '##')).join('\n\n') + '\n';
}

module.exports = { htmlToMarkdown, parse };
