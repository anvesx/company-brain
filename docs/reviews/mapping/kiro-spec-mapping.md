# Kiro review of spec-to-source mapping

Reviewer: kiro-cli, model qwen3-coder-next, 2 Nov 2026, commit dd0c104. One DISAGREE (governance cited the Meta linter, which does not cover audit chains); fixed by removing the citation.

| Spec | AGREE/DISAGREE | Citation |
|------|---------------|----------|
| structure-lint | AGREE | repository tooling not company-brain requirement |
| rag | AGREE | Meta claim 2: RAG is separate layer |
| retrieval | AGREE | Vectorize retrieval layer + GBrain |
| governance | DISAGREE | Meta linter (claim 5) is about structure validation, not audit chains |
| ingestion | AGREE | Vectorize ingestion layer |
| mcp-search-tool | AGREE | Slite + GBrain MCP interface |
| entity-resolver | AGREE | GBrain dream cycle dedupe (informative) |
| acl-filter | AGREE | Vectorize + Slite permissions at retrieval |
| audit-chain | AGREE | our proposal |
| chunker | AGREE | our proposal + Meta claim 2 (RAG layer) |
| hybrid-search | AGREE | Slite + GBrain + Vectorize hybrid search |
| change-cursor | AGREE | Slite + Vectorize scheduled pull/webhooks |
| query-router | AGREE | our proposal |
| connector-kit | AGREE | Slite + Vectorize signals |
| pointer-registry | AGREE | our proposal |
| graph-store | AGREE | Slite + Meta + GBrain |
| zone-policy | AGREE | our proposal |
| audit-service | AGREE | our proposal |
| query-service | AGREE | Vectorize retrieval + Slite |
| graph-sync | AGREE | Slite + Meta + GBrain |
| connector-runtime | AGREE | Slite + Vectorize |
| mcp-service | AGREE | Slite + GBrain |
| index-service | AGREE | Meta claim 2 (RAG layer) |
| integration | AGREE | repository tooling |
