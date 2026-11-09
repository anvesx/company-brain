# query

`visibleGraph(store, query)`: the part of the graph one caller may see, grouped and paged. Spec rules 1 to 3, 7, 8.

| File         | Holds                                                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `visible.ts` | The visible set, found with a handful of bulk `nodesOf` and `edgesOf` calls.                                                                      |
| `groups.ts`  | The group of a node (`document:<source>` or its kind) and the category totals.                                                                    |
| `limits.ts`  | `digits()`, `checkAsOf`, page size bounds, the HMAC-signed cursor and the injected 32-byte key (`checkKey`). Bad input is `GraphError` BAD_INPUT. |
| `page.ts`    | `visibleGraph`: slices the sorted nodes, places each edge once, drops props.                                                                      |
