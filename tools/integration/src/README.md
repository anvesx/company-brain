# src

Fixtures for the integration suite. Not a product package; nothing depends on it.

| File          | Job                                                                                  |
| ------------- | ------------------------------------------------------------------------------------ |
| `stack.ts`    | `openStack`: wires the real packages over one directory, no app and no MCP.          |
| `source.ts`   | `createSource`: a connector whose documents can be changed, removed or made to fail. |
| `fixtures.ts` | `doc`, `principal`, `addresses` helpers.                                             |
| `index.ts`    | Re-exports.                                                                          |
