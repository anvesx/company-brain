# login

Continue with Google (google-login spec). Google is a generic OAuth provider, so better-auth does the OAuth work.

- `options.ts`: `oauthOptions`, the better-auth options for Google and every configured connector: providers, account linking, the extra account columns and hooks.
- `google.ts`: the provider entry (off unless `config.google` is set), the rule that Google must vouch for the email, the 404 on every other sign-in start (`sign-in/social` for anything but Google, `sign-in/oauth2`), the button, and `POST /sign-in/google` with its rate limit.
