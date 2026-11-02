---
"@brain/ingestion": minor
"@brain/brain-app": minor
---

Ingestion skips the delete pass for an empty complete listing or a mass deletion (default over 50% of 10 or more known documents) and reports `reapSkipped`. Brain app seeds the known set by connector source, requires `BRAIN_AUDIT_KEY` in persistent or signed mode, and adds `exp` to signed tokens. Breaking: tokens are now `user:tenant:exp:hmac`; re-mint every token.
