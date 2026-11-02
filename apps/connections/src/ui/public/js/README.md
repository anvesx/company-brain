# js

ES modules loaded by `index.html`.

- `main.js`: the router (`#/`, `#/add`, `#/account/<id>`), the sign-in gate, and the one-time message from the OAuth redirect.
- `api.js`: the bearer in `sessionStorage` and `call`, a fetch wrapper that never throws.
- `dom.js`: `h` builds elements without innerHTML, so account text is never parsed as markup.
- `views/`: one module per screen.
