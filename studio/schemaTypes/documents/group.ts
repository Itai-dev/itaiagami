import {defineField, defineType} from 'sanity'

// A group ties related projects together (e.g. Partner: TV, Movies, Kids).
// On the site its projects sit next to each other in one colour, and when one
// opens, the arrows step through every video, image and site in the group.
export const group = defineType({
  name: 'group',
  title: 'Group',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      type: 'string',
      validation: (rule) => rule.required().warning('Name the group, e.g. the client.'),
    }),
    defineField({
      name: 'text',
      type: 'text',
      rows: 3,
      description: 'Shown under any project in the group that has no text of its own.',
    }),
  ],
  preview: {select: {title: 'name', subtitle: 'text'}},
})
