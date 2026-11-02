# resilience

- `folder-skip.test.ts`: a malformed sidecar or a vanished entry is skipped with a typed `skipped` result.
- `folder-sidecar-fetch.test.ts`: `fetch` never serves `.acl.json` sidecars; a malformed sidecar throws `BAD_ACL`.
