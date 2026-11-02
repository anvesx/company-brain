# refresh tests

`refresh.test.ts` refreshes real stored oauth accounts against the local replay provider in `tests/oauth`: new access token kept with its refresh token, rotation, provider refusal and an unreachable provider both flipping the account to `needs-auth`, and accounts that cannot refresh being left alone.

`refresh-concurrent.test.ts` checks that N concurrent refreshes of one account make one upstream call, share the result and persist a rotated token once; that different accounts are not serialised; that a failure reaches every waiter without poisoning the next attempt; and the `singleFlight` helper itself.

`refresh-edge.test.ts` checks that a credential with an empty, non-string or null refresh token is left alone.
