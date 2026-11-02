# validation

- `props.test.ts`: forbidden keys, 1 KiB byte limit, value types.
- `inputs.test.ts`: tenant, id, kind and timestamp checks, no partial rows.
- `lifecycle.test.ts`: CLOSED after close, `GraphError`, the `:memory:` guard, path checks.
