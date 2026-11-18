import {defineField, defineType} from 'sanity'

// A clip in the case-study mosaic, next to the images. Streams from Mux and
// plays muted on a loop; viewers can unmute it.
export const galleryVideo = defineType({
  name: 'galleryVideo',
  title: 'Video',
  type: 'object',
  fields: [
    defineField({
      name: 'video',
      type: 'mux.video',
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'caption', type: 'string', description: 'Shown under the clip.'}),
    defineField({name: 'half', title: 'Half width', type: 'boolean', initialValue: false}),
    defineField({
      name: 'quarter',
      title: 'Quarter width',
      type: 'boolean',
      initialValue: false,
      description: 'Four to a row (two on a phone). For walls of upright pieces such as social ads.',
    }),
  ],
  preview: {
    select: {filename: 'video.asset.filename'},
    prepare: ({filename}) => ({title: filename || 'Video', subtitle: 'Video'}),
  },
})
