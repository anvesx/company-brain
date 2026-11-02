# tests

One folder per source folder. They use real SQLite files in a temp directory and real crypto; nothing here replaces our own code.

`cli/` also compiles the package and runs `dist/bin.js` as a child process. `sync/` and `e2e/` run the real app against a local server that replays recorded GitHub JSON.
