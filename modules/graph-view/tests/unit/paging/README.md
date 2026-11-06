# tests/unit/paging

| File             | Spec rule | What it pins                                                                             |
| ---------------- | --------- | ---------------------------------------------------------------------------------------- |
| `paging.test.ts` | 3         | Pages in id order equal one big page; each edge once, both ends sent; totals per page.   |
| `limits.test.ts` | 3         | 5,000 default with `next`; 1 and 20,000 accepted; anything else is GraphError BAD_INPUT. |
