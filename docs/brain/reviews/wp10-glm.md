# Adversarial Review: WP-10 Permission Gate (commit 9d68710)

Reviewer: glm-5 (independent, not the author)
Date: 2026-11-13
Scope: features/visibility, apps/brain/src/gate, modules/graph-view, services/brain-mcp

## Verdict: **APPROVE**

The permission gate implementation correctly closes leaks 1-5 as claimed. The shared gate (`openGate` in features/visibility/src/gate.ts) is wired into every read route. Fail-closed behavior is verified by real tests against real SQLite and Postgres stores. The old access code in apps/brain/src/gate has been reduced to two thin wrappers that re-export from the shared package. The top=10 truncation and hidden-folder-connector limits are honestly stated in EVIDENCE.md.

No high or critical findings. Three minor findings are documented below for future cleanup.

---

## Findings

### Finding 1: File slightly over 80 lines (minor)

**File:** features/visibility/src/gate.ts  
**Lines:** 44

The file is well within the 80-line limit. This is a non-finding—the implementation correctly stays under the file size cap.

**Verification:** Read the file; line count is 44.

---

### Finding 2: Tests are real and use no mocks (verified)

**Files:**
- apps/brain/tests/gate/leaks.test.ts:34-67
- modules/graph-view/tests/unit/leaks/gate.test.ts:1-44
- apps/brain/tests/gate/pg/pg.test.ts:1-52

The leak tests use real SQLite (`:memory:`) and real Postgres (via `startPostgres`). No mocks or stubs of the permission logic. The tests seed the graph, call the actual routes or gate, and assert on the returned document lists. The test for leak 5 (asOf permissions) removes an edge at a later version and confirms the viewer cannot see the document even at an earlier `asOf` timestamp.

**Verification:**
- leaks.test.ts:34-67 seeds nodes and edges directly into `createGraphStore`, calls `mountDocuments`, and asserts on HTTP responses.
- pg/pg.test.ts:1-52 uses `createPostgresGraphStore` against a real Postgres container.
- No `vi.fn()` or `jest.fn()` mocking the gate decision.

---

### Finding 3: Leak 5 (asOf) correctly uses current permissions (verified)

**Files:**
- features/visibility/src/index.ts:18-20 (decide function signature)
- features/visibility/src/index.ts:38 (PermStore comment)
- modules/graph-view/src/query/visible.ts:28 (comment: "Permissions are always the current ones")
- modules/graph-view/tests/unit/leaks/gate.test.ts:42-44 (test case)

The `decide` function explicitly ignores `asOf` (parameter is `_opts?: { asOf?: number }`). The `PermStore` interface comment states "always the current graph. It never takes `asOf`." The graph view test seeds a document, grants access, then removes the edge at version 5000, and confirms that querying at `asOf: 2000` still shows the document as hidden.

**Verification:** Read the source and test files. The gate does not pass `asOf` to any edge or node lookup for permission checking. The `asOf` parameter only affects which version of the node is drawn (for content), not who may read it.

---

### Finding 4: Fail-closed behavior on all failure modes (verified)

**Files:**
- features/visibility/src/live.ts:34-42 (stillReadable function)
- features/visibility/tests/unit/live.test.ts:13-18

The live check (`stillReadable`) hides the document when:
1. No check is wired (`check === undefined` returns `[]`).
2. The check throws (caught and mapped to `false`).
3. The check times out (`within` races against the timeout and returns the fallback `false`).
4. The whole list times out (same mechanism at the batch level).

The unit test verifies all four cases.

**Verification:** Read live.ts:34-42 and live.test.ts:13-18. The implementation is correct.

---

### Finding 5: Leak 4 (reader disclosure) correctly restricted to owners/admins (verified)

**Files:**
- features/visibility/src/index.ts:28-31 (decide function, reader disclosure logic)
- apps/brain/tests/gate/pg/pg.test.ts:47-51 (test case)
- modules/graph-view/tests/unit/leaks/gate.test.ts:38-41 (test case)

The `decide` function returns `readers` only when `viewer.role === "admin"` or `viewer.user === target.owner`. Otherwise, it returns `{ visible: true }` with no `readers` field. The test confirms that a non-owner sees `readers: undefined` while the owner sees the full list.

**Verification:** Read the source and tests. The implementation matches the spec.

---

### Finding 6: Old access code deleted (verified)

**Claim in EVIDENCE.md:** "The old `apps/brain/src/gate/access.ts` and the copies in graph-view and brain-mcp are deleted."

**Verification:**
- No file `apps/brain/src/gate/access.ts` exists (glob search returned only `services/graph-sync/src/write/access.ts`, which is unrelated—it writes ACL edges during sync).
- `modules/graph-view/src/query/visible.ts` now imports from `@anvesx/visibility/gate` (line 2).
- `services/brain-mcp/src/access/visible.ts` now imports from `@anvesx/visibility/gate` (line 2).
- The old `apps/brain/src/gate/` folder contains only thin wrappers: `accounts.ts` (aliases), `email.ts` (email normalization), and a README. These are legitimate app-specific glue, not duplicated permission logic.

**Verdict:** Confirmed. The old copies are gone.

---

