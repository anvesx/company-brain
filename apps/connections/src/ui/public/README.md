# public

The static page. No framework, no build step; files are served as they are.

- `index.html`: the shell, loads `css/` and `js/main.js`.
- `css/`: `base.css` (type, layout), `header.css`, `cards.css` (list, filters, details), `forms.css`, `buttons.css`.
- `js/`: `main.js` (router; a browser with no session goes to `/sign-in`), `api.js` (fetch with the session cookie, `/v1/me`, sign-out), `dom.js` (element helper). `js/views/` holds one file per screen.

Sign-in is Google only (see `src/login`); the page holds no credential and keeps nothing in `sessionStorage`. The page sets no inline styles or scripts, to fit the content security policy.
