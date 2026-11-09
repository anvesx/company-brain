# integration/contract

What an MCP client observes from the real server and real tokens: metadata, wording, error shapes.

- `metadata.test.ts`: server name, version, instructions, tool descriptions, annotations, input field descriptions.
- `dispatch.test.ts`: tools/call envelope, unknown-tool cut, joined zod messages, 280-char cut, no-params, errors.ts.
- `cursor.test.ts`: brain.search cursor regex accepts and rejects, with its message.
- `resource.test.ts`: brain://node/{id} listing, read, hidden node and store failure codes.
