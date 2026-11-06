# passkey

Passkey (WebAuthn) sign-in and management on top of `@better-auth/passkey`. The plugin owns the
`passkey` table, the challenge cookie and the four API endpoints under `/api/auth/passkey/*`;
this folder adds what a page needs around them.

- `script.ts`: the browser glue served at `/passkey.js`: options from the server, the
  authenticator prompt through `@simplewebauthn/browser`, the signed answer back, then navigate.
- `assets.ts`: serves `/webauthn.js` (the library's own bundle, read from node_modules once) and
  `/passkey.js`.
- `view.ts`: the "Sign in with a passkey" button for the sign-in page and the passkeys section of
  the account page (list, delete form, add box).
- `mount.ts`: mounts the assets and the CSRF-checked delete post; `listPasskeys` reads the table.
