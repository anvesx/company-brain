# src

| File | Job |
|---|---|
| `errors.ts` | `RegistryError` with code `INVALID` or `TENANT_REQUIRED`. |
| `schema.ts` | Table DDL, column list, every SQL string, row-to-pointer mapping, change test. |
| `registry.ts` | `createRegistry`: the four operations plus `close`, on `node:sqlite`. |
| `index.ts` | Public exports. |
