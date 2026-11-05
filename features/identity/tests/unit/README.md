# unit

Rule-level checks of the package through its public interface, each over a fresh SQLite file
and a real HTTP server from `../support/server.ts`. Subfolders group by spec area.

| File or folder   | Rules                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `config.test.ts` | 13: every bad `IdentityConfig` field raises BAD_INPUT naming the field; 6: TTL bounds.    |
| `errors.test.ts` | 13: `IdentityError` carries the code and the field.                                       |
| `purity.test.ts` | 14: one clock in `src`, a pure install renderer.                                          |
| `account/`       | 1, 13: sign-up, personal organization, password rules.                                    |
| `session/`       | 2, 13: cookie flags, refresh on use, lockout, the identity port.                          |
| `orgs/`          | 3, 13: picker, invitations, roles.                                                        |
| `pages/`         | 3, 10, 11, 12: exact HTML of the sign-in, picker, consent, account and connections pages. |
| `routes/`        | 2, 5, 13: error mapping, redirects, validation and native-client labelling.               |
| `install/`       | 10, 13: exact install messages, command quoting, notes and templates.                     |
| `csrf/`          | 4: constant-time token comparison and CSRF token binding.                                 |
