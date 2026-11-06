# e2e

The real agent CLIs read what the install guide renders. Run with `pnpm --filter @anvesx/brain-mcp e2e`
(sets `BRAIN_E2E=1`). A missing CLI or an unset flag skips the test and prints `SKIP <cli> e2e: <reason>`.

| File                  | CLI        | What it proves                                                                          |
| --------------------- | ---------- | --------------------------------------------------------------------------------------- |
| `claude.test.ts`      | `claude`   | the rendered `claude mcp add --transport http` runs; `claude mcp list` shows `(HTTP)`   |
| `codex.test.ts`       | `codex`    | the rendered `config.toml` lists as `streamable_http`; same as `codex mcp add --url`    |
| `kiro.test.ts`        | `kiro-cli` | the rendered `.kiro/settings/mcp.json` lists; same shape as `mcp add --scope workspace` |
| `antigravity.test.ts` | `agy`      | the rendered `mcp_config.json` lists; same entry as `agy mcp add --type http`           |

Config homes are temp folders (`CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `HOME` for agy). kiro-cli needs the
user's login, so it keeps the real HOME, runs in a temp working directory and uses a unique server name.
