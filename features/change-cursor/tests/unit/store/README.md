# store

- `store-seen.test.ts`: `seen` is false first, true after, expires by the injected clock, defaults to a 24 hour ttl.
- `store-forget.test.ts`: `forget` releases only the named tenant's id so a retry can pass after a failed handler.

Both share the `thrownBy` helper in `../support.ts`.
