# pg

`db.ts`: the real Postgres side for tests. `data(dir, nowMs)` opens the vault on `DATABASE_URL` (a disposable Postgres 16; the helper throws without it) and a cursor file in `dir`. `KEYS` is the vault key ring and `AUTH` the bearer secret the harnesses sign with.
