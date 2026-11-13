# tests

One folder per source folder. They use real SQLite files in a temp directory, a real Postgres 16 (`DATABASE_URL`) for the vault and the job queue, and real crypto; nothing here replaces our own code.

`cli/` also compiles the package and runs `dist/bin.js` as a child process. `sync/` and `e2e/` run the real app against a local server that replays recorded GitHub JSON. `auto-sync/` is the end to end of the background sync and its scale run. `pg/` holds the shared Postgres helpers.
