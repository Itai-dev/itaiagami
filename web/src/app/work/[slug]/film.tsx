'use client'

import MuxPlayer from '@mux/mux-player-react'

type FilmProps = {
  playbackId: string
  aspect?: string | null
  title?: string | null
  // clips in the mosaic play muted on a loop; the main film tries sound first
  clip?: boolean
}

// Unbranded Mux player.
export function Film({playbackId, aspect, title, clip = false}: FilmProps) {
  return (
    <MuxPlayer
      playbackId={playbackId}
      streamType="on-demand"
      autoPlay={clip ? 'muted' : 'any'}
      muted={clip}
      loop={clip}
      accentColor="#26262b"
      primaryColor="#ffffff"
      metadata={title ? {video_title: title} : undefined}
      style={{aspectRatio: (aspect ?? '16:9').replace(':', ' / '), width: '100%', display: 'block'}}
    />
  )
}
