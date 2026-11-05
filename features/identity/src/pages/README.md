# pages

Server-rendered HTML, no framework. Only the connections page has a script (the copy button).

- `layout.ts`: page shell, escaping, form field helpers.
- `serve.ts`: the GET pages `/sign-in`, `/sign-up`, `/picker`, `/consent`, and mounts `signed/`.
- `actions.ts`: shared helpers: `readForm` (Origin check, 400 for a body that is not a form), `oops` (the error page), `api`, `html`, `redirect`.
- `forms.ts`: the sign-in and sign-up posts, the signed-in posts (sign-out, picker, consent) and `guardedPost`, which checks Origin and CSRF. Pages send `X-Frame-Options: DENY`.
- `signed/`: pages that need a session: `/connections`, `/account` and its revoke post.
- `views/`: the HTML for each page.
