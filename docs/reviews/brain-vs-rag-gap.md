# Brain versus RAG: what the design asks for and what exists

Source: `docs/brain/model.json` (14 stages, 152 components) and `docs/brain/research/papers.md`.
Counts below are my hand mapping, not a script.

## Verdict

What the repo has is a permission-aware RAG pipeline: connect, index pointers, chunk, embed, hybrid search, ACL filter, audit, MCP tool. That covers roughly the first six stages of the design, in part. None of the stages that make it a brain are built.

## What the research says a brain adds over RAG

| Research conclusion | Papers | Design components | Built |
| --- | --- | --- | --- |
| Entity and relationship graph over pointers answers cross-app questions | graphrag, hipporag, lightrag | ix_ent, ix_link | no |
| Every fact has a validity window and a supersession link | zep, temporal-validity, stale-poison | ix_fresh, ix_att, ix_def | no |
| Store distilled facts with provenance, consolidate on write, rank by recency and importance | mem0, a-mem, generative-agents | cp_exp, cp_dup, cp_trust, cp_lib | no |
| Route before retrieving: skip, single, multi-step | adaptive-rag, unims-rag, self-rag | qry router group | no |
| Personal, team and company zones with promotion by consent | participant-acl | zn_* (6), cr_* (4) | no |
| Capture AI chats and work activity | none (product requirement) | cp_*, cf_* (16) | no |
| Act on tools with the user's own token, confirm each change | mcp-enterprise | ag_* (5) | no |
| Erasure with receipts, tenant keys, embedding protection | embedding-inversion, rag-privacy | gv_* (7) | no |
| Agent secret boundary and egress allowlist | indirect-injection, poisoned-rag | sc_* (6) | no |
| Evaluation on own apps: freshness, leak test, golden set | freshllms, crag-bench, ragas | op_* (11) | no |

## Order to build

1. Graph store, entity resolver and link extraction (ix_ent, ix_link), per ADR 0004. This is the brain.
2. Validity windows, supersession and claim records (ix_att, ix_fresh).
3. Query router in front of rag (agent asks brain for pointers, hands them to rag).
4. Zones and promotion gate.
5. Memory distillation and case cards.
6. Governance: erasure, tenant keys, secret scan.
7. Evaluation harness: planted-user leak test, freshness test, golden set.
8. Capture daemon and action agent last; they need 1 to 6.

## Rules for the README

Line 1 stays the share of the 152 components that run against real systems. It is below 20% today and the README should say so.
