# @anvesx/token-refresh

The background sweep that keeps connector tokens fresh. Every run it finds connector accounts
whose access token expires within 30 minutes, takes a 2-minute lease on them in one conditional
write, refreshes each through `identity.refreshAccount`, and releases the lease. Two replicas
running at once never refresh the same row twice, and a replica that dies mid-sweep lets its
rows go after 2 minutes.

Spec: [connector-accounts](../../docs/specs/feature/connector-accounts.md). Brief:
[connector-accounts](../../docs/briefs/connector-accounts.md).

| Command                                        | What it runs                          |
| ---------------------------------------------- | ------------------------------------- |
| `pnpm --filter @anvesx/token-refresh test`     | unit and integration tests            |
| `pnpm --filter @anvesx/token-refresh scale`    | 10 000 rows swept in under 10 seconds |
| `pnpm --filter @anvesx/token-refresh mutation` | Stryker over `src/`, break at 80      |

The sweep owns no table. It reads and writes the `account` rows through better-auth's own
adapter, so the seal on the token columns always applies.
