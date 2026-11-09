# gate tests

- `access.test.ts`: `canRead` and `readableDocuments` run over a real graph store with `can-read` and `member-of` edges.
- `edges.test.ts`: a blank linked account id, a mixed-case ACL email and a capitalised stored email.
- `aliases.test.ts`: a real folder sync whose ACLs name people by email or linked account id; the identity user sees exactly their own, and an unverified email counts for nothing.
