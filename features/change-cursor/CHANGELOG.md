# @anvesx/change-cursor

## 0.2.0

### Minor Changes

- ac64dcb: Fixes from the Opus and Codex review of five features. acl-filter: non-array ACL columns grant nothing and every id comparison is BINARY. pointer-registry: ACL equality no longer conflates ids containing NUL. connector-kit: folder versions include a content digest, so existing folder versions change once. change-cursor: add `forget` so a failed handler can be retried.
- f7a6d5a: Review-driven fixes: tenant-scoped APIs, stronger ids, anchors; see issue tracker. Re-index required for chunker/hybrid-search.