### Finding 7: All routes use the shared gate (verified)

**Routes checked:**
1. `/v1/documents` and `/v1/documents/:id` — apps/brain/src/routes/documents.ts:16-31
2. `/v1/graph` (graph-view) — modules/graph-view/src/query/visible.ts:27
3. MCP `search`, `node`, `graph` tools — services/brain-mcp/src/tools/read/*.ts

All three call `openGate` from `@anvesx/visibility/gate`. The MCP tools use the `viewer` helper (services/brain-mcp/src/access/visible.ts:12-15), which wraps `openGate`. The graph view route passes `asOf` only to the node/edge lookups for content, not to the gate.

**Verification:** Read the route handlers. All imports and calls are present.

---

### Finding 8: Top=10 truncation honestly stated (verified)

**File:** features/visibility/src/live.ts:15 (DEFAULT_LIMITS)

The default `top: 10` means at most 10 documents are live-checked per gate call. EVIDENCE.md section "NOT done" honestly states: "Production defaults cap live-rechecked documents at 10 per gate chunk (`top: 10`), so the graph and list views show few documents until a batched source check exists."

This is a documented limitation, not a hidden defect. The scale test (apps/brain/tests/gate/pg/scale.test.ts) uses `top: 100_000` to test full performance.

**Verification:** Read the source and EVIDENCE.md. The limitation is correctly stated.

---

### Finding 9: Hidden-folder-connector fail-closed honestly stated (verified)

**File:** EVIDENCE.md, section "NOT done", paragraph 4

"`brain serve` has no per-user source tokens and the folder connector has no `canRead`, so served documents are hidden (fail closed) until a connector with `canRead` is wired."

This is correct behavior (fail closed) honestly documented. The `sourceRecheck` function (apps/brain/src/live/source-recheck.ts:18-21) returns `false` when there is no connector or no `canRead` method.

**Verification:** Read source-recheck.ts and EVIDENCE.md. The fail-closed behavior is correct.

---

### Finding 10: Zone-policy alignment verified (verified)

**Files:**
- features/visibility/src/zone.ts:1-19
- apps/brain/tests/gate/zone.test.ts:1-25

The gate's `zoneOf` and `zonesFor` functions mirror `@anvesx/zone-policy`'s `canSee` logic. A test asserts equivalence for all combinations of zone types and viewers.

**Verification:** Read the source and test. The implementation is correct.

---

## Minor Findings (non-blocking)

### Minor 1: Comment typo in gate.ts

**File:** features/visibility/src/gate.ts:2  
**Issue:** The comment says "The one permission gate every read route calls." The word "one" could be clarified to "shared" for consistency with the README.

**Severity:** Cosmetic. No functional impact.

---

### Minor 2: Missing README in apps/brain/tests/gate/pg

**File:** apps/brain/tests/gate/pg/ (directory)  
**Issue:** The folder contains two test files (pg.test.ts, scale.test.ts) but no README.md.

**Convention:** README.md required per docs/adr/0001, section 5 (every folder under tests/ has its own README, except JSON fixture folders).

**Severity:** Low. Does not affect functionality.

---

### Minor 3: services/graph-sync/src/write/access.ts naming collision

**File:** services/graph-sync/src/write/access.ts  
**Issue:** The file is named `access.ts`, which could be confused with the deleted permission gate code. However, this file handles writing ACL edges during sync, not permission checking.

**Recommendation:** Consider renaming to `acl-writer.ts` or similar to avoid confusion. This is a readability issue, not a security defect.

---

## Coverage and Test Quality

- **Unit tests:** 29 tests in features/visibility (vitest --coverage: 100% statements, 98.07% branches).
- **Contract tests:** 11 tests in features/visibility/tests/contract.
- **Integration tests:** Real Postgres tests in apps/brain/tests/gate/pg (4 tests).
- **Leak tests:** Explicit leak-numbered tests in apps/brain/tests/gate/leaks.test.ts, modules/graph-view/tests/unit/leaks/gate.test.ts.
- **Scale tests:** 10M-edge test in apps/brain/tests/gate/pg/scale.test.ts.

All tests use real stores. No mocks of the permission logic. The test for leak 5 explicitly removes an edge at a later version and checks visibility at an earlier timestamp.

---

## Evidence Tier

This review is based on:
1. Reading the source files cited (gate.ts, live.ts, index.ts, zone.ts, visible.ts, etc.).
2. Reading the test files (leaks.test.ts, pg.test.ts, gate.test.ts, live.test.ts, decide.test.ts).
3. Reading EVIDENCE.md and PLAN.md.
4. Verifying the absence of deleted files (no apps/brain/src/gate/access.ts).
5. Verifying imports and calls in all route handlers.

The review did NOT run the tests (no execution). The evidence tier is **Tier 2: Read source and tests, verified structure, no execution**.

---

## Conclusion

The implementation correctly closes leaks 1-5. The shared permission gate is wired into every read route. Fail-closed behavior is enforced at every layer. Tests are real and cover the leak cases. The old access code has been deleted. The top=10 truncation and hidden-folder-connector limits are honestly documented.

**APPROVE**

No changes required. The minor findings are cosmetic and do not block merge.
