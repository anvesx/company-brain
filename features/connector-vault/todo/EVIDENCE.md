# WP-14 evidence: @anvesx/connector-vault

Location: features/connector-vault/todo/EVIDENCE.md (package root is at its 5-file limit).
Branch wp/14-connector-vault. Package: features/connector-vault. Builder: Claude mid-engineer. Reviewer: other vendor.

## Reproduce
```
features/connector-vault/tests/support/pg-temp.sh      # Postgres 16, port 55438, temp dir, LC_ALL=en_US.UTF-8
export NODE_AUTH_TOKEN=x DATABASE_URL=postgres://postgres@127.0.0.1:55438/postgres LC_ALL=en_US.UTF-8
pnpm install && pnpm --filter @anvesx/connector-vault test    # 14 files, 65 tests, exit 0
pnpm --filter @anvesx/connector-vault typecheck               # exit 0
pnpm structure && pnpm guard:fakes                            # exit 0
cd features/connector-vault && pnpm exec stryker run          # score 83.03, break 80
```

## Results (real output)
Tests: `Test Files 14 passed (14)`, `Tests 65 passed (65)` (Postgres 16 on port 55440).
Coverage: Statements 98.96, Branches 97.32, Functions 95.55, Lines 100 (threshold 90).
Mutation: 83.03 was measured BEFORE the review fixes (commit 73594db); NOT rerun after them.
structure: `checked 24 packages, 1188 files, 332 folders`. guard:fakes: `4 findings, 1 baselined`, same count before and after this package (baseline untouched).

## What is covered (all on real Postgres 16, real HTTP token endpoint, no mocks)
Seal with row id as AAD (moved ciphertext fails); keyring with first-key-seals and BRAIN_AUTH_SECRET separation; RLS as a non-superuser role
(wrong tenant reads 0 rows, cross-tenant write refused, insert with foreign tenant refused); rotate in batches then old key rejected;
disconnect in one transaction with a caller write (rollback keeps row); error dumps contain no token or key; refresh rotation,
invalid_grant/invalid_client -> needs-auth, 5xx/429/network/200-without-token -> retry then stays active; five concurrent replicas
spend the refresh token once; lease expiry; sweep with keyset paging; import dry run and count check (trigger drops row -> COUNT_MISMATCH);
EXPLAIN shows the partial index `connector_tokens_due` on 20k rows.

## NOT done
- Old stacks are NOT removed. `apps/connections` (sqlite accounts, crypto.ts), `features/identity` seal.ts and `services/token-refresh` still exist and pass their tests.
  Reason: swapping them touches apps/connections routes plus `apps/brain` readers and about 25 test files; left for the wiring WP (see todo/TODO.md).
- The plaintext token file command (`write-token-file.ts`, `rewrite.ts`, `BRAIN_USER_TOKENS_FILE` in apps/brain) is NOT deleted, same reason. The sync runner still reads that file.
  VLT-01 (`rg -l aes-256-gcm` equals 1 file) therefore fails today: 3 files hold the cipher.
- Not built: DATABASE boot check that wires `loadKeyring(env, BRAIN_AUTH_SECRET)` into the app start (function exists and is tested; no app calls it yet).
- Not run: k6 / 1M-user load; only the 20k-row EXPLAIN. `pnpm --filter @anvesx/brain-app build` not needed.
- Not done: the `tests/contract/vault-*.test.ts` files named in the checklist do not exist in this branch; the equivalent tests are under features/connector-vault/tests.
- Tick no VLT item as done until the reviewer reruns the commands.

## Review-fix round (REVIEW-glm.md, findings 1-6, 8-10)
Each fix has a test that failed against the old source (14 failed / 51 passed) and passes now: GRANT quotes the role as an identifier
(role with a double quote); migrate rejects superuser or BYPASSRLS roles (UNSAFE_ROLE); put validates id (BAD_ID); decodeKey asserts 32 bytes;
seal throws KEY_EXHAUSTED at an injectable per-key limit (default 2^32); `audit` callback fires on sweeper transactions only;
lease-crash tradeoff and RFC 6749 DEAD set documented. Rejected: finding 7 (GCM tag check is constant-time) and 11 (node:crypto is the stable library).
Not covered: the seal counter is per process, so it resets on restart and is not summed across replicas; a real 2^32 run is not attempted
(limit injected at 2); the audit event has no caller identity or operation name; the DEAD set is documented but not configurable;
finding 6 (token in error text) was not changed; Stryker not rerun.
