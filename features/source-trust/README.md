# @anvesx/source-trust

Status: built. 173 tests pass. Stryker score 98.61 (7 survived, 1 uncovered; six equivalent, see
`tests/README.md`) is stale: it predates edits to validate, label, weight, newest, rounds, vote,
accuracy and copy/factors; re-run when machine load allows.

Two sources often give different values for one fact: who owns a service, what a limit is, when
a policy starts. This package picks the value to believe, says how sure it is, and keeps a trust
score per source that improves with evidence. It is pure functions over claims. There is no
store, no network, no clock read and no randomness. Spec: `docs/specs/feature/source-trust.md`.

## Interface

- `resolveClaims({ sources, claims, copies?, corrections? }, options)` returns
  `{ sources, items, rounds, converged }`. Each item has the winning value, its confidence,
  every value group, a `tie` flag and a `corrected` flag. Each source has its accuracy, its
  claim count and whether it learned or kept its class prior.
- `labelPassages(passages, result)` returns every passage with `trust` (its source accuracy)
  and `group` (`best`, `other` or `unresolved`). None is dropped.
- `TrustError` has code `BAD_INPUT` and a `field` path such as `claims[0].value`.

## Usage

```ts
import { labelPassages, resolveClaims } from "@anvesx/source-trust";

const result = resolveClaims(
  {
    sources: [
      { id: "handbook", class: "signed" },
      { id: "slack", class: "chat" },
    ],
    claims: [
      { id: "c1", source: "handbook", item: "owner:payments", value: "Priya", at: 1000 },
      { id: "c2", source: "slack", item: "owner:payments", value: "Sam", at: 2000 },
    ],
  },
  { now: 3000 },
);
// result.items[0]: value "Priya", confidence 0.95, both groups listed
labelPassages([{ source: "slack", item: "owner:payments", value: "Sam" }], result);
// [{ ..., trust: 0.5, group: "other" }]
```

## Maths

Class priors (our proposal): signed 0.95, record 0.90, wiki 0.75, ticket 0.65, news 0.55,
chat 0.50, draft 0.40, opinion 0.35.

- Vote weight: A'(S) = log2(n A(S) / (1 - A(S))), with n = max(1, distinct values - 1) and A
  clamped to [0.01, 0.99]. data-fusion-dong-2015 Sec 2.3 Eq 3. A source below 1 / (1 + n)
  votes against its own value.
- Value score: C(v) = sum of A'(S) over sources giving v, each times its copy and decay factor.
- Confidence: P(v) = 2^C(v) / sum of 2^C(v'), computed with max subtraction. Eq 4.
- Copy factor: a copier that matches its original counts (1 - share). Dong 2009 Eq 13.
- Decay factor: max(0.1, 0.5^(age / halfLifeMs)), or 1 without a half life.
- Accuracy: A(S) = mean of P(v) over S's claims. Eq 1. Fewer than minClaims claims keeps the
  prior. KBT Sec 5.3.1.
- Corrections pin P to 1 for the settled value and 0 for the rest. RA-RAG Sec 6.2.
- Passages are labelled, never dropped. CAG Fig 4.

Log base: Eq 4 is a product form, P(v) = prod of nA/(1-A) over v's sources divided by the sum
over every value. 2^C equals that product only when C uses log2, so we use log2. The paper's
Example 2 prints weights 4.7, 2 and 1.5 for accuracies 0.97, 0.6 and 0.4 at n = 5; no log base
gives all three (natural log: 5.09, 2.01, 1.20). We implement Eq 3 and 4 as written: log2 gives
7.34, 2.91 and 1.74.

Replication, seed 42 (`tests/research`, 500 items, 5 copy edges at share 0.8): majority vote
0.754, accuracy rounds 0.842, rounds plus copy edges 0.850. Same order as Dong 2009 Table 3;
the data is synthetic, so the values are not comparable to the paper's.

## Limits

No copy detection from shared false values: callers pass copy edges. No text similarity between
values. No persistence. Values compare as exact strings after NFC; case matters. Values are at
most 4096 bytes in UTF-8. Rule 14 targets 100k claims in under 2 s of CPU time, with cost linear in claims.

## Test

`pnpm --filter @anvesx/source-trust test`, `typecheck` and `mutation`.
