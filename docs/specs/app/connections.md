# Spec: connections app

Tier: app. Design cards: src.rt, acl.sync. Exact source: our proposal. [Vectorize](../../brain/research/exact/vectorize-how-to-build-company-brain.md) claims 2 and 5 (per-user permissions at retrieval, start with one workflow) set the access rules; the Claude connectors screen sets the UI shape.

## Purpose
A web UI and small API where a person signs in to their accounts (Google Drive, GitHub, then Slack and Gmail), sees every connection in one list, and decides who may use each one and who may read what it syncs. It writes the per-user tokens that `brain serve` reads for live rechecks, and the connector config that `brain sync` reads.

## Reuse decision
Checked 2 Nov 2026 against Onyx, Airbyte, Nango, Pipedream, Activepieces, Composio, LlamaIndex readers, Unstructured, Meltano, Steampipe. Most coverage marks came from search snippets, so only the license and fit findings below are relied on.
- Adopt `arctic` (MIT) for OAuth, `hono` (MIT) for the server. No hand-written OAuth.
- Keep the Drive and GitHub adapters: thin wrappers over the vendors' own SDKs (`googleapis`, `octokit`), already tested.
- Rejected: Pipedream (source-available, bars platform use), Onyx permission sync (Enterprise-only `ee/` code), Airbyte (ELv2 core, connector licenses conflict), Steampipe core (AGPL), LlamaIndex and Unstructured (Python, pull only, no Gmail found).
- Open, needs a decision: Nango (ELv2, TypeScript, ships a Connect UI) is the closest match to the Claude connectors screen. Internal self-hosting looks allowed; legal review is pending. Composio (MIT, TS) covers Slack and Gmail but its runtime is vendor-hosted, so company data would leave our network.
- Breadth: the catalog below, not one adapter per app. Slack and Gmail are the first two entries after Drive and GitHub. Where an OSI-licensed library already covers an app (Activepieces pieces are under test), the entry wraps it. Nango and Composio stay out (user chose open source, 2 Nov 2026).
- Storage: `node:crypto` AES-256-GCM, key from `CONNECTIONS_KEY`; SQLite via `node:sqlite`.
- Ours alone: account model, the widening rule, access and data zones, mapping to `can-read` and `member-of` edges.

## Connector catalog and custom connectors
The user wants nearly every app available, and companies must be able to add their own. So the app has a registry of manifests, and the four built-in apps are just the first entries.
- A manifest is data: `id`, `name`, `auth` (`oauth2` with authorize and token URLs and scopes, `token`, or `pat`), `defaultZone`, and a `load` that returns a `Connector` (the connector-kit contract: `list`, `fetch`, `changes`, `canRead`).
- Built-in manifests ship in `services/connectors`. A new app is one folder with one manifest and one adapter, and no change to the accounts, OAuth, token-file or UI code, which read the registry.
- Custom connectors are per tenant. An admin registers a manifest through the API (`POST /v1/catalog`, tenant admin only). An `oauth2` or `token` manifest plus a module path or an HTTP endpoint that speaks the connector contract is enough. Custom entries show up only for that tenant.
- A custom connector gets no extra trust. It runs through the same widening rule, the same zone to ACL mapping, and the same live `canRead` recheck. A connector with no `canRead` can only be `personal`.
- The sign-in screen lists the catalog, so adding an entry adds a tile.
- Tests: two manifests share one OAuth flow; a tenant entry is invisible to another tenant; a custom connector without `canRead` cannot be set to `company`.
- Not built yet. Build order: registry and manifest type, move Drive and GitHub onto it, then Slack, Gmail, and the first custom-connector test.

## Model
- `Account`: `{id, owner, provider, label, credential, access, dataZone, status}`.
- One owner may hold many accounts per provider (two Google accounts, a personal and a work GitHub).
- `credential` is `oauth` (user consent), `admin-token` (org admin or service account that can list every user's data) or `pat` (pasted personal token). Stored encrypted, never returned by the API.
- `access` says who may use the connection: `private` (owner only), `personal` (owner and the agents the owner runs), `company` (anyone in the tenant, through the tenant's ACLs).
- `dataZone` says who may read what it syncs, same three values, and is set separately from `access`. An admin-token account defaults to `company` data and `company` access only after an admin confirms.
- In the graph, `dataZone` maps to a core-types zone: `company` stays `company`; `private` and `personal` become `personal` and the documents are written owner-only (one `can-read` edge, the owner; the source ACL is not copied).
- `dataZone` can never be wider than the credential allows: a `pat` or `oauth` account cannot be `company` unless its owner is a tenant admin.

## Screens
1. Connections list: one card per account (provider, label, owner, credential kind, access, data zone, status, last sync). Filters by provider and zone.
2. Add connection: pick a provider, choose `oauth`, `admin-token` or `pat`, name it, set access and data zone, then sign in or paste the token.
3. Account detail: change access or data zone, re-authorise, run a sync now, disconnect (deletes the stored credential and closes the account's graph edges).
4. Sign-in uses the same `user:tenant:exp:hmac` bearer as the brain app.

## API (all under `/v1`, caller from the bearer)
`GET /accounts`, `POST /accounts` (optional repo), `PATCH /accounts/:id` (label, access, dataZone, repo), `DELETE /accounts/:id`, `GET /oauth/:provider/start`, `GET /oauth/:provider/callback`, `POST /accounts/:id/sync`.

## Behaviour
1. A caller sees only accounts they own, plus `company` accounts in their tenant (without credentials).
2. Every change checks the widening rule above and answers 403 with the reason.
3. The token file is `{user: {source: token}}` with one key per account, `<provider>:<account id>` (the graph source of its documents), plus the bare provider for the owner's oldest active account. `GET /v1/tokens` for the brain app is not exposed over HTTP; the app writes `BRAIN_USER_TOKENS_FILE` (chmod 600) instead.
4. A failed refresh marks the account `needs-auth`; it is never deleted silently.
5. Disconnect removes the credential and the account's `can-read` and `member-of` edges for that source.
6. Documents are stored in the graph as `<provider>:<account id>/<address>` and groups as `<source>/<raw>`, so two accounts never share a node or an edge; disconnecting one closes only its own edges.
7. A github account has a nullable `repo` (`owner/name`, validated on create and patch, refused for other providers). `POST /v1/accounts/:id/sync` uses the body `repo` if given, else the account's.
8. `lastSyncAt` (milliseconds) is set by each sync that succeeds and is null before; the card and the detail page show it. Failed syncs leave it alone.

## Tests
- Unit: the zone-widening rule, encryption round trip, token-file writer permissions.
- Integration: OAuth callback against a replay provider, then list, patch and delete over HTTP.
- E2E: add a GitHub pat account, run a sync, confirm the brain graph holds its documents with the chosen zone.
- Fake guard: no stub providers in the integration tests; use the replay server.

## Not in scope here
Slack and Gmail providers (they need their own connector modules first), per-document zone overrides, SCIM.
