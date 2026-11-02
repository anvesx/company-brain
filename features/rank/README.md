# @anvesx/rank

Permission-aware ranked search over document metadata. Give it documents, ask with a set of principals, get back ranked pointers.

Spec: `docs/specs/feature/rank.md`.

## The brain stays metadata and pointers

`search` returns `{ id, path, score, signals }` per hit. It never returns a title or a body. The index stores no body text and no title text. The SQLite file holds, per doc, the id, the path, the mtime, three token counts, ACL rows, link rows, and an FTS5 postings table that is contentless (`content=''`): it keeps token positions of hex-encoded tokens and cannot reproduce the text. The integration test `tests/integration/file.test.ts` reads the raw file bytes and asserts that body and title words are absent. The path is stored because it is the pointer. A caller that wants the content follows the pointer to the source system, which checks access again.

## API

```ts
const ix = RankIndex.open(file, { now?, weights? });          // ":memory:" or a path
ix.index(docs: Doc[]): { indexed: number };                   // upsert by id, one transaction
ix.remove(ids: string[]): { removed: number };
ix.search({ query, asker: { principals }, k? }, probe?): Hit[];
ix.close();

type Doc = { id; title; path; body; principals: string[]; mtimeMs: number; links: string[] };
type Hit = { id; path; score; signals: { text; recency; links } };
rrf(lists: string[][], k = 60): { id; score }[];              // exported utility
```

`k` defaults to 10, maximum 100. `probe(stage, ms)` is optional and receives per-stage timings. `weights` and `now` exist for tests and the eval.

Errors are `RankError` with a `code`: `BAD_DOC`, `BAD_ASKER`, `BAD_QUERY`, `CLOSED`.

## Ranking formula

Everything below is computed over the documents the asker may read, and only those.

```
idf(t)    = ln(1 + (N - df + 0.5) / (df + 0.5))
tf'(t,d)  = sum over columns c of  w_c * tf_c / (1 - b + b * len_c / avglen_c)
text(d)   = sum over query terms of  idf(t) * tf' / (k1 + tf')
recency   = 0.5 ^ (age_in_days / 90)
links     = ln(1 + inbound links from readable docs)
score(d)  = text(d) * (1 + 0.2 * recency + 0.1 * links)
```

Weights `w` are title 3, path 2, body 1. `k1` is 1.2 and `b` is 0.75. Hits sort by score descending, then id ascending. Recency and links multiply the text score, so a doc with no matching term scores 0 and is not returned. Each hit's `signals` carry `text`, `recency` and `links` so a caller can see why it ranked.

`rrf` is a separate export for fusing this package's ranking with another ranker. It is not applied inside `search`.

## Permissions

- The ACL is a pre-filter inside every statement. Statistics (N, df, average length), postings, metadata and inbound link counts all run over the readable set. Nothing is ranked and trimmed afterwards.
- A hidden doc therefore cannot change a visible doc's score, the number of hits or their order. `tests/property/canary.test.ts` adds a perfect-match hidden doc and checks that the results are exactly equal.
- Fail closed: a missing, empty or malformed asker throws `BAD_ASKER` before the database is queried. An unknown principal matches no docs and returns an empty list.
- Link counts include only links from docs the asker can read.

## Why FTS5 `bm25()` is not used

The brief suggested `bm25(t, w...)`. FTS5's function computes IDF and average length over the whole table. A hidden doc then moves a visible doc's score, and the score, rank and count of a probe query reveal that a hidden doc exists. So the index uses FTS5 only for what it is good at, the inverted index, and computes BM25F itself over the readable set. Term frequencies come from `fts5vocab` in `instance` mode.

## Text handling

One JavaScript tokenizer is used for indexing and for queries: NFC, lowercase, split on letters, digits and combining marks, then each token hex-encoded and indexed with FTS5's `ascii` tokenizer. User text never reaches an FTS5 `MATCH` expression, so `"`, `*`, `NEAR(`, `AND` and column filters are plain words. A query is read up to 10,000 characters and uses at most 32 distinct terms.

## Evidence

- Tests: `pnpm --filter @anvesx/rank test`. Unit, fast-check properties, differential test against a brute-force oracle, canary leak test, edge cases, a real SQLite file, and the no-fake guard.
- Quality: `tests/eval`. On a synthetic corpus of 400 docs and 46 labelled queries, BM25F reaches nDCG@10 0.989 and plain bm25 reaches 0.766. See `tests/eval/README.md` for what this does and does not show.
- Mutation: `pnpm --filter @anvesx/rank mutation`.

## Latency

Command: `pnpm --filter @anvesx/rank bench`. Open loop at 20 queries per second, 1500 samples per corpus, HdrHistogram, latency measured from the scheduled arrival. The machine was a laptop with other work running (load average about 3), so treat the numbers as indicative only. Queries come from a Zipf-like vocabulary, so many contain a term found in most docs, which is a heavy case.

| Corpus      | p50      | p95      | p99       | CPU per query | Index size per doc |
| ----------- | -------- | -------- | --------- | ------------- | ------------------ |
| 1,000 docs  | 5.86 ms  | 18.59 ms | 22.16 ms  | 7.08 ms       | 614 bytes          |
| 10,000 docs | 23.84 ms | 84.86 ms | 101.25 ms | 26.43 ms      | 529 bytes          |

At 10,000 docs the `postings` stage dominates (p50 10.60 ms, p95 59.71 ms). Cost grows with the number of readable docs that contain a query term, because each one is scored. There is no top-k pruning. Search is synchronous, so throughput on one thread tops out near 1000 divided by the CPU time per query, about 37 queries per second at 10,000 docs.

## Known limits

- No prefix, phrase or fuzzy queries. Matching is whole tokens.
- Concurrency is tested for interleaved calls on one handle and two handles on one WAL file. Two OS threads are not raced.
- Every readable doc that matches a term is scored. Corpora far beyond 10,000 docs with very common terms need pruning, which is not built.
- The eval corpus is synthetic.

## Layout

`src/` code, `tests/` tests, `scripts/bench/` the latency bench. Each folder has a README.
