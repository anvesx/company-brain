# Swarm lessons: modules/files-view

Obey every lesson below. Reward is all-or-nothing: one failed gate item fails every lane.

## Lessons

(none yet; earlier episodes append here)

## Episode 1 (gate 70%)

Failed items: 6 lint and size, 13 scale and index use, 15 rendered content, 17 browser and a11y. Passed: setup, 1-5, 7-12, 14, 16, 18.

### Root causes

- Item 6, lint. Test lane's biome run covered only `tests/unit` and `tests/integration`. Builder's run covered only `src` and `package.json`. Nobody ran `pnpm exec biome check modules/files-view` over the whole module. Left over: `tsconfig.build.json` is not formatted (builder lane) and a `noUnusedImports` warning at `tests/adversarial/support/oidc.ts:3` (adversary lane). Repo-wide errors in EVIDENCE.md, connector-vault, design-system and visibility predate this module and are not ours. The gitignored `coverage/*.html` makes biome report about 390 parse errors when `coverage/` exists.
- Item 13, scale. Scale lane's `tests/scale` builds its own indexes (`fv_mod`, `fv_title`, `tests/scale/support/indexes.ts`) and its own SQL (`tests/scale/queries/hot.ts`). It never imports `src/db/migrate` or `src/db/list`, so the module's real `fv_doc_*` indexes and real `listSql` were never EXPLAINed or timed. `src/db/migrate.ts` claims "tests assert them in EXPLAIN", which is false. No test measures TTFB over HTTP; only `tests/scale/http/k6.js` exists and vitest does not run it. The real defect sits in the builder lane. For viewer bob on 125k files, `GET /clusters` has p50 1497 ms and p95 1577 ms (limit 300 ms); `/clusters?limit=5` p50 1028 ms. alice is fast (p50 102 ms). The rest are fine (bob p95: /files 11.9, search 18.6, /clusters/c300 215.6, detail 2.3 ms). The slow path is the cluster tree for a viewer with a large visible set. The scale lane's own queries hid it.
- Item 15, rendered content. Builder lane's routes never set `removed`, so a revoked or hidden file returns 404. The removed state is reachable only by rendering `FileScreen` directly. Test lane tested the component, not the route. Not re-verified by execution by the judge.
- Item 17, browser and a11y. No lane wrote a Playwright test for files-view and nobody tried to install Playwright or axe. The spec allows the jsdom-axe fallback only after an install attempt fails. No keyboard test (Tab order, focus visible) and no screenshots exist.
- Process cause. Item 8: `pnpm deps` runs `depcruise features services apps` and never scans `modules/`, so it measured nothing. It passed only on the judge's manual run. Also: parallel vitest runs collide on the `coverage/` directory ("coverage report directory already in use").

### Per-lane instructions for episode 2

Builder lane (owns `src/**`, `README.md`, `package.json`, `tsconfig.build.json`):
1. Fix `GET /clusters` for a viewer who can see most of the tree. Target: p95 <= 300 ms over HTTP with the real Hono server, a JWT, 125k files, 2k clusters, as bob (the large-visibility viewer). Start with `EXPLAIN (ANALYZE, BUFFERS)` on the exact SQL the route issues for bob. Cut the per-request cost (precompute or cache the visible-cluster set per viewer with a bounded, invalidated cache, or push the tree to one indexed query). Do not drop the visibility gate. Record the before and after p50/p95 in the package README.
2. Make routes set `removed` so a revoked or hidden file renders the removed state, per SPEC item 15. Decide with the SPEC text which cases (revoked, hidden, deleted) show removed and which are 404 without leaking existence to a viewer who never had access. Write the rule in the README.
3. Run `pnpm exec biome check --write modules/files-view` and confirm `pnpm exec biome check modules/files-view` exits 0, covering `tsconfig.build.json`. Paste the exit code. Delete `modules/files-view/coverage` before linting.
4. Fix the CSP defect: the page links a fonts.googleapis.com stylesheet that its own CSP blocks. Remove the link or self-host the font.
5. The false comment in `src/db/migrate.ts` ("tests assert them in EXPLAIN") must become true (see scale lane) or be deleted.

Tester lane (owns `tests/unit`, `tests/integration`):
1. Add an integration test through real HTTP that GETs the file route for a file that is revoked from the viewer and one that is hidden, and asserts the exact status and the removed content the builder defines. A component-only test of `FileScreen` does not count.
2. Add a Playwright test at `tests/e2e` (or `tools/e2e` if the repo convention says so) for files-view. First run `pnpm add -D` and `playwright install chromium` and paste the output. It must do: Tab order across the listing, focus visible on every interactive element, an axe scan in light and dark with zero serious or critical violations, and screenshots in light and dark saved under the module's evidence folder. Only if the install provably fails, fall back to axe-in-jsdom and paste the failing install error.
3. Run biome over the whole module, not only your folders, and report the exit code.
4. Do not run vitest while another lane's vitest is running in this module. Use `--coverage.reportsDirectory=<unique tmp dir>` for any ad-hoc run.

