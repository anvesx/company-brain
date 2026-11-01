"""Skeleton of the federated company brain: stages, groups, components (id, kind, label, sub, pin) and edges.
Run: python3 -I skeleton.py  -> writes skeleton.json. Everything else (cards, viewer, counts) is generated from it."""
import json
from pathlib import Path

S = []   # stages
C = {}   # comps
E = []   # edges


def stage(id, n, role, title, blurb, groups):
    gs = []
    for gid, gtitle, comps in groups:
        members = []
        for cid, kind, label, sub, pin in comps:
            assert cid not in C, cid
            C[cid] = {"label": label, "sub": sub, "kind": kind, "stage": id, "group": f"{id}.{gid}", "pin": pin}
            members.append(cid)
        gs.append({"id": f"{id}.{gid}", "short": gid, "title": gtitle, "members": members})
    S.append({"id": id, "n": n, "role": role, "title": title, "blurb": blurb, "groups": gs})


def edge(a, b, l, d, k="n"):
    E.append({"a": a, "b": b, "l": l, "d": d, "k": k})


# ---------------------------------------------------------------- 1 connect
stage("src", 1, "main", "Connect to every app",
      "Admin connects an app once. A connector reads it with the least access that works, at the app's own pace, and turns what it finds into one shared shape.",
      [("ident", "Access and identity", [
          ("so_admin", "actor", "Workspace admin", "Connects an app", "admin consent screen with a scope diff the admin approves before any token is issued"),
          ("so_oauth", "sec", "Token vault", "Refresh and access tokens", "OAuth 2.0 authorization-code grant with refresh tokens, wrapped by a KMS key per tenant (RFC 6749)"),
          ("so_svc", "sec", "App-only access", "Sweep without a user", "admin-consented app-only access (domain-wide delegation, application permissions), read-only scopes from a catalog"),
          ("so_obo", "sec", "On-behalf-of exchange", "Per-user token at query time", "OAuth 2.0 token exchange (RFC 8693) and the Microsoft on-behalf-of flow: trade the user's brain token for a short-lived app token"),
      ]),
       ("rt", "Connector runtime", [
          ("so_sdk", "plat", "Connector SDK", "Manifest plus code escape hatch", "declarative manifest (auth, streams, pagination, incremental cursor, ACL mapping) with a code hook, as in Airbyte low-code connectors"),
          ("so_cap", "det", "Capability probe", "What can this app do?", "per-app capability descriptor {webhook, delta, list, search, acl_api, rate}; the cheapest freshness path that works is chosen"),
          ("so_rate", "det", "Rate-limit budgeter", "Stay inside each app's quota", "hierarchical token bucket per (tenant, app, endpoint) that honours Retry-After and shares a fair queue between tenants"),
          ("so_mcp", "svc", "MCP bridge", "Apps that ship an MCP server", "Model Context Protocol client that calls an app's own MCP server for live read and search when no native connector exists"),
          ("so_norm", "det", "Schema normaliser", "One shape for every object", "map each app object to a Document, Message, Principal or Event envelope with a stable URI, a version and a content hash"),
          ("so_apps", "ext", "Company apps", "Slack, Drive, 365, Notion, Jira, GitHub, CRM", "vendor REST, GraphQL and webhook APIs; the system of record stays here"),
      ])])

# ---------------------------------------------------------------- 2 changes
stage("chg", 2, "main", "Catch every change",
      "Each change reaches the brain by the cheapest reliable path: a push when the app offers one, a cursor poll otherwise, and a slow full sweep to catch what both missed.",
      [("trig", "Triggers", [
          ("ch_hook", "svc", "Webhook receiver", "Verify, ack, enqueue", "HMAC signature check, replay window, acknowledge in under 200 ms, enqueue the event and do no work inline"),
          ("ch_delta", "det", "Delta poller", "Resume from a change token", "per-stream change cursor (Microsoft Graph delta link, Drive changes page token), persisted and resumable"),
          ("ch_cdc", "svc", "Database change tail", "Rows in databases and warehouses", "log-based change data capture (Debezium style) for sources that expose a transaction log"),
          ("ch_sweep", "det", "Reconciliation sweep", "Catch what pushes missed", "slow full listing compared against a per-folder hash digest, so only differing subtrees are re-read"),
          ("ch_sched", "det", "Adaptive scheduler", "Poll faster where things change", "poll interval from an EWMA of the observed change rate, clamped between 30 s and 6 h and capped by the rate budget"),
      ]),
       ("flow", "Durable sync", [
          ("ch_bus", "bus", "Change event log", "Ordered per document", "partitioned append-only log keyed by tenant and document, at-least-once delivery"),
          ("ch_dedupe", "det", "Idempotency and ordering", "Drop stale and duplicate events", "compare-and-set on (doc_id, source_version): apply only when the version is newer than the stored one"),
          ("ch_wf", "plat", "Durable sync workflow", "Retry, resume, never lose a cursor", "durable-execution workflow (Temporal style) with resumable cursors, bounded retries and per-source concurrency"),
          ("ch_fill", "svc", "Backfill crawler", "First crawl, useful early", "priority-ordered initial crawl (recent, shared and popular first) so search works before the crawl ends"),
          ("ch_tomb", "det", "Tombstone propagation", "Deletes and revoked access", "a delete or permission removal soft-deletes the pointer at once and queues a purge of everything derived from it"),
          ("ch_cursor", "db", "Cursor store", "Where each stream stopped", "transactional store of {stream, cursor, watermark} written in the same transaction as the events it covers"),
          ("ch_dlq", "db", "Dead-letter queue", "Parked failures with a replay tool", "parked events with an error class, retry history and a one-click replay"),
      ])])

# ---------------------------------------------------------------- 3 index
stage("idx", 3, "main", "The pointer index",
      "The brain keeps pointers, facts about each document, access lists and search vectors. Document bodies are read on demand and thrown away after the vectors are made.",
      [("reg", "Pointer registry", [
          ("ix_ptr", "db", "Pointer registry", "One row per object, no body", "row {uri, app, source_id, version, content_hash, title, owner, times, acl_ref, vector_ids}; the body is never written"),
          ("ix_meta", "db", "Filter attributes", "App, type, owner, date, space", "columnar attributes the search engine filters on before it scores"),
          ("ix_ent", "ml", "Entity resolver", "Same person or project across apps", "blocking plus pairwise match scoring (Fellegi-Sunter style) with a merge audit trail"),
          ("ix_link", "db", "Relationship graph", "Who, what, linked to what", "property graph of document-to-document, person-to-document and document-to-entity edges, stored as adjacency lists"),
          ("ix_fresh", "det", "Freshness stamp", "How old is this entry?", "each pointer carries source_version and last_verified; staleness is now minus last_verified"),
          ("ix_def", "db", "Business definitions", "One agreed meaning per term", "versioned semantic contract {term, definition, owner, valid_from, valid_to, source_uri}; a query that uses a term is rewritten to the definition in force on the question date"),
          ("ix_att", "db", "Claim and attestation record", "One meaning, many sources", "each claim holds one meaning; each attestation holds a locator, content hash, author, observed time and validity window, and strength is computed when read"),
      ]),
       ("derive", "Transient derivation", [
          ("ix_fetch", "svc", "Transient fetcher", "Read the body, keep it in memory", "fetch through the connector by pointer; the body lives in memory only and is dropped after derivation"),
          ("ix_ext", "det", "Text extractor", "HTML, PDF, Office, code, chat", "format-specific extraction that keeps headings, tables and message turns"),
          ("ix_chunk", "det", "Structure-aware chunker", "Cut on meaning, not on count", "split on headings, message turns and function bounds with a 256 to 512 token target and small overlap"),
          ("ix_ctx", "llm", "Context line writer", "One sentence of context per chunk", "contextual retrieval: a cheap model writes a short situating line prepended to the chunk before embedding, cached by content hash"),
          ("ix_pii", "ml", "Sensitivity classifier", "Secrets and personal data", "detector for secrets and personal data that drops or masks them before embedding and sets a sensitivity label"),
          ("ix_embed", "ml", "Embedding service", "Dense vectors, versioned", "dense embedding through the model gateway, batched, with the model id stored on every vector"),
          ("ix_cat", "db", "Artifact catalog", "What kind of thing each pointer is", "typed catalog row per pointer {artifact_type, entities[], period, owner_team, summary_ref}, built from metadata and the first screen of text; search narrows to candidate ids here before any vector is touched"),
      ]),
       ("stores", "Search stores", [
          ("ix_lex", "db", "Lexical index", "Words and names", "BM25 inverted index with block-max WAND pruning, sharded by tenant"),
          ("ix_vec", "db", "Vector index", "Meaning", "approximate nearest-neighbour index (HNSW or DiskANN) with int8 or binary quantisation, partitioned by tenant, filter-aware"),
          ("ix_snip", "db", "Snippet cache", "Short excerpt for ranking and preview", "excerpt capped at 300 characters, encrypted, with a time to live"),
          ("ix_gc", "det", "Index garbage collector", "Remove what no pointer owns", "epoch-based collection of vectors and postings whose pointer is tombstoned"),
          ("ix_reidx", "svc", "Re-embed migrator", "Change the model without downtime", "blue-green index versions: build the new one beside the old, dual-write, cut over, retire"),
      ])])

