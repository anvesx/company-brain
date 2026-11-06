# gate

- `access.ts`: who can read which documents, from `can-read` and `member-of` edges in the graph (`canRead`, `readableDocuments`).
- `accounts.ts`: `identityAliases`, the other names a source knows a person by. Blank names are dropped and names are de-duplicated.
- `email.ts`: `withLowercaseEmails` wraps the sync connector, and `lowerEmail` is the alias rule.

Email rule: an email is always lowercase. `withLowercaseEmails` lowercases every ACL user and group member that contains `@` before it is written to the graph, and `identityAliases` lowercases the user's email (and any linked account id with an `@`). Logins and group ids are never changed. Graphs synced before this rule keep their old mixed-case ACLs until the next `brain sync`.

Who is asking comes from identity's port. Identity ids are random, but connectors write Drive emails and GitHub logins into ACLs, so a caller matches: their identity id, their verified email (an unverified one never counts), every linked account id from identity's `account` rows, and the `member-of` teams of any of those.

Open items:
- Identity has no port for linked accounts, so `accounts.ts` reads the `user` and `account` tables through better-auth's adapter. A port such as `identity.port.names(userId)` would replace it.
- Identity does not verify emails yet, so email matching stays off until it does.
- GitHub ACLs hold a login (`octocat`) while a linked account holds a numeric `accountId`. Mapping one to the other is the entity resolver's job and is not done here.
- `/v1/graph` (graph-view) still matches on the identity id and teams only.

`routes/` and `live/` import from this folder; it imports only from the graph store and identity.
