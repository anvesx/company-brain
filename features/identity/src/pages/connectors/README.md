# connectors (pages)

The connector tiles on `/connections` and the posts behind them.

- `view.ts`: the HTML. A two-column grid of tiles (logo, name, one line, `by <provider>`, then a "+" form, or a green check once linked with a "View data" link when the entry sets `dataPath`; greyed out and form-less when its env secrets are missing), then the person's own linked accounts with Sign in again and Disconnect.
- `logos.ts`: inline SVG marks for GitHub, Google Drive and Slack; any other provider gets its first letter.
- `style.ts`: the grid's `<style>` block.
- `routes.ts`: `POST /connections/link/:id` (session, then csrf, then catalog, then better-auth `link-social`), `POST /connections/unlink/:accountId` (own accounts in the catalog only), and `connectorData`.
