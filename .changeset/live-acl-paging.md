---
"@anvesx/hybrid-search": minor
"@anvesx/query-service": minor
"@anvesx/index-service": minor
"@anvesx/retrieval": minor
"@anvesx/ingestion": minor
---

Add offset paging to hybrid-search, live ACL check and paging metadata to query-service, optional fetchText and prefetched content in index-service, and a connector-based live verifier in retrieval. Breaking: re-index required, upsert events carry optional content, sync search throws LIVE_ACL when a verifier is configured.
