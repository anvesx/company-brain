# src

- `rank-server.mjs`: HTTP wrapper over `RankIndex` (`GET /search`, `GET /healthz`). Seeds a fresh SQLite file with the bench corpus, listens on loopback, returns a stop function. Run directly: `node rank-server.mjs <docs> <port>`.
- `servers.mjs`: starts the rank wrapper and the real connections launcher as child processes, waits for them to answer.
- `creds.mjs`: mints the `user:tenant:exp:hmac` bearer with the test secret the connections app's own tests use.
- `env.mjs`: prints the CPU, memory, load, Node and k6 versions a run is measured on.
