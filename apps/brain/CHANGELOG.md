# @anvesx/brain-app

## 0.2.0

### Minor Changes

- 815285a: Initial release of @anvesx/brain-app.
- 065a33f: Ingestion skips the delete pass for an empty complete listing or a mass deletion (default over 50% of 10 or more known documents) and reports `reapSkipped`. Brain app seeds the known set by connector source, requires `BRAIN_AUDIT_KEY` in persistent or signed mode, and adds `exp` to signed tokens. Breaking: tokens are now `user:tenant:exp:hmac`; re-mint every token.

### Patch Changes

- Updated dependencies [ac64dcb]
- Updated dependencies [a28e97a]
- Updated dependencies [f7a6d5a]
  - @anvesx/connector-kit@0.2.0
  - @anvesx/graph-sync@0.1.1
