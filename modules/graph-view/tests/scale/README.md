# tests/scale

Spec rule 6: `visibleGraph` for a user with 10,000 readable documents in a 50,000-edge graph returns in
under 300 ms. The graph is a real SQLite file built once from a seeded PRNG (`../support/seed.ts`), so
every run measures the same data. The test prints the measured time on every run.

This folder is excluded from mutation testing (`vitest.stryker.config.ts`): instrumented code is slower,
and a timing failure would kill mutants for the wrong reason.

The 300 ms assertion runs only while the 1-minute load average is under half the cores; otherwise the test prints `SKIPPED`
with the load and the measured time, and still checks the answer. A fixed budget fails under load for reasons that are not
the code's (322 to 568 ms were seen at load 10 to 14).
