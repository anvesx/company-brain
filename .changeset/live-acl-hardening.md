---
"@anvesx/connector-kit": minor
"@anvesx/query-service": minor
"@anvesx/retrieval": minor
---

Harden the live ACL: connectors declare enforcesUserToken (fake and folder do not, so a live ACL over them is a CONFIG error), FORBIDDEN maps to deny, one deadline and AbortSignal per search, bounded verifier concurrency, only as many hits verified as needed, maxCandidates above the index window is CONFIG, degraded flag on partial live outages, LIVE_ACL refusals write a failure audit row, and the query is validated and trimmed before embedding.
