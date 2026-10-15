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
    defineField({name: 'half', title: 'Half width', type: 'boolean', initialValue: false}),
  ],
  preview: {
    select: {filename: 'video.asset.filename'},
    prepare: ({filename}) => ({title: filename || 'Video', subtitle: 'Video'}),
  },
})
