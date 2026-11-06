# src

The sweep. Reads and writes the `account` rows through identity's own adapter, so the token seal always applies.

| File        | Holds                                                                                                                |
| ----------- | -------------------------------------------------------------------------------------------------------------------- |
| `index.ts`  | public exports: `sweep`, `selectDue`, `takeLease`, `releaseLease`, `WINDOW_MS`, `LEASE_MS`, `BATCH`                  |
| `select.ts` | `selectDue`: ordered ids of active rows expiring inside the window, paged by id; the `Adapter` type                  |
| `lease.ts`  | re-exports `takeLease` and `releaseLease` from `@anvesx/identity` (one shared implementation with on-demand refresh) |
| `sweep.ts`  | `sweep`: select, lease, refresh concurrently (50 at a time, a provider outage retried with backoff), release, report |

The sweep reads a whole page of rows in one query and hands each row to `refresh`, since a read per row cost more than the provider call. A row that fails is listed in `failed` and the rest go on: a refusal (`NEEDS_AUTH`), a provider outage after 3 tries (`PROVIDER_DOWN`), or a database error (`STORE_FAILED`, not retried, because the provider may already have answered).
