# 0004: RAG and brain are separate apps

Status: accepted, 2026-11-02. Decided by the user.

## Decision

Two apps with two stores that never share a database.

| | brain | rag |
| --- | --- | --- |
| Holds | A graph of metadata only: nodes and typed edges. No document text, no chunks, no embeddings. | Pointer index, chunks, FTS5 and vectors, as built today. |
| Written when | A user connects an account. The connector walks metadata and ACLs and updates the graph. Webhooks and delta cursors keep it current. | An agent asks for data. It fetches text from the source with the asking user's token, then chunks, embeds and ranks. |
| Answers | Who, what, where and how things relate: owners, members, links, what a user can reach. | The passages that answer a question. |

The brain returns pointers (source, address, ACL scope). An agent hands those to rag, or rag asks the brain which documents are relevant and then fetches only those.

## Graph model (v1)

- **Nodes:** person, team, document, repo, channel, ticket, project. Properties are metadata only: title, source, address, version, timestamps, ACL scope.
- **Edges:** authored, member-of, mentions, links-to, belongs-to, can-read.
- **Store:** SQLite edge tables with tenant id on every row. Kuzu is the upgrade path if traversal depth needs a graph engine.
- **No LLM extraction in v1.** Edges come from connector metadata and ACLs only.
- **Typed links and reconciliation:** borrowed from obsidian-second-brain, which keeps typed `relations:` and wikilinks over plain markdown notes.

## Consequences

- Today's pointer index, hybrid search and embedder app is `apps/rag` (renamed 2026-11-02). `apps/brain` is the graph-only app.
- A new `apps/brain` and a `features/graph-store` package hold the graph. Both apps reuse `services/connectors`.
- The embedder belongs to rag only. The brain never imports it.
- The ACL stays the user's token, checked live, in both apps.
