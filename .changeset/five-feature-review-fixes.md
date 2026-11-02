---
"@brain/acl-filter": patch
"@brain/pointer-registry": patch
"@brain/connector-kit": minor
"@brain/change-cursor": minor
---

Fixes from the Opus and Codex review of five features. acl-filter: non-array ACL columns grant nothing and every id comparison is BINARY. pointer-registry: ACL equality no longer conflates ids containing NUL. connector-kit: folder versions include a content digest, so existing folder versions change once. change-cursor: add `forget` so a failed handler can be retried.
