# 0008: Identity on one auth library that also serves Model Context Protocol (MCP) OAuth

Architecture decision record (ADR) 0008. Status: accepted, 6 Nov 2026. Decided by the builder after a
working spike. Amends the pick in
[docs/libs/permissions-security.md](../../libs/permissions-security.md) section 3.

## Context

The product now needs human users: sign-up, login, a session, and a tenant per user.

Every MCP client, such as Claude Code, Codex, Cursor and Gemini CLI,
must sign in to the brain with OAuth 2.1. The standards involved are the Request for Comments
(RFC) documents 9728 (resource metadata) and 8414 (server metadata), Proof Key for Code
Exchange (PKCE) with S256, dynamic client registration, and tokens bound to the resource URL.

Today both apps share a hand-rolled bearer of the form user, tenant, expiry and hash-based message
authentication code (HMAC). That
bearer has no login page, no sign-up, no refresh and no way for an MCP client to discover it.
Section 3 of the library doc picked openid-client plus jose and left oidc-provider for later.
That pick covers a service account, not a person.

## Evidence

Spike on 5 Nov 2026 (scratchpad `auth-spike`, four shell flows, all green on Node 26):

| Check | Result |
|---|---|
| Sign-up, sign-in, session read | better-auth 1.7.18 with email and password, SQLite through the Node built-in |
| Organization per tenant | organization plugin; the session's active organization id is the tenant |
| MCP OAuth metadata | the better-auth MCP plugin 1.7.18 serves both well-known documents |
| Dynamic client registration | enabled by one option; native client with a loopback redirect |
| PKCE, resource, access token | S256 code; the resource comes back as the audience; the org id claim comes from consent |
| Bearer check on the MCP route | the plugin's bearer guard rejects a token for another audience |

Rejected: oidc-provider 9.13.3 issues tokens but ships no users, sessions, sign-up or
organizations, so we would write all four. Keycloak and Ory are servers, out by the rule in
the library doc. Writing our own authorization server fails rule 3 of the build rules (do not
reinvent what a maintained library does) and would need its own security review.

## Decision

- The identity feature package wraps better-auth 1.7.18 with its jwt, organization and mcp
  plugins. One config module, one Hono mount for the auth API and the well-known documents.
- An organization is the tenant. The MCP consent stores the active organization id as its
  reference id and the access token carries it as the org id claim. The brain and connections
  apps read user and tenant from the session or the bearer through one identity port.
- Identity landing removes the hand-rolled HMAC bearer from both apps. No second token
  format stays behind.
- jose stays for verifying the access tokens, signed with the published JSON Web Key Set
  (JWKS), in the brain's MCP route.
- Postgres in production through better-auth's Kysely adapter; the Node built-in SQLite in tests.

## Consequences

- The login, sign-up, organization picker and consent pages are ours: better-auth serves the
  API, not the HTML. The connections app hosts them.
- Membership is fixed at consent time. A user removed from an organization keeps a valid
  token until it expires, so access tokens live 15 minutes and refresh checks membership.
- Open items, each a test before the feature is called done: refresh token rotation, client
  ID metadata documents, rate limits on sign-in, email delivery for verification, Node 22.
- Section 3 of the library doc changes to: better-auth plus its MCP plugin for people;
  openid-client stays for signing in against a customer IdP; oidc-provider is dropped.
