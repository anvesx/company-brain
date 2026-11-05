# pages

Server-rendered HTML, no framework. Only the connections page has a script (the copy button).

- `layout.ts`: page shell, escaping, form field helpers.
- `serve.ts`: the GET pages `/sign-in`, `/sign-up`, `/picker`, `/consent`, and mounts `signed/`.
- `actions.ts`: shared form helpers and the sign-in and sign-up posts.
- `forms.ts`: the signed-in posts (sign-out, picker, consent) and `guardedPost`, which checks Origin and CSRF. Pages send `X-Frame-Options: DENY`.
- `signed/`: pages that need a session: `/connections`, `/account` and its revoke post.
- `views/`: the HTML for each page.
