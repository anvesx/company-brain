# guarded

- `list.ts`: `list` runs the account sync with its token and decides what a FORBIDDEN means (probe: live token is a 403 and the account stays active, dead token is refresh-once then reconnect). It also defines `Outcome`, re-exported by `../account.ts`.
