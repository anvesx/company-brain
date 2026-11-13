# ui/pages

The four screens, one per route: `files.tsx` (GET /files), `file.tsx` (GET /files/:id),
`clusters.tsx` (GET /clusters, the tree), `cluster.tsx` (GET /clusters/:id, members).
Each takes an already gate-approved view model from `../types.ts` and returns JSX.
