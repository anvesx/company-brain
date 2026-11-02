# write

Everything a sync run writes into the graph for one document, kept apart from the paging loop in
`../sync.ts`.

- `document.ts` the run context (`Ctx`: deps, report, principals already written, connector root id), the node writer that skips unchanged content, and one document with its `belongs-to` edge.
- `access.ts` turns an ACL into principal nodes (person or team, through the optional `resolve` hook) and `can-read` edges, diffed against what the graph already holds so narrowing an ACL closes edges.

`access.ts` depends on `document.ts` for the writer; nothing here stores document text.
