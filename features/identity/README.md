# @anvesx/identity

Status: built. Unit, install, integration, property and scale tests pass; the e2e tests pass with
`PLAYWRIGHT=1` against the server in `tests/e2e/server.ts`. Pages are not yet mounted in `apps/connections`.

People sign up, sign in and land in an organization (the tenant). MCP clients sign in with
OAuth 2.1 (RFC 9728, RFC 8414, dynamic registration, PKCE S256, resource-bound JWTs) against
the same users and organizations. One identity port gives every app the caller's user and
tenant from a cookie session or a bearer token. Passkeys (WebAuthn) sign people in without a
password; they are added and removed on the account page. Built on better-auth 1.7.18 with its
jwt, organization, mcp and passkey plugins (ADR 0008). Spec: `docs/specs/feature/identity.md`.

## Interface

- `await migrateDatabase(cfg)` creates the tables. Run it before `createIdentity`, so better-auth's start-up schema check finds them.
- `createIdentity(cfg)` returns `{ auth, routes, port, migrate, protect, revokeClient, consentView, csrf }`.
  Mount `routes` at `/`: it serves `/api/auth/*` and `/.well-known/*`.
- `port.fromSession(headers)`, `port.fromBearer(headers)`, `port.require(headers)` return a
  `Caller { user, tenant, kind, scopes }` or throw `IdentityError`.
- `renderInstall({ name, url }, client)` returns `{ client, format, path, body, command, notes }`.
- `IdentityError` has `code` (one of five) and, for `BAD_INPUT`, `field`.

## Interface notes

Additions to the spec's Public interface that the tests pin:

1. `IdentityConfig.now?: () => number` (epoch ms). Our code (lockout, rate limit, token expiry
   check, key set cache age) reads time only from it; the default `Date.now` lives in
   `config.ts` and nowhere else. better-auth has no injectable clock, so tests move
   library-stamped rows (session, invitation) in the SQLite file instead.
2. `IdentityConfig.sendEmail?: (m: OutgoingEmail) => Promise<void>`, with
   `OutgoingEmail = { to; subject; text }`: the email port (spec Out of scope). Invitation
   mail goes through it and its text holds the invitation id; tests collect the messages.
3. `IdentityConfig.clients?: { id; name; redirectUris }[]`: static clients (rule 5).
4. `migrate(): Promise<void>` creates the tables. `protect(handler)` wraps an MCP route: 401
   with the RFC 9728 challenge on any failure, never 403. `revokeClient(headers, clientId)`
   is the account page action (rule 11). `consentView(headers, oauthQuery)` returns
   `{ clientName, redirectHost, scopes, organization: { id, name } }` (rule 7).
   `csrf.issue(headers): Promise<string>` (UNAUTHENTICATED without a session) and
   `csrf.verify(headers, token): Promise<boolean>` bind form tokens to the session (rule 12).
   Registration is rate limited per socket address. `X-Forwarded-For` is read only when
   `IdentityConfig.trustProxy` is true (default false), and then its last hop is the key. With no
   known address all callers share one global limit.
5. `IdentityError.field` names the bad input. Over HTTP a bad input is status 400 with JSON
   `{ code: "BAD_INPUT", field }`; on the OAuth token endpoint the body also keeps `error`.
6. `renderInstall` also returns `client`, `format` (`json` or `toml`), `command` (Claude Code
   only, else `null`) and `notes` (`"<field>: check current docs"` per unconfirmed field).
7. `INSTALL_CLIENTS` lists the five clients; `breachedPasswords` is the bundled list.
8. Page paths: sign-in `/sign-in`, sign-up `/sign-up`, organization picker `/picker`, consent
   `/consent`, connections `/connections`, account `/account` (lists allowed MCP clients, Revoke).
9. More `IdentityConfig` fields: `serverName` (default `company-brain`, lowercase letters, digits,
   hyphens: the name clients file the server under), `trustProxy`, `catalog` (`{ name, description }[]`
   tiles for an organization with no connections), `connections(tenant)` (the connections list) and
   `templates` (install templates, replaceable so a test can force a broken file). `resource` must
   be https, or http on `localhost`, `127.0.0.1` or `[::1]`.
10. A password must also score 3 or more on zxcvbn-ts, and the breached list match ignores case
    and Unicode width (NFKC then lowercase).

## Test

```sh
pnpm --filter @anvesx/identity test        # unit, install, integration, property
pnpm --filter @anvesx/identity scale       # rule 15 timings, one file at a time so no other suite contends
PLAYWRIGHT=1 pnpm --filter @anvesx/identity e2e   # Playwright; starts tests/e2e/server.ts on port 18788
pnpm --filter @anvesx/identity mutation
```

Every test uses its own SQLite file under the OS temp folder and a real HTTP server on a free
port. The e2e tests skip unless `PLAYWRIGHT=1`; set `E2E_BASE_URL` to use a server you started.

## Connectors and Google sign-in

`providers` (a catalog with `kind: "generic" | "built-in"`), `sealKey` (64 hex characters) and `env` turn on linking a
service from `/connections`. A provider with no `<ID>_CLIENT_ID` and `<ID>_CLIENT_SECRET` in `env` shows as "not
configured". Tokens are sealed in the `account` table with AES-256-GCM. `google` adds Continue with Google on
`/sign-in` and `/sign-up`. `refreshAccount` and `adapter` come back from `createIdentity` for `services/token-refresh`. `sealKey` is required whenever `google` or `providers` is set: tokens are never stored as plain text.
`RefreshError.code` is `NEEDS_AUTH`, `LEASED`, `PROVIDER_DOWN` or `STORE_FAILED` (the database failed, not the provider).
`names(userId)` returns `{ email, emailVerified, accountIds }` so apps do not read identity tables; open item: identity does not verify emails yet, so `emailVerified` is always false.

## Not yet wired

The pages live in `src/pages` and are served by `routes`, but `apps/connections` does not mount
them yet. That wiring is a separate next step.
