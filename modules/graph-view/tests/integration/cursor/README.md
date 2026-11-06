# tests/integration/cursor

Two real servers over one graph file and one identity, standing in for two instances behind a load balancer.

| File                 | What it pins                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `shared-key.test.ts` | Same key: paging across both servers equals one page. Other key: 400. A key that is not 32 bytes: refused at mount. |
