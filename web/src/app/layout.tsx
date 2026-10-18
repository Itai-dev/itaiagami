import type {Metadata} from 'next'
import {IBM_Plex_Mono, IBM_Plex_Sans} from 'next/font/google'
import {SanityLive} from '@/sanity/live'
import './globals.css'

const plexSans = IBM_Plex_Sans({
  variable: '--font-plex-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: {default: 'Itai Agami', template: '%s · Itai Agami'},
  description: 'Independent creative director, Tel Aviv.',
}

export default function RootLayout({children}: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable} antialiased`}>
      <body className="min-h-dvh">
        {children}
        <SanityLive includeDrafts={false} />
      </body>
    </html>
  )
}
