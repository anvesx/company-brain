# api

Playwright's request client against the real server, no browser.

- `catalog.test.ts`: the built-in list, the bearer check, the page assets and their security policy.
- `custom.test.ts`: tenant admin registers a custom connector (201), non-admin gets 403, duplicates 409, tenant isolation, connecting a token account to it.
- `rejects.test.ts`: bad catalog and account bodies (400), the widening rule (403), another owner's account (404), no bearer (401).
