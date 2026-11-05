# bearer

Rule 8 through the boot clock: the key set is cached for an hour and refetched at most once a
minute for an unknown key. The fetches are counted by `hits` on `/api/auth/jwks`.

- `cache.test.ts`: overlapping first checks share one fetch; no refetch at 60 min - 1 ms, one at 60 min.
- `cooldown.test.ts`: an unknown key refetches at 1 min, not before; a refetch restarts the cooldown.
- `errors.test.ts`: expiry boundary, unavailable keys, wrong audience, malformed token messages.
- `helpers.ts`: key-set fetch counter, `verify` and `login`.
