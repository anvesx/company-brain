# GBrain (Garry Tan)

- URL: https://github.com/garrytan/gbrain (README fetched via raw.githubusercontent.com)
- Status: fetched in full (33k characters)
- Why it is exact: Slite names GBrain as the project behind the "dream cycle", and the README states "It works as a company brain too."

## What it says a brain is

A memory you control that agents share. Facts are stored with their sources, can be corrected or withdrawn, and the same memory serves every agent. Git/markdown is the record, a database indexes it.

## Components it prescribes

| Piece | What GBrain does |
| --- | --- |
| Signals | recipes for voice, Gmail, Calendar, webhooks, inbox folder; signal detector captures ideas and entity mentions |
| Store | markdown repo is the system of record; PGLite (default, to about 50K pages) or Postgres with pgvector for shared use |
| Graph | typed edges extracted from references without LLM calls; breadth-first walks; BrainBench relationship R@5 0.6626 to 0.7241 |
| Taxonomy | 15 page types in `gbrain-base-v2` (person, company, project, source and others) |
| Dream cycle | overnight job: dedupe people, fix citations, score salience, find contradictions |
| Search | keyword plus vector with rank fusion; optional cited synthesis with a note on what the brain does not know |
| Access | MCP server; remote clients limited by source and operation grants plus visibility filters |
| Organisation | brain (a database) and source (a repo inside it) are separate axes |

## Claims we can test against

1. Typed edges come from explicit references, not an LLM (matches ADR 0004 "no LLM extraction in v1").
2. Facts keep their source and can be withdrawn.
3. Access is enforced per source and per operation, and the README admits local file access is a different trust boundary.
4. Maintenance runs on a schedule (dream cycle), not on request.

## Gaps in our code against it

No dream cycle, no citation repair, no contradiction finder, no synthesis with "what the brain does not know", no source and operation grants (we have ACL filters only).
