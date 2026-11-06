# install

Pure renderer for the MCP install guide. No file, network, process or environment access.

- `templates.ts`: one template per client (path, format, the entry, fields still to confirm). Seven clients; kiro (`.kiro/settings/mcp.json`, `{url}`) and antigravity (`~/.gemini/config/mcp_config.json`, `{serverUrl}`) shapes were read back from `kiro-cli mcp add` and `agy mcp add`.
- `render.ts`: `renderInstall(manifest, client, templates?)` validates the name and url, renders, parses the file back (throws `InstallRenderError` naming the client) and returns the file body and a POSIX single-quoted command.
- `url.ts`: https-or-loopback-http check shared with config validation.
