# consent

What a person sees and controls about the MCP clients they allow.

- `view.ts`: `consentView`, the data for the consent page. Everything shown comes from the stored client
  row; the raw OAuth query only picks which row, redirect and scopes (a forged query shows nothing of its own).
- `authorized.ts`: `authorizedClients`, the clients a user has consented to, for the account page.
- `names.ts`: `names(userId)` returns `{ email, emailVerified, accountIds }` through the adapter. Open item: identity does not verify emails yet, so `emailVerified` is false for every password sign-up.
