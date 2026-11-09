# consent/view

`consentView` against fixed rows: the output shape, how stored lists are read, and each BAD_INPUT,
UNAUTHENTICATED and NO_ORGANIZATION refusal.

- `kit.ts`: the stubbed adapter and auth (`world`), and the query helpers.
- `shape.test.ts`: client name, redirect host, allowed scopes, organization lookup, stored list formats.
- `failures.test.ts`: deleted organization, bad redirect, missing or unknown client, no cookie, no organization.
