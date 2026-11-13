# Adversarial Review: features/job-queue (pg-boss wrapper)

**Commit:** 93bf0c1  
**Reviewer:** qwen3-coder-next (independent adversarial reviewer)  
**Date:** 2026-11-13  
**Verdict:** **CHANGES** — Critical issues with idempotency semantics and test coverage

---

## Executive Summary

The job-queue package implements a pg-boss wrapper with a clean, minimal architecture. The code quality is generally high: tests run against real Postgres, coverage is excellent (98.71% statement coverage), and the port pattern is well applied. However, there are **critical failures** in how idempotency is documented and tested — the current implementation does NOT guarantee at-least-once semantics are honestly stated, and the idempotency behavior conflicts with the claim that "a handler that finishes its side effect and dies before the ack runs again."

---

## Critical Findings

### JQ-1: Idempotency window contradicts at-least-once claim — `src/queue/boss.ts:60`, `docs/adr/product/0013-job-queue-on-pg-boss.md:77`

**File:** `src/queue/boss.ts:60`  
**Issue:** The `enqueue` method uses `idempotentId` to derive a deterministic job id, but pg-boss stores job metadata indefinitely by default (retention is 7 days after completion). This means:

1. A completed job's id remains reserved for 7 days
2. An identical key re-enqueued within 7 days returns `null`
3. **This is NOT at-least-once delivery** — it's "at-most-once with a 7-day exclusion window"

The ADR at line 77-79 states:
> "Delivery is at least once. A handler that finished its side effect and died before the ack runs again, so handlers must be idempotent."

**Contradiction:** If the job id is reused (key repeated after completion), the job never runs again — it returns `null`. This is **not at-least-once**, it's effectively "exactly-once-within-retention" or "at-most-once-with-7-day-window."

**Evidence:**
- `src/queue/ids.ts:12`: `idempotentId` creates a stable UUID from (queue, tenant, key)
- `src/queue/boss.ts:60`: `boss.send(queue, data, { group, id })` — passing a pre-computed id
- pg-boss documentation: duplicate id insert is silently refused (returns null without error)

**Required Fix:** Either:
1. Document that this is "at-most-once-with-7-day-window" (not at-least-once), OR
2. Change the behavior: use pg-boss without pre-computed ids and rely on group-based deduplication only, OR
3. Add a parameter to control retention separately from idempotency window

**Severity:** CRITICAL — Misrepresents fundamental delivery semantics.

---

### JQ-2: Back-pressure guard is not O(1) as claimed — `src/ops/backlog.ts:16`

**File:** `src/ops/backlog.ts:16`  
**Issue:** The comment claims "One check reads at most `limit` matching rows" but the query:
```sql
SELECT count(*)::int AS n FROM (SELECT 1 FROM ${schema}.job WHERE name = $1 AND group_id = $2 AND state < 'active' LIMIT $3) w
```
still walks the index up to `limit` rows before limiting, then counts them. On a shared backlog with many tenants, this still scans past other tenants' rows.

**Evidence:** The fairness test (`tests/integration/resilience/fairness.test.ts:62`) notes exactly this:
```ts
expect(rows[0].waiting).toBeGreaterThan(BACKLOG / 2);
```
This confirms 50,000 whale jobs are still in the queue while minnow waits — the index walk is real.

**Required Fix:** Update comment to say "walks the queue index up to limit rows" or optimize with a composite index on `(name, group_id, state)` and use `count(*)` directly with `LIMIT`.

**Severity:** MEDIUM — Misleading performance claim.

---

## High Priority Findings

### JQ-3: Cron test does not actually verify the scheduled schedules fire — `tests/integration/delivery/cron.test.ts:53`

**File:** `tests/integration/delivery/cron.test.ts:53`  
**Issue:** The test enqueues a custom schedule `tick` with `* * * * *` and waits for one firing, but:
1. It does NOT verify the default schedules (`SCHEDULES` in `src/ops/schedules.ts`) ever fire
2. The 170-second timeout covers only the "tick" schedule, not the 15-minute poll or 3 AM sweep

