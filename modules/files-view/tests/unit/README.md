# Unit tests

Pure functions and view rendering, no database and no network. Each folder tests one part of `src`:

- `format/`: size, date, age and link helpers, and the query-string parser.
- `cursor/`: the keyset cursor and the SQL builders.
- `screens/`: the HTML each screen renders from a view model, including the removed and empty states.

Everything that needs Postgres, HTTP or the OIDC provider is in `../integration`.
