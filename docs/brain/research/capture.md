# Capture routes for employee AI chat history

Date: 2026-10-23. Evidence flags: ok = page read, snippet = search snippet or third party, failed = not obtained. Detail in capture.json.

## Table

| Vendor | Capture route | Admin or user | Real-time or batch | Covers deletes? | URL |
|---|---|---|---|---|---|
| Claude.ai Enterprise | Compliance API, cursor sync (updated_at, after_id) | Admin (Compliance Access Key) | Batch poll, 600 req/min | Yes, deleted_at tombstones; API can also delete | platform.claude.com/docs/en/manage-claude/compliance-api.md |
| Claude Team/Pro/consumer | No Compliance API documented (inferred); user data export only | User | Manual | No | same page (snippet) |
| Claude Code | Hooks (SessionEnd/Stop/PostToolUse, transcript_path), JSONL in ~/.claude/projects, OTel | Admin via managed settings, or user | Real-time (hooks) or batch (files) | No; local files purged after cleanupPeriodDays (30) | code.claude.com/docs/en/hooks |
| Codex CLI | Hooks, notify, OTel, rollout/history files in CODEX_HOME | Admin via requirements.toml, or user | Real-time or batch | No | learn.chatgpt.com/codex |
| ChatGPT Enterprise/Edu | Compliance API / Logs Platform | Admin | Batch | Reportedly 30-day log retention; snippet only | openai.com/enterprise-privacy/ |
| ChatGPT individual | User export | User | Manual | No | not read (403) |
| Gemini app | Google Vault | Admin | Batch | Follows Vault retention | support.google.com/vault |
| Gemini Enterprise | Not researched | | | | |
| Microsoft 365 Copilot | Graph aiInteractionHistory, Purview audit | Admin (app permission, licensed user) | Batch | Not verified | learn.microsoft.com/graph |
| Cursor | Hooks for prompts/code; Analytics API is metrics only; audit log is management events | Admin (Enterprise) / user | Hooks real-time | No | cursor.com/docs/account/teams/analytics-api |
| GitHub Copilot | Audit log excludes prompts; custom hooks (CLI) | Admin | Batch (SIEM stream) | No | docs.github.com (review-audit-logs) |
| MCP | No history-read primitive | n/a | n/a | n/a | modelcontextprotocol.io/specification |

## Deletion and retention

- Claude Compliance API: deleted items return a deleted_at tombstone; a sync must apply them. ZDR and HIPAA orgs are restricted (HIPAA 30 days).
- Claude Code local files: removed after cleanupPeriodDays (default 30), so capture must run inside that window or via hooks.
- OpenAI: deleted conversations purged within 30 days (snippet); litigation holds can extend.
- GitHub audit log keeps 180 days; Cursor Admin API audit 30 days (third party).

## What we cannot get

- Claude Team, Pro and consumer chats through any admin API (not documented; inferred).
- Claude API-key traffic, Bedrock, Vertex, Foundry, Claude Code cloud sessions, ZDR orgs.
- Cursor and GitHub Copilot chat content from vendor APIs; only local hooks or custom logging.
- Chat history through MCP; no spec primitive exists.
- Anything personal-account on ChatGPT, Gemini, Claude without the employee exporting it.
- Unverified: ChatGPT Compliance Platform details (403), Gemini Enterprise, Purview specifics, Claude Code JSONL schema, Codex file format (.jsonl vs .zst).
