# Meta: An Organizational Second Brain

- URL: https://engineering.fb.com/2026/09/02/ml-applications/organizational-second-brain-ai-learns-from-experts/
- Authors and date: Sengar, Nawrocki, Shah, Kommireddi, Meta, 2 Sep 2026. InfoQ summary: https://infoq.com/news/2026/09/meta-organizational-agents
- Status: primary post fetched in full (25k characters)
- Why it is exact: the post names the "organizational second brain" and describes the company-level knowledge system.

## What it says the brain is

Knowledge a company has pre-extracted into structured, auditable files, separate from how the agent reasons. It is not a pile of documents to retrieve from on every run.

## Four layers

1. Knowledge system: 200+ files in a taxonomy (position files, vocabulary files, routing indexes, gateway files). Each file declares `depends_on` and `referenced_by` in frontmatter, so the files form a bidirectional dependency graph.
2. Reasoning layer: composable recipes that hold procedure and no facts. Knowledge files hold positions and no procedure.
3. Evaluation framework: targeted blind replay, then regression suites judged independently.
4. Self-improvement loop: diagnose expert feedback, compile minimal edits, validate, expert review, then add the fixed case to the regression suite.

## Claims we can test against

1. Retrieval order is deterministic and auditable: routing indexes map inputs to files "without relying on embedding similarity alone".
2. Knowledge splits by density and usage frequency. Dense, often-used knowledge goes in the curated wiki. Sparse reference material goes to RAG. So RAG is kept as a separate layer, which supports ADR 0004.
3. Every file carries its dependencies and consumers, so the effect of a change can be traced.
4. Humans stay in control through checkpoints and escalations. Nothing lands without expert review as a pull request.
5. A deterministic linter validates structure (dangling references, size budgets, id collisions, dependency cycles).
6. Progressive disclosure cut tokens per turn by about 80%.
7. Each fix becomes a permanent regression test.

## Gaps in our code against it

No routing index, no dependency edges between knowledge files, no recipes, no feedback diagnosis or compile loop, no replay or regression harness, no review-as-PR flow. graph-store has typed edges and bi-temporal validity, which covers claim 3 only for the metadata graph.