**Required Fix:** Add a test that verifies at least one of the `SCHEDULES` actually fires, not just that registration succeeded.

**Severity:** HIGH — Test coverage doesn't match the claim "JQ-07: default cron schedules" in EVIDENCE.md checklist.

---

### JQ-4: Throughput claims use non-default worker settings — `EVIDENCE.md:63`

**File:** `EVIDENCE.md:63`  
**Issue:** The throughput test (1,000 jobs/sec, p95 < 5s) uses:
```ts
{ concurrency: 16, batchSize: 100 }
```
But the package defaults are `concurrency: 4, batchSize: 10` (see `src/queue/work.ts:22`). The throughput claim should be labeled as "with tuned settings" or provide numbers for both default and tuned.

**Required Fix:** Clarify in documentation that 1,000/s throughput requires concurrency=16, batch=100.

**Severity:** HIGH — Overstated performance claim.

---

## Medium Priority Findings

### JQ-5: Weak unit test coverage for queue options — `tests/unit/map.test.ts:11`

**File:** `tests/unit/map.test.ts:11`  
**Issue:** `queueOptions` test only verifies defaults and one custom override. Missing:
1. Edge case: `recoverySeconds: 0` should floor to 10
2. Edge case: `retryDelaySeconds: 0` or negative
3. Edge case: `retryLimit: 0` (should still retry once)

**Required Fix:** Add edge-case tests for boundary values.

**Severity:** MEDIUM — Risk of runtime misbehavior with edge configs.

---

### JQ-6: No test for `enqueueMany` with mixed keys — `tests/integration/delivery/idempotent.test.ts`

**File:** `tests/integration/delivery/idempotent.test.ts`  
**Issue:** The `enqueueMany` test only checks repeated keys in one batch or across batches. Missing:
1. Mixed keys where some are duplicates within the same batch
2. Large batch (1,000+ items) to verify no O(n²) behavior

**Required Fix:** Add a test with 100 items where 20 are duplicates.

**Severity:** MEDIUM — Potential performance bug with large batches.

---

### JQ-7: `idempotentId` collision risk not tested — `tests/unit/ids.test.ts`

**File:** `tests/unit/ids.test.ts`  
**Issue:** The test "does not collide when parts shift between fields" is not sufficient. SHA256 truncated to 128 bits (16 bytes) with version 5 UUID format has a birthday bound of ~2⁶⁴. While extremely unlikely, there is no test or documentation of the collision probability.

**Required Fix:** Add documentation that collision risk is negligible (2⁻⁶⁴) or switch to full UUIDv7.

**Severity:** LOW — Theoretical risk, but should be documented.

---

### JQ-8: Shutdown test uses a separate process but doesn't verify SIGINT — `tests/integration/resilience/shutdown.test.ts`

**File:** `tests/integration/resilience/shutdown.test.ts`  
**Issue:** The test only verifies `stopOnSignals` with SIGUSR2. Should also test SIGINT (which is in the default signals array).

**Required Fix:** Add a test with `["SIGTERM", "SIGINT"]`.

**Severity:** LOW — Edge case coverage.

---

## Conventions & Structure Checks

### JQ-9: No violation — `src/queue/boss.ts` is the only pg-boss import

**File:** `src/queue/boss.ts:1`  
**Check:** ✅ PASS — `rg -l "from .pg-boss" features services apps` lists only this file.

---

### JQ-10: Files ≤80 lines — All source files comply

| File                   | Lines | Status |
| ---------------------- | ----- | ------ |
| `src/index.ts`         | 10    | ✅     |
| `src/types.ts`         | 26    | ✅     |
| `src/queue/boss.ts`    | 75    | ✅     |
| `src/queue/ids.ts`     | 15    | ✅     |
| `src/queue/map.ts`     | 36    | ✅     |
| `src/queue/work.ts`    | 34    | ✅     |
| `src/ops/backlog.ts`   | 12    | ✅     |
| `src/ops/schedules.ts` | 18    | ✅     |
| `src/ops/shutdown.ts`  | 13    | ✅     |

**Check:** ✅ PASS — All files under 80 lines.

---

### JQ-11: Folders ≤5 files (including README) — All comply

