# Spec: google-login

Tier: feature (inside `@anvesx/identity`). Decision: ADR 0008 (better-auth) and
[0009](../../adr/product/0009-connector-oauth-on-better-auth.md).

## Purpose
"Continue with Google" on the sign-in and sign-up pages. A Google account becomes a user; a
returning Google user signs in to the same user and organization. Email and password and
passkeys stay.

## Reuse decision
better-auth's `genericOAuth` plugin with provider id `google` and Google's discovery document
(it verifies the RS256 id token and nonce). Not `socialProviders.google`: that one hard-codes
Google's endpoints, so no local replay server can stand in for Google in tests. We write the
button, the config check, the callback landing and the tests. No hand-written OAuth.

## Public interface
```ts
interface IdentityConfig { /* existing */ google?: { clientId: string; clientSecret: string;
  discoveryUrl?: string /* default https://accounts.google.com/.well-known/openid-configuration */ } }
```

## Behaviour
1. With `google` configured, sign-in and sign-up show a "Continue with Google" button that posts to `/sign-in/google` (csrf not needed: no session yet) and answers 302 to Google's consent URL with `prompt=select_account`.
2. Without `google` the button is absent and `/sign-in/google` is 404. Boot does not fail. `/api/auth/sign-in/social` answers 404 for every provider except a configured `google`: connector providers link accounts, they are never a sign-in door.
3. The callback lands on `/connections`; a first-time Google user gets an organization named after their name, as email sign-up does (the existing `user.create.after` hook uses `user.name`).
4. An existing email-and-password user is linked, not duplicated, only when both the Google email and the local user's email are verified (better-auth `account.accountLinking.enabled`, trusted provider google only). An unverified local user is not linked and the sign-in lands back on `/sign-in`: otherwise anyone who registers a victim's address first could take the account over.
5. A Google account with an unverified email is refused with the sign-in error shape of rule 13 in the identity spec.
6. Rate limits on `/sign-in/google` match `/sign-in`: 5 starts per 15 minutes per client address, then 429 with `Retry-After`.

## Acceptance tests (written first)
- integration: replay Google server (discovery, token, userinfo): new user lands on `/connections` with an organization; returning user keeps the same id; same email links; unverified email refused; button absent when not configured.
- e2e: Chromium clicks the button and lands on the replay consent page; screenshot.

## Layout
`features/identity/src/login/google.ts` (`src/auth` is full), one view change in `src/pages/views/auth.ts`, tests under `tests/integration/google/` and `tests/e2e/google/`.

## Out of scope
Microsoft and GitHub login (same mechanism, later), domain allow-lists.
