# @anvesx/connector-kit

## 0.2.0

### Minor Changes

- ac64dcb: Fixes from the Opus and Codex review of five features. acl-filter: non-array ACL columns grant nothing and every id comparison is BINARY. pointer-registry: ACL equality no longer conflates ids containing NUL. connector-kit: folder versions include a content digest, so existing folder versions change once. change-cursor: add `forget` so a failed handler can be retried.
- a28e97a: Harden the live ACL: connectors declare enforcesUserToken (fake and folder do not, so a live ACL over them is a CONFIG error), FORBIDDEN maps to deny, one deadline and AbortSignal per search, bounded verifier concurrency, only as many hits verified as needed, maxCandidates above the index window is CONFIG, degraded flag on partial live outages, LIVE_ACL refusals write a failure audit row, and the query is validated and trimmed before embedding.
- f7a6d5a: Review-driven fixes: tenant-scoped APIs, stronger ids, anchors; see issue tracker. Re-index required for chunker/hybrid-search.
