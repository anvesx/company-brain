# core-types/src

Zod schemas and inferred types shared by every feature. One file per concept.

| File           | Holds                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| `pointer.ts`   | `PointerSchema`: one index row, strict, no body text                        |
| `principal.ts` | `IdSchema` (rejects lone surrogates), `PrincipalSchema`: id, tenant, groups |
| `acl.ts`       | `AclSchema`: allowed users, groups, version                                 |
| `zone.ts`      | `ZONES`, `ZoneSchema`, `mostRestrictedZone`                                 |
| `index.ts`     | Re-exports the public surface                                               |
