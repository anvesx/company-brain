# gate tests

- `zone.test.ts`: the gate zone check gives the same answer as zone-policy `canSee` for every viewer and zone.
- `edges.test.ts`: a blank linked account id, a mixed-case ACL email and a capitalised stored email.
- `aliases.test.ts`: a real folder sync whose ACLs name people by email or linked account id; the identity user sees exactly their own, and an unverified email counts for nothing.
- `leaks.test.ts`: leaks 1 to 3 on the real `/v1/documents` route: no check, a failing check, and zones.