# ---------------------------------------------------------------- 4 permissions
stage("acl", 4, "main", "Permissions follow the user",
      "Every result is checked against the access list the source app holds. The index narrows the search by permission first; for the final few results the app is asked again.",
      [("sync", "Permission sync", [
          ("ac_scim", "svc", "Directory sync", "Users, groups, leavers", "SCIM 2.0 and identity-provider feeds for users, groups and offboarding events"),
          ("ac_id", "det", "Identity mapper", "App user to company person", "map each app's user id to one company principal by verified email, SCIM id and IdP subject"),
          ("ac_src", "svc", "ACL fetcher", "Who may open this object", "read each object's sharing list (Drive permissions, SharePoint, Slack channel members, Jira project roles)"),
          ("ac_grp", "det", "Group expander", "Nested groups made flat", "cycle-safe nested group flattening with versioned membership snapshots and lazy expansion for very large groups"),
          ("ac_store", "db", "Access list store", "Object to allowed principals", "document id to a set of principal and group ids, stored apart from content so it can change on its own"),
      ]),
       ("enf", "Enforcement", [
          ("ac_filter", "det", "Filter compiler", "Search only what you may see", "user to principal set to a pre-filter pushed into lexical and vector search; never filter after ranking alone"),
          ("ac_live", "sec", "Live permission recheck", "Ask the app again for the top results", "verify the top-k with the source app using the user's token before display; fail closed"),
          ("ac_neg", "db", "Revocation fast path", "Lost access takes effect in seconds", "revoked-principal cache with push invalidation and a seconds-long time to live"),
          ("ac_audit", "db", "Access audit log", "Who saw which object, under which list", "append-only record of principal, query, objects shown, ACL version and any source recheck"),
          ("ac_gate", "sec", "Ownership gate", "Hard check after retrieval, before the model", "every retrieved chunk carries owner and zone; a chunk whose owner or zone is not in the caller's allowed set is dropped by code, not by a prompt, and each drop is counted"),
          ("ac_lin", "sec", "Derived-object access", "A note is as private as its sources", "each stored card or note keeps a derived_from list; visibility is the intersection of the asker's rights on every source, rechecked lazily after a policy change"),
      ])])

# ---------------------------------------------------------------- 5 query
stage("qry", 5, "main", "Answer a question",
      "A question is planned, routed to the index or to the live app, ranked, checked against the user's permissions, read fresh, and answered with citations.",
      [("plan", "Understand and route", [
          ("qr_id", "det", "Principal resolver", "Who is asking, as whom", "resolve the caller to a user principal, an optional agent id and a scope"),
          ("qr_rw", "llm", "Query planner", "Rewrite and split the question", "a small model rewrites, decomposes and extracts entities; it never sees data, only the question"),
          ("qr_route", "det", "Source router", "Index, live, or both", "cost-based choice per sub-question from freshness need, app capability and remaining rate budget"),
          ("qr_cache", "db", "Result cache", "Per permission set", "cache keyed by query and principal set, invalidated by change events"),
          ("qr_scope", "det", "Candidate scoper", "Narrow to a few hundred ids first", "catalog and metadata filters produce a candidate id set (target under 500) that the lexical and vector search then rank inside, with the permission filter applied to the same set"),
          ("qr_rev", "llm", "Plan reviser", "Diagnose a bad step and change the plan", "after each step a small model checks the result against the sub-question, names the failure (empty, off-topic, wrong source, stale) and revises the next step, at most 3 revisions"),
      ]),
       ("ret", "Retrieve", [
          ("qr_hyb", "det", "Hybrid retrieval", "Words plus meaning", "BM25 and dense nearest neighbours merged with reciprocal rank fusion (k = 60)"),
          ("qr_graph", "det", "Graph expansion", "Pull in linked context", "personalised PageRank over the relationship graph from the entities in the question"),
          ("qr_live", "svc", "Live federated search", "Ask the app itself", "fan-out to app search APIs or MCP tools with the user's token, 1.5 s deadline, merged by rank fusion"),
          ("qr_rerank", "ml", "Cross-encoder reranker", "Best ten of a hundred", "cross-encoder over the top 100 with recency and authority features"),
          ("qr_hyd", "svc", "Hydrator", "Read the real text now", "fetch current text for the chosen pointers, validate by ETag, recheck access"),
          ("qr_loop", "llm", "Raw-record search loop", "Agent searches the records, step by step", "agentic loop with chat-native controls (grep by term, filter by channel, actor and time, read around a hit) over permitted raw records, capped at 8 steps and a token budget"),
      ]),
       ("ans", "Compose the answer", [
          ("qr_pack", "det", "Context packer", "Fit the best into the budget", "token-budgeted selection with maximal marginal relevance and ordering that fights the lost-in-the-middle effect"),
          ("qr_inj", "sec", "Injection quarantine", "Retrieved text is data", "retrieved text is wrapped as untrusted data; an instruction detector flags it and tool calls stay off in this context"),
          ("qr_ans", "llm", "Answer generator", "Cite or abstain", "model call through the gateway with a cite-or-abstain instruction"),
          ("qr_cite", "det", "Citation verifier", "Every claim has a source", "check each claim span against its cited passage and drop what the passage does not support"),
          ("qr_stamp", "det", "Freshness stamp", "Say how current the answer is", "attach source version and read time to every citation"),
          ("qr_life", "det", "Evidence lifecycle check", "Newest, not contradicted, complete", "each passage is labelled current, superseded or contradicted from version and link edges; set questions are checked for completeness and negations route to an absence check"),
      ])])

