# tests

`node --test`, no mocks: `creds.test.mjs` recomputes the bearer signature independently; `outcome.test.mjs` runs real child processes (exit 0, exit 99, killed by SIGKILL, missing binary) through `exitCode`.
