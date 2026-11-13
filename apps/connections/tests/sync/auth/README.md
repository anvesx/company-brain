# sync auth tests

- `forbidden.test.ts`: a 403 with a live token keeps the account active (route 403), a 401 asks to reconnect (409), and an unverifiable refusal is a retryable 502.
- `superseded.test.ts`: two overlapping syncs of one account; the older ends quietly (409, no failure in health).
