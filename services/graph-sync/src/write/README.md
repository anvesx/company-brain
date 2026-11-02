# write

Everything a sync run writes into the graph for one document, kept apart from the paging loop in
`../sync.ts`.

- `document.ts` the run context (`Ctx`: deps, report, run check, principals already written, connector root id), the node id (`<connector.id>/<address>`), the node writer that skips unchanged content, and one document with its `belongs-to` edge. A document id owned by another source is refused.
- `skip.ts` runs one entry's writes so bad input is reported in `report.skipped` instead of thrown, and closes the `can-read` edges of a skipped document (fail closed).
- `access.ts` turns an ACL into principal nodes (person or team, through the optional `resolve` hook) and `can-read` edges, diffed against what the graph already holds so narrowing an ACL closes edges. A principal node is written only when absent, and a user/group id clash is refused.

`access.ts` depends on `document.ts` for the writer; nothing here stores document text.
