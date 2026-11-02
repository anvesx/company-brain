# src

- `servers.mjs`: starts the real connections launcher as a child process and waits for it to answer.
- `creds.mjs`: mints the `user:tenant:exp:hmac` bearer with the test secret the connections app's own tests use.
- `env.mjs`: prints the CPU, memory, load, Node and k6 versions a run is measured on.