# ---------------------------------------------------------------- 6 llm interface
stage("llm", 6, "main", "Interfaces for LLMs and agents",
      "Any model or agent can ask the brain through MCP or a plain API, under its own identity, and gets results that say where they came from and how current they are.",
      [("mcp", "Expose the brain", [
          ("ll_mcp", "svc", "Brain MCP server", "search, fetch, who_knows", "Model Context Protocol server over streamable HTTP with OAuth 2.1; tools search, fetch, list_sources, who_knows"),
          ("ll_api", "svc", "REST and SDK", "For code that is not an agent", "REST with an OpenAPI description, idempotency keys, cursor pagination and generated SDKs"),
          ("ll_schema", "det", "Tool contract", "Descriptions tuned by evaluation", "tool names, descriptions and argument schemas tuned against a tool-use eval, with token-lean responses"),
          ("ll_fmt", "det", "Result envelope", "Provenance on every hit", "result {id, title, uri, snippet, score, source_app, version, retrieved_at, permission_checked_at}"),
          ("ll_browse", "svc", "Browsable knowledge files", "Agent reads index.md, then opens one file", "a generated tree of index.md and SKILL.md files with frontmatter {title, owner, updated, scope, open_with}, served per user so an agent lists, reads and follows links like a file system"),
      ]),
       ("agent", "Agent access", [
          ("ll_agent", "sec", "Agent identity and scope", "Its own name, narrower than its owner", "per-agent principal with a named owner and a token scoped to no more than the owner may see"),
          ("ll_quota", "det", "Quota and fairness", "No agent starves the rest", "token bucket per agent and tenant with the cost of each call metered"),
          ("ll_sub", "svc", "Change subscription", "Wake an agent when something changes", "agents subscribe to entity or topic change events and receive pushes"),
          ("ll_ro", "sec", "Read-only guard", "The brain does not write to apps", "the brain exposes no write tool; actions go through the action layer under policy"),
      ]),
       ("proactive", "Proactive surfacing", [
          ("ll_delta", "det", "Change detector", "What moved since last time", "per user and per watched entity, diff the pointer and relationship changes since the last cursor, grouped by entity and kept as {entity, change, uri, at}"),
          ("ll_score", "ml", "Relevance scorer", "Does this change matter to this person?", "score = w1*role_match + w2*recency + w3*link_distance + w4*past_clicks, thresholded per user; only permitted changes are scored"),
          ("ll_note", "llm", "Notification writer", "Two lines and a link", "a small model turns the top deltas into a short notice with citations, one notice per entity per day, with a snooze and a never-again control"),
      ])])

# ---------------------------------------------------------------- 7 AI clients
stage("cli", 7, "main", "Connect to AI clients",
      "One remote MCP server reaches Claude, Codex, ChatGPT, Cursor, Copilot and Gemini. Each client signs the user in, sees a small set of tools, and gets the answer under its own limits.",
      [("auth", "Sign in from any client", [
          ("cl_meta", "svc", "Login discovery", "Client finds the login server itself", "RFC 9728 protected resource metadata plus RFC 8414 server metadata, so a client learns where to sign in from a 401 reply"),
          ("cl_reg", "svc", "Client registration", "Known or unknown client", "client ID metadata documents first, dynamic client registration as fallback, and a static pre-registered client for hosts that need one"),
          ("cl_aud", "sec", "Token audience check", "Token made for this server only", "PKCE S256, RFC 8707 resource indicator checked as the token audience, and RFC 9207 issuer in the redirect"),
          ("cl_consent", "svc", "Connect-an-app prompt", "Ask the user to link a source", "URL-mode elicitation that sends the user to the brain's own consent page when a source app is not linked yet"),
      ]),
       ("ship", "Reach each client", [
          ("cl_search", "svc", "Search and fetch pair", "Works with ChatGPT research", "two tools named search and fetch that return {id, title, text, url}, as ChatGPT deep research and company knowledge expect"),
          ("cl_budget", "det", "Tool and output budget", "Stay inside each client's limits", "few tools with exact names, results under 25,000 tokens, a result-size hint on large tools, server instructions under 4,096 characters"),
          ("cl_dist", "det", "Org rollout configs", "One file per client family", "generated managed config per client: managed-mcp.json, Claude.ai org connector, Copilot policy, Windsurf allowlist, Codex requirement, ChatGPT admin app"),
          ("cl_plugin", "det", "Skill and context snippets", "Tell agents when to ask the brain", "a Claude plugin with a skill, plus CLAUDE.md and AGENTS.md snippets that name the brain tools and when to call them"),
          ("cl_net", "plat", "Public endpoint", "Reachable from vendor clouds", "public HTTPS URL with an allowlist of vendor IP ranges, and a private registry instead of the public MCP registry"),
          ("cl_tasks", "svc", "Slow query tasks", "Long searches that report back", "the MCP Tasks extension for slow multi-source queries, with polling and a cancel call"),
      ])])

# ---------------------------------------------------------------- 7 ops
stage("ops", 8, "support", "Freshness, quality and cost",
      "The index is measured against the apps it points at: how late it is, what it misses, whether it leaks, and what each question and document costs.",
      [("fresh", "Freshness", [
          ("op_lag", "det", "Freshness lag monitor", "How late is the index?", "lag is now minus source modified time, tracked as p95 per source against a stated target"),
          ("op_audit", "det", "Sampling audit", "Check a sample against the app", "random pointers checked against the live app for existence, version and access, with a capture-recapture coverage estimate"),
          ("op_cov", "det", "Coverage estimator", "Index count against app count", "compare indexed object counts with cheap count calls to the app"),
          ("op_health", "svc", "Connector health", "Break the circuit, then repair", "error budget and circuit breaker that pauses a failing connector and opens a repair task"),
          ("op_beat", "det", "Silent-failure heartbeat", "A quiet source is not a healthy source", "each connector must emit a heartbeat and a count of objects seen; no heartbeat, or zero new objects against an expected rate, raises a health alarm and forces a sweep"),
      ]),
       ("qual", "Quality and cost", [
          ("op_eval", "det", "Retrieval evaluation", "A golden set per tenant", "recall at k, nDCG at 10 and MRR on a per-tenant golden set, run on every index change"),
          ("op_leak", "sec", "Permission leak test", "Planted users, zero leaks allowed", "synthetic users with known access lists; any unauthorised hit fails the release"),
          ("op_cost", "det", "Cost meter", "Per document and per query", "cost per document indexed and per query from embedding, storage and app API calls"),
          ("op_trace", "svc", "Query trace store", "Replay any answer", "full trace of plan, retrieve, live calls and rerank, replayable against a past index version"),
          ("op_attr", "ml", "Failure attributor", "Which stage caused the bad answer?", "given a failed trace, a model assigns the failure to one stage (route, retrieve, rank, permission, compose) with evidence, and the cause is counted per week"),
          ("op_ver", "svc", "Versioned pipeline release", "Prompts, rules and indexes ship as versions", "planner prompts, chunk rules, rerank weights and thresholds are versioned artifacts; a candidate version must beat the current one on the golden set under a judge before it goes live, and rolls back in one call"),
      ])])

# ---------------------------------------------------------------- 8 governance
stage("gov", 9, "support", "Privacy, deletion and tenant safety",
      "What the brain keeps is small and sensitive. It must forget when the app forgets, keep tenants apart, honour each app's terms and stop on command.",
      [("priv", "Keep and forget", [
          ("gv_erase", "det", "Erasure propagation", "Delete in the app, gone here", "a source delete becomes a tombstone that purges pointers, vectors, snippets, caches and traces within a stated time, with a receipt"),
          ("gv_kms", "sec", "Tenant keys and region", "Own key, own region", "per-tenant envelope encryption with an optional customer-held key and region pinning"),
          ("gv_inv", "sec", "Embedding protection", "Vectors are sensitive", "treat embeddings as sensitive data: encrypted at rest, never exported, rotated per tenant"),
          ("gv_tenant", "sec", "Tenant isolation", "No cross-tenant read", "tenant id in every key and shard, with row-level policy as a second check"),
          ("gv_tos", "det", "Vendor terms registry", "What each app lets us keep", "per-app allowed use (cache time, training ban, rate) enforced by configuration"),
          ("gv_line", "det", "Store-or-point rule", "What the brain may keep, and what it only points to", "a table of what may be stored per object class: pointers, filters and a 300-character excerpt by default; derived notes only with a source list and an owner"),
          ("gv_kill", "sec", "Pause and purge switch", "Stop one connector or one tenant", "per-connector and per-tenant kill switch that stops sync and purges derived data"),
      ])])

