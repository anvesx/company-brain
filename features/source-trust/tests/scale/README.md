# Scale test

`scale.test.ts` pins rule 14: cost per round is O(claims + copies). It resolves 50k and then 100k
claims (10 per item, 1k sources, 20 rounds each) and asserts that CPU time at 100k is under 3x
CPU time at 50k, and that 100k claims take under 2 s of CPU time. It prints both timings. A
second test pins what is exact: every per-round loop in rounds.ts visits each claim a fixed
number of times. `Run.visits` counts the elements every per-round loop visits (including the loops
in `voteItem` and `learnAccuracy`), and the test asserts visits per round equal
2 items + 2 claims + 5 values + 3 sources, the derivation written in the test. A new per-round loop
must add to the counter. Work done outside those loops is bounded only by the CPU ratio (< 3 on a
2x input, which catches about n^1.585 and worse); the counter does not see un-instrumented work.

Why CPU time and a ratio, not wall clock: `performance.now()` counts time spent waiting for the
CPU, so on a loaded machine a correct run failed a 2000 ms bound (2208 ms and 2425 ms at load 7).
`process.cpuUsage()` counts only the time this process ran. The ratio of two runs on the same
machine also cancels machine speed, so it fails only if cost grows faster than the bound allows. The bound 3 catches about
n^1.585 and worse (n^1.585 gives 3, quadratic gives 4). It does not catch n log n drift.

`copies.test.ts` pins that `edgesByCopier` does not copy a copier's edge list per push: one copier
with 20k and then 40k distinct originals (inserted in descending order), fastest call of many,
CPU ratio under 3. Pushing and sorting gives about 2.2; the old per-edge array spread gave 5.
