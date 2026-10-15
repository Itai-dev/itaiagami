import type {StructureResolver} from 'sanity/structure'

// Site settings is one fixed document; projects are listed by their order field.
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Site settings')
        .id('settings')
        .child(S.document().schemaType('settings').documentId('settings')),
      S.divider(),
      S.documentTypeListItem('project')
        .title('Projects')
        .child(S.documentTypeList('project').title('Projects').defaultOrdering([{field: 'order', direction: 'asc'}])),
    ])
