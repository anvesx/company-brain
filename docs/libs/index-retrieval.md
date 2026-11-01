# Index and retrieval: library picks (stack.json layer L2, plus L4 packing and injection defence)

Verified 2026-11-01 with `npm view <pkg> version license time.modified` and `gh api repos/<r>` (stars, pushed_at, license, archived). Node here is v26.0.0. Anything not run as a command is marked unverified. "GH license" of NOASSERTION or Other means GitHub could not detect it; the npm field is quoted instead.

Design rule: every pick runs embedded with zero servers in tests and scales up by config behind one port (interface) per need.

## 1. Text extraction (docs, PDF, HTML)

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| unpdf | 2.1.0 | MIT | 1258 | 2026-11-01 | PICK for PDF. Serverless-friendly wrapper over pdf.js, pure JS. |
| pdfjs-dist | 6.4.299 | Apache-2.0 | 54072 (mozilla/pdf.js) | 2026-11-01 | Underlying engine; use through unpdf only. |
| officeparser | 8.5.0 | MIT | 564 | 2026-10-31 | PICK for docx/pptx/xlsx/odt/rtf/epub. Engines field lists Node 26.12.1 or newer; local Node is 26.0.0, so pin Node at or above that (npm engines is advisory, run a smoke test). |
| mammoth | 1.13.0 | BSD-2-Clause | 6335 | 2026-10-16 | Backup for docx to HTML only. |
| @mozilla/readability | 0.6.0 | Apache-2.0 | 11521 | 2026-08-04 | PICK for HTML article cleanup (npm last modified 2025-03-03, stable). |
| linkedom | 0.18.15 | ISC | 2091 | 2026-11-01 | PICK as the DOM for Readability (fast, no browser). |
| jsdom | not run | NOASSERTION on GH (BSD-2-Clause, unverified) | 21743 | 2026-10-30 | Heavier alternative DOM; skip. |
| turndown | 7.2.4 | MIT | 11499 | 2026-10-18 | PICK to turn cleaned HTML into Markdown. |
| html-to-text | 10.0.1 | MIT | 1764 | 2026-08-19 | Fallback for plain text from HTML. |
| markitdown (Python) | n/a on npm | MIT | 193376 | 2026-10-28 | Needs a Python sidecar; reject for zero-server TS. |
| unstructured (Python) | not on npm (E404) | Apache-2.0 | 15656 | 2026-10-30 | Needs a Python service; keep only as optional scale-up for scanned PDFs and OCR. |

PICK: `unpdf@2.1.0`, `officeparser@8.5.0`, `@mozilla/readability@0.6.0`, `linkedom@0.18.15`, `turndown@7.2.4`.
Why: all pure JS, MIT/Apache/ISC, active, no servers.
Adapter we write: `Extractor.extract(bytes, mime) -> {text, markdown, sections[{heading, offsetStart, offsetEnd}]}` that routes by MIME to the four libs. Scale-up by config: an `unstructured` HTTP backend behind the same interface for OCR (unverified that its API fits).

## 2. Chunking

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| @langchain/textsplitters | 1.0.2 | MIT | 18311 (langchainjs) | 2026-11-01 | PICK. Recursive and Markdown-aware splitters, small dependency surface (dependency list not checked, unverified). |
| @chonkiejs/chunk | 0.10.1 | MIT OR Apache-2.0 | 368 (chonkie-ts) | 2026-10-03 | Runner-up; younger, smaller community. |
| semantic-chunking | 3.0.2 | ISC | not checked | n/a | Embedding-based; pulls ONNX models, too heavy for default. |
| llm-chunk | 0.0.1 | MIT | repo not found on GH (404) | npm 2023-09-09 | Reject, abandoned. |
| js-tiktoken | 1.0.21 | MIT | not checked | npm 2025-08-09 | PICK as the token-length function for splitters. |

PICK: `@langchain/textsplitters@1.0.2` with `js-tiktoken@1.0.21` as lengthFunction.
Adapter: `Chunker.split(doc) -> Chunk[{id, docPointerId, text, headingPath, offsetStart, offsetEnd, tokenCount}]`. Offsets are mandatory because citations and live hydration need to re-find the span in fresh text.

## 3. Contextual notes (per-chunk context before embedding)

