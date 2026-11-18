import {defineArrayMember, defineField, defineType} from 'sanity'

/* A lead from the /nadlan questionnaire. Written by api/lead.js; everything
   the visitor sent is read-only here, and only the status is yours to change.
   The document ids start "leads.", so the public dataset never serves them. */
export const lead = defineType({
  name: 'lead',
  title: 'Lead',
  type: 'document',
  fields: [
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      initialValue: 'new',
      options: {
        list: [
          {title: 'New', value: 'new'},
          {title: 'Contacted', value: 'contacted'},
          {title: 'Meeting booked', value: 'meeting'},
          {title: 'Won', value: 'won'},
          {title: 'Not a fit', value: 'lost'},
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
    }),
    defineField({name: 'notes', title: 'Your notes', type: 'text', rows: 4}),
    defineField({name: 'receivedAt', title: 'Received', type: 'datetime', readOnly: true}),
    defineField({name: 'ref', title: 'Brief no.', type: 'string', readOnly: true}),
    defineField({name: 'name', title: 'Name', type: 'string', readOnly: true}),
    defineField({name: 'company', title: 'Company', type: 'string', readOnly: true}),
    defineField({name: 'phone', title: 'Phone', type: 'string', readOnly: true}),
    defineField({name: 'email', title: 'Email', type: 'string', readOnly: true}),
    defineField({name: 'city', title: 'Project city', type: 'string', readOnly: true}),
    defineField({name: 'projectType', title: 'Project type', type: 'string', readOnly: true}),
    defineField({name: 'units', title: 'Units', type: 'string', readOnly: true}),
    defineField({name: 'stage', title: 'Stage', type: 'string', readOnly: true}),
    defineField({name: 'has', title: 'Already has', type: 'array', of: [defineArrayMember({type: 'string'})], readOnly: true}),
    defineField({name: 'start', title: 'Wants to start marketing', type: 'string', readOnly: true}),
    defineField({name: 'missing', title: 'Missing for launch', type: 'array', of: [defineArrayMember({type: 'string'})], readOnly: true}),
    defineField({name: 'brief', title: 'Brief', type: 'text', rows: 12, readOnly: true}),
    defineField({name: 'source', title: 'Source', type: 'string', readOnly: true}),
    defineField({name: 'consent', title: 'Agreed to be contacted', type: 'boolean', readOnly: true}),
    defineField({
      name: 'attribution',
      title: 'Where they came from',
      type: 'object',
      readOnly: true,
      options: {collapsible: true, collapsed: true},
      fields: [
        defineField({name: 'utmSource', title: 'UTM source', type: 'string'}),
        defineField({name: 'utmMedium', title: 'UTM medium', type: 'string'}),
        defineField({name: 'utmCampaign', title: 'UTM campaign', type: 'string'}),
        defineField({name: 'utmContent', title: 'UTM content', type: 'string'}),
        defineField({name: 'utmTerm', title: 'UTM term', type: 'string'}),
        defineField({name: 'fbclid', type: 'string'}),
        defineField({name: 'gclid', type: 'string'}),
        defineField({name: 'referrer', title: 'Referrer', type: 'string'}),
        defineField({name: 'landingPage', title: 'Landing page', type: 'string'}),
        defineField({name: 'userAgent', title: 'User agent', type: 'string'}),
      ],
    }),
  ],
  orderings: [{title: 'Newest first', name: 'newest', by: [{field: 'receivedAt', direction: 'desc'}]}],
  preview: {
    select: {company: 'company', name: 'name', type: 'projectType', status: 'status', at: 'receivedAt'},
    prepare: ({company, name, type, status, at}) => ({
      title: [company, name].filter(Boolean).join(' · ') || 'Lead',
      subtitle: [status ? status.toUpperCase() : '', type, at ? new Date(at).toLocaleDateString('he-IL') : '']
        .filter(Boolean)
        .join(' · '),
    }),
  },
})
