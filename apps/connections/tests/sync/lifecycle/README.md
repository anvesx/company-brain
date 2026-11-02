# lifecycle tests

- `disconnect.test.ts`: deleting accounts and checking the graph edges close.
- `narrow.test.ts`: narrowing `dataZone` over PATCH closes the edges written at the wider zone.
- `narrow-race.test.ts`: a sync in flight while the zone is narrowed, widened or the account disconnected leaves no edges at the old zone.
- `refresh.test.ts`: the token refresh that runs before a sync.
