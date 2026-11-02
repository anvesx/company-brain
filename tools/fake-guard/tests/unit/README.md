# unit

`rules.test.ts` exercises `scanFile` for each rule (fake in `src`, module mocking, memory
databases and fake words in the real tiers, clean code). `baseline.test.ts` exercises the
shrink-only ratchet: `snapshot` and `compare`. Fixture strings that would trip a rule are built by
concatenation so the package does not flag itself.
