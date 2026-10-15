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
    defineField({name: 'email', type: 'string', validation: (rule) => rule.email()}),
    defineField({name: 'linkedin', title: 'LinkedIn URL', type: 'url'}),
    defineField({name: 'cv', title: 'CV (PDF)', type: 'file', options: {accept: 'application/pdf'}}),
  ],
  preview: {prepare: () => ({title: 'Site settings'})},
})
