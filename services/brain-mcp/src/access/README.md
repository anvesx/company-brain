# access

What the caller may see. Reads go through `AsyncGraphStore`, so the same code runs on SQLite (via `toAsync`) and Postgres; `par.ts` runs a lookup over many ids a few at a time. `visible.ts` answers "can this user see this node" using the graph itself: the user and their teams, the documents they can read, and the projects, repos, people and teams around those documents. Channels and tickets are never visible.
