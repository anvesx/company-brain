# ui

The browser page for the connections app and the two routes it needs.

- `routes.ts`: `uiRoutes`, serves `GET /` (the page) and `GET /ui/*` from `public/`. Only files found in `public/` with a known type are served; responses carry a strict content security policy and `no-store`.
- `oauth-ui.ts`: `oauthUi`, wraps the OAuth routes. `GET /v1/oauth/:provider/start-url` returns `{url}` (bearer required, same checks and 403 reasons as `start`). With a redirect configured, `callback` answers 302 to `<redirect>?connected=<id>` or `<redirect>?oauth_error=<reason>`.
- The add and list pages read the provider list from `GET /v1/catalog`; nothing in `public/` names a provider.
- `public/`: static page, no framework and no build step.
