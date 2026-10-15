import {defineArrayMember, defineField, defineType} from 'sanity'

export const settings = defineType({
  name: 'settings',
  title: 'Site settings',
  type: 'document',
  fields: [
    defineField({
      name: 'about',
      title: 'About text',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      description: 'One short line per entry.',
    }),
    defineField({
      name: 'offerLine',
      title: 'Offer, in one line',
      type: 'string',
      description: 'The first line of the "work with me" panel. What you do, for whom, how fast.',
      validation: (rule) => rule.max(90).warning('Keep it to one short line.'),
    }),
    defineField({
      name: 'offer',
      title: '"Work with me" text',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      description: 'One short line per entry: what is included, how long it takes, the starting price.',
    }),
    defineField({name: 'bookingUrl', title: 'Booking link', type: 'url', description: 'Where "book a call" goes.'}),
    defineField({name: 'email', type: 'string', validation: (rule) => rule.email()}),
    defineField({name: 'linkedin', title: 'LinkedIn URL', type: 'url'}),
    defineField({name: 'cv', title: 'CV (PDF)', type: 'file', options: {accept: 'application/pdf'}}),
  ],
  preview: {prepare: () => ({title: 'Site settings'})},
})
