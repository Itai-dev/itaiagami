import { defineField, defineType, defineArrayMember } from 'sanity';

export const settings = defineType({
  name: 'settings',
  title: 'Site settings',
  type: 'document',
  fields: [
    defineField({
      name: 'about', title: 'About text', type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      description: 'One short line per entry, shown in the "about me" panel.',
    }),
    defineField({ name: 'email', title: 'Email', type: 'string' }),
    defineField({ name: 'linkedin', title: 'LinkedIn URL', type: 'url' }),
    defineField({ name: 'cv', title: 'CV (PDF)', type: 'file', options: { accept: 'application/pdf' } }),
  ],
  preview: { prepare: () => ({ title: 'Site settings' }) },
});
