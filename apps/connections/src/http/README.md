# http

- `auth.ts`: the `user:tenant:exp:hmac` bearer check (same shape as the brain app) and the Hono middleware.
- `validate.ts`: request body checks for create and patch; no extra fields accepted.
- `accounts-routes.ts`: `GET/POST /accounts`, `PATCH/DELETE /accounts/:id`. Applies the widening rule and answers 403 with the reason.
- `app.ts`: `createApp`, mounts everything under `/v1`.
- `serve.ts`: `startServer`, a loopback listener for the app.

A caller sees accounts they own plus `company` accounts in their tenant; another owner's private account answers 404. Credentials are accepted on POST and never returned.
