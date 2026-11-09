# doors

The ways into the brain that need an outside party: Google login and the connector tiles. Both are
read from the environment here, once, and handed to identity as config.

- `catalog.ts`: the built-in connector catalog (`CATALOG`). Data only; a tile shows greyed as
  "not configured" until its `<ID>_CLIENT_ID` and `<ID>_CLIENT_SECRET` are set.
- `base.ts`: `<ID>_BASE_URL` (for example `GITHUB_BASE_URL`) points a connector at another OAuth server (`/authorize`, `/token`, `/userinfo`): a self-hosted one, or a local provider for a demo.
- `env.ts`: `doorsFromEnv(env, secret)` reads `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` (both or
  neither) and `BRAIN_SEAL_KEY` (64 hex; otherwise derived from the auth secret), and returns the
  `google`, `sealKey`, `providers` and `env` slice of identity's config. A bad value is a `ConfigError`.
