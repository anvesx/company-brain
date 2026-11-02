# change-cursor/src/model

What the store is allowed to hold and how inputs are refused. No file here opens a database.

| File        | Job                                                                            |
| ----------- | ------------------------------------------------------------------------------ |
| `schema.ts` | SQL schema, limits (`CURSOR_MAX_CHARS`, `DEFAULT_TTL_MS`) and input validators |
| `errors.ts` | `CursorError` with codes `INVALID_INPUT` and `CURSOR_TOO_LARGE`                |

Every validator throws `CursorError`; storage failures are not wrapped and propagate unchanged.
