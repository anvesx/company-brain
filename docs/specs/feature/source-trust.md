# Spec: source-trust

Tier: feature. Design cards: none (gap found by the trust research). Milestone: M3 retrieval quality.

Exact source: our proposal. The maths comes from the cards in
[docs/brain/research/trust](../../brain/research/trust/README.md); the composition and the class
priors are ours. Audit table: [exact research README](../../brain/research/exact/README.md), row
"Consolidation, contradiction policy: not built".

## Purpose
Two sources often assert different values for one fact: who owns a service, what a limit is, which
date a policy starts. This feature decides which value to believe and how sure we are. It also keeps
a trust score per source that improves with evidence. Pure functions over claims. No store, no network, no
clock read, no randomness. Any app that merges facts from several feeds can use it.

## Reuse decision
No maintained JavaScript library implements truth discovery (searched npm for truth-discovery,
data-fusion, accucopy, truthfinder: nothing with tests or users). The algorithm is twelve lines of
maths from the cards, so we write it. fast-check (already in the workspace) drives property tests.
pure-rand (a fast-check dependency) gives the seeded generator for the replication study.

## Public interface
```ts
type SourceClass = "signed" | "record" | "wiki" | "ticket" | "chat" | "draft" | "opinion" | "news";
interface Source { id: string; class: SourceClass }
/** One assertion by one source: "for item X the value is V", made at time at (ms since epoch). */
interface Claim { id: string; source: string; item: string; value: string; at: number }
/** Caller-known copying: copier repeats share (0..1) of original's values. */
interface CopyEdge { copier: string; original: string; share: number }
/** A person settled an item. Resolved truths re-score every source that disagreed. */
interface Correction { item: string; value: string; at: number }
interface TrustOptions {
  now: number;                                   // injected clock, ms since epoch
  priors?: Partial<Record<SourceClass, number>>; // override the class priors, each in (0, 1)
  minClaims?: number;                            // below this a source keeps its prior; default 5
  maxRounds?: number;                            // default 20
  epsilon?: number;                              // convergence and tie threshold; default 1e-6
  halfLifeMs?: number;                           // vote decay; omitted means no decay
}
interface ValueGroup { value: string; score: number; confidence: number; sources: string[]; newestAt: number }
interface Resolution { item: string; value: string | null; confidence: number; groups: ValueGroup[]; tie: boolean; corrected: boolean }
interface SourceScore { source: string; accuracy: number; claims: number; learned: boolean }
interface TrustResult { sources: SourceScore[]; items: Resolution[]; rounds: number; converged: boolean }
function resolveClaims(input: { sources: Source[]; claims: Claim[]; copies?: CopyEdge[]; corrections?: Correction[] }, options: TrustOptions): TrustResult;
/** Answer-time labelling. Every passage comes back; none is dropped (CAG Fig 4, CrAM Table 2). */
function labelPassages<T extends { source: string; item?: string; value?: string }>(passages: T[], result: TrustResult): Array<T & { trust: number; group: "best" | "other" | "unresolved" }>;
class TrustError extends Error { code: "BAD_INPUT" }
```

## Behaviour
1. Class priors, our proposal, overridable: signed 0.95, record 0.90, wiki 0.75, ticket 0.65,
   news 0.55, chat 0.50, draft 0.40, opinion 0.35. Opinion and news are separate classes on purpose
   (Budak 2016 Fig 1b; Wikipedia WP:RS).
2. Vote weight of source S on an item with n competing values: A'(S) = log2(n A(S) / (1 - A(S)))
   with n = max(1, distinct values on that item - 1) and A clamped to [0.01, 0.99]
   (data-fusion-dong-2015 Sec 2.3, Eq 3 and 4). Base 2 is the only base under which
   2^C(v) equals the product form of Eq 4 exactly. The paper's Example 2 prints 4.7, 2, 1.5 for
   accuracies 0.97, 0.6, 0.4 at n = 5; no log base reproduces all three, so tests assert the
   Eq 4 product form, not those printed numbers. A source below 1/(1+n) votes against its own
   value; that is the paper's behaviour and stays.
3. Score of value v: C(v) = sum of A'(S) over sources giving v, each term multiplied by its copy
   factor and its decay factor. Confidence P(v) = 2^C(v) / sum over v' of 2^C(v') (Eq 4), computed
   with max subtraction so no overflow.
4. Copy factor: a claim whose source is a copier of an original that gives the same value for
   the same item counts (1 - share) of its weight (Dong 2009 Eq 13 with the copy probability known).
   A chain A copies B copies C discounts A against both. Copies never add a vote.
5. Decay factor: with halfLifeMs, a claim of age t gets max(0.1, 0.5^(t / halfLife)). Age lowers
   the magnitude, never the sign. Without halfLifeMs the factor is 1.
