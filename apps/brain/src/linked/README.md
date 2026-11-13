# linked

What a linked connector can read. `GET /connections/data/:provider` takes the signed-in person's own account for that provider, asks identity for its token (refreshed when due), calls the provider's API once, and shows the first rows. The token never leaves the server.

- `sources.ts`: per provider, the one API call and how its answer becomes rows (GitHub repos, Drive files, Slack channels).
- `route.ts`: the route. Signed out goes to `/sign-in`; no linked account is 404; a link that needs a new sign-in or a provider that fails is a plain page, never a stack.
- `view.ts`: the HTML.

`<ID>_BASE_URL` (see `../doors/base.ts`) points the call at another host with the same paths, so a local provider can stand in for the real one.
