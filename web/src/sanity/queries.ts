import {defineQuery} from 'next-sanity'

export const PROJECTS_QUERY = defineQuery(`
  *[_type == "project"] | order(coalesce(order, 999) asc, name asc){
    _id,
    name,
    type,
    "slug": coalesce(slug.current, _id),
    category,
    client,
    thumbnail,
    image,
    "muxPlaybackId": film.asset->playbackId,
    "loopUrl": loop.asset->url
  }
`)

export const PROJECT_SLUGS_QUERY = defineQuery(`
  *[_type == "project"]{"slug": coalesce(slug.current, _id)}
`)

export const PROJECT_QUERY = defineQuery(`
  *[_type == "project" && (slug.current == $slug || _id == $slug)][0]{
    _id,
    name,
    type,
    text,
    image,
    siteEmbed,
    client,
    role,
    oneliner,
    idea,
    outcome,
    vimeoId,
    siteUrl,
    "muxPlaybackId": film.asset->playbackId,
    "muxAspect": film.asset->data.aspect_ratio,
    moreVideos[]{_key, "muxPlaybackId": asset->playbackId, "muxAspect": asset->data.aspect_ratio},
    moreImages,
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
