# ui tests

Drive the real app over HTTP: the static page routes, the `start-url` variant and the callback redirect. OAuth uses the replay provider from `tests/oauth`; SQLite is a real temp file.

- `fixture.ts`: boots the app with the replay provider and the UI redirect on.
- `routes.test.ts`: page and asset serving, content types, path traversal.
- `oauth-ui.test.ts`: `start-url` JSON and the redirect back to the page.
