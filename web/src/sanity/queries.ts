import {defineQuery} from 'next-sanity'

export const PROJECTS_QUERY = defineQuery(`
  *[_type == "project" && defined(slug.current)] | order(coalesce(order, 999) asc, name asc){
    _id,
    name,
    "slug": slug.current,
    category,
    client,
    thumbnail,
    "muxPlaybackId": film.asset->playbackId,
    "loopUrl": loop.asset->url
  }
`)

export const PROJECT_SLUGS_QUERY = defineQuery(`
  *[_type == "project" && defined(slug.current)]{"slug": slug.current}
`)

export const PROJECT_QUERY = defineQuery(`
  *[_type == "project" && slug.current == $slug][0]{
    _id,
    name,
    client,
    role,
    oneliner,
    idea,
    outcome,
    vimeoId,
    siteUrl,
    "muxPlaybackId": film.asset->playbackId,
    "muxAspect": film.asset->data.aspect_ratio,
    hero,
    gallery[]{
      _key,
      _type,
      image,
      alt,
      half,
      "muxPlaybackId": video.asset->playbackId,
      "muxAspect": video.asset->data.aspect_ratio
    },
    "loopUrl": loop.asset->url
  }
`)

export const SETTINGS_QUERY = defineQuery(`
  *[_id == "settings"][0]{about, email, linkedin, "cvUrl": cv.asset->url}
`)