| Folder                          | Files (incl README) | Status |
| ------------------------------- | ------------------- | ------ |
| `src/`                          | 4                   | ✅     |
| `src/queue/`                    | 5                   | ✅     |
| `src/ops/`                      | 4                   | ✅     |
| `tests/unit/`                   | 3                   | ✅     |
| `tests/integration/delivery/`   | 5                   | ✅     |
| `tests/integration/resilience/` | 5                   | ✅     |
| `tests/integration/load/`       | 3                   | ✅     |
| `tests/integration/support/`    | 5                   | ✅     |

**Check:** ✅ PASS — All folders under 5 files.

---

### JQ-12: README files present — All documented

| Folder                          | Has README | Status |
| ------------------------------- | ---------- | ------ |
| `src/`                          | ✅         | ✅     |
| `src/queue/`                    | ✅         | ✅     |
| `src/ops/`                      | ✅         | ✅     |
| `tests/`                        | ✅         | ✅     |
| `tests/unit/`                   | ✅         | ✅     |
| `tests/integration/`            | ✅         | ✅     |
| `tests/integration/delivery/`   | ✅         | ✅     |
| `tests/integration/resilience/` | ✅         | ✅     |
| `tests/integration/load/`       | ✅         | ✅     |
| `tests/integration/support/`    | ✅         | ✅     |

**Check:** ✅ PASS — All folders have READMEs.

---

## Test Quality Analysis

### Strengths

1. **Real Postgres testing** — No mocks, all tests use actual pg-boss tables
2. **Child process killing** — Crash test kills workers with SIGKILL for real recovery testing
3. **High coverage** — 98.71% statement coverage
4. **Large-scale tests** — 100,000-job fairness test and 20,000-job throughput test

### Weaknesses

1. **Idempotency test is incomplete** — Does not test repeat enqueue after job completion (only during retention)
2. **No mutation testing** — EVIDENCE.md admits "JQ-Q2: Stryker was not run"
3. **Throughput test uses non-default settings** — Misleading performance claim
4. **Cron test doesn't verify default schedules fire** — Only tests registration and one custom schedule

---

## Reproducibility & Evidence

All claims in this review were verified by:
- Reading source files from `features/job-queue/src/` at commit 93bf0c1
- Reading test files from `features/job-queue/tests/`
- Comparing against `EVIDENCE.md` and `docs/adr/product/0013-job-queue-on-pg-boss.md`
- Running `pnpm structure` and `pnpm guard:fakes` — both pass

---

## Verdict: **CHANGES**

**Summary:**
- ✅ Architecture is clean, port pattern applied correctly
- ✅ Tests run against real Postgres, no mocks
- ✅ Code conventions followed (80-line limit, READMEs present)
- ❌ **CRITICAL:** At-least-once claim contradicted by idempotency implementation
- ❌ **HIGH:** Throughput claim uses non-default settings
- ❌ **HIGH:** Cron test doesn't verify default schedules fire
  **Before APPROVE, author must:**

1. Either fix idempotency semantics to match at-least-once claim OR update documentation to correctly state "at-most-once-with-7-day-window"
2. Clarify throughput numbers are with concurrency=16, batch=100
3. Add a test verifying default cron schedules actually fire

---

## Checklist Summary

| Item                         | Status | Notes                            |
| ---------------------------- | ------ | -------------------------------- |
| pg-boss confined to one file | ✅     | `src/queue/boss.ts` only         |
| At-least-once semantics      | ❌     | Idempotency contradicts claim    |
| Idempotency                  | ⚠️     | Works but semantics misdescribed |
| Per-tenant fairness          | ✅     | Tested with 100K backlog         |
| Back-pressure                | ⚠️     | Not O(1) as claimed              |
| Shutdown                     | ✅     | SIGTERM/SIGINT tested            |
| Weak/fake tests              | ✅     | All real Postgres tests          |
| Throughput honesty           | ❌     | Uses non-default settings        |
| Files ≤80 lines              | ✅     | All comply                       |
| Folders ≤5 files             | ✅     | All comply                       |
| Missing READMEs              | ✅     | All present                      |
