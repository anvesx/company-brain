# csrf tests

Against real Postgres 16 and the local OIDC server: a signed-in cookie is refused on cross-site requests (403), the same-origin request works, and the bearer is never checked.

- `cross-site.test.ts`: cross-origin text/plain POST, same-origin POST, bearer, and cross-site `oauth start` and `start-url`.
