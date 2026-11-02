# scale

`scale.test.ts` diffs 100k known addresses in under 2000 ms, then records 100k new event ids and
checks every one is reported as seen afterwards. Time budgets are asserted, so a regression to
quadratic behaviour fails the test.
