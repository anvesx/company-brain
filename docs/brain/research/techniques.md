# Company brain: building techniques, scale and flexibility

Research date 2026-10-23. Evidence is in `techniques.json` (58 items, ids T01-T58). Figures not marked "estimate" are from the cited source. Vendor benchmarks are labelled as vendor claims in the JSON.

## Recommended reference architecture (13 decisions)

1. **Index and pointers, not a copy.** Store per chunk: embedding, metadata, ACL, a short snippet, and a pointer (source, id, version, URL). Fetch full content live at answer time.
   Reason: Dash and Microsoft both run indexes for breadth and speed, and Microsoft and Slack offer live/federated paths for sensitive or restricted sources (T11, T12, T13). Federated alone is slow (up to 45 s per MCP query at Dash) and cannot see company-wide content (T11).
   Risk: the snippet and embedding are still derived data. Treat them as in scope for privacy and deletion (T15).

2. **Two retrieval paths behind one gateway: index first, live MCP for the freshest or the most sensitive slice.** The model sees one `retrieve` tool.
   Reason: many tools bloat context; Dash collapsed 5-10 tools into one super tool and caps context near 100,000 tokens (T19, T18).
   Risk: live path latency and source rate limits (T06, T07); keep it opt-in per query class.

3. **Freshness = webhook doorbell + delta cursor + polling backstop + periodic reconciliation.** Webhook only enqueues; a worker pulls the delta/changes feed and applies idempotently by (source id, version).
   Reason: Google push bodies are empty (T03); GitHub gives 10 s to ack and reuses the delivery ID on redelivery (T05); Graph subscriptions expire (4,320 min for Teams up to 42,300 min for drive items) and deliveries can lag up to 6 h (T01); delta tokens expire after 7 days and may replay or return 410 (T02, T55).
   Risk: silent drift. Mitigate with the weekly full scan and per-connector lag alerts (T54).

4. **Deletes are first-class.** Handle @removed/trash/remove events as tombstones; cascade to chunks, embeddings, snippets, caches and the graph bundles; verify with a post-delete probe.
   Reason: Graph and Drive emit removal records (T02, T03); embeddings can be inverted (92% of 32-token inputs, T15) and soft-deleted vectors may linger (T17, secondary source).
   Risk: erasure SLA missed. Use per-tenant encryption keys so crypto-shredding is a backstop.

5. **One durable, checkpointed workflow per (tenant, connector), with its own token bucket.** Backfill and live sync are separate lanes; backfill gets a capped share of quota.
   Reason: Jira has hourly point quotas and per-second bursts (T06); Slack throttles bulk history to 1 req/min for unlisted apps (T07); Notion averages 3 req/s (T08); Notion runs separate Spark (backfill) and Kafka (live) paths (T45); resume-from-checkpoint beats restart (T10).
   Risk: a big onboarding takes days for Slack/Notion. Set expectations and prefer live query for those.

6. **Hash every chunk; re-embed only on text change.** Metadata/ACL changes patch in place.
   Reason: Notion's 64-bit xxHash per span cut data volume 70% (T44); turbopuffer-style pricing charges for writes (T37).
   Risk: chunker changes invalidate hashes; version the chunker and embedding model together as a "generation" (T43, T58).

7. **ACL synced as data, enforced inside the query, verified live on the final few.** Sync users/groups/memberships on their own faster schedule (Glean uses periodic identity crawls, T20). Put the expanded ACL principals on each chunk and filter in the ANN query (T22). Before text reaches the model, re-check the top N against the source with the user's delegated token (T23).
   Reason: post-filtering leaks to the model and starves recall (T22); index ACLs can lag (T23).
   Risk: the live check costs source calls. Cap N (estimate: 10-20) and cache positive checks for seconds only.

8. **On-behalf-of everywhere for live paths.** Per-user delegated OAuth tokens, audience-bound, never forwarded between services.
   Reason: MCP spec forbids token passthrough and requires RFC 8707 resource binding and PKCE (T24); Slack MCP requires user-token scopes and admin approval (T25).
   Risk: token storage is the crown jewel. Encrypt, rotate, short-lived access tokens.

