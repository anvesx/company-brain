# connectors (pages)

The connector tiles on `/connections` and the posts behind them.

- `view.ts`: the HTML. A tile per catalog entry (greyed out and form-less when its env secrets are missing), then the person's own linked accounts with Sign in again and Disconnect.
- `routes.ts`: `POST /connections/link/:id` (session, then csrf, then catalog, then better-auth `link-social`), `POST /connections/unlink/:accountId` (own accounts in the catalog only), and `connectorData`.
