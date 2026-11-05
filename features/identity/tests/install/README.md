# install

Rule 10 and the install half of rules 13 and 14: `renderInstall(manifest, client)` turns one
manifest (name, url) into one client's config file (design card cl_dist).

- `render.test.ts`: each client against its entry in `golden.json` (manifest
  `company-brain`, `https://brain.example.com/mcp`); the Claude Code command; the
  "check current docs" notes; no credential in any body.
- `validate.test.ts`: name and url checks, unknown client; each is BAD_INPUT naming the field.
- `parse.test.ts`: every body parses back (JSON or TOML) to the manifest's url and name.

`golden.json` holds, per client, the full return value. A change to a template changes its golden file in the
same commit, on purpose.
