# apps/brain

The graph-only brain (ADR 0004). It serves who can read what, from a metadata graph in one SQLite file. It never holds document text, chunks or embeddings; that is the separate anvesx/rag repo.

## Why

Slite, Meta and Vectorize all put access control at the retrieval step and keep the system of record in the source. The brain answers "which documents can this user reach" with pointers (source, address, title, version). An agent then hands a pointer to rag, which fetches text with the user's own token.

## API

Read-only, behind `@anvesx/identity` (ADR 0008). A caller is a signed-in browser (session cookie) or an MCP client (OAuth access token as `Authorization: Bearer`). Anyone else gets 401 and a `www-authenticate` challenge.

| Route                                                       | Returns                                                                                             |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `GET /v1/documents`                                         | pointers the caller can read, directly or through a team                                            |
| `GET /v1/documents/:id`                                     | one pointer, or 404 (a hidden document looks the same as a missing one)                             |
| `GET /graph`, `/v1/graph`                                   | the 3D graph page and its JSON (`@anvesx/graph-view`)                                               |
| `/api/auth/*`, `/sign-in`, `/connections`, `/.well-known/*` | identity's own routes, on the same origin                                                           |
| `POST /mcp`                                                 | the MCP server (`@anvesx/brain-mcp`): the URL the install guide on `/connections` gives each client |

## Run

```bash
BRAIN_GRAPH_PATH=./graph.db BRAIN_AUTH_DB=./auth.db BRAIN_AUTH_SECRET=<32+ chars> \
  BRAIN_BASE_URL=http://localhost:8787 node dist/bin.js
```

| Variable                                   | Meaning                                                                                                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `BRAIN_GRAPH_PATH`                         | SQLite graph file                                                                                                                                                                    |
| `BRAIN_AUTH_DB`                            | SQLite file for sign-in data                                                                                                                                                         |
| `BRAIN_AUTH_SECRET`                        | 32+ characters; signs cookies and derives the graph-view cursor key. Rotating it ends sessions and outstanding Load more cursors. Share it across instances                          |
| `BRAIN_BASE_URL`                           | public origin: https, or http on localhost; no path, query or fragment. Host case, default port and one trailing `/` are normalised. Default `http://localhost:<BRAIN_PORT>`         |
| `BRAIN_PORT`                               | 1 to 65535, default 8787                                                                                                                                                             |
| `BRAIN_HOST`                               | bind address, default `127.0.0.1`                                                                                                                                                    |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | both or neither. With both, sign-in and sign-up show "Continue with Google" (a Google Cloud OAuth client whose redirect URI is `<BRAIN_BASE_URL>/api/auth/callback/google`)          |
| `<ID>_CLIENT_ID`, `<ID>_CLIENT_SECRET`     | per connector in `src/doors/catalog.ts` (`GITHUB_`, `GOOGLE_DRIVE_`, `SLACK_`). Until set, the tile on `/connections` is greyed "not configured"                                     |
| `BRAIN_SEAL_KEY`                           | 64 hex characters; encrypts stored connector tokens. Default: derived from `BRAIN_AUTH_SECRET` (HKDF), so rotating that secret without setting this makes linked accounts unreadable |

A bad setting prints one `brain: ...` line and exits 1 before anything is created; an unknown argument exits 2.

Production (Postgres, identity, `/healthz`; the container image runs this):

```bash
DATABASE_URL=postgres://... BRAIN_AUTH_SECRET=<32+> IDENTITY_SECRET=<32+> BASE_URL=https://brain.example.com node dist/bin.js serve
```

`PORT` defaults to 8080, `HOST` to `0.0.0.0`. Identity answers under `/api/auth/*` and `/.well-known/*`. The Google, connector and seal-key variables above apply here too. See `src/serve/README.md`.

## Try it

```bash
# 1. sign up; the response sets the session cookie (the Origin header is identity's CSRF check)
curl -s -c jar -H 'origin: http://localhost:8787' -H 'content-type: application/json' \
  -d '{"name":"Ann","email":"ann@example.com","password":"<a long unusual password>"}' \
  http://localhost:8787/api/auth/sign-up/email
# 2. call the API with the cookie (without it: 401)
curl -s -b jar http://localhost:8787/v1/documents
```

Open `http://localhost:8787/graph` in the same browser for the graph. MCP clients use an access token from identity's OAuth flow (see `/connections`) as `Authorization: Bearer <token>`.

## Who a document's ACL names

Connectors write names like a Drive email or a GitHub login into ACLs; identity ids are random. A person matches their identity id, their verified email, every linked account id and the teams of any of those. Details and the open GitHub login mapping are in `src/gate/README.md`.

## Not built yet

No webhooks, no `reach` or `neighbors` routes, no review queue or dream cycle (see `docs/brain/research/exact/README.md`).

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
