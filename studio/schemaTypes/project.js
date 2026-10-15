import { defineField, defineType, defineArrayMember } from 'sanity';

// Field names match data/projects.json so the site reads either source the same way.
export const project = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  groups: [
    { name: 'card', title: 'Card', default: true },
    { name: 'story', title: 'Story' },
    { name: 'media', title: 'Media' },
  ],
  fields: [
    defineField({ name: 'name', title: 'Name', type: 'string', group: 'card', validation: r => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', group: 'card', options: { source: 'name', maxLength: 64 }, validation: r => r.required() }),
    defineField({ name: 'client', title: 'Client', type: 'string', group: 'card' }),
    defineField({
      name: 'cat', title: 'Category', type: 'string', group: 'card',
      options: { list: ['Brand', 'Culture', 'Technology'], layout: 'radio', direction: 'horizontal' },
      description: 'Drives the brand / culture / tech filters.',
      validation: r => r.required(),
    }),
    defineField({ name: 'homeRank', title: 'Order', type: 'number', group: 'card', description: 'Lower comes first.' }),
    defineField({ name: 'thumb', title: 'Card image', type: 'image', group: 'card', options: { hotspot: true }, validation: r => r.required() }),
    defineField({ name: 'loop', title: 'Card video loop (mp4)', type: 'file', group: 'card', options: { accept: 'video/mp4' }, description: 'Optional. Plays on the card instead of the image. Keep it short and small (under ~2 MB).' }),

    defineField({ name: 'oneline', title: 'One-liner', type: 'string', group: 'story', validation: r => r.max(160) }),
    defineField({ name: 'role', title: 'Role', type: 'string', group: 'story' }),
    defineField({ name: 'idea', title: 'Idea', type: 'text', rows: 3, group: 'story', description: 'Only the first sentence shows in the pop-up.' }),
    defineField({ name: 'result', title: 'Outcome', type: 'text', rows: 3, group: 'story', description: 'Only the first sentence shows in the pop-up.' }),
    defineField({ name: 'challenge', title: 'Challenge', type: 'text', rows: 3, group: 'story' }),
    defineField({ name: 'system', title: 'System', type: 'text', rows: 3, group: 'story' }),
    defineField({ name: 'contribution', title: 'Contribution', type: 'text', rows: 3, group: 'story' }),
    defineField({ name: 'disciplines', title: 'Disciplines', type: 'string', group: 'story' }),
    defineField({ name: 'credits', title: 'Credits', type: 'array', of: [defineArrayMember({ type: 'string' })], group: 'story' }),

    defineField({ name: 'vimeo', title: 'Vimeo film ID', type: 'string', group: 'media', description: 'The number in vimeo.com/123456789. Plays first when the case study opens.' }),
    defineField({ name: 'hero', title: 'Hero image', type: 'image', group: 'media', options: { hotspot: true } }),
    defineField({
      name: 'gallery', title: 'Images', type: 'array', group: 'media',
      of: [defineArrayMember({
        type: 'object', name: 'galleryImage',
        fields: [
          defineField({ name: 'image', type: 'image', options: { hotspot: true }, validation: r => r.required() }),
          defineField({ name: 'half', title: 'Half width', type: 'boolean', initialValue: false }),
        ],
        preview: { select: { media: 'image' } },
      })],
      options: { layout: 'grid' },
    }),
  ],
  orderings: [{ title: 'Order', name: 'order', by: [{ field: 'homeRank', direction: 'asc' }] }],
  preview: { select: { title: 'name', subtitle: 'cat', media: 'thumb' } },
});
