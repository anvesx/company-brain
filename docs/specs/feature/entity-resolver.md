# Spec: entity-resolver

Tier: feature. Design cards: ix_ent. Research: graphrag, hipporag.

## Purpose
Decide that "rachit@x.com" in Slack, a GitHub login and a Drive owner are one person node. Pure functions over metadata, no store, no network.

## Reuse decision
`fastest-levenshtein` for name distance (check it installs; else `js-levenshtein`). Rules are ours.

## Public interface
```ts
interface Identity { source: string; handle: string; email?: string; name?: string }
interface Entity { id: string; identities: Identity[] }
function resolve(existing: Entity[], incoming: Identity): { entity: Entity; created: boolean; merged: string[] };
function normalizeEmail(raw: string): string;
```

## Behaviour
1. Same lowercased email (plus-tag and Gmail-dots stripped for gmail.com) merges.
2. Same source+handle merges.
3. Name-only similarity never merges on its own; it needs a shared email domain and distance <= 1.
4. A merge is deterministic: the lowest id survives, input order does not matter.
5. Empty handle, missing email, unicode names and 10k entities (under 50 ms per resolve with an index) are handled.
6. Identities never contain secrets or message text.

## Acceptance tests
- unit + property tests (fast-check): order independence, idempotence, no merge across different emails.
- mutation >= 80.

## Layout
`features/entity-resolver/{src,tests}`: email.ts, match.ts, resolve.ts, index.ts.

## Out of scope
Persistence, graph writes.
