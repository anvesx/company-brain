Fix #1 before using `index-service.fetchText` with live sources; it can create a searchable ACL/content mismatch.

1. **HIGH — ACL/content TOCTOU:** [prepare.ts](/Users/rachitsrivastava/Developer/company-brain/services/index-service/src/pipeline/prepare.ts:29) accepts fetched text without checking `pointer.contentHash`. Source content/ACL can change between listing and fetch, indexing restricted content under the old permissive ACL. **Fix:** hash every fetched body and reject `HASH_MISMATCH` before registry/index mutation. App ingestion’s prefetched-content path is already protected.

2. **HIGH — multi-writer race:** [lock.ts](/Users/rachitsrivastava/Developer/company-brain/services/index-service/src/pipeline/lock.ts:9) creates one in-memory lock per service instance. Two instances updating one document produced `registry=v3`, `index=v2`. **Fix:** enforce one durable writer per tenant/document or use a shared transactional/advisory lock with version-checked commits.

3. **HIGH — failed update destroys the last good index:** [replace.ts](/Users/rachitsrivastava/Developer/company-brain/services/index-service/src/pipeline/replace.ts:53) removes old chunks, then an `add` failure removes partial chunks and tombstones the pointer. This contradicts the “prior pointer restored/old chunks intact” contract in [index-service.md](/Users/rachitsrivastava/Developer/company-brain/docs/specs/service/index-service.md:3). **Fix:** add an atomic `replaceDocument` index operation or generation-staged swap.

4. **MEDIUM — partial live-ACL outage becomes silent success:** [adapter.ts](/Users/rachitsrivastava/Developer/company-brain/modules/retrieval/src/adapter.ts:23) returns `ok:true` whenever at least one pointer survives, even with `liveUnverified > 0`; `BrainApp.search` then discards that metadata. **Fix:** reject when any verification is unknown, or expose a degraded typed result instead of `Pointer[]`.

5. **MEDIUM — timed-out user-token requests are not cancelled:** [live.ts](/Users/rachitsrivastava/Developer/company-brain/services/query-service/src/paging/live.ts:17) races a timeout but cannot abort the `Promise.all` fetches started by [connector-acl.ts](/Users/rachitsrivastava/Developer/company-brain/modules/retrieval/src/live/connector-acl.ts:25). Repeated searches can leave hundreds of token-bearing requests running indefinitely. **Fix:** propagate `AbortSignal`, abort on timeout, and bound connector concurrency.

6. **MEDIUM — live-ACL failures disappear from audit:** [audit.ts](/Users/rachitsrivastava/Developer/company-brain/modules/retrieval/src/audit.ts:22) explicitly skips the row for `LIVE_ACL`, conflicting with “every search writes one audit row” in [brain.md](/Users/rachitsrivastava/Developer/company-brain/docs/specs/app/brain.md:2). **Fix:** record a failure outcome with zero returned results; still fail the request if that audit write fails.

7. **MEDIUM — offset paging skips hits during concurrent mutation:** [scan.ts](/Users/rachitsrivastava/Developer/company-brain/services/query-service/src/paging/scan.ts:30) recomputes each offset page after the live-ACL `await` in [service.ts](/Users/rachitsrivastava/Developer/company-brain/services/query-service/src/service.ts:47). Deleting a rank-0 hit between pages reproduced `d101` returned while `d100` was skipped. **Fix:** page over a snapshot/generation-bound cursor, not a mutable offset ranking.

8. **MEDIUM — accepted configuration crashes at runtime:** [service.ts](/Users/rachitsrivastava/Developer/company-brain/services/query-service/src/service.ts:9) accepts `maxCandidates=1001`, but hybrid search rejects the final page through [validate.ts](/Users/rachitsrivastava/Developer/company-brain/features/hybrid-search/src/search/validate.ts:18). Reproduced as `QueryError(BACKEND)` caused by `SearchError(OFFSET)`. **Fix:** reject `maxCandidates > MAX_WINDOW` during construction.

9. **MEDIUM — bearer tokens are indefinitely replayable:** [token.ts](/Users/rachitsrivastava/Developer/company-brain/apps/brain/src/auth/token.ts:12) signs only `user:tenant`; there is no expiry, audience, issuer, nonce, scope, or key ID. A stolen token remains valid until the global secret changes. **Fix:** use short-lived JWTs with `exp/aud/iss/jti/kid` and key rotation. No direct token logging or cross-tenant token disclosure was found in the reviewed path.

Verification: five scoped package typechecks passed; structure checked 22 packages/345 files; dependency analysis passed over 697 modules/1,294 edges. Seven behavior repros exited `0`. Vitest was blocked by read-only `EPERM` creating `.vite-temp`; selfcheck was likewise blocked creating its temporary file. Lint found one pre-existing `.changeset/live-acl-paging.md` formatting error. No files were modified; `docs/reviews/` was already untracked.

Next: implement the fetched-text hash check and add the ACL-change-between-list-and-fetch regression test.


