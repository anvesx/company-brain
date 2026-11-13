# login cli tests

- `login-env.test.ts`: which `LOGIN_*` settings mean a page, and the error when some are missing.
- `start-login.test.ts`: `start` with a real Postgres 16 and the local OIDC server serves `/sign-in` and sends `/` there.