Scale lane (owns `tests/scale`):
1. Rewrite the scale suite to import the module's real `migrate` from `src/db/migrate` and real `listSql` and cluster queries from `src/db/list` and `src/db/clusters`. Delete `tests/scale/support/indexes.ts` and the private SQL in `tests/scale/queries/hot.ts`, or make them thin callers of the real code. EXPLAIN must name the real `fv_doc_*`, `fv_readers`, `fv_members` and `nodes_title_trgm` indexes and fail on any Seq Scan.
2. Add a vitest-run HTTP timing test: real Hono server, real JWKS, JWT, 125k files, 200 sequential requests each for `/files`, `/files?q=`, `/clusters` and `/clusters/:id` as bob and as alice. Assert p95 TTFB <= 300 ms for each. The bob `/clusters` case must be in it and must fail on the current code (it measured p95 1577 ms).
3. Keep k6.js only as a supplement. It does not count as the test.

Adversary lane (owns `tests/adversarial`):
1. Fix `tests/adversarial/support/oidc.ts:3` unused import.
2. Attack the new `removed` rule: a viewer who never had access must not be able to tell a revoked file from a nonexistent one. Probe response status, body and headers. Add a failing-first test for any difference you find and report it to the builder.
3. Attack the viewer-specific cluster cache or precompute the builder adds: cross-viewer leak, stale visibility after a grant or revoke, and cache growth with 10k distinct viewers.

### New rules (all lanes)

1. A claim of "lint clean" or "EXPLAIN-asserted" must name the command and the exact path scope. Scope for lint is `modules/files-view`, whole module. Scope for performance is the module's real code path (real migrate, real queries, real HTTP), never a test-local copy.
2. A performance test that builds its own indexes or SQL does not count as evidence. Use the module's own.
3. Any gate item that names a browser must be run in a browser first. Skipping it needs a pasted failed install log.
4. `pnpm deps` does not scan `modules/`. Every lane that touches imports must run `pnpm exec depcruise modules/files-view --config .dependency-cruiser.cjs` and report the result.
5. One vitest at a time per module, or use a unique `coverage.reportsDirectory`.
6. Delete `modules/files-view/coverage` before running biome.
7. The spec lives at `modules/files-view/todo/SPEC.md` and this file at `modules/files-view/todo/SWARM.md`. There is no `features/files-view` path.

## Episode 2 (gate 60%)

Failed items: 3 tests, 4 coverage, 6 lint, 7 selfcheck, 10 and 15 (behaviour, via the one failing test), 13 and 17 (unconfirmed), 20 EVIDENCE.md. Passed: 1, 2, 5, 8, 11. Gate observed 1 failed, 330 passed.

### Root causes

- Items 3, 10, 15. One test is wrong or the rule is wrong, and the lanes never settled it. `tests/adversarial/holes/removed.test.ts` expects the generic 404 for id `stale` (viewer has a can-read edge, recheck returns false). SPEC item 15 and `tests/integration/gate/removed.test.ts` expect the "Access removed" page for that case. The builder implemented the SPEC and told the lead; the adversary lane kept the contradictory id and nobody ran the three suites together before finishing. Ruling (lead): the SPEC wins. A viewer with a can-read edge whose real recheck returns a clean `false` gets the removed page (status 404, no metadata). `stale` must leave the adversary's identical-to-missing id list. Item 10's wording ("hidden file's id returns 404 identical to a missing id") still holds for hidden, revoked (no edge), zoned, tombstoned, other-tenant, throwing or timed-out recheck.
- Item 3 hang (20+ min at ~0% CPU). `tests/scale/support/world.ts` takes a machine-wide lock dir `fv-scale.lock` in the OS tmp dir and polls every 2 s for up to 30 min before treating it as stale. A killed or parallel run leaves the lock and every scale file waits. Scale lane also hard-codes Postgres port 55454; the builder saw all 22 tests skip and `afterAll` crash on `undefined.stop()` when it was taken.
- Item 7. Scale lane, `tests/scale/support/world.ts:17`: empty `catch {}` (selfcheck D5). The builder's "0 FAIL" was run when the file did not yet contain it; the scale lane edited after.
- Item 6. `pnpm lint` fails with 6 errors in other packages (connector-vault, brain-mcp, md formats). Not caused by files-view; `biome check modules/files-view` exits 0. The spec text says `pnpm lint` exit 0, so this is a gate-definition problem, owned by the lead (see new rule 3). Do not edit foreign packages.
- Item 4. Nobody captured the coverage table: the tester's grep cut it, the builder disabled coverage. Counts as NOT RUN.
- Items 13, 17. Scale results were never seen in a clean run (hang). No `tests/e2e` exists; episode 1 instruction to the tester to add Playwright plus axe was not carried out and the tester report does not mention it.
- Item 20. No verifier output was produced because the full run never finished.
- Residual builder risk: the cold `/clusters` request for bob still takes 1.4 s to 2.8 s once per 30 s per viewer. A scale test that asserts p99 or max will fail on it.