No library does this; it is a prompt plus a cache. Candidates for the LLM call:

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| @anthropic-ai/sdk | 1.3.0 | Apache-2.0 | not checked | npm 2026-10-23 | PICK as one backend (prompt caching on the document prefix). |
| ai (Vercel AI SDK) | 7.0.159 | Apache-2.0 | 27676 | 2026-11-01 | PICK as the provider-neutral wrapper (GH license NOASSERTION, npm says Apache-2.0). |
| ollama | 0.6.4 | MIT | 4406 (ollama-js) | 2026-10-16 | Local backend for tests and air-gapped use. |
| @mastra/rag | 2.7.1 | Apache-2.0 | 29255 (mastra) | 2026-11-01 | Considered; framework lock-in, skip. |

PICK: `ai@7.0.159` with `@ai-sdk/*` providers and `ollama@0.6.4` local.
Adapter: `Contextualizer.note(chunk, docSummary) -> string` (50 to 100 tokens), cached by `sha256(docVersionHash + chunkId)` so unchanged chunks never re-bill. A deterministic stub (first heading path) is the test default.

## 4. PII masking

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| @redactpii/node | 1.0.19 | MIT | 6 (wrannaman/redactpii-node) | 2026-09-28 | Regex only, tiny community. Acceptable as the embedded default behind a port; low stars is a risk. |
| Microsoft Presidio | Python, not on npm (npm "presidio" is 0.0.0, 2022, unrelated) | MIT | 11623 | 2026-11-01 | PICK for scale-up: run analyzer/anonymizer as a sidecar container, call over REST. |
| llm-guard (npm) | 0.1.9 | MIT | 5 (therizwan/llm-guard) | 2026-08-19 | Not the Protect AI project; tiny. Reject. |
| protectai/llm-guard (Python) | n/a | MIT | 3220 | 2026-07-08 | ARCHIVED. Reject. |

PICK: `@redactpii/node@1.0.19` embedded default, Presidio REST as config upgrade.
Adapter: `PiiMasker.mask(text) -> {text, spans[{type, start, end, token}]}` with reversible tokens kept only in the vault. Regex misses names and addresses; that gap is the reason Presidio is the production path (recall figures unverified, measure on our eval set).

## 5. Embeddings (local and API)

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| @huggingface/transformers | 4.3.2 | Apache-2.0 | 16395 | 2026-10-30 | PICK local. Successor to @xenova/transformers; onnxruntime-node dependency. |
| @xenova/transformers | 2.17.2 | Apache-2.0 | same repo | npm 2024-05-29 | Stale package name; reject. |
| fastembed (JS) | 3.0.0 | MIT | 177 | 2026-09-24 | GH repo ARCHIVED though npm published 2026-09-30. Reject. |
| openai | 7.47.0 | Apache-2.0 | not checked | npm 2026-10-31 | PICK API backend (also covers any OpenAI-compatible endpoint). |
| voyageai | 0.4.0 | MIT | 47 | 2026-10-15 | Optional API backend (embeddings plus rerank). |
| node-llama-cpp | 3.22.2 | MIT | 2197 | 2026-10-20 | Option for GGUF embedding models; skip unless needed. |

PICK: `@huggingface/transformers@4.3.2` (local, small ONNX model, model name chosen by config; first-run model download needs network or a pre-baked cache, unverified for CI) and `openai@7.47.0` for API.
Adapter: `Embedder.embed(texts[], kind: "doc"|"query") -> Float32Array[]` plus `dim` and `modelId`. The index stores modelId and refuses mixed models.

