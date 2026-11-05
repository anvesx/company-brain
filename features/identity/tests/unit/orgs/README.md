# orgs

Rule 3: organizations are tenants. Driven through better-auth's organization endpoints under
`/api/auth/organization/*` with the email port capturing invitation mail.

- `picker.test.ts`: set-active switches the tenant the port returns; each session keeps its own.
- `invite.test.ts`: invitation by email, accepted by the signed-in invitee, expires after 7 days.
- `roles.test.ts`: owner, admin, member; only owner or admin may invite or remove.
