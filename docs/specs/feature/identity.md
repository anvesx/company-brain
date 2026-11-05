# Spec: identity

Tier: feature, plus the sign-in screens in the connections app. Design cards: cl_meta, cl_reg,
cl_aud, cl_consent (auth stage) and cl_dist (ship stage). Decision: architecture decision record (ADR)
[0008](../../adr/product/0008-identity-on-better-auth.md).

Exact source: our proposal. The OAuth shape follows the Model Context Protocol (MCP)
authorization spec (2025-06-18 revision) as the design cards record it; the screens follow the
Claude connectors page. Audit table: [exact research index](../../brain/research/exact/a readme).

## Purpose
A person signs up, signs in, lands in an organization (the tenant), sees their connections, and
gets a copy-paste guide that installs the brain in their MCP client. Every MCP client signs in
through standard OAuth 2.1 against the same users and organizations. The standards named
below are Request for Comments (RFC) documents and Proof Key for Code Exchange (PKCE). One identity port replaces
the hand-rolled hash-based message authentication code (HMAC) bearer in both apps. Any app that needs users, tenants and MCP sign-in can
mount this package.

## Reuse decision
better-auth 1.7.18 with the jwt, organization and mcp plugins (spike proven, ADR 0008). jose
verifies access tokens by the published key set. Hono serves the routes. We write: the config
module, the identity port, the HTML pages, the install-guide renderer, and the tests. No
hand-written password hashing, session store, OAuth endpoint or token format.

## Public interface
```ts
interface IdentityConfig {
  baseUrl: string; secret: string; database: Database;
  resource: string;               // canonical MCP URL: https, or http on localhost/127.0.0.1/[::1] only
  accessTokenTtlSeconds?: number;
  serverName?: string;            // name clients file the server under; lowercase letters, digits, hyphens; default "company-brain"
  trustProxy?: boolean;           // default false: rate limits key on the socket address, not X-Forwarded-For
  catalog?: { name: string; description: string }[];                        // tiles shown when there are no connections
  connections?: (tenant: string) => Promise<{ name: string; detail: string }[]>; // the connections list for an organization
  templates?: Record<InstallClient, InstallTemplate>;                       // install templates; tests inject broken ones
  clients?: StaticClient[]; sendEmail?: (m: OutgoingEmail) => Promise<void>; now?: () => number;
}
/** One better-auth instance plus the Hono routes to mount it. */
function createIdentity(cfg: IdentityConfig): { auth: Auth; routes: Hono; port: IdentityPort };
interface Caller { user: string; tenant: string; kind: "session" | "mcp"; scopes: string[] }
interface IdentityPort {
  fromSession(headers: Headers): Promise<Caller | null>;       // cookie session, browser callers
  fromBearer(headers: Headers): Promise<Caller | null>;        // JWT access token, MCP callers
  require(headers: Headers): Promise<Caller>;                  // either, else throws IdentityError
}
/** Renders one client's config file from the install manifest; parse-checked (cl_dist). */
function renderInstall(manifest: { name: string; url: string }, client: InstallClient): { path: string; body: string };
type InstallClient = "claude-code" | "codex" | "cursor" | "gemini-cli" | "claude-desktop";
class IdentityError extends Error { code: "UNAUTHENTICATED" | "NO_ORGANIZATION" | "WRONG_AUDIENCE" | "EXPIRED" | "BAD_INPUT" }
```

## Behaviour

| Caller | Proof | Lifetime | Tenant comes from |
|---|---|---|---|
| Browser | cookie session | 7 days, refreshed on use | active organization on the session |
| MCP client | JWT access token | 15 minutes; refresh 30 days, rotating | org_id claim fixed at consent |

1. Sign-up with email and password creates the user and a personal organization named after the
   user, and makes it active. Password rules: 12 to 128 characters; not on the top 10,000
   breached list bundled with the package (compared after NFKC and lowercase, so case and
   full-width forms do not dodge it); and a zxcvbn-ts score of at least 3. No composition rules.
2. Sign-in sets a cookie session: HttpOnly, Secure outside localhost, SameSite Lax, 7 day
   lifetime, refreshed on use. Five failed sign-ins per email per 15 minutes return 429 with a
   Retry-After header; the counter lives in the same database so it survives restarts.
3. Organizations are tenants. A user may belong to several; exactly one is active per session.
   The organization picker page sets the active one. Invitations are by email, accepted on
   sign-in, expire after 7 days. Roles: owner, admin, member. Only owner or admin may invite,
   remove members, or register a custom connector.
4. The MCP route answers an unauthenticated call with 401 and a WWW-Authenticate header naming
   the resource metadata URL (RFC 9728). The server metadata document (RFC 8414) lists the
   authorize, token, registration and key set endpoints (cl_meta).