## 6. Hybrid store (BM25 plus vector)

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| better-sqlite3 plus sqlite-vec plus FTS5 | 13.0.3 / 0.1.9 | MIT / MIT OR Apache | 7540 / 8232 | 2026-08-10 / 2026-05-18 | PICK embedded. One file, BM25 via built-in FTS5 (FTS5 is a SQLite feature, not run here), vectors via vec0. sqlite-vec is pre-1.0 and last pushed May 2026; brute-force KNN, fine for tests and small tenants. |
| @orama/orama | 3.1.18 | Apache-2.0 (LICENSE.md read; GH shows Other) | 10591 | 2026-10-18 | Pure JS, full-text plus vector plus hybrid. Hybrid verified in source as min-max weighted merge, not RRF. In-memory; persistence is on us. Good test double. |
| pg plus pgvector | 8.23.1 / 0.3.0 | MIT / MIT | 23557 (pgvector, GH NOASSERTION; PostgreSQL-style license, unverified) | 2026-10-31 | PICK for scale-up: tsvector or BM25 extension plus HNSW in one managed Postgres. Needs a server. |
| @lancedb/lancedb | 0.41.0 | Apache-2.0 | 11824 | 2026-11-01 | Embedded, built-in FTS and vector, disk-based; strong alternative for the 1M-chunk ceiling. Pre-1.0. Node 26 binary support unverified. |
| @qdrant/js-client-rest | 1.20.0 | Apache-2.0 | 35366 (qdrant) | 2026-11-01 | Server needed; has hybrid and RRF fusion server-side (unverified here). Option if Postgres is not the target. |
| minisearch | 7.2.0 | MIT | 6192 | 2025-09-16 | BM25 only, no vectors; no push in 13 months. Reject. |
| flexsearch | 0.8.212 | Apache-2.0 | 13816 | 2026-06-28 | Keyword only. Reject. |

PICK: `better-sqlite3@13.0.3` + `sqlite-vec@0.1.9` (embedded default, also used in CI), `pg@8.23.1` + `pgvector@0.3.0` (production). `@lancedb/lancedb@0.41.0` is the named fallback if the benchmark at 1M chunks fails on Postgres.
Adapter: `ChunkStore { upsert(chunks, vectors), deleteByPointer(id), bm25(q, k, filter), knn(vec, k, filter) }`. Two implementations, one contract test suite run against both. The ACL filter parameter is part of the contract now so L3 needs no rework.

## 7. Fusion (RRF)

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| Hand-written RRF | n/a | ours | n/a | n/a | PICK. About 15 lines; score = sum of 1/(60 + rank). |
| Orama hybrid | 3.1.18 | Apache-2.0 | 10591 | 2026-10-18 | Weighted min-max, not RRF (verified in source). |
| Qdrant server-side fusion | 1.20.0 | Apache-2.0 | 35366 | 2026-11-01 | RRF claimed in docs, unverified; server only. |
| npm "rank-fusion" | n/a | n/a | n/a | n/a | Does not exist (E404). |

PICK: no dependency. Write `rrfFuse(lists, k=60, limit)` in `packages/retrieval`, property-tested (stable ordering, ties broken by id). Reason: pure function, trivially testable, and keeps fusion identical across SQLite and Postgres backends.

## 8. Reranking

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| @huggingface/transformers cross-encoder | 4.3.2 | Apache-2.0 | 16395 | 2026-10-30 | PICK local (ONNX cross-encoder model, e.g. a MiniLM or BGE reranker; model availability and latency unverified). |
| cohere-ai (rerank) | 8.3.0 | MIT (npm license field empty; GH says MIT) | 171 | 2026-10-21 | PICK API backend. |
| voyageai (rerank) | 0.4.0 | MIT | 47 | 2026-10-15 | Alternative API backend. |
| @ai-sdk/cohere | 4.0.73 | Apache-2.0 | 27676 (vercel/ai) | 2026-11-01 | Gives a rerank call through the AI SDK if we want one client. |

PICK: `@huggingface/transformers@4.3.2` local default, `cohere-ai@8.3.0` by config.
Adapter: `Reranker.rerank(query, candidates[{id,text}], topN) -> {id, score}[]`. A no-op reranker (keep RRF order) is the test default.

## 9. Live hydration

No library fits; this is our L0 connector contract.

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| Connector fetch plus Extractor (section 1) | ours | ours | n/a | n/a | PICK. |
| p-limit / p-retry / lru-cache | not checked | unverified | not checked | not checked | Check before adding; likely used for concurrency, retry, and a short-TTL cache. |
| LlamaIndexTS | not run | MIT | 3080 | 2026-03-11 | ARCHIVED. Reject. |

PICK: ours. Adapter: `Hydrator.hydrate(hits, asker) -> {hitId, liveText, fetchedAt, versionHash, stale: boolean}[]` fetching top N in parallel with a deadline, re-running Extractor, re-locating the chunk span by offset then by fuzzy match, and falling back to the stored snippet marked stale. Needs the connector token from L3.