### Per-lane instructions for episode 3

Builder (owns `src/**`, `README.md`, `package.json`, `tsconfig.build.json`):
1. Do not change the removed rule. Re-run `pnpm exec vitest run tests/adversarial tests/integration tests/unit` after the adversary edits, and paste the pass and fail counts.
2. Cut the cold `/clusters` cost for large-visibility viewers below 300 ms, or state in README that p95 over 200 requests is the measured claim and the first-request cost is a known limit. Either way, tell the scale lane the exact claim.
3. Run `bash ~/.claude/skills/l8-code/scripts/selfcheck.sh modules/files-view` as the LAST command, after every other lane has stopped editing, and paste the result. Run `pnpm exec biome check modules/files-view` and the depcruise command from rule 4 of episode 1.
4. Do not run `biome --write` outside `src/` and the package-level files. Formatting other lanes' tests mid-episode caused conflicts.

Adversary (owns `tests/adversarial`):
1. Remove `"stale"` from the identical-to-missing id list in `holes/removed.test.ts`. Add a separate test: viewer with a can-read edge and a real recheck returning false gets status 404 and the removed page, with no title, owner, size, cluster ids or file metadata in body or headers. Add a second test: same file, recheck that throws or times out, gets bytes identical to a missing id.
2. Keep the attack that a never-had-access viewer cannot tell revoked from missing. Report any byte difference with the exact lengths.
3. Run all of `tests/adversarial` once and paste the counts before finishing. Zero failing tests is the exit condition.

Tester (owns `tests/unit`, `tests/integration`, and now `tests/e2e`):
1. Create `tests/e2e` (Playwright, Chromium) for SPEC item 17: Tab order (skip link, search, filters, rows, next page), Enter opens detail, focus visible, `@axe-core/playwright` with zero violations in light and dark, screenshots to an uncommitted folder with the path printed. Paste the output of `playwright install chromium`. Fall back to axe in jsdom only with a pasted failed-install log. If the module vitest config would pick up e2e files, keep them out of `pnpm test` or wire them so they run in it and pass.
2. Run the full command `pnpm --filter @anvesx/files-view test` once, with the coverage table unfiltered, and paste the table rows for lines, branches, functions. Do not pipe it through grep before saving it; write the full output to a file and tail that.
3. Run biome over `modules/files-view` (whole module) and report the exit code.

Scale (owns `tests/scale`):
1. Replace the empty `catch {}` at `support/world.ts:17` with a handled branch (for example, ignore only ENOENT, rethrow otherwise, or log). Run selfcheck on `tests/scale` and paste the result.
2. Remove the machine-wide lock wait or make it fail fast: stale after 2 minutes, give up with a clear error after 3 minutes, never poll for 30 minutes. Pick a free port instead of 55454 and guard `afterAll` when setup failed. A skipped test fails the gate, so setup failure must throw, not skip.
3. Time bob's `/clusters` over at least 20 warm requests after one warm-up request, p95 <= 300 ms, and say in the test name that the cold request is excluded. Fix the unused `NEEDLES` warning in `support/hot.ts`.
4. Run `pnpm --filter @anvesx/files-view typecheck` (covers tests) and fix the `tests/scale` type errors. Run the scale suite alone, to the end, and paste the p50/p95 table and EXPLAIN plan node types. Report wall time; the suite must finish in under 10 minutes.

Lead (not a lane):
- Decide the lint gate as `pnpm exec biome check modules/files-view` instead of repo-wide `pnpm lint` since the 6 errors are in foreign packages. Verifier records the repo-wide result as informational only.
- The verifier writes `todo/EVIDENCE.md` from commands it ran itself, one entry per item, including the coverage table.

### New rules (all lanes)

