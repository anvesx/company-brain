# routes

Pure helpers of `src/routes`, called directly with real `Response` objects.

- `errors.test.ts`: `toRedirect` and `mapRejection`, including the 4xx and 5xx boundaries.
- `validate.test.ts`: BAD_INPUT and 429 responses, `Retry-After`, sign-up checks.
- `register.test.ts`: loopback-only redirects are labelled as native clients.
