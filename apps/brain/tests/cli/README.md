# cli tests

- `connector.test.ts`: `connectorFromEnv` builds the folder, github and drive connectors from the environment, names missing variables and rejects an unknown or absent connector.
- `recheck.test.ts`: `recheckFromEnv` is off without a tokens file, reads the token under the caller's own tenant and user (not another tenant's), denies a user with no token, and refuses a missing, readable-by-others or misshapen tokens file.
- `recheck-shape.test.ts`: every JSON shape other than `{"tenant:user": {source: token}}` with non-empty string tokens is refused with the one "must be" message: a top-level array, null, string or number; a null, string, empty or numeric entry; one bad user or one bad token among good ones.
- `sync.test.ts`: `runSync` needs a graph path, stamps the graph in milliseconds and leaves a graph a second sync can reopen.