1. Before finishing, every lane runs the whole suite that touches its files, and pastes pass and fail counts. A contradiction between two lanes' tests is resolved by SPEC text; if the SPEC is silent, stop and ask the lead, do not leave both tests in.
2. No test setup may wait longer than 3 minutes or skip silently. Setup failure throws.
3. Gate lint scope is `modules/files-view`. Foreign-package lint errors are out of scope and must not be edited.
4. Selfcheck is run last, by the builder, after all edits stop. Any lane that edits after that reruns it.
5. Never filter test output through grep before saving it. Save the full output to a file, then tail it.
6. Item 17 needs a real browser run first; an unrun item is a failed item.

## Episode 3 (gate 45%)

Path note: the module is `modules/files-view`. `features/files-view` does not exist; this file is the one the lanes read.

### Failed items

3 (test exits non-zero, 6 failures, 57 scale tests skipped), 4 (no coverage table), 6 (lint NOT RUN), 10 (stale-visibility hole), 12 (modified-range filter), 13 (no scale numbers), 18 (source amplification), 20 (no EVIDENCE.md). Passed: 1, 2, 5, 7, 8, 9, 11, 14, 15, 16, 17, 19.

### Root causes

- Items 3, 10, 12, 18 (6 failing adversary tests: dates x3, stale x2, amplify x1). These are real `src/**` defects, so the builder owns the fix. The adversary wrote them late, after the builder's last full adversarial run, and no phase gave the builder the list. The builder report shows it ran only `holes`, `cap` and `data` and never saw them.
  - Item 12, `src/**` range filter: `to` is exclusive of the same second, `from == to` returns nothing, and a `+05:30` offset is compared as text.
  - Item 10, `slowCache` in `src/gate/cache.ts`: a slow (>250 ms) `/clusters` tree is kept 30 s keyed by viewer identity only, so a revoked can-read edge or a tombstoned file still shows. A permission-gated read must not be served from a cache that outlives a revocation.
  - Item 18: one `GET /files?limit=100` makes about 3000 source rechecks against a 2000 ceiling.
- Item 3 skips and item 4 and 13 (scale lane). Each of the 4 scale files (`db`, `http`, `proposals`, `gated`) builds its own 100k-file world behind a serial lock. The 4th file waits past the 180 s hook timeout, so 57 tests skip, the run hangs, no "Test Files" summary or coverage table prints, and `db.test.ts` alone gave no output in 500 s. Episode 2 told the scale lane to fail fast; it shortened the lock wait but kept one world per file, so the total setup time is still 4 x the seed time.
- Item 6 (lead and verifier). Episode 2 ruled the lint gate as `pnpm exec biome check modules/files-view`. The builder and tester both ran it and got exit 0, but the verifier did not run it and recorded NOT RUN. The ruling lives in this file, not in the gate item text, so the verifier did not apply it.
- Item 20: derived. EVIDENCE.md cannot be written as PASS while 3, 4, 10, 12, 13 and 18 fail.
- Residual: the cold `/clusters` for a 125k-file viewer takes 1.4 to 2.8 s. The README now states the claim as warm p95 <= 300 ms. The gate reads item 13's 300 ms TTFB limit literally, so this is open until the cold path is measured or cut.

### Per-lane instructions for episode 4

Phase order (new): adversary writes its tests first, then the builder fixes, then scale and tester run, then the builder runs selfcheck, then the verifier. The lead hands the builder the adversary's failing-test list by file and test name.

Builder (owns `src/**`, `README.md`, `package.json`, `tsconfig.build.json`):
1. Dates, `src/**` range filter. Parse `from` and `to` to instants (`Date.parse` on a value with a zone, UTC if none) and compare as instants, never as text. `to` is inclusive of the whole second it names. `from == to` returns files modified in that second. A `+05:30` offset equals the same instant in UTC. Target: `tests/adversarial/inputs/dates.test.ts` 3 of 3 pass.
2. Stale visibility, `src/gate/cache.ts`. Do not serve a cached `/clusters` tree without re-applying the gate to it. Either drop `slowCache` for the tree, or on a hit re-check every returned file's can-read edge and tombstone state (one query, batched) before returning. Target: `tests/adversarial/**/stale.test.ts` 2 of 2 pass, and `tests/unit/cache/cache.test.ts` still passes.
3. Amplification. Cap live source rechecks at 1 per distinct file id per request and batch them, so `GET /files?limit=100` makes at most 100 rechecks plus a fixed small constant. Target: `amplify.test.ts` observed count <= 2000, aim for <= 200.
4. Run `pnpm exec vitest run tests/adversarial` to the end, with coverage off, and paste the counts. Zero failing is the exit condition. Do not report done on a partial directory run.
5. Cold `/clusters`: measure it with `EXPLAIN (ANALYZE, BUFFERS)` on the 125k-file viewer and paste the plan node types. Cut it to <= 300 ms (precomputed per-viewer visibility, or a keyset-limited first page) or state in README, with the measured number, that it is a known limit and tell the lead. Do not leave it undocumented.
6. Run `bash ~/.claude/skills/l8-code/scripts/selfcheck.sh modules/files-view` last, after all other lanes stop, and paste the result.

