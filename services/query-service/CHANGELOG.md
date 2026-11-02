# @anvesx/query-service

## 0.2.0

### Minor Changes

- a28e97a: Harden the live ACL: connectors declare enforcesUserToken (fake and folder do not, so a live ACL over them is a CONFIG error), FORBIDDEN maps to deny, one deadline and AbortSignal per search, bounded verifier concurrency, only as many hits verified as needed, maxCandidates above the index window is CONFIG, degraded flag on partial live outages, LIVE_ACL refusals write a failure audit row, and the query is validated and trimmed before embedding.
- Add offset paging to hybrid-search, live ACL check and paging metadata to query-service, optional fetchText and prefetched content in index-service, and a connector-based live verifier in retrieval. Breaking: re-index required, upsert events carry optional content, sync search throws LIVE_ACL when a verifier is configured.
- 037efe8: Initial release of @anvesx/query-service.

### Patch Changes

- Updated dependencies [ac64dcb]
- Updated dependencies [422ef04]
- Updated dependencies
- Updated dependencies [f7a6d5a]
- Updated dependencies [f7a6d5a]
- Updated dependencies [f7a6d5a]
  - @anvesx/acl-filter@0.2.0
  - @anvesx/pointer-registry@0.2.0
  - @anvesx/hybrid-search@0.2.0
