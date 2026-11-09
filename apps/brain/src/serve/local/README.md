# local

The local entry (`brain`, SQLite): settings checks and start-up.

- `checks.ts`: `ConfigError` and the path and URL checks (`writableDir`, `usableFile`, `checkBaseUrl`).
- `config.ts`: `readServeConfig` checks every env setting (secret length, port digits and range, `BRAIN_BASE_URL` https or localhost, writable database folders, and that an existing database path is a writable SQLite file, not a directory) and throws `ConfigError` before anything is created.
- `key.ts`: `cursorKeyFrom(secret)`, the graph-view cursor key: HKDF-SHA256 of `BRAIN_AUTH_SECRET` with the label "graph-view cursor v1", so every instance shares it and it differs from the session key. The production `serve` uses it too.
- `start.ts`: `startBrain` opens the databases, migrates, starts identity and listens. `explain` turns a fixable failure (bad config, identity's `BAD_INPUT`, `EADDRINUSE`, `EACCES`, a SQLite open error) into one line for `bin.ts`.
