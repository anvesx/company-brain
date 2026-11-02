# guard

What a request must pass before a route runs.

- `auth.ts`: the `user:tenant:exp:hmac` bearer check (same shape as the brain app) and the Hono middleware.
- `validate.ts`: request checks for create, patch and oauth start; no extra fields accepted.
