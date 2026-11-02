# js

ES modules loaded by `index.html`.

- `main.js`: the router (`#/`, `#/add`, `#/account/<id>`), the sign-in gate, and the one-time message from the OAuth redirect.
- `actions.js`: Sync now and Re-authorise (the add flow's start-url with the account's label and zones; it makes a fresh connection), `when` for times, `ROUTE`.
- `api.js`: the bearer in `sessionStorage` and `call`, a fetch wrapper that never throws.
- `dom.js`: `h` builds elements without innerHTML, so account text is never parsed as markup.
- `views/`: one module per screen.
