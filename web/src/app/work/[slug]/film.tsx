'use client'

import MuxPlayer from '@mux/mux-player-react'

// Unbranded Mux player: tries to play with sound, falls back to muted.
export function Film({playbackId, aspect, title}: {playbackId: string; aspect?: string | null; title?: string | null}) {
  return (
    <MuxPlayer
      playbackId={playbackId}
      streamType="on-demand"
      autoPlay="any"
      accentColor="#26262b"
      primaryColor="#ffffff"
      metadata={title ? {video_title: title} : undefined}
      style={{aspectRatio: (aspect ?? '16:9').replace(':', ' / '), width: '100%', display: 'block'}}
    />
  )
}
