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
      description: 'The first line opens "let\'s talk", e.g. "itai agami. creative director, tel aviv."',
    }),
    defineField({
      name: 'offerLine',
      title: 'Offer, in one line',
      type: 'string',
      description: 'Comes right after the about line in "let\'s talk". What you do and for whom.',
      validation: (rule) => rule.max(90).warning('Keep it to one short line.'),
    }),
    defineField({
      name: 'offer',
      title: '"Work with me" text',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      description: 'Follows the offer line in the same paragraph: how long it takes, the starting price. Keep it short.',
    }),
    defineField({name: 'bookingUrl', title: 'Booking link', type: 'url', description: 'Where "book a call" goes.'}),
    defineField({name: 'email', type: 'string', validation: (rule) => rule.email()}),
    defineField({name: 'linkedin', title: 'LinkedIn URL', type: 'url'}),
    defineField({name: 'cv', title: 'CV (PDF)', type: 'file', options: {accept: 'application/pdf'}}),
  ],
  preview: {prepare: () => ({title: 'Site settings'})},
})
