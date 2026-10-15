import type {Metadata} from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import {cachedSanity} from '@/sanity/live'
import {urlFor} from '@/sanity/image'
import {PROJECT_QUERY, PROJECT_SLUGS_QUERY} from '@/sanity/queries'
import {Film} from './film'

export async function generateStaticParams() {
  const {data} = await cachedSanity({query: PROJECT_SLUGS_QUERY, perspective: 'published', stega: false})
  // Cache Components needs at least one param to prerender the route shell
  return data.length ? data.map(({slug}) => ({slug: slug ?? ''})) : [{slug: '_'}]
}

export async function generateMetadata(props: PageProps<'/work/[slug]'>): Promise<Metadata> {
  const {slug} = await props.params
  const {data} = await cachedSanity({query: PROJECT_QUERY, params: {slug}, perspective: 'published', stega: false})
  return data ? {title: data.name ?? undefined, description: data.oneliner ?? undefined} : {}
}

// first sentence only; keeps the paragraph short
const firstSentence = (text?: string | null) => text?.match(/^(.{20,}?[.!?])(\s|$)/)?.[1] ?? text ?? ''

export default async function ProjectPage(props: PageProps<'/work/[slug]'>) {
  const {slug} = await props.params
  const {data: project} = await cachedSanity({
    query: PROJECT_QUERY,
    params: {slug},
    perspective: 'published',
    stega: false,
  })
  if (!project) notFound()

  const paragraph = [project.oneliner, project.idea, project.outcome]
    .filter(Boolean)
    .map(firstSentence)
    .filter((sentence, i) => i === 0 || sentence.length <= 150)
    .join(' ')
  const meta = [project.client, project.role].filter(Boolean).join(' · ')
  // the mosaic: hero, then gallery images and video clips in the order set in the CMS
  const media = [
    ...(project.hero?.asset ? [{key: 'hero', image: project.hero, playbackId: null, aspect: null}] : []),
    ...(project.gallery ?? []).map((item) => ({
      key: item._key,
      image: item.image?.asset ? item.image : null,
      playbackId: item.muxPlaybackId ?? null,
      aspect: item.muxAspect ?? null,
    })),
  ].filter((item) => item.image || item.playbackId)

  return (
    <main className="mx-auto max-w-6xl bg-paper px-4 pb-16 pt-6 sm:px-10">
      <Link href="/" className="lowercase text-black/50 hover:text-black">
        ← all work
      </Link>

      <p className="mt-6 max-w-[62ch]">
        <strong className="font-semibold">{project.name}</strong> {paragraph}
      </p>
      {meta && <p className="text-black/55">{meta}</p>}
      {project.siteUrl && (
        <a href={project.siteUrl} target="_blank" rel="noopener" className="lowercase underline underline-offset-2">
          visit site ↗
        </a>
      )}
      <div className="mb-6" />

      <div className="columns-1 gap-1.5 sm:columns-2">
        {project.muxPlaybackId ? (
          <div className="mb-1.5 [column-span:all]">
            <Film playbackId={project.muxPlaybackId} aspect={project.muxAspect} title={project.name} />
          </div>
        ) : project.vimeoId ? (
          <div className="relative mb-1.5 aspect-video bg-black [column-span:all]">
            <iframe
              src={`https://player.vimeo.com/video/${project.vimeoId}?autoplay=1&title=0&byline=0&portrait=0&dnt=1`}
              title={`${project.name} film`}
              allow="autoplay; fullscreen; picture-in-picture"
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        ) : project.loopUrl ? (
          <video src={project.loopUrl} muted loop autoPlay playsInline className="mb-1.5 block w-full" />
        ) : null}

        {media.map((item) =>
          item.playbackId ? (
            <div key={item.key} className="mb-1.5 break-inside-avoid">
              <Film playbackId={item.playbackId} aspect={item.aspect} clip />
            </div>
          ) : item.image ? (
            <Image
              key={item.key}
              src={urlFor(item.image).width(1600).url()}
              alt=""
              width={1600}
              height={1000}
              sizes="(min-width: 640px) 50vw, 100vw"
              className="mb-1.5 block h-auto w-full break-inside-avoid"
            />
          ) : null,
        )}
      </div>
    </main>
  )
}
