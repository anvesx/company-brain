# install

Pure renderer for the MCP install guide. No file, network, process or environment access.

- `templates.ts`: one template per client (path, format, the entry, fields still to confirm).
- `render.ts`: `renderInstall(manifest, client, templates?)` validates the name and url, renders, parses the file back (throws `InstallRenderError` naming the client) and returns the file body and a POSIX single-quoted command.
- `url.ts`: https-or-loopback-http check shared with config validation.