Adversary (owns `tests/adversarial`):
1. Finish all attacks in phase 1 and hand the builder the full failing-test list (file, test name, observed vs expected) before the builder starts. Do not add tests after the builder starts; if you must, tell the lead so the builder reruns.
2. Add no test that needs more than 20 s or a 100k-row world. Use the small shared fixture.
3. Run all of `tests/adversarial` once after the builder's fixes and paste counts. If a test still fails, report whether the bug is in `src/**` or in the test, with a one-line reason.

Tester (owns `tests/unit`, `tests/integration`, `tests/e2e`):
1. Run, in this order, and paste each exit code: `pnpm --filter @anvesx/files-view typecheck` (after your last edit, since the last typecheck was before deep.test.ts and cache.test.ts), then `pnpm --filter @anvesx/files-view test` end to end with output saved to a file, then tail the "Test Files" line and the coverage table. The 90% thresholds must be met by that command, not by your lane alone.
2. In `tests/integration/paging/keyset.test.ts`, pass the timeout per test (`it(name, fn, 120_000)`), not with `vi.setConfig` inside the describe.
3. `tests/e2e` was not needed (item 17 passes through `tests/integration/browser`). Do not add it. Say in the report that item 17 is covered there, with the pass counts for light and dark.

Scale (owns `tests/scale`):
1. One world for all scale files. Seed the 100k-row world once in a vitest `globalSetup` (or one shared file that the four files import through a single module-level promise), with a free port and a data dir under the OS tmp dir removed in teardown. The four scale files must not each seed. Remove the cross-file lock entirely.
2. Seed budget: the whole scale suite, seed included, finishes in under 8 minutes, and each hook sets an explicit timeout of 300 s. Seed with bulk `COPY` or batched multi-row inserts. If setup fails or times out it throws; a skipped scale test fails the gate.
3. Run `pnpm exec vitest run tests/scale` alone, to the end, with `--reporter=verbose` and the full output saved to a file. Paste the p50/p95 table, the EXPLAIN plan node types, and wall time. Warm p95 <= 300 ms over at least 20 requests after one warm-up, with the cold request timed and printed separately.
4. If your run hangs past 10 minutes, kill it with `TaskStop` or the runner's own timeout. A permission-denied `pkill` is not an excuse; use your own PID.
5. Run selfcheck on `tests/scale` and typecheck, and paste the results.

Lead (not a lane):
- The gate verifier runs, as the item 6 command, `pnpm exec biome check modules/files-view`, and runs repo-wide `pnpm lint` only as informational. Copy this into the gate item text, not only into this file.
- Give the verifier a cap of 15 minutes for the full `pnpm --filter @anvesx/files-view test` with its output saved to a file, so a hang is reported as a failure with a log, not a stop.
- The verifier writes `todo/EVIDENCE.md` from commands it ran itself.

### New rules (all lanes)

1. Phase order: adversary first, builder second, scale and tester third, builder selfcheck fourth, verifier last. A lane never edits after the verifier starts.
2. A shared expensive fixture (more than 10 s to build) is built once per run in `globalSetup`, never once per file. Per-file locks across files are forbidden.
3. Every hook and test that touches a large fixture sets its own explicit timeout; the default is not allowed there.
4. A cache in front of a permission gate must either re-apply the gate on a hit or be proven by a test to be invalidated by revocation and tombstoning.
5. Range filters compare parsed instants, never strings.
6. Any per-request fan-out to a remote source has a stated cap, tested against a counter, in the same episode that adds the fan-out.
7. A lane's "done" report includes the pass and fail counts of the full directory it touches, not a subset, and says what it did not run.
8. The module path is `modules/files-view`; `features/files-view` does not exist. Rules from episodes 1 and 2 still apply.

## Episode 1 (gate 60%)

Failed items: 3, 4, 6, 12, 13. Items 1, 2, 5, 7, 8, 9 to 11, 14 to 19 passed.

### Root causes