## 10. Answer packing with citations

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| ai (Vercel AI SDK) | 7.0.159 | Apache-2.0 | 27676 | 2026-11-01 | PICK for generation and structured output (zod schema for answer plus citation ids). |
| @anthropic-ai/sdk | 1.3.0 | Apache-2.0 | not checked | npm 2026-10-23 | Native citations feature exists in the Anthropic API (unverified here); use via the AI SDK provider if exposed. |
| js-tiktoken | 1.0.21 | MIT | not checked | npm 2025-08-09 | PICK for token budgeting. |
| @mastra/rag | 2.7.1 | Apache-2.0 | 29255 | 2026-11-01 | Skip. |

PICK: `ai@7.0.159` + `js-tiktoken@1.0.21`.
Adapter: `Packer.pack(hydratedHits, budgetTokens) -> {context, sources[{n, title, url, fetchedAt}]}`: dedupe, order best at start and end (lost-in-the-middle), number each source `[n]`, wrap each in an untrusted-data delimiter. Post-check: every `[n]` in the answer must exist in `sources`, and each claim sentence should overlap its cited span; reject otherwise.

## 11. Prompt-injection defence

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| Our delimiter plus tool-less answer step plus output check | ours | ours | n/a | n/a | PICK as the base layer. |
| protectai/llm-guard (Python) | n/a | MIT | 3220 | 2026-07-08 | ARCHIVED. Reject. |
| NeMo-Guardrails (Python) | n/a | NOASSERTION | 7406 | 2026-11-01 | Active but Python server; optional later. |
| meta-llama/PurpleLlama (Prompt Guard, Python) | n/a | NOASSERTION | 4455 | 2026-10-30 | Classifier model; could run via transformers.js if an ONNX export exists (unverified). |
| lakeraai/pint-benchmark | n/a | MIT | 200 | 2026-04-16 | ARCHIVED; benchmark only. Reject. |
| protectai/rebuff | n/a | Apache-2.0 | 1532 | 2024-08-07 | ARCHIVED. Reject. |
| llm-guard (npm, therizwan) | 0.1.9 | MIT | 5 | 2026-08-19 | Too small to trust. Reject. |

PICK: no maintained TS library found; build a thin layer. Defence in depth: (1) strip control characters and hidden HTML at extraction, (2) quote retrieved text as data in delimiters and tell the model it is untrusted, (3) the answering call gets no tools and no write access, (4) citation and output validator from section 10, (5) optional classifier behind `InjectionScreen.screen(text) -> {score, flag}` (default regex heuristics, upgrade to a Prompt Guard-class model via transformers.js, unverified). The L4 exit test (planted instruction does not change the answer) is the acceptance test.

## Summary of picks

| Need | Embedded default (tests) | Scale-up by config |
|---|---|---|
| Extraction | unpdf@2.1.0, officeparser@8.5.0, @mozilla/readability@0.6.0, linkedom@0.18.15, turndown@7.2.4 | unstructured sidecar for OCR |
| Chunking | @langchain/textsplitters@1.0.2, js-tiktoken@1.0.21 | same |
| Contextual notes | stub, ollama@0.6.4 | ai@7.0.159 with API providers |
| PII | @redactpii/node@1.0.19 | Presidio REST |
| Embeddings | @huggingface/transformers@4.3.2 | openai@7.47.0 |
| Hybrid store | better-sqlite3@13.0.3 + sqlite-vec@0.1.9 | pg@8.23.1 + pgvector@0.3.0 (fallback @lancedb/lancedb@0.41.0) |
| Fusion | own rrfFuse | same |
| Rerank | @huggingface/transformers@4.3.2 | cohere-ai@8.3.0 |
| Hydration | own Hydrator | same |
| Packing | ai@7.0.159, js-tiktoken@1.0.21 | same |
| Injection defence | own layered screen | optional classifier |

Open risks: officeparser Node engine floor versus local Node 26.0.0; sqlite-vec and LanceDB are pre-1.0; @redactpii/node has 6 stars; no maintained TS prompt-injection library exists; local model downloads need a cache strategy in CI.
