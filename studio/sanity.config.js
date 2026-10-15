import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './schemaTypes/index.js';

// Site settings is a single document; projects are a list ordered by "Order".
const structure = S => S.list().title('Content').items([
  S.listItem().title('Site settings').id('settings')
    .child(S.document().schemaType('settings').documentId('settings')),
  S.divider(),
  S.documentTypeListItem('project').title('Projects'),
]);

export default defineConfig({
  name: 'itaiagami',
  title: 'Itai Agami',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID,
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  plugins: [structureTool({ structure })],
  schema: {
    types: schemaTypes,
    // settings is a singleton: no "new settings" in the create menu
    templates: templates => templates.filter(t => t.schemaType !== 'settings'),
  },
  document: {
    actions: (actions, { schemaType }) =>
      schemaType === 'settings' ? actions.filter(a => !['duplicate', 'delete', 'unpublish'].includes(a.action)) : actions,
  },
});