# ---------------------------------------------------------------- 10 platform parts
stage("plt", 10, "support", "Platform parts the brain owns",
      "The brain is its own product. It runs these parts itself and picks standard tools for each, so it needs no host system.",
      [("own", "Own platform parts", [
          ("pl_gw", "plat", "LLM gateway", "Every model call goes here", "one gateway such as LiteLLM routes by cost and quality, meters spend per team and redacts personal data"),
          ("pl_idp", "plat", "Identity and audit", "Users, agents, tenants, audit", "an OpenID Connect provider for users and agents, plus a hash-chained audit table nobody can edit"),
          ("pl_pol", "plat", "Policy engine", "Written rules before action", "versioned rule files in OPA or Cedar, checked before any agent action"),
          ("pl_mem", "plat", "Lessons store", "Preferences, corrections, lessons", "a per-tenant table of corrections and preferences, linked to the eval tests that guard them"),
          ("pl_obs", "plat", "Traces and eval gates", "Release gates and incidents", "OpenTelemetry traces and a CI eval suite that blocks a release, plus an incident log"),
      ])])


# ---------------------------------------------------------------- 11 zones and credentials
stage("zon", 11, "main", "Personal, team and company zones",
      "Admin access sees what the company shares. Per-user access sees what only one person can. Every pointer is tagged with a zone from its source, and personal data stays with its owner.",
      [("zone", "Zones and promotion", [
          ("zn_tag", "det", "Zone tagger", "Company, team or personal", "zone is read from the source's own sharing setting (private channel, DM, My Drive, shared drive), never guessed by a model"),
          ("zn_scope", "sec", "Owner filter", "Personal rows match their owner only", "owner id is a mandatory filter term inside the ANN and BM25 query for every personal-zone row, checked again at hydrate"),
          ("zn_key", "sec", "Per-user key", "Personal data under the owner's key", "envelope encryption with one data key per user wrapped by the tenant KMS key; deleting the user key crypto-shreds their zone"),
          ("zn_promote", "det", "Promotion gate", "Personal to team only with consent", "an item leaves the personal zone only when the source sharing changes or the owner confirms in a prompt; a model never promotes"),
          ("zn_taint", "det", "Derived-data taint", "Nothing derived crosses zones", "every cache entry, entity, lesson and trace carries the highest zone of its inputs, and a company-level store rejects a personal taint"),
          ("zn_review", "det", "Preview and correct", "Owner sees and edits before sharing", "before any case or chat excerpt leaves the personal zone the owner gets a preview with the exact text, can edit or strike lines, and approves; the approval record is kept"),
      ]),
       ("cred", "Admin and user credentials", [
          ("cr_mode", "det", "Credential mode policy", "Admin crawl, user link, or both", "per connector and per zone mode table: company zone via app-only grant, personal zone via the user's own grant, strict mode forces user grant for all"),
          ("cr_link", "svc", "One-time user link", "Sign in once, link without a second login", "the user signs in once through company single sign-on, and linking an app reuses that session; only apps with no federation show a consent page"),
          ("cr_union", "det", "Merged view", "Admin view plus the user's own view", "results from the admin-crawled index and the user-linked index are merged by uri, and the stricter ACL wins on a conflict"),
          ("cr_gap", "det", "Coverage gap report", "What the admin crawl cannot see", "per source, count objects the app-only grant cannot list and prompt the owner to link, using a probe of the user's own listing"),
      ])])

# ---------------------------------------------------------------- 12 capture
stage("cap", 12, "main", "Capture AI chats and work activity",
      "A small app on each laptop and the vendor admin feeds bring in AI chats and work activity as personal-zone records, with the owner in control.",
      [("local", "Companion app", [
          ("cp_daemon", "svc", "Local daemon", "Runs on each laptop", "a signed background process that watches an allowlist of session folders and posts new turns over an outbound-only TLS channel"),
          ("cp_hook", "det", "Session hook reader", "Claude Code and Codex sessions", "session-end and stop hooks plus a tail of the local JSONL transcript files, resuming from a byte offset per file"),
          ("cp_redact", "det", "On-device redaction", "Strip secrets before upload", "pattern and entropy secret scan (gitleaks style) plus personal-data masking, run before any byte leaves the laptop"),
          ("cp_vault", "sec", "Keychain and consent", "Owns the credentials, shows a pause button", "tokens stay in the operating system keychain, only the daemon reads them, and a visible pause switch stops capture at once"),
          ("cp_mdm", "plat", "Rollout and update", "Install by device management", "a signed and notarised installer pushed by device management with a pinned auto-update channel and a remote disable"),
      ]),
       ("feeds", "Vendor feeds", [
          ("cf_claude", "ext", "Claude compliance feed", "Enterprise chats and files", "Anthropic compliance API pulled on a schedule with a compliance access key, for web and desktop chats"),
          ("cf_openai", "ext", "ChatGPT compliance feed", "Enterprise conversation logs", "OpenAI compliance logs pulled in time windows as JSONL, scoped by workspace"),
          ("cf_vault", "ext", "Other chat exports", "Gemini and Copilot", "Google Vault export and Microsoft Purview or Graph interaction records, pulled by the same scheduled runner"),
          ("cf_norm", "det", "Chat normaliser", "One Message shape, zone personal", "each turn becomes a Message envelope {uri, owner, tool, session, turn, time, content_hash} stamped zone personal"),
          ("cf_del", "det", "Delete reconciler", "Chats the user deleted", "each export or hook run is diffed against the pointer set and any turn no longer reported becomes a tombstone"),
          ("cf_struct", "det", "Chat views", "By channel, by person, by artifact", "each Message is attached to three views, channel thread, actor timeline and artifact link, so a search can open the view that fits the question"),
      ]),
       ("experience", "Tacit experience", [
          ("cp_exp", "llm", "Experience distiller", "Turn a finished task into a case", "a model reads the owner's session and writes a case with six elements {situation, goal, actions, decision rule, outcome, caveat}, always as a draft the owner reviews"),
          ("cp_probe", "svc", "Claim probe", "Check the card against the live source", "before review, read-only calls to the live app test each card claim for support, scope and current validity, using the contributor's own permissions"),
          ("cp_dup", "det", "Duplicate and conflict check", "Is this case already on a shelf?", "compare the draft with the five nearest cards after a tag prefilter, then mark it new, a duplicate, a clarification or a conflict"),
          ("cp_trust", "det", "Card evidence tier", "Prediction, core or anchor", "a card starts as a prediction from one case, becomes core after three independent cases agree, and an anchor after ten review cycles without contradiction"),
          ("cp_lib", "db", "Case libraries", "Six shelves of cases", "six libraries (situation, action, decision rule, failure, tool, glossary) holding approved cases as pointers to the owner's source, retrieved by situation similarity"),
      ])])

