# posts

Form posts and the account page over real HTTP.

- `forms.test.ts`: 12, 10, 11: Origin and CSRF checks on form posts, page headers, install guide, broken template is a 500.
- `account.test.ts`: 11, 12: the account page lists allowed clients; Revoke ends a refresh token; Origin and CSRF on the revoke post.
