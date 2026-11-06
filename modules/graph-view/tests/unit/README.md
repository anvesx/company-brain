# tests/unit

`visibleGraph` against a real graph-store file. Frozen contract: the builder makes these green and does
not edit them.

| Folder     | Spec rules | What it pins                                                                 |
| ---------- | ---------- | ---------------------------------------------------------------------------- |
| `visible/` | 1, 2, 7, 8 | Who sees what, edge both-ends rule, groups, props absent, `asOf`.            |
| `paging/`  | 3          | Cursor walk, each edge sent once, totals per page, limit default and bounds. |

Fixtures live in `../support/world.ts`; the expected sets there are worked out by hand from the picture
in its comment, not computed by a second copy of the rule.