- Item 3 (full test command never finished, 21+ min). Scale lane. Episode 3 told it to build one world in `globalSetup` and remove the lock. It did neither: every scale file still seeds its own world, and `fv-scale.lock` still exists. Under load the hooks hit the 180 s timeout, all scale tests were skipped, and the leaked lock blocked later runs. A skipped scale test is a failure.
- Item 3 (5 failures in `tests/adversarial/holes/cache.test.ts`, `.clusters` undefined at line 9). Two causes, both lane process. (a) The builder removed the `/clusters` cache and reported 378 of 378 passing, but the gate saw 5 failures in that file. The builder said late adversary probes kept arriving, so `holes/cache.test.ts` most likely was added or changed after the builder's last full run. That breaks adversary rule 1 (no tests after the builder starts) and builder rule 4 (run the whole directory last). (b) The test reads `.clusters` from a response that is not the cluster list (an error body or a changed shape). Whether the bug is in the test or in `src/**` was never stated. Not yet diagnosed; the next builder must diagnose it first.
- Item 4 (no coverage). Follows from item 3. The tester did obtain coverage (97.95 stmts, 91.86 branches) on unit and integration only, so the thresholds are reachable. The gate command did not finish, so nothing was printed.
- Item 6 (biome exit 1). One extra space at `todo/SPEC.md` line 39. Lead owns that file. The builder was right not to edit it.
- Items 12 and 13 (scale numbers). Builder. It profiled one 100k world as `bob` and did not run `tests/scale`, so it never saw the failures. Its "190 to 230 ms cold" claim is not reproduced (cold distinct viewers p95 1337.5 ms; `/clusters` p95 363 to 1928 ms; limit 300 ms). It also changed `membersSql` so that `cap` is per cluster (lateral), while `tests/scale` still passes the old total cap of 500 for 2000 clusters. That asks for up to 1M member probes: the test "tree member ids" took 2012.9 ms with 458,400 buffer hits. The builder named this risk in its report but the scale lane did not adapt. Deep list pages: `list modified asc deep` 150.2 ms, `list size desc deep` 388.1 ms, `filter modified range (bob)` failed. Those need index-backed keyset plans, not only a new `fv_ts` index. The builder's cap floor of 2 also leaves behaviour above 2000 clusters unmeasured.
- Unverified: `pnpm-lock.yaml` shows 387 added lines nobody claims. Orphan vitest process 39251 is still running.

### Instructions per lane

Lead (before the episode starts):
1. Fix `todo/SPEC.md` line 39 (remove the extra space) and run `pnpm exec biome check modules/files-view`; it must exit 0.
2. Kill vitest PID 39251, delete `/tmp/fv-scale.lock` and the empty `fv-scale-*` directory, then run `git diff --stat pnpm-lock.yaml`. If the lock change is not from an intended dependency edit, `git checkout pnpm-lock.yaml`.
3. Do not start the builder until the adversary has handed over its final failing list and `holes/cache.test.ts` is committed to the worktree.

Adversary:
1. Run `holes/cache.test.ts` against the current `src/**` and state in one line whether the 5 failures come from the test (it assumes a `.clusters` key and the old cache) or from `src/**`. If it is the test, update it to assert the real contract: a revoked or tombstoned file disappears at once on a second request. Assert `res.status === 200` before reading the body.
2. Freeze the test set. Add no test after the builder starts. A new probe goes to the lead, who reruns the builder.
3. Paste the counts for `tests/adversarial` run to the end.

Builder:
1. First, reproduce the 5 `holes/cache.test.ts` failures with `pnpm exec vitest run tests/adversarial/holes/cache.test.ts`. Fix `src/**` if the cause is there. Then run `pnpm exec vitest run tests/unit tests/integration tests/adversarial` last, after the adversary freeze, and paste "Test Files" and "Tests" lines. Do not report 378 passing unless the final run printed it.
2. Run the scale suite yourself once the scale lane has the shared world (see below) and read its p95 table. Do not claim a latency from a private profile world. Targets, taken from the gate: `/clusters` warm p95 <= 300 ms (limit 5, alice and bob), cold distinct viewers p95 <= 300 ms, tree member ids <= 150 ms, deep list `modified asc` and `size desc` p95 <= 150 ms, `filter modified range` p95 <= 150 ms.
3. `/clusters` must be computed from a bounded structure. Do not keep a per-request cost that grows with 2000 clusters times a cap. Paste `EXPLAIN (ANALYZE, BUFFERS)` node types for `membersSql`, the tree query and each failing list query, with buffer hits. A plan must show an index scan with a keyset bound and no sort over the full viewer set. For a deep `size desc` page, add or fix the index so the order matches it. If a target cannot be met, put the measured number and the reason in `README.md` and tell the lead; do not leave it silent.
4. Write the `membersSql` contract (per cluster cap, row bound) in `src/cluster/README.md` and message the scale lane before changing any signature or semantic used by `tests/scale/support/hot.ts`.
5. Run selfcheck last, as before.

