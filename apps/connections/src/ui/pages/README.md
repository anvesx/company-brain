# ui/pages

One function per screen. Each takes plain data from `ui/model` and returns a `Shell` page. They hold no logic beyond layout.

- `connections.tsx`: the directory and the table of connected accounts, or the one-line empty state.
- `connect.tsx`: the pre-consent panel and the Continue button, or the reason a provider is not available.
- `account.tsx`: account header, health strip, Sync now (or Reconnect), repo forms and Disconnect with confirm.
- `parts.tsx`: the connected table, the health strip and the repository forms.
