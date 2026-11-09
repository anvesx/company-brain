# tests/unit/visible

| File                 | Spec rule | What it pins                                                                      |
| -------------------- | --------- | --------------------------------------------------------------------------------- |
| `visibility.test.ts` | 1, 7      | Alice's and bob's sets, both-ends edges, no leaks, tenants, tombstones, no props. |
| `groups.test.ts`     | 2         | `document:<source>` for documents, `<kind>` for the rest, categories sorted.      |
| `asof.test.ts`       | 8         | Titles, grants and tombstones as they were at `asOf`.                             |
| `reads.test.ts`      | 1         | `can-read` edges when both ends are visible; alias principals.                    |