# ---------------------------------------------------------------- 13 security
stage("sec", 13, "support", "Credential and agent security",
      "Tokens never reach an agent. Only the connector runtime opens them. Everything an agent reads is scanned and scoped, and an agent cannot ask for a secret.",
      [("vault", "Keep secrets from agents", [
          ("sc_runtime", "sec", "Token boundary", "Only the connector runtime decrypts", "tokens are decrypted only inside the connector runtime process, which has no inbound tool surface and no model access"),
          ("sc_split", "sec", "Separate admin and user keys", "One breach does not reach both", "admin app-only tokens and per-user tokens sit under different KMS keys and different roles, and neither role can read the other"),
          ("sc_noconf", "sec", "No credential tools", "Nothing to ask for a secret", "the tool list has no tool that returns, lists or edits a credential or connector setting; a test fails the build if one appears"),
          ("sc_scan", "det", "Secret scan on index and output", "Secrets never indexed or returned", "gitleaks style rules and entropy checks on every chunk before indexing and on every answer before it leaves"),
          ("sc_scope", "sec", "Agent scope and trifecta guard", "Least access per agent", "per-agent scope set checked by the policy engine, and no agent holds private data, untrusted input and an outbound channel at once"),
          ("sc_egress", "sec", "Egress allowlist", "Answers cannot leak out", "outbound destinations limited to an allowlist and rendered links and images stripped from answers"),
      ])])

# ---------------------------------------------------------------- 14 action agent
stage("act", 14, "main", "Record work and update tools",
      "A separate action agent reads context from the brain and proposes updates to Jira and similar tools. It writes with the user's own token after the user confirms.",
      [("write", "Action agent", [
          ("ag_collect", "svc", "Activity collector", "What the user did today", "reads the user's own personal-zone sessions and tool events for a day window, scoped by the owner filter"),
          ("ag_plan", "llm", "Update planner", "Draft the Jira changes", "a model proposes {tool, issue, change, evidence} items from collected activity and brain context, never a write"),
          ("ag_gate", "det", "Confirmation gate", "The user approves each change", "each proposed write waits for the owner's approval by default, and a per-tool auto-approve list is opt-in"),
          ("ag_write", "svc", "Scoped writer", "Writes with the user's own token", "one write call per approved item through the user's own grant, idempotent by a client key, then logged"),
          ("ag_priv", "det", "Quote guard", "Private chat never pasted in public", "any text copied from the personal zone into a company tool is paraphrased or blocked unless the owner confirms it"),
      ])])

