# Spec: query-router

Tier: feature. Design cards: qry router group. Research: adaptive-rag, unims-rag, self-rag.

## Purpose
Decide per question whether to skip retrieval, ask the brain graph, ask rag, or both, and which sources. Cheap, deterministic, no LLM in v1.

## Reuse decision
None fits (all routers are LLM-based). Rules over the question text and the connected-source list.

## Public interface
```ts
type Route = { mode: "none" } | { mode: "graph" | "rag" | "both"; sources: string[]; depth: "single" | "multi" };
function route(q: string, ctx: { sources: string[]; hasGraph: boolean; hasRag: boolean }): Route;
```

## Behaviour
1. Greetings, thanks and empty input give `none`.
2. Questions about people, ownership, membership, "who", "which team", "linked to" go `graph`.
3. Questions quoting content, "what does", "summarize", "find the doc about" go `rag`.
4. Both signals, or a question naming two sources, give `both` with `depth: "multi"`.
5. Source names mentioned in the question (slack, github, drive, jira, notion) restrict `sources`; names not connected are dropped.
6. If a leg is unavailable, route degrades to the other; neither available returns `none`.
7. Question over 4 KiB is truncated before matching; unicode safe; deterministic.

## Acceptance tests
- unit table tests (30+ questions), property test: output sources subset of ctx.sources.
- mutation >= 80.

## Layout
`features/query-router/{src,tests}`: signals.ts, sources.ts, route.ts, index.ts.

## Out of scope
LLM routing, learning from feedback.
