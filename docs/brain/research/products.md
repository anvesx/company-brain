# Company brain products and app integration: research (2026-10-23)

Scope: how products connect to company apps and keep an index without a full copy. Every row cites a URL in `products.json` (id column). "not public" means not found in sources I could fetch. Many vendor pages blocked fetch or returned snippets only; those are marked search-snippet in the JSON.

## Comparison table

| id | Style | Permissions | Freshness | Storage | Connectors (as stated) |
|---|---|---|---|---|---|
| glean | Hybrid: crawl+index default, live/hybrid per connector | Source ACL map mirrored; some query-time checks | Webhooks else incremental crawl | Vendor tenant | 275+ (vendor claim) |
| m365-copilot | Hybrid: synced into Graph, or federated via MCP | Entra app (synced); OAuth via MCP (federated) | Connector-defined; federated is live | Graph (synced) / none | 100+ |
| gemini-enterprise | Hybrid: ingest or federate, admin chooses | ACL groups via identity sync | Incremental every 3h default | Regional store / none | ~130 listed |
| atlassian-rovo | Hybrid: synced, direct (live), Smart Link | Source restrictions honoured | Ongoing sync, no timing | Teamwork Graph / none | not public |
| notion-ai | not public | not public | not public | not public | 4 named |
| slack-ai | Live (RTS API, MCP) | User OAuth, granular scopes | Live | Slack only; 3rd-party indexes barred | n/a |
| chatgpt-company-knowledge | Hybrid: admin sync plus live apps | Source perms after initial index | not public | OpenAI index | not public |
| claude-connectors | Live via MCP | Inherits each user's permissions | Live | No index | not public |
| dust | Ingest | Space-based | Minutes | Dust | 9 named |
| sana | Ingest (sync) | Mirrors or shared; can over-expose | Real-time sync | Sana | not public |
| guru | Ingest | Optional inherited | not public | Guru | not public |
| moveworks | Hybrid by connector | Permissions store + pre/post filter; OAuth for live | Live for live connectors | Index or none | 35+ classic, 9 Max Capacity |
| perplexity-enterprise | not public | not public | not public | not public | 6 named |
| writer | Live via MCP gateway | Admin read/write per tool | Live + triggers | No index | not public |
| coveo | Crawl+index | Perms stored as item metadata | not public | Coveo | not public |
| elastic | Crawl+index (self-run) | DLS on selected connectors | Scheduled sync | Your cluster | DLS list only |
| salesforce-data360 | Zero-copy (lakes/warehouses) | Partial | Live read | Customer lake | Lakes only |
| databricks-lakehouse-federation | Zero-copy query federation | Unity Catalog | Live | Source | 11 sources |
| supermemory-company-brain, gyld, cognee, pancake | "Company brain/OS" marketing; architecture mostly not public | not public | not public | not public | named apps only |

Pricing: not public for nearly all. Third-party estimates exist (Glean about $30-48/seat/month, Gemini Enterprise about $21/$30/$50-60, M365 Copilot about $30 add-on). Treat as unverified.

Not covered: Hebbia (no source found), Snowflake (only seen as a zero-copy partner in the Salesforce article).

## Verdict: 11 conclusions

1. Every large vendor ships both styles; none is pure. Microsoft, Google, Atlassian, Moveworks and Glean all offer an indexed path and a live path (m365-copilot, gemini-enterprise, atlassian-rovo, moveworks, glean).
2. Vendors say indexed gives better ranking. Google states ingestion "generally improves search quality" and federation may be lower (gemini-enterprise). Atlassian says synced connectors give best search quality (atlassian-rovo). Microsoft says federated connectors get no semantic indexing (m365-copilot).
3. Live federation wins for chat, tickets and email, where content is fresh, per-user, and permission-sensitive. Moveworks runs Slack, Outlook and Jira live (moveworks); Slack designs its RTS API to avoid third-party storage (slack-ai).
4. Indexing wins for large, slow-changing document stores (Drive, SharePoint, Confluence). Those are the connectors Moveworks, Gemini and Glean index (moveworks, gemini-enterprise, glean).
5. For Slack the choice is made by contract, not engineering. API Terms bar third parties from persistent copies, archives or indexes of RTS/Data Access API data, and unlisted apps get 1 request/minute on history (slack-ai). A brain that "indexes Slack" outside Slack's own products needs live query or an internal-app exemption.
6. Permissions are most accurate when the user's own token does the query. Live paths inherit source ACLs for free (claude-connectors, moveworks live, slack-ai). Indexed paths mirror ACLs and can lag; Glean admits 24h permission lag without webhooks (glean) and Sana's shared integrations can over-expose (sana).
7. Hybrid is the practical design for "index but do not copy": store a thin index (titles, snippets, embeddings, ACL fingerprints, source pointers) and fetch full content live at answer time. No vendor documents exactly this thin-index design; Glean, Gemini and Rovo store full content in their tenants. This is an inference, not a finding.
8. Zero-copy (Data 360, Lakehouse Federation) solves structured warehouse data only. It does not reach Slack, Notion or Jira (salesforce-data360, databricks-lakehouse-federation).
9. MCP is the cross-vendor live-access standard in 2026: Microsoft federated connectors, Slack MCP, Claude, Writer, Sana, and Glean's MCP connectors use it. MCP gives tools, not search; Glean says MCP tools do not make content searchable (glean, claude-connectors, writer).
10. Freshness depends on source push support, not vendor. Where webhooks are thin (Notion aggregates events; Gmail watch expires in 7 days) every vendor falls back to polling plus delta tokens (see per-app facts).
11. Treat all connector counts and prices as marketing until a contract says otherwise. Counts range from "9 named" to "275+" and are not comparable (glean, m365-copilot, moveworks).

## Per-app integration facts

