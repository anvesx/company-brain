# ADR 0003: Connector sourcing

Status: Proposed | Date: 2026-11-02 | Scope: Slack, Google Drive, GitHub, Notion, Confluence, Jira (minimum)

## Context

Company Brain needs source connectors that (1) list documents with ACLs (users and groups who can read),
(2) fetch text with the end user's own token, and (3) deliver change events (webhook or delta cursor).
Composio is the reference, but its SDK (`@composio/core`, ISC) calls a hosted API and needs a
`COMPOSIO_API_KEY` (repo README). That makes it a paid, third-party runtime dependency for every read.
We want free, self-hostable, permissive, and usable from plain TypeScript (Node 26) with no extra server.

Key requirement that most aggregators miss: **ACL listing**. Retrieval must filter by who can read, so a
connector that only returns "documents" is not enough. Generic wrappers expose actions ("list files"), not
permission graphs.

## Evidence

npm data from `npm view <pkg> license version time.modified` on 2026-11-02. Licences for repos read from each
repo's LICENSE file via the GitHub API.

| Option | Licence (verified) | Version / modified | Unpacked size | TypeScript | Plain npm import | OAuth / per-user token | ACLs exposed |
|---|---|---|---|---|---|---|---|
| googleapis / @googleapis/drive | Apache-2.0 | 189.0.0 (2026-10-30) / drive 27.0.0 (2026-10-20) | 247 MB / 2.5 MB | Bundled .d.ts | Yes | You pass an OAuth2 client with the user's token | Yes: Drive `permissions.list`, `changes.list` cursor, `changes.watch` |
| @slack/web-api | MIT | 8.3.0 (2026-10-30) | 3.0 MB | Bundled .d.ts | Yes | You pass the user's token | Partial: channel membership via `conversations.members`; no doc-level ACL |
| @octokit/rest | MIT | 22.0.1 (2026-07-24) | 8 KB wrapper over @octokit/* | Bundled .d.ts | Yes | `auth: userToken` | Yes (repo collaborators, teams, visibility); webhooks for events |
| @notionhq/client | MIT | 5.30.0 (2026-10-30) | 1.5 MB | Bundled .d.ts | Yes | `auth: userToken` | Weak: pages visible to the integration, no per-page permission listing |
| jira.js | MIT | 6.4.0 (2026-10-27) | 20.7 MB | Typed, no `types` field in npm metadata | Yes | Bearer or OAuth2 token | Yes: project permissions, permission schemes, issue security |
| confluence.js | MIT | 3.3.1 (2026-10-13) | 5.8 MB | Bundled .d.ts | Yes | Bearer or OAuth2 token | Yes: content restrictions and space permissions |
| Activepieces pieces (`@activepieces/piece-*`) | MIT outside `packages/ee`; npm `license` field is empty | slack 0.23.1, drive 0.13.1, github 0.11.0, notion 0.8.3, jira-cloud 0.6.2, confluence 0.4.1 (all Oct 2026) | 1.1 to 1.9 MB each | None shipped: pieces are one minified `src/index.js`, no .d.ts | Awkward: needs `@activepieces/pieces-framework` (peer: ai, zod, `@activepieces/shared`) and its run context | Auth handled by the Activepieces server; pieces receive an auth object | No. Drive piece has permission create/delete actions, not an ACL listing or delta cursor |
| Nango | Elastic License 2.0 (repo LICENSE). npm: "SEE LICENSE IN LICENSE FILE" | @nangohq/node 0.71.14 (2026-10-29) | 196 KB (client only) | .d.ts present | Client yes, but it calls a Nango server | Best in class: token vault, refresh, per-user connections | Only what you code in a sync script |
| Pipedream components | Pipedream Source Available License: bans "any commercial use" as an Excluded Purpose (LICENSE) | @pipedream/sdk 3.3.0 (licence "SEE LICENSE") | 2.6 MB | Yes | SDK is a client for Pipedream's hosted Connect API | Hosted by Pipedream | No |
| n8n nodes | Sustainable Use Licence; `.ee.` files unlicensed (LICENSE.md) | n8n-nodes-base 2.15.1 | 71.7 MB | Via n8n-workflow | Needs n8n runtime | n8n credential store | No |
| Airbyte | Platform repo LICENSE is Elastic License 2.0. Per-connector licences not verified here | repo active 2026-11-01 | n/a (Python/Java, Docker) | n/a | No: runs as containers | Per-workspace config | No: moves records, not ACLs |
| Composio OSS | Repo MIT; `@composio/core` ISC 0.27.0 | 2026-10-22 | 4.2 MB | Yes | Yes, but calls hosted API with an API key | Hosted | Not as ACL listings |
| Unified.to / Merge | Both SDKs are clients for paid hosted APIs (`@unified-api/typescript-sdk` 2.86.11, `@mergeapi/merge-node-client` 4.0.4; no npm licence field) | Nov 2026 / Jul 2026 | 73 MB / 13.7 MB | Yes | No: hosted | Hosted | Merge and Unified expose some permission objects, but only on paid plans |

Not verified here: ACL behaviour of Notion, Slack, Jira and Confluence beyond the vendor API surface I know of;
Activepieces permission semantics beyond a string search of the Drive piece bundle; Airbyte connector licences.
Confirm each in a spike (see Consequences) before relying on it.

## Decision

**Use the official vendor SDKs directly, behind a thin in-house `SourceConnector` interface.** One adapter
package per source in `modules/connectors/*`:

```ts
interface SourceConnector {
  listDocuments(ctx: { token: string; cursor?: string }): AsyncIterable<{ doc: DocRef; acl: Acl }>;
  fetchText(ctx: { token: string }, doc: DocRef): Promise<string>;
  changes(ctx: { token: string; cursor: string }): Promise<{ events: ChangeEvent[]; next: string }>;
  verifyWebhook(req: Request): ChangeEvent[]; // Slack Events, GitHub, Drive watch, Jira, Confluence
}
```

Packages: `@googleapis/drive` (not `googleapis`, which is 247 MB), `@slack/web-api`, `@octokit/rest`,
`@notionhq/client`, `jira.js`, `confluence.js`. OAuth is done in our own auth module (authorization-code with
PKCE, refresh tokens encrypted at rest, one row per user and source). The adapter takes the token as a
parameter, so "fetch with the user's own token" is a property of the signature, not a policy.

Reasons:

1. **ACLs are the product requirement and only vendor SDKs reach them.** Drive, GitHub, Jira and Confluence
   expose real permission endpoints. No aggregator surfaces them uniformly, so we would write ACL mapping
   ourselves regardless of which wrapper we picked.
2. **Licences are clean.** All six SDKs are MIT or Apache-2.0. Activepieces is MIT but its npm packages declare
   no licence; Nango and Airbyte are Elastic 2.0; Pipedream and n8n forbid or restrict commercial use.
3. **No server, no hosted dependency.** Each SDK is a plain import, actively maintained (all published within
   the last 3.5 months, five of six within the last 3 weeks), and ships types except where noted.
4. **Delta support is native.** Drive `changes.list` page tokens, GitHub/Slack/Jira/Confluence webhooks, Notion
   `last_edited_time` polling. A wrapper would hide these behind a lowest-common-denominator trigger model.

## Fallback

**Self-hosted Nango, for the OAuth and token layer only** (keep our SDK adapters on top). Trigger: if building
and maintaining OAuth app registration, refresh and revocation for six providers costs more than about two
engineer-weeks, or a customer needs 10+ more sources. Elastic 2.0 permits internal self-hosting; it forbids
offering Nango itself as a hosted service, and the free self-host tier has a limited feature set (Nango README).
Legal sign-off is needed before shipping it inside a product we sell. Second fallback for long-tail actions
only: Activepieces pieces, accepting no types and framework coupling.

## Consequences

- We own six adapters and ACL normalisation (users plus groups to a single `Principal` model). Estimated
  3 to 5 days per source for list, fetch and cursor, plus webhooks.
- We own OAuth: app registrations, scopes, token refresh, secret storage. This is the main cost and the main
  reason Nango is the fallback.
- Notion has no per-page ACL listing, so Notion documents need a coarse rule (workspace-wide or per-integration
  share) and a documented gap. Slack ACL is channel membership, not document-level.
- Install size stays small if we use scoped packages. Avoid `googleapis` and the full `jira.js` bundle where
  tree-shaking allows.
- Adding a source is a new adapter against a stable interface. If we later adopt Nango or a hosted vendor,
  only the token provider changes.
- Next step: a one-day spike per source proving all three capabilities (ACL list, fetch with user token,
  change cursor) against a real test tenant, before committing the adapter estimate.
