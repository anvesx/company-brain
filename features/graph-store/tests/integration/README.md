# integration

- `persist.test.ts`: reopen persistence, WAL and shm removal, two handles in one process.
- `two-process.test.ts`: compiles the package to a temp dir and runs `writer.mjs` in two OS processes against one file.
- `writer.mjs`: the child process for that test.
- `scale.test.ts`: 10k nodes, 50k edges, reach under the 2 s CI budget.
