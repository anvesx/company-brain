# core-types/src

Zod schemas and inferred types shared by every feature. One file per concept.

| Entry        | Holds                                                        |
| ------------ | ------------------------------------------------------------ |
| `pointer.ts` | `PointerSchema`: one index row, strict, no body text         |
| `access/`    | Who may read: principals, ACLs and trust zones               |
| `index.ts`   | Re-exports the public surface (the `access/` files included) |
