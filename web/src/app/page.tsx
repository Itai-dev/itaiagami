import Image from 'next/image'
import Link from 'next/link'
import {cachedSanity} from '@/sanity/live'
import {urlFor} from '@/sanity/image'
import {PROJECTS_QUERY, SETTINGS_QUERY} from '@/sanity/queries'

export default async function Home() {
  const [{data: projects}, {data: settings}] = await Promise.all([
    cachedSanity({query: PROJECTS_QUERY, perspective: 'published', stega: false}),
    cachedSanity({query: SETTINGS_QUERY, perspective: 'published', stega: false}),
  ])

  return (
    <main className="px-4 py-6 sm:px-8">
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-2 lowercase">
        <span className="font-medium">itai agami</span>
        <span className="text-black/50">{settings?.about?.[0] ?? 'independent creative director, tel aviv.'}</span>
      </header>

      {projects.length === 0 ? (
        <p className="text-black/60">
          No projects yet. Add one in the Studio, or run <code className="font-mono">npm run seed</code> in{' '}
          <code className="font-mono">studio/</code>.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
          {projects.map((project) => (
            <li key={project._id}>
              <Link href={`/work/${project.slug}`} className="group block">
                <div className="relative aspect-[16/10] overflow-hidden bg-black/10 outline outline-1 outline-frame">
                  {project.loopUrl ? (
                    <video
                      src={project.loopUrl}
                      muted
                      loop
                      autoPlay
                      playsInline
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : project.thumbnail ? (
                    <Image
                      src={urlFor(project.thumbnail).width(900).url()}
                      alt={project.name ?? ''}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : null}
                </div>
                <div className="mt-1.5 flex justify-between gap-2 lowercase">
                  <span>{project.name}</span>
                  <span className="text-black/45">{project.category}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