# ================================================================ edges
edge("cl_meta", "cl_reg", "server metadata", "Authorization server URL, scopes and supported registration methods", "s")
edge("cl_reg", "cl_aud", "client record", "Registered client {client_id, redirect_uris, kind}", "s")
edge("cl_aud", "ll_mcp", "verified token", "Access token whose audience is this server, with the user's identity", "s")
edge("ll_mcp", "cl_meta", "401 challenge", "WWW-Authenticate header that points to the resource metadata", "s")
edge("cl_consent", "so_admin", "connect link", "URL to the consent page for the missing source app", "s")
edge("ll_mcp", "cl_consent", "unlinked source", "Source app that has no grant for this user", "e")
edge("cl_search", "ll_mcp", "tool pair", "search and fetch tool definitions that return {id, title, text, url}", "n")
edge("cl_search", "qr_id", "search call", "Tool call {query} with the caller's token", "e")
edge("cl_budget", "ll_schema", "limits", "Tool count, result token cap and instruction length cap", "n")
edge("cl_budget", "ll_fmt", "size cap", "Per-tool result size cap and page size", "n")
edge("cl_dist", "cl_net", "server URL", "Public MCP endpoint written into each client's config", "n")
edge("cl_plugin", "ll_mcp", "tool names", "Tool names the skill tells agents to call", "n")
edge("cl_net", "ll_mcp", "traffic", "Requests from vendor clouds and local clients", "e")
edge("cl_tasks", "ll_mcp", "task handle", "Task ID, status and result for a slow search", "n")
edge("cl_tasks", "qr_id", "long search", "Query that runs past the client's wait limit", "e")
# 1 connect
edge("so_admin", "so_oauth", "consent and scopes", "Admin approves the scope diff; the grant {tenant, app, scopes, expiry} is stored", "s")
edge("so_admin", "so_svc", "admin consent", "Tenant-wide app-only grant {tenant, app, scopes[]} with a named admin approver", "s")
edge("so_oauth", "so_obo", "refresh token", "Wrapped refresh token {user, app, kms_key_id} used only for per-user exchange", "s")
edge("so_oauth", "so_sdk", "access token", "Short-lived access token {token, expires_at, scopes} per user and app", "e")
edge("so_svc", "so_sdk", "app token", "App-only token {token, expires_at, scopes} for sweeps", "e")
edge("so_sdk", "so_cap", "probe", "Probe calls {app, endpoint} to learn webhook, delta, search and ACL support", "n")
edge("so_cap", "ch_sched", "freshness path", "Capability descriptor {webhook, delta, list, acl_api, rate_limits}", "e")
edge("so_rate", "so_sdk", "budget grant", "Grant {tenant, app, endpoint, tokens, wait_ms} before each call", "n")
edge("so_sdk", "so_apps", "list and read", "HTTPS request {endpoint, cursor, page_size} with the access token", "e")
edge("so_apps", "so_norm", "raw objects", "App-native object JSON with its own ids, times and sharing fields", "e")
edge("so_norm", "ch_bus", "normalised event", "Envelope {uri, app, tenant, kind, version, content_hash, modified_at, acl_ref}", "d")
edge("so_mcp", "so_apps", "MCP tool call", "MCP request {tool, arguments} to the app's own MCP server", "e")
edge("so_obo", "so_mcp", "user token", "Short-lived token for this user and this app", "s")
edge("so_obo", "qr_live", "user token", "Per-user token for live search, never stored beyond the request", "s")
edge("so_obo", "ac_live", "user token", "Per-user token for the final access recheck", "s")
edge("so_rate", "so_mcp", "budget grant", "Same budget applies to MCP calls", "n")
# 2 changes
edge("ch_hook", "ch_bus", "event", "Verified webhook {app, tenant, object_id, kind, received_at}", "d")
edge("ch_delta", "ch_bus", "changed objects", "Delta page {stream, items[], next_cursor}", "d")
edge("ch_cdc", "ch_bus", "row change", "Change record {table, pk, op, lsn, after}", "d")
edge("ch_sweep", "ch_bus", "missed change", "Objects whose digest differs from the registry {uri, version}", "d")
edge("ch_sched", "ch_delta", "poll now", "Poll order {stream, interval_s} from the change-rate EWMA", "n")
edge("ch_sched", "ch_sweep", "sweep window", "Sweep schedule {tenant, app, window}", "n")
edge("ch_bus", "ch_dedupe", "event", "Ordered event per document key", "e")
edge("ch_dedupe", "ch_wf", "new version", "Event whose version beats the stored one", "e")
edge("ch_dedupe", "ch_dlq", "poison event", "Event that failed {error_class, attempts}", "d")
edge("ch_wf", "ch_cursor", "commit cursor", "Cursor and watermark written with the events it covers", "n")
edge("ch_wf", "ch_dlq", "retries spent", "Event after bounded retries {error, history}", "d")
edge("ch_wf", "ix_ptr", "upsert pointer", "Pointer row {uri, version, content_hash, metadata}", "e")
edge("ch_wf", "ix_fetch", "derive request", "Order to fetch and derive {uri, version}", "e")
edge("ch_wf", "ch_tomb", "delete event", "Delete or access-removed event {uri, reason}", "s")
edge("ch_fill", "ch_bus", "backfill batch", "Priority-ordered objects {uri, rank}", "d")
edge("ch_dlq", "ch_wf", "replay", "Operator replay of a parked event", "n")
edge("ch_tomb", "gv_erase", "tombstone", "Tombstone {uri, tenant, reason, at}", "s")
edge("ch_tomb", "ix_ptr", "soft delete", "Mark pointer deleted so it drops out of search at once", "s")
edge("ch_cursor", "ch_delta", "resume point", "Stored cursor for the next poll", "n")
edge("ch_fill", "ch_cursor", "backfill progress", "Progress watermark per stream", "n")
# 3 index
edge("ix_ptr", "ix_meta", "attributes", "Filterable attributes {app, type, owner, date, space}", "n")
edge("ix_ptr", "ix_fresh", "version info", "source_version, last_verified", "n")
edge("ix_ptr", "ix_ent", "names and owners", "Person and project mentions {uri, mentions[]}", "n")
edge("ix_ent", "ix_link", "resolved entities", "Merged entity ids and edges", "n")
edge("ix_fetch", "ix_ext", "raw body", "Body bytes in memory {uri, version, mime}", "e")
edge("ix_ext", "ix_chunk", "structured text", "Text with headings, turns and tables marked", "e")
edge("ix_chunk", "ix_ctx", "chunks", "Chunks {chunk_id, text, position}", "e")
edge("ix_ctx", "ix_pii", "chunk with context", "Chunk text with the situating line", "e")
edge("ix_pii", "ix_embed", "clean chunks", "Chunk text with secrets masked and a sensitivity label", "e")
edge("ix_ctx", "pl_gw", "context-line call", "Model call through the gateway", "n")
edge("ix_embed", "pl_gw", "embedding call", "Batched embedding call through the gateway", "n")
edge("ix_embed", "ix_vec", "vectors", "Vector {chunk_id, vec, model_id, acl_ref, uri}", "e")
edge("ix_pii", "ix_lex", "tokens", "Chunk terms for the inverted index {chunk_id, terms, uri}", "e")
edge("ix_pii", "ix_snip", "excerpt", "Excerpt up to 300 characters with a time to live", "e")
edge("ix_link", "qr_graph", "graph reads", "Neighbours of an entity", "n")
edge("ix_gc", "ix_vec", "collect", "Remove vectors whose pointer is deleted", "s")
edge("ix_gc", "ix_lex", "collect", "Remove postings whose pointer is deleted", "s")
edge("ix_gc", "ix_snip", "expire", "Remove excerpts whose pointer is deleted", "s")
edge("ix_reidx", "ix_embed", "re-embed job", "Re-embed all chunks under the new model id", "n")
edge("ix_reidx", "ix_vec", "cutover", "Swap the active index version", "n")
edge("ix_meta", "ac_filter", "filter fields", "Attributes available to pre-filter", "n")
edge("ix_fresh", "op_lag", "stamps", "Per-pointer last_verified", "n")
# 4 permissions
edge("ac_scim", "ac_id", "users and groups", "User, group and leaver records from the identity provider", "s")
edge("ac_id", "ac_store", "principal map", "App user id to company principal", "s")
edge("ac_src", "ac_grp", "raw ACL", "Per-object sharing entries {uri, principal, role}", "s")
edge("ac_grp", "ac_store", "expanded sets", "Principal set per object with a membership snapshot version", "s")
edge("ch_wf", "ac_src", "acl refresh", "Order to refresh the sharing list when an object or its sharing changes", "s")
edge("ac_store", "ac_filter", "principal sets", "Object to allowed principal ids", "s")
edge("ac_filter", "qr_hyb", "pre-filter", "Principal-set filter {principals[], acl_version}", "s")
edge("qr_id", "ac_filter", "principal", "User principal, group ids and agent scope", "s")
edge("ac_neg", "ac_filter", "revoked", "Principals whose access just ended", "s")
edge("ac_live", "ac_audit", "decision", "Decision {user, uri, allowed, acl_version, checked_at}", "s")
edge("ac_live", "qr_hyd", "cleared results", "Results that passed the live recheck", "s")
edge("ac_scim", "ac_neg", "leaver event", "Offboarding event {principal, at}", "s")
edge("ac_audit", "pl_idp", "audit rows", "Rows appended to the shared audit log", "s")
edge("ac_src", "so_sdk", "acl read", "Sharing-list calls through the connector", "s")
# 5 query
edge("qr_id", "qr_rw", "question and scope", "Question text, principal, scope", "e")
edge("qr_rw", "qr_route", "sub-questions", "Sub-questions with entities and freshness hints", "e")
edge("qr_rw", "pl_gw", "planner call", "Small-model call through the gateway", "n")
edge("qr_route", "qr_cache", "lookup", "Cache key {query_hash, principal_set_id}", "n")
edge("qr_cache", "qr_hyb", "miss", "Sub-questions that missed the cache", "n")
edge("qr_route", "qr_hyb", "index path", "Sub-questions answerable from the index", "e")
edge("qr_route", "qr_live", "live path", "Sub-questions that need the freshest data or an unindexed app", "e")
edge("qr_hyb", "ix_lex", "term query", "BM25 query with the ACL pre-filter", "e")
edge("qr_hyb", "ix_vec", "vector query", "kNN query with the ACL pre-filter", "e")
edge("qr_hyb", "qr_graph", "seed hits", "Top hits whose entities seed the expansion", "n")
edge("qr_hyb", "qr_rerank", "candidates", "About 100 fused candidates {chunk_id, score}", "e")
edge("qr_graph", "qr_rerank", "extra candidates", "Linked documents from graph expansion", "n")
edge("qr_live", "qr_rerank", "live candidates", "App-ranked hits with the user's own access already applied", "e")
edge("qr_rerank", "ac_live", "top results", "Top 10 {uri, chunk_id, score}", "s")
edge("qr_hyd", "ix_snip", "snippet read", "Use cached excerpt while the live read is in flight", "n")
edge("qr_hyd", "qr_pack", "fresh passages", "Current passages with ETag and read time", "e")
edge("qr_hyd", "ix_fetch", "stale detected", "Re-derive when the ETag differs from the registry", "d")
edge("qr_pack", "qr_inj", "packed context", "Passages in budget order", "e")
edge("qr_inj", "qr_ans", "wrapped context", "Passages marked as untrusted data", "s")
edge("qr_ans", "pl_gw", "answer call", "Model call through the gateway", "n")
edge("qr_ans", "qr_cite", "draft answer", "Answer with claim spans and citation ids", "e")
edge("qr_cite", "qr_stamp", "verified answer", "Answer whose claims all have support", "e")
edge("qr_stamp", "ll_fmt", "final answer", "Answer with per-citation version and read time", "e")
edge("qr_cite", "pl_mem", "unsupported claims", "Claims that failed the check, for the lessons store", "d")
# 6 interfaces
edge("ll_mcp", "ll_schema", "tool descriptions", "Tool names, descriptions and argument schemas", "n")
edge("ll_mcp", "qr_id", "search call", "Tool call {query, filters} with the caller's token", "e")
edge("ll_api", "qr_id", "API call", "Request {query, filters} with the caller's token", "e")
edge("ll_fmt", "ll_mcp", "tool result", "Result envelope as an MCP tool result", "e")
edge("ll_fmt", "ll_api", "response", "Result envelope as JSON", "e")
edge("ll_agent", "ll_mcp", "agent token", "Token scoped to the agent and its owner", "s")
edge("ll_agent", "ll_api", "agent token", "Token scoped to the agent and its owner", "s")
edge("ll_agent", "pl_idp", "principal", "Agent principal {agent_id, owner, scope}", "s")
edge("ll_quota", "ll_mcp", "limit", "Allow or delay by bucket", "n")
edge("ll_quota", "op_cost", "metered use", "Calls and cost per agent", "n")
edge("ll_sub", "ch_bus", "event feed", "Subscribe to change events for an entity or topic", "d")
edge("ll_sub", "ll_agent", "push", "Change notification to the subscribed agent", "d")
edge("ll_ro", "ll_schema", "no write tools", "Tool list contains no write action", "s")
edge("ll_ro", "pl_pol", "action requests", "Write intents sent to the action layer under policy", "s")
# 7 ops
edge("op_lag", "op_health", "late source", "Source whose lag breaches its target", "n")
edge("op_audit", "op_cov", "sample result", "Sampled existence, version and access results", "n")
edge("op_cov", "ch_sweep", "gap found", "Folders or streams whose counts disagree", "n")
edge("op_health", "ch_wf", "pause", "Pause or resume a failing connector", "s")
edge("op_audit", "ix_ptr", "sample", "Random pointers drawn for checking", "n")
edge("op_eval", "pl_obs", "release gate", "Eval result that gates an index or model change", "n")
edge("op_eval", "ix_reidx", "gate", "Block a cutover when quality drops", "n")
edge("op_leak", "ac_filter", "probe", "Synthetic users query for objects they must not see", "s")
edge("op_leak", "pl_obs", "leak result", "Zero-leak result as a release gate", "s")
edge("op_cost", "pl_gw", "model spend", "Model spend read from the gateway meter", "n")
edge("op_trace", "qr_ans", "trace", "Plan, retrieve, live and rerank trace for each answer", "n")
edge("op_trace", "op_eval", "replay", "Replay of past queries against a new index", "n")
# 8 governance
edge("gv_erase", "ix_gc", "purge order", "Purge {uri, derived_ids[]}", "s")
edge("gv_erase", "qr_cache", "invalidate", "Drop cached answers that cite the object", "s")
edge("gv_erase", "op_trace", "redact traces", "Remove the object from stored traces", "s")
edge("gv_kms", "ix_vec", "key", "Per-tenant data key for the vector shard", "s")
edge("gv_kms", "ix_snip", "key", "Per-tenant data key for excerpts", "s")
edge("gv_inv", "ix_vec", "policy", "No export; rotate per tenant", "s")
edge("gv_tenant", "ix_ptr", "isolation", "Tenant id in every key; row-level policy", "s")
edge("gv_tos", "so_sdk", "allowed use", "Per-app cache time, training ban and rate ceiling", "s")
edge("gv_tos", "ix_snip", "time to live", "Maximum excerpt lifetime for the app", "s")
edge("gv_kill", "ch_wf", "stop sync", "Stop a connector or tenant", "s")
edge("gv_kill", "gv_erase", "purge", "Purge all derived data for the connector or tenant", "s")
# 9 reused
edge("pl_gw", "pl_pol", "policy check", "Each call is checked against policy", "s")
edge("pl_idp", "pl_pol", "principal", "Caller identity for policy", "s")
edge("pl_mem", "qr_rw", "preferences", "Company preferences and lessons for the planner", "n")
edge("pl_obs", "op_trace", "traces", "Shared trace and incident tooling", "n")


