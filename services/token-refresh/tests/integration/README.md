# tests/integration

The whole sweep against the real stack: identity over SQLite, `identity.refreshAccount`, and the
local replay OAuth provider answering real token requests. The replay counts every refresh call,
so a double refresh shows up as a wrong count, and a rotated refresh token spent twice would turn
the row needs-auth.

| File               | Rules                                                                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `report.test.ts`   | 5: report counts, refusals listed, rows held elsewhere skipped, rows out of window ignored; 7: three lease writes for 1001 rows                 |
| `parallel.test.ts` | 6: two sweeps at once refresh each row once, a dead replica's rows return after 2 minutes, provider down, refused grants                        |
| `main.test.ts`     | 5: the built `dist/bin/main.js --once` as a child process rotates a due row on disk, prints one report line, exits 0; a missing setting exits 1 |
| `busy.test.ts`     | 6: `main.js --once` started while another process holds the SQLite write lock waits for it, refreshes the row and exits 0                       |
