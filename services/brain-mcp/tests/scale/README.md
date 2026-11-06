# scale

Latency budgets from the spec (rule 12), measured through the real SDK client and printed every run.
Excluded from `pnpm test` and from Stryker; run with `pnpm --filter @anvesx/brain-mcp scale`.
Under load (1-minute load average above the CPU count) a budget prints SKIPPED instead of asserting.

- `seed.ts`: seeds 100,000 nodes in one tenant plus `budget()`, which prints p50/p99 and asserts.
- `search.test.ts`: brain.search p99 under 50 ms over 200 mixed queries, including misses; tools/list median under 5 ms.
- `common.test.ts`: the worst case, terms in most titles (`report`, `re`, `repo`) for Ada, Eve and a user who reads
  nothing; p99 under 50 ms, cursor continuation, and a printed brain.graph timing at limit 100, 5000, 20000.
