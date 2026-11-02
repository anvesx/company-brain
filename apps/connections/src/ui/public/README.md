# public

The static page. No framework, no build step; files are served as they are.

- `index.html`: the shell, loads `css/` and `js/main.js`.
- `css/`: `base.css` (type, layout), `header.css`, `cards.css` (list, filters, details), `forms.css`, `buttons.css`.
- `js/`: `main.js` (router, sign-in gate), `api.js` (bearer fetch), `dom.js` (element helper). `js/views/` holds one file per screen.

The bearer is kept in `sessionStorage`, so closing the tab signs out. The page sets no inline styles or scripts, to fit the content security policy.
