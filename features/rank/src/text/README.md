# text

Pure functions. No database, no clock, no I/O.

## tokenize.ts

One tokenizer serves indexing and querying, so the two cannot disagree.

1. Normalise to NFC and lowercase.
2. Split on `/[\p{L}\p{N}\p{M}]+/gu`: letters, digits and combining marks stay inside a token.
3. Hex-encode each token as UTF-8.

The hex form goes to SQLite FTS5 with the plain `ascii` tokenizer. FTS5 never sees user text, so it cannot interpret `"`, `*`, `NEAR(` or column filters as syntax, and its own unicode folding cannot split a token differently from this code. `queryTerms` reads at most the first 10,000 characters, keeps distinct tokens and caps them at 32.

## formula.ts

BM25F computed over the set of documents the asker may see. See the package README for the full formula and the reason FTS5's built-in `bm25()` is not used.

- `idf(n, df)` is `ln(1 + (n - df + 0.5) / (df + 0.5))`, always positive.
- `textScore(terms, lengths, averages, weights)` sums per-term `idf * tf' / (k1 + tf')` where `tf'` is the length-normalised, column-weighted term frequency.
- `recency(now, mtimeMs)` is `0.5 ^ (age / 90 days)`, clamped so a future mtime counts as age zero.
- `linkSignal(inbound)` is `ln(1 + inbound)`.
- `combine(text, recency, links)` is `text * (1 + 0.2 * recency + 0.1 * links)`. Recency and links only scale a text match, so a doc with no matching term scores zero and never appears.
