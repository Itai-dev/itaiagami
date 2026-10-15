import {defineArrayMember, defineField, defineType} from 'sanity'

// A project is a video, an image or a site, each with a short text. Videos and
// images can be several: the first one, then "more", stepped through on the site.
// Nothing blocks publishing: missing pieces show as warnings, and the site
// falls back sensibly (e.g. a card without an image shows the project name).
const TYPES = [
  {title: 'Video', value: 'video'},
  {title: 'Image', value: 'image'},
  {title: 'Site', value: 'site'},
]

type Parent = {type?: string; siteUrl?: string} | undefined
const isType = (parent: Parent, ...types: string[]) => !parent?.type || types.includes(parent.type)

export const project = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  groups: [
    {name: 'main', title: 'Project', default: true},
    {name: 'card', title: 'Card'},
    {name: 'more', title: 'More'},
  ],
  fields: [
    defineField({
      name: 'name',
      type: 'string',
      group: 'main',
      validation: (rule) => rule.required().warning('Add a name so the project has a tag on the site.'),
    }),
    defineField({
      name: 'type',
      type: 'string',
      group: 'main',
      initialValue: 'video',
      options: {list: TYPES, layout: 'radio', direction: 'horizontal'},
      description: 'What opens when the card is clicked.',
    }),
    defineField({
      name: 'text',
      type: 'text',
      rows: 3,
      group: 'main',
      description: 'A few words shown under the project when it opens.',
    }),

    // video
    defineField({
      name: 'film',
      title: 'Video',
      type: 'mux.video',
      group: 'main',
      hidden: ({parent}) => !isType(parent, 'video', 'site'),
      description: 'Upload the video. Its first frame becomes the card image unless you set one in "Card".',
    }),
    defineField({
      name: 'moreVideos',
      title: 'More videos',
      type: 'array',
      group: 'main',
      of: [defineArrayMember({type: 'mux.video'})],
      hidden: ({parent}) => !isType(parent, 'video', 'site'),
      description: 'Shown after the video above, with arrows to step through them. Drag to reorder.',
    }),
    defineField({
      name: 'vimeoId',
      title: 'Vimeo ID (fallback)',
      type: 'string',
      group: 'main',
      hidden: ({parent}) => !isType(parent, 'video'),
      description: 'Only used while no video is uploaded above: the number in vimeo.com/123456789.',
      validation: (rule) => rule.regex(/^\d+$/, {name: 'numeric id'}).warning(),
    }),

    // image
    defineField({
      name: 'image',
      type: 'image',
      group: 'main',
      options: {hotspot: true},
      hidden: ({parent}) => !isType(parent, 'image', 'site'),
      description: 'Shown large when the card is clicked. Also used as the card image unless you set one in "Card".',
    }),
    defineField({
      name: 'moreImages',
      title: 'More images',
      type: 'array',
      group: 'main',
      of: [defineArrayMember({type: 'image', options: {hotspot: true}})],
      options: {layout: 'grid'},
      hidden: ({parent}) => !isType(parent, 'image', 'site'),
      description: 'Shown after the image above, with arrows to step through them. Drag to reorder.',
    }),

    // site
    defineField({
      name: 'siteUrl',
      title: 'Site link',
      type: 'url',
      group: 'main',
      hidden: ({parent}) => !isType(parent, 'site') && !parent?.siteUrl,
      description: 'Adds a "visit site ↗" tag that opens the site in a new tab.',
    }),
    defineField({
      name: 'siteEmbed',
      title: 'Show the site live and clickable',
      type: 'boolean',
      group: 'main',
      initialValue: false,
      hidden: ({parent}) => !parent?.siteUrl,
      description:
        'Opens the site inside the card. Only works if the site allows being shown inside other sites; many (e.g. exhibition.nli.org.il) do not and stay blank. Otherwise the video or image above is shown, with the "visit site" tag.',
    }),

    // card
    defineField({
      name: 'thumbnail',
      title: 'Card image (optional)',
      type: 'image',
      group: 'card',
      options: {hotspot: true},
      description: 'Used on the card when there is no uploaded video (a video always shows its first frame, so it opens without a cut). Without any image the card shows the project name.',
    }),
    defineField({
      name: 'loop',
      title: 'Card video loop (optional)',
      type: 'file',
      group: 'card',
      options: {accept: 'video/mp4'},
      description: 'A short silent mp4 (under ~2 MB) that plays on the card.',
    }),
    defineField({
      name: 'category',
      type: 'string',
      group: 'card',
      options: {list: ['Brand', 'Culture', 'Technology'], layout: 'radio', direction: 'horizontal'},
      description: 'Drives the brand / culture / tech filters. Without one it only shows under "all".',
    }),
    defineField({name: 'order', type: 'number', group: 'card', description: 'Lower comes first.'}),
    defineField({
      name: 'slug',
      type: 'slug',
      group: 'card',
      options: {source: 'name', maxLength: 64},
      description: 'Web address name. Click "Generate" after naming the project.',
    }),

    // more: details kept from the earlier case studies
    defineField({name: 'client', type: 'string', group: 'more'}),
    defineField({name: 'role', type: 'string', group: 'more'}),
    defineField({name: 'oneliner', title: 'One-liner', type: 'string', group: 'more', validation: (rule) => rule.max(160).warning()}),
    defineField({name: 'idea', type: 'text', rows: 3, group: 'more'}),
    defineField({name: 'outcome', type: 'text', rows: 3, group: 'more'}),
    defineField({name: 'challenge', type: 'text', rows: 3, group: 'more'}),
    defineField({name: 'system', type: 'text', rows: 3, group: 'more'}),
    defineField({name: 'contribution', type: 'text', rows: 3, group: 'more'}),
    defineField({name: 'disciplines', type: 'string', group: 'more'}),
    defineField({name: 'credits', type: 'array', group: 'more', of: [defineArrayMember({type: 'string'})]}),
    defineField({name: 'hero', title: 'Hero image', type: 'image', group: 'more', options: {hotspot: true}}),
    defineField({
      name: 'gallery',
      title: 'Images & videos',
      type: 'array',
      group: 'more',
      of: [defineArrayMember({type: 'galleryImage'}), defineArrayMember({type: 'galleryVideo'})],
      options: {layout: 'grid'},
    }),
  ],
  orderings: [{title: 'Order', name: 'orderAsc', by: [{field: 'order', direction: 'asc'}]}],
  preview: {
    select: {title: 'name', type: 'type', category: 'category', thumb: 'thumbnail', image: 'image'},
    prepare: ({title, type, category, thumb, image}) => ({
      title: title || 'Untitled project',
      subtitle: [type, category].filter(Boolean).join(' · '),
      media: thumb || image,
    }),
  },
})
