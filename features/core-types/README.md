# @brain/core-types

The shared shapes of Company Brain. Every other feature may import this package and nothing else
from the repo, which keeps each feature reusable on its own.

## What it holds

| Export                                      | What it is                                                                                                |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `PointerSchema` / `Pointer`                 | One row per document: address, version, content hash, zone, ACL. No body text (strict schema rejects it). |
| `PrincipalSchema` / `Principal`             | The asking user: id, tenant, groups.                                                                      |
| `AclSchema` / `Acl`                         | Allowed users and groups plus a version number.                                                           |
| `ZONES`, `ZoneSchema`, `mostRestrictedZone` | Personal, team, company. Derived data takes the most restricted input zone.                               |

## Use

```ts
import { PointerSchema } from "@brain/core-types";
const pointer = PointerSchema.parse(row); // throws ZodError on bad input
```

## Limits

Ids up to 256 chars, addresses up to 2048, groups up to 1000 per principal.

## Test

`pnpm --filter @brain/core-types test` (unit), `... exec stryker run` (mutation, break below 80).
Last run: 23 tests, mutation score 97.3.
