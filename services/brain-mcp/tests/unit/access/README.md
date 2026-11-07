# access tests

- `visible-principals.test.ts`: principals come only from outgoing member-of edges, as of asOf.
- `visible-kinds.test.ts`: repos, projects, teams and people become visible through readable documents; kind hints and ghosts.
- `visible-memo.test.ts`: answers are remembered per viewer; proven by closing the store.
- `docs.test.ts`: bulk and per-chunk document reads agree, honour asOf and count only documents.
