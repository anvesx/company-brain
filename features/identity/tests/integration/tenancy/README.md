# tenancy

Rules 6 and 7: the organization in a token is the one chosen at consent.

- `consent.test.ts`: two organizations send the user to the picker before consent; one goes
  straight to consent; the consent view shows client, redirect host, scopes and organization;
  the consented organization does not follow later set-active calls.
- `membership.test.ts`: a member removed from the consented organization cannot refresh; the
  access token already issued dies at 15 minutes.
- `view.test.ts`: consent view list encodings, name fallback, BAD_INPUT on `oauth_query`.
- `setactive.test.ts`: 3: API set-active with a bad organizationId is 400 and clears nothing; a form-encoded set-active is 400 `body: send JSON`; a user in no organization gets NO_ORGANIZATION.
  The stale-organization grant tests live in `../grant/`.