| App | Delta/change API | Webhooks | Rate limits | Permission model | ToS limits on indexing |
|---|---|---|---|---|---|
| Slack | Events API (push); search via RTS | Events API, 3s ack, retries; 30,000 deliveries/workspace/app/hr | Tiers 1-4 (1, 20+, 50+, 100+/min); unlisted apps 1/min on history | User OAuth scopes; private needs consent | No persistent copies/indexes of RTS/DAA data; no bulk export; no LLM training. [limits](https://docs.slack.dev/apis/web-api/rate-limits) [events](https://docs.slack.dev/apis/events-api/) [ToS](https://slack.com/terms-of-service/api) [2025 change](https://docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps) |
| Google Drive | changes.getStartPageToken + changes.list | changes.watch; notifies only, then call list; channel expiry not on page | 1,000,000 units/min/project, 325,000/user/min; list=100 units [link](https://developers.google.com/drive/api/guides/limits) | OAuth per user; ACL on each file | Limited Use policy: use only for user-facing features, no transfer, applies to derived data; no explicit AI clause. [changes](https://developers.google.com/drive/api/guides/manage-changes) [policy](https://developers.google.com/terms/api-services-user-data-policy) |
| Microsoft 365 / SharePoint | driveItem/listItem/site delta; tokens expire (directory 7d; Outlook cache-dependent); 410 means full resync | Change notifications (push) combine with delta | 429 + Retry-After; use Graph Data Connect for bulk [link](https://learn.microsoft.com/graph/throttling) | Entra delegated or app permissions | not checked. [delta](https://learn.microsoft.com/graph/delta-query-overview) |
| Notion | not found | page.content_updated (aggregated, can lag minutes), comment.created, page.locked, schema_updated; payload has IDs, not content [link](https://developers.notion.com/reference/webhooks) | 600/min (about 10/s) Business/Enterprise; 180/min others [link](https://developers.notion.com/reference/request-limits) | Integration sees only pages shared to it (not verified on a page) | not verified (terms page redirected, not read) |
| Jira / Confluence | not found | Jira REST-registered webhooks expire in 30 days unless extended; run without user context so may reveal sensitive data [link](https://developer.atlassian.com/cloud/jira/platform/webhooks/) | Points: 65,000/hr global pool; 100 req/s GET/POST burst; enforced from 2026-03-02 for Forge/Connect/OAuth 3LO [Jira](https://developer.atlassian.com/cloud/jira/platform/rate-limiting/) [Confluence](https://developer.atlassian.com/cloud/confluence/rate-limiting/) | OAuth 3LO per user; webhooks bypass user permissions | Developer terms s9: only data user authorised or app needs; no sale; consent before storing; no explicit caching/AI clause [link](https://developer.atlassian.com/platform/marketplace/atlassian-developer-terms/) |
| GitHub | not found (use events/webhooks) | Repo, org, App scoped webhooks [link](https://docs.github.com/en/webhooks/about-webhooks) | 5,000/hr user; App installation 5,000 min to 12,500 (15,000 on GHEC); 100 concurrent; 900 REST points/min [link](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) | App installation tokens scoped to repos | not checked |
| Salesforce | Change Data Capture, 72h replay window (search snippet) | CDC via Pub/Sub API/CometD, not HTTP webhooks | 24h event allocation: 10,000 Developer, 25,000 Enterprise, 50,000 Unlimited/Performance, shared across clients [link](https://developer.salesforce.com/docs/atlas.en-us.242.0.change_data_capture.meta/change_data_capture/cdc_allocations.htm) | Sharing rules, FLS; not verified in fetched page | not checked |
| HubSpot | not found | Workflow webhook actions need Marketing Enterprise; do not count toward API limit | Private apps: 100-190 per 10s per app; 250,000-1,000,000/day per account; marketplace apps 110/10s per install [link](https://developers.hubspot.com/docs/api/usage-details) | OAuth/private app scopes | not checked |
| Zendesk | Incremental exports, cursor-based for tickets (time-based can exceed 1,000 items) | not checked | 200-2,500 req/min by plan; incremental exports 10/min (30 with High Volume add-on) [limits](https://developer.zendesk.com/api-reference/introduction/rate-limits/) [exports](https://developer.zendesk.com/api-reference/ticketing/ticket-management/incremental_exports/) | Role-based; not verified | not checked |
| Gmail / Outlook | Gmail: history.list from historyId. Outlook: message/mailFolder delta | Gmail: users.watch via Pub/Sub, renew within 7 days, 1 notification/s/user, can be dropped [link](https://developers.google.com/workspace/gmail/api/guides/push). Outlook: Graph change notifications | Gmail not captured; Graph per throttling page | Per-mailbox OAuth | Gmail: Google Limited Use policy; Outlook not checked |
| Linear | not found | Data-change webhooks (issues, comments, projects, documents...); retries 1m, 1h, 6h; may be disabled if unresponsive [link](https://linear.app/developers/webhooks) | 2,500/hr API key, 5,000/hr OAuth per user; complexity 2-3M points/hr; query cap 10,000 [link](https://linear.app/developers/rate-limiting) | Workspace/team scope; OAuth | not checked |
| Figma | not found | File webhooks: limits 150/300/600 by plan; 3 per file; team-context events skip invite-only folders [link](https://developers.figma.com/docs/rest-api/webhooks/) | Per seat, plan and endpoint tier; View/Collab seats get 20/month on Tier 1 (page internally inconsistent) [link](https://developers.figma.com/docs/rest-api/rate-limits/) | Seat type decides limits | not checked |

Gaps: delta APIs for Notion, Jira, GitHub, HubSpot, Linear, Figma and webhook details for Zendesk were not retrieved; ToS limits for most apps other than Slack, Google and Atlassian were not read.
