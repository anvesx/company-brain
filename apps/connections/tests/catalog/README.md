# catalog tests

- `routes.test.ts`: `GET/POST /v1/catalog`: admin only, bad bodies, duplicates, and a tenant entry that another tenant cannot see.
- `zones.test.ts`: a custom connector without `canRead` cannot be set to company, at create, patch and oauth start.
- `shared-oauth.test.ts`: two manifests on one OAuth app run the same flow against a local OAuth server, each with its own scopes, and each makes its own account.
