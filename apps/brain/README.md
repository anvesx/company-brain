# apps/brain

The graph-only brain (ADR 0004). It serves who can read what, from a metadata graph in one SQLite file. It never holds document text, chunks or embeddings; that is the separate anvesx/rag repo.

## Why

Slite, Meta and Vectorize all put access control at the retrieval step and keep the system of record in the source. The brain answers "which documents can this user reach" with pointers (source, address, title, version). An agent then hands a pointer to rag, which fetches text with the user's own token.

## API

Read-only, bearer token `user:tenant:exp:hmac` (the same form the rag repo's `mint-token` makes).

| Route                   | Returns                                                                 |
| ----------------------- | ----------------------------------------------------------------------- |
| `GET /v1/documents`     | pointers the caller can read, directly or through a team                |
| `GET /v1/documents/:id` | one pointer, or 404 (a hidden document looks the same as a missing one) |

## Run

```bash
BRAIN_GRAPH_PATH=./graph.db BRAIN_AUTH_SECRET=<32+ chars> node dist/bin.js
```

## Not built yet

The graph is filled by `services/graph-sync` (in progress). Until it lands the file is empty. No webhooks, no `reach` or `neighbors` routes, no review queue or dream cycle (see `docs/brain/research/exact/README.md`).

`src/auth.ts` repeats about 12 lines of the rag token check. Extract a shared package when a third app needs it.

## Filling the graph

`brain sync` reads one connector and writes metadata and access edges into the graph.

| Variable                            | Meaning                                                  |
| ----------------------------------- | -------------------------------------------------------- |
| `BRAIN_TENANT`                      | tenant the nodes belong to                               |
| `BRAIN_GRAPH_PATH`                  | SQLite graph file shared with the API                    |
| `BRAIN_CONNECTOR`                   | `folder`, `github` or `drive`                            |
| `BRAIN_FOLDER_ROOT`                 | folder source: directory with `<file>.acl.json` sidecars |
| `GITHUB_TOKEN`, `BRAIN_GITHUB_REPO` | github source: token and `owner/repo`                    |
| `DRIVE_ACCESS_TOKEN`                | drive source: access token                               |

`tests/e2e/sync-then-serve.test.ts` runs the whole path: real folder, real graph file, real HTTP.
