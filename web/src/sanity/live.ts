import {defineLive, type StrictDefinedFetchType} from 'next-sanity/live'
import {client} from './client'

// Published content only for now. Add SANITY_API_READ_TOKEN (server-only) to
// enable drafts and Visual Editing later.
const token = process.env.SANITY_API_READ_TOKEN

export const {sanityFetch, SanityLive} = defineLive({
  client,
  serverToken: token,
  browserToken: token,
  strict: true,
})

// The app's one shared 'use cache' boundary. sanityFetch tags the cache entry,
// and <SanityLive /> invalidates it when the content changes.
export const cachedSanity: StrictDefinedFetchType = async (options) => {
  'use cache'
  return sanityFetch(options)
}
