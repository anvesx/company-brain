# consent

What a person sees and controls about the MCP clients they allow.

- `view.ts`: `consentView`, the data for the consent page. Everything shown comes from the stored client
  row; the raw OAuth query only picks which row, redirect and scopes (a forged query shows nothing of its own).
- `authorized.ts`: `authorizedClients`, the clients a user has consented to, for the account page.
