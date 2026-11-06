# posts

Form posts and the account page over real HTTP.

- `forms.test.ts`: 12, 10, 11: Origin and CSRF checks on form posts, page headers, install guide, broken template is a 500.
- `account.test.ts`: 11, 12: the account page lists allowed clients; Revoke ends a refresh token; Origin and CSRF on the revoke post.
- `body.test.ts`: 13, 12: a JSON, text or cut-off body to any form post is 400, never 500; the sign-in page names the bad field.
- `picker.test.ts`: 3: a refused organization leaves the session's active organization alone.
