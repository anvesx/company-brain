# passkey

Rule 16 over real HTTP: the plugin's endpoints behind our Origin guard, and the pages around them.

| File            | What it pins                                                                                  |
| --------------- | --------------------------------------------------------------------------------------------- |
| `api.test.ts`   | table created by migrate; options need a session (register) or none (sign-in); rp id is the   |
|                 | host of baseUrl; a made-up answer is refused with no session; foreign Origin is 403.          |
| `pages.test.ts` | `/webauthn.js` is the library bundle byte for byte; `/passkey.js`; the sign-in button carries |
|                 | the OAuth query; the account section; delete is CSRF-checked and 404 for a stranger's id.     |

The signed answer itself needs an authenticator, so the full round trip lives in `tests/e2e/passkey`.
