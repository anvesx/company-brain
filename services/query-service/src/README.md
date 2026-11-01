# Source layout

- `errors.ts` defines `QueryError` and its codes.
- `service.ts` validates input, queries the index with the principal's ACL clause, hydrates and re-checks each pointer against the registry.
- `index.ts` exposes the supported package API.

All runtime imports use ESM `.js` suffixes.
