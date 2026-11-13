# tests/unit/leaks

| File           | Leak | What it pins                                                                                         |
| -------------- | ---- | ---------------------------------------------------------------------------------------------------- |
| `gate.test.ts` | 1-5  | No recheck hides everything, zones, a failed recheck hides, owner-only readers, current permissions. |
