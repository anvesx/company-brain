# tools

- `schema.ts`: input and output shapes of the four tools.
- `register.ts`: adds the tools to a server (this is what `tools/list` shows).
- `dispatch.ts`: `serveCalls`, our own `tools/call` handler. It validates arguments, runs the handler and turns every failure into `structuredContent { code, message }`.
- `read/`: the four handlers.

## Why we own tools/call (D2)

The SDK reports a bad argument as plain text with no `code` (`@modelcontextprotocol/sdk` 1.32.2,
`dist/esm/server/mcp.js`, the `tools/call` handler: its catch turns any thrown McpError into text-only
`createToolError`). Rule 8 needs `{ code, message }`. `Server.setRequestHandler` (`server/index.js`) wraps
the handler and re-parses the envelope with the stock schema, and a second registration for a method
replaces the first (`shared/protocol.js`). So `dispatch.ts` registers a looser `tools/call` and does its own `safeParse`.

- Bad arguments, and an unknown tool name: `isError` with `INVALID_ARGUMENT` and a message of `path: reason`, at most 280 characters.
- `arguments` that is not an object (for example a string) fails the SDK's envelope check: JSON-RPC error `-32602`, not a tool result.
- A handler result that breaks the output schema is `INTERNAL`.

## Output schema

Each output schema is `orFailure`: success fields and `code`/`message` are all optional. The client
validates `structuredContent` even when `isError` is true and the SDK needs an object schema, so one
object accepts both shapes. Tests assert the exact success payloads and exact error results end to end.

## Known limits

- `brain.search` looks at most 4,096 candidate titles per call (`MAX_CANDIDATES`). Bound: the per-candidate
  probe (tenant, validity, LIKE, read-edge check) costs about 2.2 microseconds, so 4,096 x 2.2 us is about 9 ms,
  plus about 2 ms to list candidates. Measured for a user who can read nothing (the worst case): p50 9.2 ms, max 15.7 ms.
  Budget is 50 ms (rule 12).
- Results come in insertion order, not id order. If the cap is hit before `limit` results are found, the reply has
  `truncated: true` and `next`, an opaque decimal cursor; pass it back as `cursor` to continue. `next` without
  `truncated` just means more pages exist. No `next` means the scan finished.
- Candidates from other tenants and from unreadable nodes count toward the cap, so a very common word can
  return a page with few or no hits and `truncated: true`. Keep paging.
- Non-document kinds are checked in JS (`sees`), which costs more per candidate than the SQL probe for documents.
- Needles under 3 characters cannot use the trigram index; they scan rowid ranges under the same cap.
- A caller in more than 1,000 teams gets `INVALID_ARGUMENT` from `brain.search` (the store takes at most 1,000 ids in `reachedBy.from`).
- `brain.graph` recomputes the whole visible set on every page. With 10,000 readable documents it took about
  520 ms at `limit` 100 and about 810 ms at `limit` 20,000 (printed by `tests/scale/common.test.ts`). The cost
  follows the visible set, not `limit`, so chunking `limit` does not help. A fix needs a store-side cursor query. Not done.
- Browser MCP clients are unsupported: a CORS preflight (`OPTIONS /mcp`) gets 401 with no CORS headers. We do not implement CORS.
