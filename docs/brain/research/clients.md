# AI client integration research (company brain)

Data: `clients.json` (clients, brain_products, mcp_spec, design_implications). Every entry has a URL and a `fetched` or `snippet` status.

## Findings
- Every client accepts a remote Streamable HTTP MCP server with OAuth. One server covers Claude, Codex, ChatGPT, Cursor, Copilot, Gemini CLI, Windsurf and Goose.
- ChatGPT deep research and company knowledge need `search` and `fetch` tools returning id, title, text, url.
- Org rollout differs per client: managed-mcp.json (Claude Code), Owner-added connectors (Claude.ai), a Copilot policy, a Windsurf allowlist, a Codex enterprise requirement.
- Limits: Claude Code 25,000-token default output, 50,000-char file spill, tool search; Windsurf 100 tools.
- Notion, Atlassian, Slack, Linear and Sourcegraph point at live data and run as the user. Glean, Onyx and Mem0 index or store copies.
- 2026-07-28 spec: stateless transport, CIMD preferred over DCR, Tasks as an extension, MRTR replaces server-initiated elicitation.
- The public MCP Registry does not support private servers.

## Gaps
Gemini Enterprise (404), ChatGPT admin pages (403, snippets only), Guru, Moveworks, Zep, Claude Drive connectors, Cursor and Windsurf-style org distribution detail for Cursor, RFC 8707 exact wording.