9. **Hybrid retrieval by default: contextualized chunks, BM25 + dense, fuse with RRF, rerank 150 to 20.**
   Reason: failure 5.7% to 1.9% (-67%) in Anthropic's test (T26); RRF is a safe fusion default (T28); budget about 100 ms for the reranker (T29, third-party figures).
   Risk: gains are corpus-specific. Gate every change on your own eval set (T53).

10. **Entity layer as precomputed relationship bundles in the same index, not a graph database.**
   Reason: Dash dropped a graph DB for latency and query-pattern reasons and indexes asynchronous knowledge bundles (T30).
   Risk: bundles go stale; rebuild on source change events.

11. **Route by query difficulty.** Simple lookups: one hybrid call. Hard/broad: an agentic loop with a hard token budget and subagents only when needed.
   Reason: multi-agent used about 15x chat tokens and token use explained 80% of variance on BrowseComp (T32); early failure was 50 subagents for simple queries.
   Risk: runaway cost. Enforce per-query token and tool-call caps.

12. **Namespace per (tenant) on an object-storage-native index with cache tiers; quantize; keep full precision on cheap storage.**
   Reason: turbopuffer sees 250M+ namespaces and 100k+ q/s globally, 5k+ q/s per namespace (T35); cold p50 874 ms vs warm 14 ms at 1M docs (T36); Pinecone cold starts about 2 s up to ~20 s at billions (T38); Notion cut search spend 60% moving to namespaces (T42); binary quantization cuts memory about 95% (T40, vendor).
   Risk: cold-tenant first query; pre-warm active tenants. Max 500M docs/shard, 256 shards/namespace (T35).

13. **Everything untrusted, everything measured.** Retrieved text is data, never instructions: strip active content, no auto-fetched URLs/images, never mix scopes in one prompt (T52). Continuous monitors: connector lag, recall on the eval set, judge-human agreement, and a nightly ACL-leak canary (T54, T34, T56).
   Risk: monitors that are cheap to satisfy get gamed; plant real forbidden documents, not mocks.

Also: keep the connector contract thin (id, acl, text pointer, timestamps, type) so a new app is a mapping plus auth (T47, T48, T49, T50), and treat any vendor MCP server as an adapter you can swap (T51).

## Scaling ladder

| Rung | Corpus (estimate unless cited) | What to build | What changes next |
|---|---|---|---|
| 1. Team, ~100 docs per user | Tens of thousands of docs; if the whole knowledge base is under 200,000 tokens (~500 pages) skip RAG entirely (T27) | Full-text + live MCP/federated calls with per-user tokens; tiny index of pointers; ACL = the user's own token, so no ACL sync | Graduates when corpus exceeds context or live calls get slow (Dash: up to 45 s, T11) |
| 2. 10k employees | Millions to low billions of chunks (estimate: 10k users x ~1,000 docs x ~10 chunks = ~100M chunks) | One namespace per tenant (here one company); webhooks + delta + polling per connector; identity/group sync; hybrid + rerank; hash-diff re-embedding; eval set and lag monitors. Cost sample (estimate): 100M chunks x 1536-d float32 = ~614 GB = ~$200/month storage at $0.33/GB (T37), before write/query fees | Backfill quotas (T06, T07, T08) set onboarding time; ACL group explosion; need generation routing for model upgrades (T43) |
| 3. 1M employees / billions of docs | Billions of chunks per large tenant; many tenants | Namespaces per tenant with shard split (500M docs/shard, T35); object-storage-native index with NVMe/RAM cache; quantization; per-tenant keys and residency cells; durable workflow fleet with per-tenant budgets; live ACL check on final top N; agentic routing with token caps; multi-region active tenants pre-warmed | Cost is dominated by writes and re-embedding (T42, T44), cold starts (~20 s at billions, T38), and source rate limits; freshness becomes a per-connector SLA, not one number |

Reference points: Notion reports a multi-billion object corpus, 10x scale at about 90% lower cost, p50 query 50-70 ms and sub-minute live freshness (T42, T45).

## Open gaps (not found in public sources)

- Glean's engineering internals (documents per tenant, QPS, p95): not published in what was reachable; only identity and connector docs found (T20, T47).
- No official per-million-vector cost from any vendor; the $/GB rates above are list prices and the per-corpus totals are estimates.
- Temporal-style durable-execution evidence for connectors was not found; T10 is the closest primary source.
- GDPR-specific guidance on vector deletion rests on secondary summaries (T16, T17); get counsel review before promising erasure SLAs.
