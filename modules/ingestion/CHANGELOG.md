# @anvesx/ingestion

## 0.2.0

### Minor Changes

- Add offset paging to hybrid-search, live ACL check and paging metadata to query-service, optional fetchText and prefetched content in index-service, and a connector-based live verifier in retrieval. Breaking: re-index required, upsert events carry optional content, sync search throws LIVE_ACL when a verifier is configured.
- 037efe8: Initial release of @anvesx/ingestion.
- 065a33f: Ingestion skips the delete pass for an empty complete listing or a mass deletion (default over 50% of 10 or more known documents) and reports `reapSkipped`. Brain app seeds the known set by connector source, requires `BRAIN_AUDIT_KEY` in persistent or signed mode, and adds `exp` to signed tokens. Breaking: tokens are now `user:tenant:exp:hmac`; re-mint every token.

### Patch Changes

- Updated dependencies [ac64dcb]
- Updated dependencies [422ef04]
- Updated dependencies [a28e97a]
- Updated dependencies
- Updated dependencies [037efe8]
- Updated dependencies [037efe8]
- Updated dependencies [f7a6d5a]
- Updated dependencies [f7a6d5a]
- Updated dependencies [f7a6d5a]
- Updated dependencies [f7a6d5a]
- Updated dependencies [f7a6d5a]
  - @anvesx/pointer-registry@0.2.0
  - @anvesx/connector-kit@0.2.0
  - @anvesx/change-cursor@0.2.0
  - @anvesx/hybrid-search@0.2.0
  - @anvesx/index-service@0.2.0
  - @anvesx/connector-runtime@0.2.0
  - @anvesx/chunker@0.2.0
