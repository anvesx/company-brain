# Permissions, identity, security, governance: library picks

Scope: stack.json layers L3 (acl.sync, acl.enf, cli.auth, zon.zone, zon.cred, sec.vault) and L5 (gov.priv, tenant isolation, erasure). Verified 2026-11-01 with `npm view` and `gh api` (owner repo of the main project; stars rounded as returned). Anything not checked is marked unverified. Node 26, pnpm.

Rule used for verdicts: embeddable in-process (testable without Docker) beats a server we must run.

## 1. ACL as data, filter inside the search query

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| Plain columns/arrays on pointer rows plus a WHERE clause (no lib) | n/a | n/a | n/a | n/a | Use. The filter must be part of the query, so a library cannot own it |
| @electric-sql/pglite (in-process Postgres for tests) | 0.5.14 | Apache-2.0 | unverified | npm modified 2026-10-31 | Use for tests only; array/GIN filter behaviour matches prod Postgres |
| lancedb/lancedb (r_lancedb in INDEX.md) | npm pkg not checked | Apache-2.0 | 11824 | 2026-11-01 | Candidate vector store; supports SQL-style prefilter (unverified for list-valued ACL columns) |
| @casl/ability | 7.1.1 | MIT | unverified | npm modified 2026-10-31 | Skip: ACL-to-query helpers target ORMs, not our vector store |

PICK: no library for the filter; `@electric-sql/pglite@0.5.14` as the in-process test DB. Why: the exit test (zero leaks over 1,000 queries) needs the filter in the SQL itself, and a real SQL engine runs in the unit suite. Thin adapter we write: `buildAclPredicate(principal): {sql, params}` that turns `{userId, groupIds[], tenantId}` into `tenant_id = $1 AND (acl_principals && $2::text[])`, plus a lint test that fails if any search function is callable without a predicate argument.

## 2. Relationship or policy authorization (live recheck, zone rules)

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| @cedar-policy/cedar-wasm (cedar-policy/cedar) | 4.14.0 | Apache-2.0 | 1827 | 2026-10-30 | Use. In-process wasm, typed schema, deny-overrides, unit-testable |
| @openfga/sdk (openfga/openfga) | 0.9.7 | Apache-2.0 | 6069 | 2026-10-30 | Skip for now. Needs a running server, no embedded mode (unverified for a JS embedded build) |
| @authzed/authzed-node (authzed/spicedb) | 1.6.1 | Apache-2.0 | 7184 | 2026-10-30 | Skip for now. Server required; LookupResources would give list-what-I-can-see but npm client last modified 2025-10-06 |
| casbin (casbin/node-casbin) | 5.51.1 | Apache-2.0 | 2922 | 2026-11-01 | Fallback. Embeddable, model files are looser than Cedar's schema |
| @cerbos/embedded (cerbos/cerbos-sdk-javascript) | 0.15.4 | Apache-2.0 | 84 | 2026-10-26 | Skip: small, wasm engine lags the server (unverified) |
| @open-policy-agent/opa-wasm | 1.10.0 | Apache-2.0 | unverified (opa repo 12419) | npm modified 2024-11-08 | Skip: client package stale |

PICK: `@cedar-policy/cedar-wasm@4.14.0`. Why: embeddable, schema-checked policies, explicit forbid-wins, and it covers both the live recheck decision and the zone rule in one engine. Limit: Cedar does not enumerate resources, which is fine because the set a user may see comes from the ACL filter in section 1. Thin adapter we write: `authorize({principal, action, resource, context}): Decision` wrapping `isAuthorized`, loading policies and schema from the repo, with a golden-file test (20 planted users, expected allow/deny table). Revisit OpenFGA or SpiceDB only if cross-app group nesting becomes too deep to sync as flat data.

