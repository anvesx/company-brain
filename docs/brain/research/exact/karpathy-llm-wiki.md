# Karpathy: LLM Wiki

- URL: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
- Author and date: Andrej Karpathy, 4 Apr 2026
- Status: fetched in full (61k characters including comments)
- Why it is kept: Meta and Slite both cite it as the pattern behind their brains, and it names "Business/team" wikis fed by Slack, transcripts and documents. It does not use the words "company brain", so it is a cited-by source, one step weaker than the others in this folder.

## Idea

Instead of retrieving chunks from raw documents on every question (RAG), the LLM builds and maintains a persistent, interlinked wiki. Cross-references and contradictions are resolved at ingest, so knowledge compounds.

## Three layers

1. Raw sources: immutable, the source of truth.
2. Wiki: LLM-written markdown, owned by the LLM.
3. Schema: a CLAUDE.md or AGENTS.md describing structure and workflows.

## Operations

- Ingest: read a source, write a summary page, update index, entity and concept pages, append to a log.
- Query: search the wiki, answer with citations, file good answers back as pages.
- Lint: find contradictions, stale claims, orphan pages, missing cross-references.

Two files: `index.md` (catalog, updated on every ingest) and `log.md` (append-only, parseable prefixes).

## Claims we can test against

1. Maintenance (cross-reference, contradiction flagging, supersession) is the work, not retrieval.
2. Raw sources are never modified by the brain.
3. A lint pass exists and finds contradictions, stale claims and orphans.
4. An append-only log records every ingest, query and lint.
5. Team use has humans reviewing updates.

## Tension with our design

Karpathy's wiki stores synthesised text. ADR 0004 says our brain stores metadata only. The two agree only if synthesised pages live in a separate layer. This needs a decision, recorded in ADR 0004.
