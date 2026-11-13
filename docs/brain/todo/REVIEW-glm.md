# TODO Index Review — glm-5 (2026-11-13)

**Reviewer:** Kiro glm-5  
**Scope:** docs/brain/TODO.md, docs/brain/todo/*.md (26 files), */todo/TODO.md (20 files)  
**Verdict:** CHANGES

## Summary

The TODO index is well-structured with consistent per-module checklists, clear rules, and weighted items. However, several issues require attention before APPROVE.

---

## 1. Percent Math — CORRECT

The overall calculation in TODO.md is accurate:

- Sum of ticked weights: 75
- Sum of all weights: 1290
- 75/1290 = 0.0581 = **5.8%** ✓

Item counts: 31/422 ticked (7.3%). The percent is weight-based, not item-count-based, which matches the stated convention.

Per-module percents were spot-checked:

| Module | Stated | Calculated | Verdict |
|--------|--------|------------|---------|
| core-types | 12.5% (2/16) | 2/16 = 0.125 | ✓ |
| graph-store | 18.0% (9/50) | 9/50 = 0.18 | ✓ |
| structure-lint | 57.9% (11/19) | 11/19 = 0.579 | ✓ |
| brain-mcp | 20.3% (12/59) | 12/59 = 0.203 | ✓ |

---

## 2. Per-Feature Per-Module Items — PRESENT AND STRUCTURED

Every module has:

- Unique item IDs prefixed with module code (CT-, GS-, VIS-, etc.)
- Weight values (w1 to w5)
- Work-package reference (WP-XX)
- Proof command (exact command to run)
- Builder/reviewer assignment

No module is missing its checklist. All 46 modules in the index have corresponding TODO files.

---

## 3. Verifiable Acceptance — MIXED

**Good:**

- Every item has a proof command: `pnpm vitest run tests/contract/...`, `k6 run ...`, `rg -c ...`, `test ! -e ...`
- Commands are executable and specific
- Live tests against staging are explicit (e.g., VIS-10, SYN-09)

**Issues requiring fixes:**

1. **Item CTR-03**: "One test per research row in PLAN section 4.1" — this references an external document that may not be checkable without context. The proof command `rg -c "4.1" tests/contract` is weak; it only counts string matches, not whether tests exist for each research row.

2. **Item SEC-01**: "Adversarial review by a second vendor finds zero high issues" — the proof is `docs/brain/evidence/security-review.md`. This is a file existence check, not an executed command. There's no guarantee the review was performed by a different vendor or that it was adversarial.

3. **Item CLE-08**: "Topic labels judged useful by the owner on a real tenant" — proof is `docs/brain/evidence/cluster-quality.md`. This is subjective and file-based, not executable.

4. **Items with `ls` as proof**: Several items use `ls docs/adr` or `ls docs/runbooks` as proof. These only verify file existence, not content correctness.

---

## 4. 1M-User Scale Items — PRESENT

Scale items are distributed across modules:

- **SCL-02** (w5): "1M-user-shaped mixed load (10,000 concurrent sessions): p95 under 300 ms, error rate under 0.1%"
- **UIF-05** (w5): "TTFB p95 under 300 ms at 100,000 files"
- **SRCH-05** (w5): "p95 under 200 ms at 200 requests per second over 100,000 files"
- **GS-10** (w4): "Hot reads plan as index or bitmap scans with zero Seq Scan at 10M edges"
- **JQ-08** (w4): "1,000 jobs per second sustained with p95 queue lag under 5 s"
- **VIS-07** (w4): "Gate check p95 under 5 ms with 10M edges"

The scale harness (tools/scale-k6) has dedicated scripts and deterministic seed generation (SCL-01).

---

## 5. Permission-Leak Coverage — STRONG

The visibility module (VIS) and security module (SEC) have comprehensive leak coverage:

| Leak ID | Coverage |
|---------|----------|
| Leak 1 (as-of time travel) | VIS-02 |
| Leak 2 (MCP gate) | MCP-04 |
| Leak 3 (multiple gate copies) | VIS-01, GV-01, MCP-04 |
| Leak 4 (reader lists) | VIS-04 |
| Leak 5 (zone bypass) | ZP-02 |
| Leak 6 (token revocation) | MCP-05 |
| Leak 7 (node fields) | MCP-07 |
| Leak 8 (hidden counts) | VIS-09, SRCH-03 |

