import type {StructureResolver} from 'sanity/structure'

// Site settings is one fixed document; projects are listed by their order field,
// then the groups that tie related projects together, then the leads from /nadlan.
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
      S.documentTypeListItem('group').title('Groups'),
      S.divider(),
      S.documentTypeListItem('lead')
        .title('Leads')
        .child(S.documentTypeList('lead').title('Leads').defaultOrdering([{field: 'receivedAt', direction: 'desc'}])),
    ])
