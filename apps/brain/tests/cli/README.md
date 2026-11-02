# cli tests

- `connector.test.ts`: `connectorFromEnv` builds the folder, github and drive connectors from the environment, names missing variables and rejects an unknown or absent connector.
- `recheck.test.ts`: `recheckFromEnv` is off without a tokens file, reads the token under the caller's own tenant and user (not another tenant's), denies a user with no token, and refuses a missing, readable-by-others or misshapen tokens file.
- `sync.test.ts`: `runSync` needs a graph path, stamps the graph in milliseconds and leaves a graph a second sync can reopen.
