# core-types/src/access

The access-control vocabulary every other package builds on. All three files are schemas plus
pure helpers; none does I/O. `src/index.ts` re-exports each with `export *`, so import paths for
consumers of `@anvesx/core-types` are unchanged.

| File           | Holds                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| `principal.ts` | `IdSchema` (rejects lone surrogates), `PrincipalSchema`: id, tenant, groups |
| `acl.ts`       | `AclSchema`: allowed users, groups, version                                 |
| `zone.ts`      | `ZONES`, `ZoneSchema`, `mostRestrictedZone` (derived data takes the lowest) |
