import {defineField, defineType} from 'sanity'

export const galleryImage = defineType({
  name: 'galleryImage',
  title: 'Image',
  type: 'object',
  fields: [
    defineField({
      name: 'image',
      type: 'image',
      options: {hotspot: true},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'alt',
      title: 'Alt text',
      type: 'string',
      description: 'What the image shows, for screen readers and search.',
    }),
    defineField({name: 'half', title: 'Half width', type: 'boolean', initialValue: false}),
  ],
  preview: {select: {media: 'image', title: 'alt'}},
})
