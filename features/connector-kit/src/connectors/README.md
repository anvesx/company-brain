# Connectors

The folder adapter reads live UTF-8 files,
loads `<file>.acl.json` sidecars, and rejects traversal or symlinks outside its configured root.

`folder-scan.ts` skips an entry with a bad sidecar (`BAD_ACL`) or one that vanished mid-scan (`VANISHED`) and returns it in `skipped`. `folder.ts` refuses to `fetch` any `*.acl.json` file.
