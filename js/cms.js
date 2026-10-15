/* Content source for the homepage cloud.
   Projects and the about text come from Sanity when a project ID is set below;
   otherwise (or if Sanity can't be reached) from data/projects.json in the repo.
   Both paths return the same shape, so the cloud doesn't care which one answered. */

export const SANITY = {
  projectId: 'c8rr77b1',      // Itai Agami Portfolio
  dataset: 'production',
  apiVersion: '2024-06-01',
};

// local film loops for the JSON fallback (in Sanity this is the project's "loop" file)
const LOCAL_LOOPS = {
  'natural-intelligence': '/assets/opt/ni-ad-home-options.mp4',
  riddle: '/assets/opt/riddle-logo.mp4',
};

const QUERY = `{
  "projects": *[_type == "project" && !(_id in path("drafts.**"))] | order(coalesce(order, 999) asc, name asc) {
    "slug": coalesce(slug.current, _id), name, type, text,
    "group": group->{ "id": _id, name, text }, groupOrder, client, "cat": category, role, disciplines,
    "oneline": oneliner, challenge, idea, system, "result": outcome, contribution, credits,
    "vimeo": vimeoId, siteUrl, siteEmbed,
    "mux": film.asset->{ playbackId, "aspect": data.aspect_ratio },
    "thumb": thumbnail.asset->url,
    "image": image.asset->url,
    "moreMux": moreVideos[].asset->{ playbackId, "aspect": data.aspect_ratio },
    "moreImages": moreImages[].asset->url,
    "hero": hero.asset->url,
    "gallery": gallery[]{ "src": image.asset->url, half, "mux": video.asset->{ playbackId, "aspect": data.aspect_ratio } },
    "loop": loop.asset->url
  },
  "settings": *[_id == "settings"][0]{ about, offerLine, offer, bookingUrl, email, linkedin, "cv": cv.asset->url }
}`;

// Sanity's image pipeline: resize and serve the best format for the browser
export function sized(url, w) {
  if (!url || !/^https:\/\/cdn\.sanity\.io\/images\//.test(url)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}w=${w}&auto=format&fit=max`;
}

async function fromSanity() {
  const { projectId, dataset, apiVersion } = SANITY;
  const url = `https://${projectId}.apicdn.sanity.io/v${apiVersion}/data/query/${dataset}?query=${encodeURIComponent(QUERY)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`sanity ${res.status}`);
  const { result } = await res.json();
  // every published project shows up; missing pieces fall back on the site
  const projects = (result && result.projects || []).filter(p => p.slug);
  if (!projects.length) throw new Error('sanity: no projects');
  return { source: 'sanity', projects, settings: result.settings || null };
}

async function fromJson() {
  const res = await fetch('/data/projects.json');
  if (!res.ok) throw new Error(`projects.json ${res.status}`);
  const projects = (await res.json()).map(p => ({ ...p, loop: p.loop || LOCAL_LOOPS[p.slug] || null }));
  return { source: 'json', projects, settings: null };
}

export async function loadContent() {
  if (SANITY.projectId) {
    try { return await fromSanity(); }
    catch (err) { console.warn('cms: Sanity unavailable, using data/projects.json', err); }
  }
  return fromJson();
}