# 11 zones and credentials
edge("so_norm", "zn_tag", "envelope", "Normalised object with its source sharing fields", "s")
edge("zn_tag", "ix_ptr", "zone tag", "Pointer row gains {zone, owner_id}", "s")
edge("zn_tag", "zn_key", "personal rows", "Personal-zone chunks routed to the owner's data key", "s")
edge("zn_key", "ix_vec", "owner key", "Per-user data key for personal vector rows", "s")
edge("zn_scope", "ac_filter", "owner term", "Mandatory owner_id filter for personal rows", "s")
edge("zn_scope", "qr_hyd", "owner recheck", "Owner check repeated at hydrate", "s")
edge("zn_promote", "zn_tag", "new zone", "Zone change {uri, from, to, by, at}", "s")
edge("zn_promote", "ac_audit", "promotion record", "Who moved what out of the personal zone", "s")
edge("zn_taint", "qr_cache", "taint label", "Cache entries carry the highest input zone", "s")
edge("zn_taint", "ix_ent", "taint label", "Entities merge only inside one zone", "s")
edge("zn_taint", "pl_mem", "taint label", "Lessons store rejects personal taint", "s")
edge("zn_taint", "op_trace", "taint label", "Traces carry the zone of the answer", "s")
edge("cr_mode", "so_svc", "company zone", "Company-zone sweeps use the app-only grant", "s")
edge("cr_mode", "cr_link", "personal zone", "Personal-zone sources need the user's own grant", "s")
edge("cr_link", "so_oauth", "user grant", "Per-user refresh token stored under the user's key {user, app}", "s")
edge("cr_link", "cl_consent", "missing link", "Source with no federation falls back to the consent page", "s")
edge("cr_union", "qr_rerank", "merged candidates", "Candidates from both views, deduplicated by uri", "e")
edge("cr_gap", "cr_link", "link prompt", "Sources the user should link {user, app, count}", "n")
edge("cr_gap", "op_cov", "gap count", "Objects the admin crawl cannot see", "n")
edge("so_svc", "cr_union", "admin view", "Index built under the app-only grant", "e")
# 12 capture
edge("cp_hook", "cp_daemon", "new turns", "Transcript lines {session, offset, text}", "e")
edge("cp_daemon", "cp_redact", "raw turns", "Turns before upload", "e")
edge("cp_redact", "cf_norm", "clean turns", "Redacted turns over the outbound channel", "e")
edge("cp_vault", "cp_daemon", "pause and token", "Pause state and keychain-held token", "s")
edge("cp_mdm", "cp_daemon", "install and update", "Signed build and policy file", "n")
edge("cf_claude", "cf_norm", "export page", "Compliance API page {chat, files, deleted}", "d")
edge("cf_openai", "cf_norm", "log window", "Logs for a time window", "d")
edge("cf_vault", "cf_norm", "export file", "Vault or Purview export records", "d")
edge("cf_norm", "zn_tag", "personal messages", "Message envelope stamped zone personal", "s")
edge("cf_norm", "ch_bus", "chat event", "Message event {uri, owner, tool, session, turn}", "d")
edge("cf_del", "ch_tomb", "missing turns", "Turns no longer reported {uri, reason}", "s")
edge("cf_norm", "cf_del", "reported set", "Set of turn uris seen in this run", "n")
edge("cp_redact", "sc_scan", "rules", "Shared secret rule set", "n")
# 13 security
edge("sc_runtime", "so_oauth", "decrypt", "Decrypt request from the connector runtime only", "s")
edge("sc_runtime", "so_sdk", "short token", "Short-lived access token handed to a connector call", "s")
edge("sc_split", "gv_kms", "two keys", "Separate admin and user KMS keys", "s")
edge("sc_noconf", "ll_schema", "tool audit", "Build check that no credential tool exists", "s")
edge("sc_scan", "ix_pii", "rules", "Secret rules used before indexing", "s")
edge("sc_scan", "ll_fmt", "output scan", "Answer text scanned before it leaves", "s")
edge("sc_scope", "ll_agent", "scope", "Allowed tools and zones per agent", "s")
edge("sc_scope", "pl_pol", "rule set", "Trifecta rules in the policy engine", "s")
edge("sc_egress", "ll_fmt", "strip", "Links and images removed from answers", "s")
edge("sc_egress", "ag_write", "allowlist", "Destinations a write may call", "s")
# 14 action agent
edge("ag_collect", "zn_scope", "owner scope", "Reads limited to the signed-in owner", "s")
edge("ag_collect", "ag_plan", "activity", "Day window of the owner's sessions and events", "e")
edge("ag_plan", "pl_gw", "planner call", "Model call through the gateway", "n")
edge("ag_plan", "qr_id", "context search", "Brain search with the owner's token", "e")
edge("ag_plan", "ag_priv", "proposed items", "Items {tool, issue, change, evidence}", "e")
edge("ag_priv", "ag_gate", "checked items", "Items with private text paraphrased or blocked", "e")
edge("ag_gate", "ag_write", "approved items", "Items the owner approved", "e")
edge("ag_gate", "pl_pol", "policy check", "Write intent checked against rules", "s")
edge("ag_write", "so_apps", "write call", "One write with the user's own grant and an idempotency key", "e")
edge("ag_write", "ac_audit", "write record", "Audit row for each write", "s")
edge("ll_ro", "ag_collect", "read only brain", "The brain stays read only; this agent sits beside it", "s")