5. Client registration (cl_reg): dynamic registration is open, rate limited to 20 per hour per
   socket address (X-Forwarded-For is trusted only when `trustProxy` is set, and then its last
   hop is used; with no known address all callers share one global limit); a native client may use a loopback redirect; a web client must use https. Static
   clients come from config. Client ID metadata documents are out of scope for this spec and
   listed in ADR 0008 as an open item.
6. Authorization (cl_aud): PKCE S256 is required, plain is rejected; the resource parameter must
   equal the brain's canonical MCP URL; the access token carries that URL as its audience, the
   issuer, the user id, the active organization as org_id, and expires in 15 minutes. Refresh
   tokens rotate on every use, live 30 days, and refresh fails with invalid_grant when the user
   is no longer a member of the organization in the consent.
7. Consent (cl_consent): the consent page shows client name, redirect host, scopes and the
   organization; the organization is fixed at consent time. A user with more than one
   organization chooses one on the picker before consent.
8. The brain's MCP route verifies: signature against the key set, audience equals the
   resource, issuer equals the base URL, not expired. Any failure is 401 with the challenge
   header, never 403, so clients re-run discovery.
9. Post-login the connections app shows the connections list for the active organization,
   then the install guide below it. A user with zero connections sees the catalog tiles first.
10. Install guide (cl_dist): one manifest, name and url (https, or http only on a loopback host), renders a config file per client. Each
    rendered JSON or TOML is parsed back before it is shown; a parse failure is a 500 with the
    client named, never a half-rendered snippet. Shell arguments in the `claude mcp add` command
    are POSIX single-quoted. Claude Code renders a `claude mcp add` command
    as well as the file. Fields the vendor docs did not confirm carry the line "check current
    docs" in the page, as the card says.
11. Sign-out revokes the session row. Revoking an MCP client on the account page revokes its
    refresh tokens; its access token dies within 15 minutes.
12. Every page is server-rendered HTML with no client JavaScript except the copy button. Forms
    carry a CSRF token bound to the session; the auth API checks Origin on every write.
13. Every bad input raises BAD_INPUT naming the field: empty or malformed email, password out of
    range, unknown organization, redirect not matching the registration, missing code_verifier.
14. Determinism and purity: the install renderer is pure. Clocks come from better-auth's
    injected time in tests. No Date.now outside the adapter.
15. Scale: a session lookup is one indexed read; token verification is local (cached key set,
    refreshed hourly, or on an unknown key id at most once a minute so forged key ids cannot force fetches). The scale test runs 10,000 verifications in
    under 1 s and 1,000 sign-ins against SQLite in under 20 s on a laptop, denominator printed.

## Acceptance tests (written first)
- unit: sign-up creates user and personal organization; password too short, breached and too
  long each name the field; sign-in sets the cookie flags; lockout after five failures with
  Retry-After; picker switches the active organization; invitations expire; role checks.
- unit, install renderer: one golden file per client, each parsed back; a name with an
  underscore or over 63 characters is BAD_INPUT; a non-https url is BAD_INPUT.
- integration, through the mounted Hono app with a real SQLite file in a temp dir: the full MCP
  flow as a client does it, 401 challenge, both metadata documents, registration, authorize
  with PKCE, token, call the resource, refresh with rotation, reuse of an old refresh token is
  rejected, removed member cannot refresh, wrong audience is 401.
- property (fast-check): any registered redirect not equal to the request's is rejected;
  verification of a token with any single claim altered fails.
- browser (Playwright, tests/e2e): sign-up, sign-in, picker, connections list, guide shown, copy
  button writes the clipboard, sign-out; screenshots saved as the artifact.
- scale: rule 15 with printed timings and counts.
- mutation: Stryker score >= 80 on the hand-written files.

## Layout
`features/identity/`: a readme, package.json, stryker.config.json, tsconfig.json,
tsconfig.build.json. `src/`: index.ts, config.ts, port.ts, errors.ts, a readme. `src/install/`:
render.ts, templates.ts, a readme. `src/guard/`: session.ts, bearer.ts, limits.ts, a readme.
Pages live in `features/identity/src/pages` (sign-up, sign-in, picker, consent, connections with
the guide, account); wiring them into `apps/connections` is a separate step. Tests
under each package, at most five files per folder, 80 lines per file.

## Out of scope
Passkeys and social sign-in (a later spec on top of the same library). Email delivery: the
package exposes a `sendEmail` port and tests use a capture; production wiring is the app's.
Client ID metadata documents. SSO against a customer IdP (openid-client, later).