## 3. OIDC login and per-app service accounts

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| openid-client (panva) | 6.8.8 | MIT | 2439 | 2026-10-28 | Use as the relying party for admin sign-in against the customer IdP |
| jose (panva) | 6.2.14 | MIT | 7857 | 2026-10-29 | Use for JWT sign and verify (service tokens, JWKS) |
| oidc-provider (panva/node-oidc-provider) | 9.13.3 | MIT | 3844 | 2026-10-29 | Use if we must issue tokens ourselves (client_credentials per app); in-process |
| better-auth | 1.7.15 | MIT | 30542 | 2026-11-01 | Skip for service accounts; good if we later want built-in user and session tables; brings framework peer deps |
| Keycloak (keycloak/keycloak) | server | Apache-2.0 | 37630 | 2026-11-01 | Skip: JVM server, not in-process |
| Ory Kratos (ory/kratos) | @ory/client 1.22.66 | Apache-2.0 | 13948 | 2026-07-29 | Skip: Go server |

PICK: `openid-client@6.8.8` plus `jose@6.2.14`; add `oidc-provider@9.13.3` only at the point we mint our own app tokens. Why: all three are one maintainer, MIT, pure Node, and run inside Vitest with a fake IdP. Thin adapter we write: `Identity` port with `verifyAdmin(idToken)` and `verifyServiceToken(jwt, expectedAppId)` returning `{tenantId, subject, kind}`, plus a `mintServiceToken(appId, scopes)` that uses jose and a per-app key.

## 4. Token vault for delegated user tokens

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| node:crypto AES-256-GCM envelope (no lib) | built in | n/a | n/a | n/a | Use for the data encryption layer |
| @aws-sdk/client-kms | 3.1161.0 | Apache-2.0 | unverified | npm modified 2026-10-30 | Use behind a KeyWrap port for production root keys |
| OpenBao (openbao/openbao) with node-vault 0.13.0 | server / 0.13.0 | MPL-2.0 / MIT | 8820 | 2026-10-30 | Alternative root-key service for self-hosted; server required |
| HashiCorp Vault | server | NOASSERTION on GitHub (BSL, unverified here) | 36454 | 2026-11-01 | Skip: license |
| Infisical (@infisical/sdk) | 5.0.2 | NOASSERTION on GitHub; SDK ISC | 30197 | 2026-11-01 | Skip: server, license mixed |
| Nango (nangohq/nango) | not checked | NOASSERTION | 13073 | 2026-10-30 | Skip: INDEX.md already flags non-OSI license |

PICK: `node:crypto` envelope plus `@aws-sdk/client-kms@3.1161.0` behind a port. Why: delegated tokens are small rows; a Postgres table of ciphertext with a per-tenant data key needs no server, and a local in-memory KeyWrap makes tests free. Thin adapter we write: `TokenVault.put(tenant, user, app, token)` and `get(...)`, with `KeyWrap {wrap, unwrap}` implemented by `LocalKeyWrap` (tests) and `KmsKeyWrap`; AAD binds tenant, user and app so a row copied across tenants fails to decrypt.

## 5. Tamper-evident audit log (hash chain)

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| node:crypto SHA-256 chain, append-only table (no lib) | built in | n/a | n/a | n/a | Use. About 60 lines |
| transparency-dev/tessera | Go | Apache-2.0 | 256 | 2026-10-29 | Skip: Go library, no Node binding found (unverified) |
| google/trillian | Go server | Apache-2.0 | 3760 | 2026-10-02 | Skip: heavy server |
| sigstore/rekor | Go server | Apache-2.0 | 1230 | 2026-10-26 | Skip: public-good transparency log, wrong shape |
| fast-check (property tests) | 4.10.2 | MIT | unverified | npm modified 2026-09-19 | Use for tamper tests |

PICK: own chain on `node:crypto`, tested with `fast-check@4.10.2`. Why: no maintained embeddable Node hash-chain log was found; the primitive is trivial and the value is in the verifier. Thin adapter we write: `AuditLog.append(event)` computing `hash = sha256(prevHash || canonicalJson(event))` per tenant inside one transaction, `verify(tenant)` that walks the chain, and a periodic anchor (write the head hash to a second store). Property test: mutate, drop or reorder any row and `verify` must fail.

## 6. Zone taint rule

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| Cedar forbid policy plus own label propagation | 4.14.0 | Apache-2.0 | 1827 | 2026-10-30 | Use |
| casbin | 5.51.1 | Apache-2.0 | 2922 | 2026-11-01 | Fallback |
| No dedicated taint-tracking lib found for Node | n/a | n/a | n/a | n/a | Build the propagation ourselves |