6. Winner: the value with the highest C. If the top two are within epsilon, the group with the
   newest claim wins and tie is false; if their newest claims share the same at, value is the
   lexicographically smaller one and tie is true. Every group is returned, sorted by score then
   value, so the caller can show both sides.
7. Source accuracy after a round: A(S) = mean of P(v) over S's claims (Eq 1). A source with fewer
   than minClaims claims keeps its prior and reports learned: false (KBT Sec 5.3.1).
8. Rounds: start from priors; repeat vote then accuracy until max |change in A| < epsilon or
   maxRounds; report rounds and converged. Never loop forever, never hide non-convergence.
9. Corrections fix P = 1 for the corrected value and 0 for the others on that item before every
   round, so sources that disagreed lose accuracy and ones that agreed gain it (RA-RAG Sec 6.2).
   The newest correction per item wins. A corrected item reports corrected: true and its groups.
10. Determinism: same input in any order gives the same output. Sort by id internally. No
    Date.now, no Math.random. Inputs are never mutated.
11. labelPassages: trust = source accuracy; group best when the passage's item and value match
    the winner, other when they match a losing group, unresolved when the passage names no
    item or the item is unknown. Output length equals input length, always.
12. Every bad input raises BAD_INPUT naming the offending field. Validation runs before any
    maths, so one bad claim fails the whole call and nothing is swallowed.

    | Field | Rejected when |
    |---|---|
    | id, source, item, value | empty or not a string; value over 4096 bytes in UTF-8 |
    | claim id, source id | duplicated |
    | claim.source, correction.item | names an unknown source or item |
    | at, now | not a finite non-negative integer |
    | priors | any prior outside the open interval (0, 1) |
    | minClaims, maxRounds | not a positive integer |
    | epsilon, halfLifeMs | not a positive finite number |
    | copy edge | copier equals original, an end is unknown, or share outside [0, 1] |
13. Unicode: values compare by exact string, after NFC normalisation, so "é" composed and
    decomposed are one value. Case is significant.
14. Size: 100k claims over 10k items and 1k sources resolve in under 2 s on a laptop, 20 rounds.
    Cost per round is O(claims + copies). The scale test pins this with its denominator.
15. Empty claims give `items: []`, every source at its prior, `rounds: 0`, `converged: true`.

## Acceptance tests (written first, before any src file)
- unit, hand-computed, one test each: the Eq 4 check on data-fusion-dong-2015 Example 2 inputs
  (accuracies 0.97, 0.6, 0.4 with n = 5 give log2 weights 7.34, 2.91, 1.74, and the confidence
  of a value equals the log2 of the product of nA/(1-A) over its sources). A two-source
  conflict where the signed source beats the chat source. A copier that cannot flip a vote. Decay
  that cannot flip a vote. A tie broken by the newest claim. A correction that lowers the wrong
  source's accuracy.
- unit, errors: one test per BAD_INPUT case in rule 12, asserting the field named in the message.
- property (fast-check): permutation invariance; output items cover every input item exactly once;
  every accuracy in [0.01, 0.99]; labelPassages output length equals input; adding a copy edge
  never raises the copied value's confidence; removing claims of the winner's sources never raises
  its confidence; converged true implies a further round changes nothing beyond epsilon.
- research replication (tests/research): seeded synthetic data, 20 sources with accuracies drawn
  from [0.3, 0.95], 500 items, 5 copiers at share 0.8. Measure precision of (a) majority vote
  (all priors equal, one round), (b) accuracy rounds, (c) accuracy plus copy edges. Assert
  (c) >= (b) >= (a) on the fixed seed and print all three with the denominator (Dong 2009 Table 3
  direction: 0.71, then 0.87). The README cites the numbers this test prints, nothing else.
- integration: public API through the package entry only.
- scale (tests/scale): rule 14, with printed timing, and counts.
- mutation: Stryker score >= 80.

## Layout
`features/source-trust/`: README.md, package.json, stryker.config.json, tsconfig.json,
tsconfig.build.json. `src/`: index.ts, types.ts, errors.ts, validate.ts, README.md.
`src/score/`: weight.ts, vote.ts, accuracy.ts, rounds.ts, README.md. `src/answer/`: groups.ts,
label.ts, README.md. `tests/unit/`, `tests/property/`, `tests/research/`, `tests/integration/`,
`tests/scale/`, each with README.md, at most five files per folder, 80 lines per file.

## Out of scope
Copy detection from shared false values (Dong 2009 Eq 5 to 12): the caller supplies copy edges
from content hashes today; the Bayesian detector is the next spec. Text similarity between values.
Persistence of scores (graph-store props). Wiring into apps/brain. An LLM anywhere.
