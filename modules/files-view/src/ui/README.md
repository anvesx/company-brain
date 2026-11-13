# ui

Server-rendered screens for files-view (hono/jsx and `@anvesx/design-system`, no client JavaScript).
Pure functions from view models (`types.ts`) to JSX, so the route layer owns data and the gate, and this
folder owns what the customer sees. Every view model is already gate-approved; nothing here reads the store.

- `types.ts`: view models the routes must fill (files, cluster paths with `why`, pages, queries).
- `format.ts`: size, date and URL helpers. `shell.tsx`: page frame, nav, freshness line.
- `styles/`: module CSS. `parts/`: filter form, file table, empty/error/removed states. `pages/`: the four screens.
- `styleHashes()` returns the CSP `style-src` sha256 sources for the two inline stylesheets.
