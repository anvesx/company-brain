# src/cli

| File             | Job                                                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `serve.ts`       | `startFromEnv`: reads env, enforces the auth mode, picks the source, starts the app and ingests each tenant.                  |
| `sources.ts`     | `sourceFor`: `BRAIN_FOLDER_ROOT` as tenant `BRAIN_TENANT`, otherwise the demo. Folder mode embeds with the demo toy embedder. |
| `user-tokens.ts` | `userTokensFor`: `BRAIN_USER_TOKENS` JSON `{"tenant:user": credential}` for connectors that enforce per-user tokens.          |
| `mint-token.ts`  | `brain mint-token --user U --tenant T [--groups a,b] [--ttl SECONDS] [--kid K]`; never exceeds `BRAIN_TOKEN_MAX_TTL_SECONDS`. |
