import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {muxInput} from 'sanity-plugin-mux-input'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'

const SINGLETONS = new Set(['settings'])

export default defineConfig({
  name: 'default',
  title: 'Itai Agami Portfolio',
  projectId: 'c8rr77b1',
  dataset: 'production',
  plugins: [
    structureTool({structure}),
    visionTool(),
    // films are uploaded to Mux and streamed from there; 'basic' quality has free
    // encoding and is plenty for a portfolio, capped at 1080p to keep costs down
    muxInput({video_quality: 'basic', max_resolution_tier: '1080p'}),
  ],
  schema: {
    types: schemaTypes,
    // singletons can't be created from the "new document" menu
    templates: (templates) => templates.filter(({schemaType}) => !SINGLETONS.has(schemaType)),
  },
  document: {
    actions: (actions, {schemaType}) =>
      SINGLETONS.has(schemaType)
        ? actions.filter(({action}) => action && ['publish', 'discardChanges', 'restore'].includes(action))
        : actions,
  },
})