PICK: Cedar (same package as section 2). Why: the rule "a result touched by a restricted zone may not flow to a lower zone" is a forbid policy over `context.taint`; the propagation (max of input zones) is a pure function. Thin adapter we write: `taintOf(items): Zone` and a Cedar policy `forbid(...) when { context.taint > resource.zone }`, with tests that a mixed-zone answer to a low-zone sink is denied.

## 7. Right-to-delete (erasure across pointers, vectors, caches)

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| Crypto-shredding: per-tenant or per-subject data keys on node:crypto + KMS port | built in / 3.1161.0 | n/a / Apache-2.0 | n/a | n/a | Use for caches and any derived text |
| @aws-crypto/client-node (aws-encryption-sdk-javascript) | 5.0.2 | Apache-2.0 | 261 | 2026-10-31 | Alternative; adds keyring and message format we do not need |
| tink-crypto | 0.1.1 | Apache-2.0 | unverified | npm modified 2023-05-02 | Skip: stale |
| pg-boss (durable erase job) | 12.38.0 | MIT | unverified | npm modified 2026-10-13 | Use only if the chosen workflow engine does not already cover it |

PICK: our own `ErasureService` over the lineage table, with key destruction as the backstop (INDEX.md t_t17 warns soft-deleted vectors can persist). No new package beyond section 4. Thin adapter we write: `eraseSubject(tenant, subjectId)` that reads source-to-derived lineage, hard-deletes pointers, vectors and caches, destroys the subject key, then runs a probe that must return zero hits; the L5 exit test calls this exactly.

## 8. Tenant isolation

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| Postgres row-level security plus namespace per tenant in the vector store | n/a | n/a | n/a | n/a | Use (INDEX.md t_t35, t_t39 support namespace per tenant) |
| pglite for RLS tests | 0.5.14 | Apache-2.0 | unverified | 2026-10-31 | Use; RLS support inside pglite is unverified, run a spike first |
| lancedb (table per tenant) | npm not checked | Apache-2.0 | 11824 | 2026-11-01 | Candidate store |

PICK: no new library. Thin adapter we write: `withTenant(tenantId, fn)` that opens a transaction, runs `SET LOCAL app.tenant_id`, and hands `fn` a client bound to RLS policies; the vector adapter takes a `TenantScope` and refuses to build a handle without one. Cross-tenant test: write as tenant A, read as tenant B, expect zero rows.

## 9. Secret scanning

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| secretlint (+ @secretlint/node, preset-recommend) | 13.1.0 | MIT | 1470 | 2026-11-01 | Use. Node API, runs on strings, so it can scan extracted text before embedding |
| gitleaks | Go binary | MIT | 30569 | 2026-10-28 | Use in CI on the repo only; not embeddable |
| trufflehog | Go binary | AGPL-3.0 | 28816 | 2026-11-01 | Skip: AGPL |

PICK: `secretlint@13.1.0` with `@secretlint/node@13.1.0` and `@secretlint/secretlint-rule-preset-recommend@13.1.0`; `gitleaks` in CI. Why: only one that runs in-process on arbitrary text, which the PII and secret masking step in L2 needs. Thin adapter we write: `scanText(text): Finding[]` and `maskSecrets(text)` calling `lintSource`, with a fixtures test of planted keys.

## Summary of picks

- `@cedar-policy/cedar-wasm@4.14.0`
- `openid-client@6.8.8`, `jose@6.2.14`, `oidc-provider@9.13.3` (when we mint tokens)
- `@aws-sdk/client-kms@3.1161.0` behind a KeyWrap port, with node:crypto envelope
- `secretlint@13.1.0`, `@secretlint/node@13.1.0`, `@secretlint/secretlint-rule-preset-recommend@13.1.0`
- Test-only: `@electric-sql/pglite@0.5.14`, `fast-check@4.10.2`
- Build thin: ACL predicate builder, audit hash chain, taint propagation, erasure service, tenant scope.

Unverified: star counts for npm-only packages, pglite RLS support, Cedar partial evaluation, lancedb ACL prefilter, OpenFGA embedded JS build.