Scale lane:
1. Build one shared world in a vitest `globalSetup` and remove `fv-scale.lock` and every use of it. Delete the per-file seeding. Free port, data dir under `os.tmpdir()`, removed in teardown. Check by `rg -n "fv-scale.lock|seed" tests/scale` that only the globalSetup seeds.
2. Match `hot.ts` to the builder's `membersSql` contract: call it with the same per-cluster cap that `describe.ts` uses (`max(2, min(500, floor(3000 / clusters)))`), not a total of 500 for 2000 clusters. Say in the report which arguments you pass.
3. Set an explicit timeout of 300 s on every hook and an explicit timeout on every long test. A skipped test counts as failed; assert `skipped === 0` in the run summary you paste.
4. Run `timeout 600 pnpm exec vitest run tests/scale --reporter=verbose > <file>`. The suite must finish in under 8 minutes including seed. Paste the p50 and p95 table, wall time, and the count of passed, failed and skipped. If it exceeds 600 s, report which test is slow and stop; do not retry in a loop.
5. Own-PID kill only (`TaskStop` or the `timeout` wrapper).

Tester:
1. Run the exact gate command, `pnpm --filter @anvesx/files-view test`, once all other lanes have stopped, with `timeout 900` and output saved to a file. Paste exit code, the "Test Files" and "Tests" lines and the coverage totals. If it does not finish, paste the last 30 lines and the process list for vitest, and name the hung file.
2. Run `tests/adversarial` yourself and include its counts. A report that leaves out a directory the package test command runs is incomplete (rule 7).
3. No new tests unless they fill a gap named by the verifier. Folders `paging`, `listing`, `gate`, `http` are at the 5-file cap; use a new subfolder.

### New rules

9. The lead runs the exact gate commands (`pnpm --filter @anvesx/files-view test`, `pnpm exec biome check modules/files-view`) before the verifier starts, and fixes anything it owns (SPEC.md formatting, stale locks, orphan processes).
10. A latency claim needs a number from `tests/scale` on the shared world, not from a private profile. A claim from any other source is labelled "unverified" in the report.
11. A change of a function's argument meaning (such as `membersSql` cap per cluster) is announced to every lane that calls it, in the same phase, and the callers are updated before the phase ends.
12. A test file added or edited after the builder's final run invalidates that run. The builder reruns the full directory.
13. A process or lock a lane starts is stopped by the same lane before it reports done. The lead checks `ps` and `/tmp` for leftovers before the verifier.

## Episode 2 (gate 55%)

Failed items: 3, 4, 6, 13, and 9-19 not executed (12 touched by real failures; 20 EVIDENCE.md not written). Passed: 1, 2, 5, 7, 8.

### Root causes

- Item 3, scale world (scale lane). `tests/scale/world.test.ts` `beforeAll` timed out at 300 s, so all 61 scale tests were skipped (a skip fails the gate). The seed is too slow under load ~10. Unhandled error `Cannot read properties of null (reading 'port')` at `tests/scale/support/world.ts:14`: `freePort` calls `s.address()` inside the `s.close` callback, where it is null. The old `tests/scale/{cold,db,gated,http}.test.ts` are still present beside `world.test.ts`. The world is in a `beforeAll`, not a `globalSetup`, as episode 3 required.
- Item 3, two failing tests in `tests/adversarial/order/order.test.ts` (builder lane). Both are real `src/**` bugs found by the adversary and left unfixed: (1) `sort=modified` orders by ISO text, not by instant (`src/db/list.ts` `KEY.modified`; fix is `fv_ts` plus a bigint cursor); (2) `q=élan` misses `Élan report` (`COLLATE C ILIKE`). The adversary found them late and the builder had already finished, so nobody owned them. This is a handover failure, not a test fault.
- Item 3 and 6, the builder and tester reports each ran a subset (`unit+integration+adversarial` or `unit+integration`), never the gate command. The tester said so itself. Nobody ran `pnpm --filter @anvesx/files-view test` to the end, so the scale failure and the 2 order failures were first seen by the gate.
- Item 4. Follows from item 3: the run exited before the coverage report. Unit+integration alone measured 98.04 / 91.29 / 97.73 / 99.12, so thresholds are reachable.
- Item 6 (lead). `todo/SPEC.md` line 39 still has 4 leading spaces where biome wants 3. Episode 3 lead instruction 1 and rule 9 were not carried out. The builder and tester both reported it and correctly left the lead-owned file alone. The tester also saw a formatter error in `tests/scale/suites/cold.ts` mid-run that was gone by the gate.
- Item 13. NOT RUN, so there is no p95 table and no EXPLAIN output. The scale lane's own report lists 6 `/clusters` p95 failures above 300 ms (membersSql semi-join over 146k rows). The README cold `/clusters` claim (190 to 230 ms) is still unverified; rule 10 forbids it.
- Leftovers (lead): orphan postgres PIDs 8317 and 8318 (`files-view-pg-*`, 11:18) and 23706 (`fv-scale-jnb5hH`), stale `fv-scale-*` dirs and `fv-scale.lock`. Rule 13 was not enforced.

