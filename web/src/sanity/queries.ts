import {defineQuery} from 'next-sanity'

export const PROJECTS_QUERY = defineQuery(`
  *[_type == "project" && defined(slug.current)] | order(coalesce(order, 999) asc, name asc){
    _id,
    name,
    "slug": slug.current,
    category,
    client,
    thumbnail,
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
    hero,
    gallery[]{_key, image, alt, half},
    "loopUrl": loop.asset->url
  }
`)

export const SETTINGS_QUERY = defineQuery(`
  *[_id == "settings"][0]{about, email, linkedin, "cvUrl": cv.asset->url}
`)
