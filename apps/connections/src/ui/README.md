# ui

The browser pages, server-rendered with hono/jsx and `@anvesx/design-system`. No client framework and no client script.

- `routes.ts`: `uiRoutes(d, api, login)` serves `/`, `/connect/:provider` and `/accounts/:id`, and takes the form posts (sync, repo, disconnect, sign out). Each post calls the matching `/v1` route and redirects back with a note.
- `guard.ts`: the session check (no session goes to `/sign-in`), the cross-site refusal and the page security policy.
- `oauth-redirect.ts`: sends the OAuth callback back to `/` with `?connected=<id>` or `?oauth_error=<code>` (a fixed code, never the provider's words; a 500 from the callback is `store`).
- `assets.ts`: serves `/ui/app.css` and an empty `204` for `/favicon.ico`.
- `model/`: what each page shows (states, directory, counts). `shell/`: the shared frame. `pages/`: one screen per file.

No page has a field for a token or password: the only way to connect is the provider's own sign-in page.