### Instructions per lane

Lead, before any lane starts:
1. Fix `todo/SPEC.md` line 39 (3 leading spaces). `rm -rf modules/files-view/coverage && pnpm exec biome check modules/files-view` must exit 0; paste the exit code.
2. `ps` for PIDs 8317, 8318, 23706; stop them if their data dirs are not owned by a live lane. `rm -rf $TMPDIR/fv-scale*`. Paste `ps` and `ls $TMPDIR | rg fv-` showing nothing left.
3. Order of phases: scale lane and builder run first and finish; then adversary freeze; then builder reruns the full directory; then tester runs the gate command alone; then the lead runs the gate commands; then the verifier. Write `EVIDENCE.md` (item 20) from the tester's pasted output before the verifier.

Builder:
1. Fix both order holes in `src/**` before anything else, in this order: `sort=modified` ordering by instant (`fv_ts` bigint column or expression, bigint cursor, index matching it, no OFFSET), then `q` matching case-insensitively beyond ASCII (drop `COLLATE C` for the ILIKE, or lower() both sides with a UTF-8 collation). Run `pnpm exec vitest run tests/adversarial/order` and paste "Tests N passed (N)" with 0 failed. Do not edit the test to pass.
2. Fix `/clusters` p95 against the scale lane's shared world: replace the semi-join over 146k rows with a bounded keyset/lateral per-cluster probe. Paste `EXPLAIN (ANALYZE, BUFFERS)` node types and buffer hits for `membersSql`. Target `/clusters` warm and cold p95 <= 300 ms. If missed, README states the measured number; delete the 190-230 ms claim unless a `tests/scale` run reproduces it.
3. Finish by running `pnpm exec vitest run tests/unit tests/integration tests/adversarial` to the end and paste the Test Files and Tests lines. Run selfcheck last.

Scale lane:
1. Fix `freePort`: read `(s.address() as AddressInfo).port` before calling `s.close`, then resolve in the close callback.
2. Make the seed fast: use `COPY` or multi-row batched `INSERT` (at least 5000 rows per statement) in `tests/scale/support/seed.ts`. Paste the seed wall time on this machine; it must be under 120 s at load ~10. Every hook gets an explicit 600_000 ms timeout.
3. Move the world to a vitest `globalSetup` (with `provide`/env for the port) so it is built once. Delete `tests/scale/{cold,db,gated,http}.test.ts` if `suites/` covers them; check with `rg -n "fv-scale.lock|seed" tests/scale` that only the globalSetup seeds.
4. Run `timeout 600 pnpm exec vitest run tests/scale --reporter=verbose` to the end. Paste passed, failed, skipped (skipped must be 0), wall time and the p50/p95 table. Report the 6 failing `/clusters` p95 cases to the builder by name, same phase.
5. Run `biome check --write` on any file you changed, then `pnpm exec biome check modules/files-view/tests/scale`; paste the exit code.
6. Stop every postgres you start; paste `ps` showing none of yours left.

Adversary:
1. Hand the two failing tests to the lead as a final list now; add no further test after the builder starts. A new probe goes to the lead.
2. Write each hole report with the exact file, the line and the failing assertion text, so the builder can fix without rereading the test.

Tester:
1. Run the exact gate command `timeout 900 pnpm --filter @anvesx/files-view test > <file> 2>&1` once, after all other lanes have stopped. Paste exit code, "Test Files", "Tests" (with skipped count), "Errors" and the coverage totals. A subset run does not count as your report.
2. If it exits non-zero, name the failing file and the lane that owns it, and message that lane; do not edit `src/**` or another lane's tests.

### New rules

14. The builder, tester and verifier each run the exact gate command or say "NOT RUN: gate command" in the report. A report that only covers a subset is incomplete.
15. A late adversary finding is assigned to the builder in the same episode. The lead restarts the builder after the freeze; a hole with no owner counts as a lead failure.
16. Skipped, timed-out hooks and unhandled errors are failures. Any `afterAll`, `beforeAll`, or `globalSetup` seed has an explicit timeout and is measured; if the seed exceeds 120 s, fix its speed instead of raising the timeout.
17. Helper code that reads a socket address does so before `close`. A scale helper is run once alone (`vitest run tests/scale`) before the lane reports done.