# ---- research update 2026-10: new components
edge("ix_ext", "ix_cat", "typed artifact", "Artifact type, entities and period found during extraction", "n")
edge("ix_cat", "ix_ptr", "catalog row", "Catalog fields written beside the pointer row", "n")
edge("ix_cat", "qr_scope", "candidate ids", "Ids whose type, entities and period match the question", "e")
edge("ix_def", "qr_rw", "definitions", "Term definitions in force on the question date", "n")
edge("ix_def", "qr_life", "term versions", "Definition validity windows used to label superseded answers", "n")
edge("qr_scope", "qr_hyb", "id set", "Candidate id set, target under 500, passed into both searches", "e")
edge("qr_scope", "ac_filter", "scope plus access", "Candidate ids joined with the permission filter", "s")
edge("qr_rev", "qr_route", "revised plan", "Next step with the diagnosis and the changed source or filter", "d")
edge("qr_rev", "op_trace", "revision record", "Failure name, old step, new step", "n")
edge("qr_hyd", "qr_rev", "step result", "Passages and counts from the step that just ran", "n")
edge("qr_loop", "qr_live", "raw search", "Grep, channel, actor and time filters sent to the live path", "n")
edge("qr_loop", "pl_gw", "agent step", "One model step through the gateway with the step budget", "n")
edge("qr_loop", "ac_filter", "same filter", "The user's permission filter applied on every step", "s")
edge("qr_loop", "qr_pack", "evidence set", "Passages the loop kept, with the steps that found them", "e")
edge("cf_struct", "qr_loop", "chat views", "Channel thread, actor timeline and artifact links the loop may open", "n")
edge("qr_pack", "qr_life", "packed passages", "Passages with version, supersedes and contradicts links", "e")
edge("qr_life", "ix_link", "link reads", "Supersedes and contradicts edges for the packed ids", "n")
edge("qr_life", "qr_ans", "labelled evidence", "Passages tagged current, superseded or contradicted, plus a completeness flag", "e")
edge("qr_rerank", "ac_gate", "ranked chunks", "Chunks with owner id and zone", "s")
edge("ac_gate", "ac_live", "owned chunks", "Chunks whose owner and zone are allowed", "s")
edge("ac_gate", "ac_audit", "drop record", "Count and reason of chunks dropped by the ownership gate", "s")
edge("ll_mcp", "ll_browse", "browse call", "list and read calls for index.md and SKILL.md files", "n")
edge("ll_browse", "ix_meta", "listing", "Per user listing built from catalog and filter attributes", "n")
edge("ll_browse", "ac_filter", "per user tree", "The tree is cut to what the user may open", "s")
edge("ll_browse", "ll_fmt", "file result", "File text with frontmatter and provenance", "e")
edge("ch_bus", "ll_delta", "change events", "Pointer and relationship change events", "d")
edge("ll_delta", "ll_score", "deltas", "Grouped changes per watched entity", "e")
edge("ll_score", "ac_filter", "who may see", "Permission filter applied before a delta is scored", "s")
edge("ll_score", "ll_note", "ranked deltas", "Deltas above the user's threshold", "e")
edge("ll_note", "pl_gw", "notice call", "Model call through the gateway", "n")
edge("ll_note", "ll_sub", "ready notices", "Notices handed to the subscription push", "d")
edge("cp_hook", "cp_exp", "finished session", "Redacted transcript of a finished task", "n")
edge("cp_exp", "pl_gw", "distil call", "Model call through the gateway", "n")
edge("zn_review", "zn_promote", "approved case", "Case text the owner approved or edited", "s")
edge("zn_review", "ac_audit", "consent record", "Who approved which text and when", "s")
edge("zn_promote", "cp_lib", "promoted case", "Approved case moved to the shared shelf", "e")
edge("cp_lib", "ll_browse", "libraries as files", "Each shelf exposed as browsable files", "n")
edge("cf_norm", "cf_struct", "messages", "Message envelopes ready to be attached to views", "e")
edge("cf_struct", "ix_link", "view edges", "Channel, actor and artifact edges", "n")
edge("op_beat", "op_health", "silent source", "Connector with no heartbeat or no new objects", "d")
edge("op_beat", "ch_sweep", "force sweep", "Sweep request for one connector", "d")
edge("op_beat", "pl_obs", "heartbeat", "Heartbeat rows per connector", "n")
edge("op_trace", "op_attr", "failed trace", "Trace of an answer a user marked wrong or the verifier rejected", "n")
edge("op_attr", "op_ver", "attributed fix", "Stage, cause and a proposed version change", "e")
edge("op_attr", "op_eval", "new golden case", "Failed question added to the golden set", "n")
edge("op_ver", "pl_gw", "judge call", "Judge model scores the candidate against the current version", "n")
edge("op_ver", "op_eval", "candidate", "Candidate version under test", "e")
edge("op_ver", "ix_reidx", "release", "Version id to cut over or roll back", "e")

# ---- research update 2026-10 batch 2: memory and knowledge-layer papers
edge('cp_exp', 'cp_probe', 'case draft', 'Six-field draft with its source pointers', 'e')
edge('cp_probe', 'ix_fetch', 'live read', "Read-only fetch of the cited source, under the contributor's token", 'e')
edge('cp_probe', 'cp_dup', 'probed draft', 'Draft with each claim marked supported, narrowed or unsupported', 'e')
edge('cp_dup', 'cp_lib', 'nearest cards', 'Top five cards by tag and meaning', 'n')
edge('cp_dup', 'cp_trust', 'checked draft', 'Draft with a new, duplicate, clarify or conflict mark', 'e')
edge('cp_trust', 'zn_review', 'draft with tier', "Draft and its evidence tier for the owner's review", 'e')
edge('cp_exp', 'ac_lin', 'derived_from', 'List of source pointers the card was drawn from', 's')
edge('ac_lin', 'ac_gate', 'card visibility', "Intersection of the asker's rights on every source", 's')
edge('ix_ptr', 'ix_att', 'locator and hash', 'Source locator, content hash and validity window', 'n')
edge('ix_att', 'qr_life', 'attestations', 'Claims with their attestations, authority and conflict edges', 'e')
edge('gv_tos', 'gv_line', 'vendor terms', 'What each app lets us keep', 's')
edge('gv_line', 'ix_snip', 'excerpt cap', 'Excerpt length and class rules', 's')
edge('gv_line', 'cp_lib', 'note rule', 'Derived notes need a source list and an owner', 's')

# gate: every edge endpoint exists
for e in E:
    assert e["a"] in C and e["b"] in C, e
touched = {e["a"] for e in E} | {e["b"] for e in E}
orph = [c for c in C if c not in touched]
assert not orph, orph
sk = {"stages": S, "comps": C, "edges": E}

Path(__file__).with_name("skeleton.json").write_text(json.dumps(sk, indent=1), encoding="utf-8")
ng = sum(len(s["groups"]) for s in S)
print(f"{len(S)} stages, {ng} groups, {len(C)} comps, {len(E)} edges")