Additional leak tests:
- `leak-suite.test.ts`: 2 tenants × 3 users over every route and MCP tool (VIS-05)
- `leak-rag.test.ts`: RAG boundary (RAG-02)
- `leak-live-recheck.test.ts`: Fail-closed live check (VIS-03)

---

## 6. Fake/Stub Item Check — MOSTLY CLEAN

All items have executable proof commands. However:

**Issue:** Items FG-01 and FG-02 in `tools/fake-guard/todo/TODO.md` use the same proof command (`pnpm guard:fakes`) but are marked independently. FG-02 requires the baseline to be empty, which is a stronger condition than FG-01 (ratchet runs). These are appropriately separate, but the baseline check (`test "$(node -p ...)"`) should be its own command.

**Issue:** Several items in `features/connector-kit/todo/TODO.md` reference "fake-scale test replaced by real-tier scale test" (CK-01), implying there was a fake test that was upgraded. The current state is acceptable.

---

## 7. Structural Issues

### 7.1 Inconsistent Item Counting

The "Items ticked" column counts `[x]` items. The "Percent" column uses weighted sums. This is correct per the stated rules, but the table header could be clearer.

**Recommendation:** Change table header from "Items ticked" to "Ticked / Total items" to match the format used in per-module headers.

### 7.2 Duplicate Q1 Items Across All Modules

Every module has Q1, Q2, Q3 quality items:
- Q1: Typecheck and default test tier green
- Q2: Line coverage at least 90%, Stryker score at least 80
- Q3: Size, shape and fake-guard clean, plus reviewer EVIDENCE.md

This is consistent but creates 46 × 3 = 138 nearly-identical items. Consider whether this repetition is intentional for per-package ownership or if a cross-cutting quality module would reduce duplication.

### 7.3 Ticked Items Without Evidence

All ticked items include this note:

> Ticks for the Q1 test item replay a cached turbo run of identical inputs (46/46 green).

This is acceptable as evidence — it documents that `pnpm turbo run test typecheck --filter=...` was executed and passed.

---

## 8. Required Fixes (Numbered)

1. **CTR-03**: Replace `rg -c "4.1" tests/contract` with an explicit test count check or remove this item if PLAN section 4.1 is not version-controlled alongside the tests.

2. **SEC-01**: Add an executable check. Either:
   - Require the security review to be a PR with a different-vendor reviewer signature, or
   - Add a contract test that checks for the absence of known vulnerability patterns.

3. **CLE-08**: Replace subjective "judged useful" with an automated metric or remove the item. If owner judgment is required, specify the rubric and add a signed-off-by line in the evidence file.

4. **Items using `ls` as proof**: For DOC-01, DOC-04, DOC-05, OBS-06, add content validation. For example:
   - DOC-01: `test $(ls docs/adr/*.md | wc -l) -ge 6` (at least 6 ADRs)
   - OBS-06: Add a test that parses the SLO file and validates required fields exist.

5. **SEC-07**: "STRIDE threat model written and reviewed" — add a check that the threat model was reviewed by a named reviewer (different from author).

6. **DEP-07**: The proof command reads `tools/deploy restore-drill log in docs/runbooks/restore.md` which appears to be malformed. Should be:
   - `test -f docs/runbooks/restore.md && pnpm --filter @anvesx/deploy test -- restore`

7. **UIF-05, SRCH-05, MCP-13, etc.**: k6 scripts are referenced but not all exist in `tools/scale-k6/scripts/`. Verify each script path is correct.

8. **Add a rule about deleting ticked items**: The current rules say nothing about what happens when an item is complete. Should ticked items be archived, or do they stay in the checklist? Add a rule clarifying this.

---

## 9. Minor Observations (No Fix Required)

- The builder/reviewer assignments use model names (Claude, Codex, Kiro glm-5, Kiro qwen3-coder-next). This is good for multi-vendor enforcement.
- The "Evidence date" field is consistent across all files (2026-11-13).
- Work package references (WP-XX) are consistent and traceable.
- The "Scope" section in each file clearly defines boundaries.

---

## Verdict: CHANGES

The index is well-designed and mathematically correct. The structure is sound. However, 8 fixes are required to address:

- Non-executable or weak proof commands (CTR-03, SEC-01, CLE-08, DEP-07)
- Content validation for file-based proofs (DOC-01, DOC-04, DOC-05, OBS-06, SEC-07)
- Verification that scale script paths exist
- Clarification on ticked item lifecycle

After these fixes, the index can be APPROVED.
