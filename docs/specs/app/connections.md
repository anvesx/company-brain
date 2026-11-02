# Spec: connections app

Tier: app. Design cards: src.rt, acl.sync. Exact source: our proposal. [Vectorize](../../brain/research/exact/vectorize-how-to-build-company-brain.md) claims 2 and 5 (per-user permissions at retrieval, start with one workflow) set the access rules; the Claude connectors screen sets the UI shape.

## Purpose
A web UI and small API where a person signs in to their accounts (Google Drive, GitHub, then Slack and Gmail), sees every connection in one list, and decides who may use each one and who may read what it syncs. It writes the per-user tokens that `brain serve` reads for live rechecks, and the connector config that `brain sync` reads.

## Reuse decision
- OAuth 2 flows: `arctic` (MIT, Google, GitHub, Slack providers). No hand-written OAuth.
- Server: `hono` (MIT). UI: one static HTML page and one script, no framework.
- Token storage: `node:crypto` AES-256-GCM with a key from `CONNECTIONS_KEY`; SQLite via `node:sqlite`.
- Later swap-in: Nango (Elastic 2.0) if legal clears it; the store interface stays the same.

## Model
- `Account`: `{id, owner, provider, label, credential, access, dataZone, status}`.
- One owner may hold many accounts per provider (two Google accounts, a personal and a work GitHub).
- `credential` is `oauth` (user consent), `admin-token` (org admin or service account that can list every user's data) or `pat` (pasted personal token). Stored encrypted, never returned by the API.
- `access` says who may use the connection: `private` (owner only), `personal` (owner and the agents the owner runs), `company` (anyone in the tenant, through the tenant's ACLs).
- `dataZone` says who may read what it syncs, same three values, and is set separately from `access`. An admin-token account defaults to `company` data and `company` access only after an admin confirms.
- `dataZone` can never be wider than the credential allows: a `pat` or `oauth` account cannot be `company` unless its owner is a tenant admin.

## Screens
1. Connections list: one card per account (provider, label, owner, credential kind, access, data zone, status, last sync). Filters by provider and zone.
2. Add connection: pick a provider, choose `oauth`, `admin-token` or `pat`, name it, set access and data zone, then sign in or paste the token.
3. Account detail: change access or data zone, re-authorise, run a sync now, disconnect (deletes the stored credential and closes the account's graph edges).
4. Sign-in uses the same `user:tenant:exp:hmac` bearer as the brain app.

## API (all under `/v1`, caller from the bearer)
`GET /accounts`, `POST /accounts`, `PATCH /accounts/:id` (label, access, dataZone), `DELETE /accounts/:id`, `GET /oauth/:provider/start`, `GET /oauth/:provider/callback`, `POST /accounts/:id/sync`.

## Behaviour
1. A caller sees only accounts they own, plus `company` accounts in their tenant (without credentials).
2. Every change checks the widening rule above and answers 403 with the reason.
3. `GET /v1/tokens` for the brain app is not exposed over HTTP; the app writes `BRAIN_USER_TOKENS_FILE` (chmod 600) instead.
4. A failed refresh marks the account `needs-auth`; it is never deleted silently.
5. Disconnect removes the credential and the account's `can-read` and `member-of` edges for that source.

## Tests
- Unit: the zone-widening rule, encryption round trip, token-file writer permissions.
- Integration: OAuth callback against a replay provider, then list, patch and delete over HTTP.
- E2E: add a GitHub pat account, run a sync, confirm the brain graph holds its documents with the chosen zone.
- Fake guard: no stub providers in the integration tests; use the replay server.

## Not in scope here
Slack and Gmail providers (they need their own connector modules first), per-document zone overrides, SCIM.
