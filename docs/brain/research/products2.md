# Devx Brain: product research, round 2 (2026-10-23)

Extends products.md. Each row's URL was opened with WebFetch unless status is snippet (taken from search results, page blocked or empty) or failed. Prices and counts are vendor claims; "not on page" means the opened page did not state it.


## 1 enterprise search / company brain

**Glean** (ok) <https://www.glean.com/product/overview>
- Facts: Assistant, Agents, model routing across 40+ models, Glean Protect for sensitive content and anomaly detection. Connector claim 275+ (glean.com/pricing page, opened). Pricing: demo only. Permissions and deployment not stated on page (earlier research: crawl index, ACL mirror, vendor tenant).
- Versus us: Indexes and stores content in the vendor tenant and ships first-party agents and a build platform. We keep pointers only and fetch live.

**Microsoft 365 Copilot** (ok) <https://www.microsoft.com/en-us/microsoft-365-copilot/pricing>
- Facts: Pre-built agents (Researcher, Analyst, Facilitator), Agent Builder and Copilot Studio, connectors feeding Work IQ. Pricing: Business add-on from $18/user/month yearly (promo to 2026-12-31), Business Standard plus Copilot $23.50, Business Premium plus Copilot $32; agent actions metered in Copilot Credits.
- Versus us: Tied to the Microsoft Graph and tenant. Agents write and act; ours is a read-only retrieval layer. Pricing is public, ours is not set.

**Gemini Enterprise** (ok) <https://docs.cloud.google.com/gemini/enterprise/docs/overview>
- Facts: Intranet search, assistants, Agent Gallery, custom agents, customizable RAG agent, Gemini Notebook Enterprise. Prebuilt connectors named: Confluence, Jira, SharePoint, ServiceNow. Editions: Standard, Plus, Pay-as-you-go, Frontline, Business. Access-controlled results with SSO. cloud.google.com product page returned a title only.
- Versus us: Google-hosted store with editions and an agent gallery. We are cloud-neutral and pointer-only.

**Atlassian Rovo** (ok) <https://www.atlassian.com/software/rovo>
- Facts: Search, chat, agents that handle next steps, a Teamwork Graph linking work items, projects, teams and goals; admin controls on AI access. Connector count and price not on page.
- Versus us: Strong on a typed work graph inside Atlassian; we have no graph product surface and no agents.

**Notion AI** (ok) <https://www.notion.com/product/ai>
- Facts: Notion Agent (creates and edits pages and databases), Custom Agents on trigger or schedule, AI meeting notes, Enterprise Search (beta, Business) across Slack, Google Drive, GitHub, Workers for custom code. Credits: 1,500 Standard plus 500 Select per seat per month. SAML SSO, private teamspaces; Enterprise zero data retention with LLM providers.
- Versus us: Search is one feature of a workspace with writes and scheduled agents. We do not host documents.

**Slack AI** (ok) <https://slack.com/features/ai>
- Facts: Channel and thread summaries, daily recap, Slackbot agent, Workflow Builder, AI meeting notes, Agentforce agents that query data and trigger actions. AI included in paid plans; no prices on page.
- Versus us: Lives inside Slack and is the only party allowed to index Slack content; we query Slack live only.

**ChatGPT company knowledge** (snippet) <https://help.openai.com/articles/12628342>
- Facts: Turned on per chat; searches connected apps (connectors renamed apps in Dec 2025) with citations. Enterprise/Edu connectors off until admin approves; Business auto-enabled; group-level permissions. Apps need search and fetch. Source: search result snippets (help page returned 403).
- Versus us: Chat-only surface, no REST index we control, apps must expose search and fetch. Similar live-fetch idea, but vendor-hosted.

**Claude Enterprise (search, connectors, memory)** (ok) <https://support.claude.com/en/articles/12138966-release-notes>
- Facts: Past-chat search, projects with org-wide sharing, memory (off by default on Team/Enterprise), connectors with per-role tool control (2026-05-28), Microsoft 365 connector gained write tools for email, calendar, OneDrive/SharePoint (2026-07-07), SCIM groups with custom roles. anthropic.com/claude/enterprise returned 404.
- Versus us: Live MCP, no index. We add a cross-app index and ranking that MCP alone does not give.

**Dust** (ok) <https://dust.tt/>
- Facts: Custom agents with reusable skills and human review, 70+ connectors, 20+ models, dual-layer permissions (what agents access vs who can use them), SCIM groups, audit logs, SOC 2 Type II, US or EU residency, single-tenant deployment. Pricing: enterprise credits, no figures.
- Versus us: Agent platform with its own store; we are retrieval infrastructure.

**Sana (Workday)** (snippet) <https://sana.ai/>
- Facts: Agents; per snippet sources: 100+ connectors claimed at Workday acquisition, 18 at Sana Enterprise launch; sold via Workday Flex Credits, no extra licence. sana.ai page body gave no details.
- Versus us: HR/finance-centred, tied to Workday licensing. We are app-neutral.

**Guru** (ok) <https://www.getguru.com/>
- Facts: Curated knowledge with verification: flags conflicting versions, merges duplicates, drafts docs from Slack threads, surfaces gaps, Knowledge Agents verify and unverify. Delivers to Slack, Teams, Chrome, Cursor, Claude, MCP. Role-scoped answers, SSO, audit trails, DLP, SOC 2 Type 2, HIPAA-ready. Pricing not on page.
- Versus us: Owns and maintains a managed knowledge base; we do not curate or verify content.

**Moveworks** (ok) <https://www.moveworks.com/us/en/platform>
- Facts: Tool Studio and Agent Architect, Knowledge Studio, Employee Comms, insights, Conversations API, MCP plugins, agent marketplace (free to install), Assistant Builder (coming soon). 'Hundreds' of connectors. Permission-aware by role, region, language. Deployment and price not stated.
- Versus us: Employee-support agents with actions across ITSM and HR; we do not execute actions.

**Coveo** (ok) <https://www.coveo.com/en/platform>
- Facts: Generative answering, recommendations, personalization, passage retrieval API for agents, Coveo Headless UI toolkit, analytics. 100+ content sources. Single SaaS platform; ISO 27001, SOC2, HIPAA. Permissions not described on page.
- Versus us: Ships personalization, analytics and UI kit; copy of content in the index. SaaS only.

**Onyx (open source)** (ok) <https://onyx.app/>
- Facts: Open-source chat and search, 40+ or 50+ connectors (page gives both), permissions enforced at query time, self-host in your cloud, bare metal or air-gapped. License not named on page; about 20k GitHub stars. Pricing on separate page.
- Versus us: Closest in shape (self-host, query-time permissions). It indexes content; we store pointers only.

**Elastic Search AI** (ok) <https://www.elastic.co/enterprise-search>
- Facts: Hybrid vector and keyword search with reciprocal rank fusion, semantic_text, Agent Builder (ES|QL tools, multi-turn memory, MCP and A2A), prebuilt connectors, web crawler, RBAC with document and field-level security. Self-managed, Cloud, Serverless, air-gapped. Pricing on separate page.
- Versus us: A toolkit you operate and fill with copies of content. We would be a finished product with ACL sync and live fetch.

**Perplexity Enterprise** (ok) <https://www.perplexity.ai/enterprise>
- Facts: Computer (coordinates 20 models), internal file answers plus web research, Comet browser agent, SSO, SCIM, audit logs, retention up to 1 day, SOC 2 Type II, HIPAA. Tiers Enterprise Pro and Max; prices not listed; connector list not shown.
- Versus us: Web-first with agentic browser; our corpus is private apps only.

**Writer** (ok) <https://writer.com/platform/>
- Facts: Playbooks, Skills, Memory, Knowledge Graph, Triggers, WRITER Agent that runs tasks end to end; connectors named: Salesforce, Snowflake, Microsoft 365, Google Workspace, HubSpot, Gong, PitchBook, ZoomInfo, FactSet. Granular controls over knowledge, tools, roles. Many compliance badges. No prices.
- Versus us: Content-creation agent platform with a knowledge graph; not a neutral retrieval layer.

**Hebbia** (ok) <https://www.hebbia.com/>
- Facts: Max (finance AI analyst) and Matrix (grid research over many documents); integrations: SEC filings, FactSet, S&P Capital IQ, PitchBook, SharePoint, Box, Salesforce, Snowflake. Permissions, deployment and price not on page.
- Versus us: Vertical finance workbench; we are horizontal and have no grid or analysis UI.

**Vectara** (ok) <https://www.vectara.com/>
- Facts: Managed agents (Failure Analysis, Engineering Knowledge Search, Customer Support), multimodal parsing, hybrid search, rerank, hallucination detection, agent harness with skills, MCP, memory, REST, MCP and A2A interfaces. Enforces source ACLs with SSO. SaaS, VPC (AWS, Azure, GCP), on-prem, air-gapped. Pricing on a separate page.
- Versus us: Same deployment spread we want, plus hallucination scoring and parsing. It stores content; we store pointers.

**Mendable** (ok) <https://www.mendable.ai/>
- Facts: Customer and employee Q and A trained on docs and support channels; 20+ connectors, cron and webhook sync, search bar and chat widgets, SOC 2 Type II, SSO, RBAC, BYO key/model. Free plan 300 or 500 credits (page conflicts); enterprise custom. Page advertises Firecrawl separately; rename not confirmed.
- Versus us: Public docs-assistant, not an internal permissioned brain.


## 2 personal and team memory / capture

**Obsidian** (ok) <https://obsidian.md/>
- Facts: Local Markdown vault, graph view, canvas, thousands of plugins, end-to-end encrypted Sync with shared vaults for teams, Publish. Notes stored locally; vendor cannot read them. MCP/AI plugins are community add-ons, not described on the page.
- Versus us: Human note app; no cross-app index or ACL model.

**Notion (workspace)** (ok) <https://www.notion.com/product/ai>
- Facts: See notion-ai: Notion is the notes and database store; AI agents read and write it.
- Versus us: We never host the content.

**Mem** (failed) <https://mem.ai/>
- Facts: Page would not load (browser-version notice). Not verified.
- Versus us: Not assessed.

**Rewind / Limitless** (ok) <https://www.limitless.ai/>
- Facts: Acquired by Meta. Pendant no longer sold; existing customers supported through 2026 with Unlimited plan free. Rewind sunset, capture stopped 2025-12-19; service ended 2025-12-05 in Brazil, China, EU, Israel, South Korea, Turkey, UK, with data deleted after 2025-12-19.
- Versus us: Personal capture product that closed. Lesson: capture of personal data is exposed to regional and acquirer risk.

**Granola** (ok) <https://www.granola.ai/>
- Facts: Bot-free meeting notes from computer audio, pre-meeting Brief, action items, Chat across meeting history, mobile app, MCP connector for Claude, OpenAI, Cursor. Notes private by default; team roles on a separate Enterprise page. Free plan limits notes older than 30 days.
- Versus us: Single source (meetings) with MCP out; we span all apps.

**Fireflies** (ok) <https://fireflies.ai/>
- Facts: Meeting capture plus 200+ AI Skills, Voice Agents, Live Assist, conversation intelligence, 100+ integrations, MCP server, user groups and channels, SSO, Private Storage on Enterprise with HIPAA BAA. Free plan; prices not on page.
- Versus us: Meetings only, vendor store; writes into CRMs and ATS.

**Otter** (ok) <https://otter.ai/>
- Facts: Transcripts, AI Chat across meetings and connected apps, channels, MCP server, agents for sales, education, media, recruiting, SDR. Integrations include Zoom, Teams, Meet, Slack, Salesforce, HubSpot, Jira, Notion, Glean. Pricing: Basic free, Business from $19.99/user/month.
- Versus us: Meetings first; public price list.

**Fathom** (ok) <https://fathom.ai/>
- Facts: Bot-free or bot capture, summaries, Ask Fathom, topic monitoring, AI scorecards, highlight playlists, public API and MCP; SSO and SCIM, SOC 2 Type II, HIPAA. Free tier; Teams and Individuals plans.
- Versus us: Meetings only; scorecards and coaching are things we lack.

**Screenpipe** (ok) <https://screenpipe.com/>
- Facts: Local screen and audio recording, recall timeline, redaction on device, local DB plus REST and MCP; described as source-available; enterprise workspace with MDM, SSO, audit logs, shared policies. macOS, Windows, Linux. Pricing not shown.
- Versus us: Copies everything the screen shows; we index app data with permissions instead.

**Microsoft Recall** (ok) <https://support.microsoft.com/en-us/windows/retrace-your-steps-with-recall-aa03f8a0-a78b-4b3e-b0a1-2eb8ac48701c>
- Facts: Opt-in screen snapshots every few seconds, local encrypted storage, semantic search, Windows Hello gate; IT cannot force-enable, can disable, cap disk, set retention and filter lists. Needs Copilot+ PC, 50 GB free.
- Versus us: Device-local, personal; no company-wide scope.

**Heyday** (failed) <https://heyday.xyz/>
- Facts: Page returned no content. A Dealroom snippet calls it a browser extension 'AI thought partner'. Status unverified.
- Versus us: Not assessed.

**Reflect** (ok) <https://reflect.app/>
- Facts: Open-source notes app, daily notes, backlinks, local Markdown, iCloud or Git sync, optional AI with your own API key; private notes excluded from AI. Mac app free; iOS paid.
- Versus us: Personal tool; no team features described.

**Capacities** (ok) <https://capacities.io/>
- Facts: Object-based notes (people, books, projects), backlinks, daily notes, AI Assistant (no detail), free plan, Pro price not shown. Built 'For you. Not your team.'
- Versus us: Individual only.

**Tana** (ok) <https://tana.inc/>
- Facts: Meeting platform with shared context graph; agents that run in chat, voice or on schedule; skills; proposals (AI writes only after human approval); MCP server with OAuth read and write; spaces with inherited permissions; integrations GitHub, Slack, Linear, Jira, HubSpot. Free, Pro, Team, Business; prices not retrieved.
- Versus us: Approval-gated writes and an MCP server with writes; we are read-only.


## 3 agent memory layers

**Supermemory (incl. company brain)** (ok) <https://supermemory.ai/>
- Facts: Memory engine via API, plugins and MCP; learner-1 model extracts context into a vector-graph store; integrates with ChatGPT, Claude, Cursor, Claude Code. Claims 187 ms server search, SOC 2, HIPAA, GDPR; runs in customer data center, VPC, laptop or air-gapped. Pricing not on page.
- Versus us: Memory of what agents and users said; ours is an index of company app data with ACLs. Shares deployment spread.

**Mem0** (ok) <https://mem0.ai/>
- Facts: Add, Learn, Retrieve memory loop, compression engine, MCP, benchmarks on LoCoMo, LongMemEval, BEAM; Kubernetes, private cloud or air-gapped; SOC 2 Type 1, HIPAA, BYOK, read/write logging. About 62.6k GitHub stars; license not on page.
- Versus us: Memory for agents, not a company-app index.

**Zep / Graphiti** (ok) <https://www.getzep.com/>
- Facts: Context graphs per user, account or domain with dated facts and source trace, under 200 ms retrieval, access policies, retention, legal hold, audit logs. Cloud, BYOK, BYOC in your VPC; free tier; Graphiti not described on page.
- Versus us: Temporal fact graph; we lack time-versioned facts.

**Letta** (ok) <https://www.letta.com/>
- Facts: Self-improving agents with persistent memory, git-based context repositories, Letta Code CLI (npm). Hosting, license, price not on page; lineage MemGPT.
- Versus us: Agent runtime with memory; not a retrieval service.

**Cognee** (ok) <https://www.cognee.ai/>
- Facts: remember, recall, improve; auto-generated ontologies; connectors Slack, GitHub, Linear, warehouses, docs; MCP and Python SDK; integrates with Claude Code, Codex, Cursor, LangGraph; open-source core (32.7k stars), Cognee Cloud, BYOC. Permissions control offered. Pricing on separate page.
- Versus us: Graph and ontology build, copies content; we use pointers and live fetch.

**LangMem** (ok) <https://langchain-ai.github.io/langmem/>
- Facts: Memory API, hot-path memory tools, background memory manager, LangGraph store integration; pip install; license not on page.
- Versus us: Library for one agent framework.


## 4 captures AI chats / agent sessions for a team

**GitHub Copilot Spaces** (ok) <https://docs.github.com/en/copilot/concepts/context/spaces>
- Facts: Group repos, files, PRs, issues, notes into context; org spaces shared at admin, editor, viewer or no access; viewers see only sources they can access; usable in IDE via GitHub MCP. Usage consumes AI credits.
- Versus us: Scoped to GitHub-style sources; viewer-permission rule matches ours.

**GitHub Copilot Memory** (ok) <https://docs.github.com/en/copilot/concepts/agents/copilot-memory>
- Facts: Public preview. Repo facts and user preferences, only from Copilot activity; unused entries deleted after 28 days; facts validated against current branch; owners review and delete; admins export or delete on Business/Enterprise.
- Versus us: Auto-captures from agent use with expiry and validation; we do not capture agent sessions.

**Cursor rules (Team Rules)** (ok) <https://cursor.com/docs/context/rules>
- Facts: Project rules in .cursor/rules, user rules, Team Rules from dashboard on Team/Enterprise with admin enforcement, AGENTS.md; precedence Team then Project then User. Page does not cover memories.
- Versus us: Static instructions, not captured knowledge.

**Warp** (ok) <https://www.warp.dev/>
- Facts: Enterprise admin (identity, agent governance, roles), Warp Drive for team workflows, Factories for fleets of agents, runs steerable from web, mobile, terminal; Factories priced per agent run. Shared sessions not confirmed on page.
- Versus us: Terminal and agent runner; no cross-app retrieval.

**Entire** (ok) <https://entire.com/?redirected_from=entire.io>
- Facts: Stores every agent session in the repo as checkpoints paired with commits; secret redaction; agentic search across repos, commits and sessions; works with Claude Code, Codex, Gemini, Cursor; CLI MIT-licensed; multi-region residency. Pricing not on page.
- Versus us: Captures agent conversations with commits; we have no agent-session source.

**AgentOps** (ok) <https://www.agentops.ai/>
- Facts: Agent tracing, session replay, cost tracking; 400+ frameworks; Basic free (5,000 events), Pro from $40/month, Enterprise on-prem or self-host on AWS, GCP, Azure; RBAC on Pro.
- Versus us: Observability for agent builders, not team knowledge.

**LangSmith** (ok) <https://www.langchain.com/langsmith>
- Facts: Agent tracing, online evals, alerts, Insights clustering of traces, SmithDB; managed cloud (GCP us-central-1), BYOC, self-hosted Kubernetes; free tier, paid by trace volume.
- Versus us: Traces for debugging, not searchable team memory.

**Langfuse** (ok) <https://langfuse.com/>
- Facts: Tracing, evals, prompt management, annotation, cost monitoring; MIT licensed, self-host with Docker, Helm, Terraform; Hobby free 50k observations/month; SSO on enterprise self-host.
- Versus us: Same: observability.

**Claude Code team analytics** (ok) <https://code.claude.com/docs/en/analytics>
- Facts: Usage and contribution dashboards, PR attribution by matching session activity to merged PRs (21 days before to 2 after), leaderboard, CSV export, OpenTelemetry export, Enterprise Analytics API. Not session content sharing.
- Versus us: Measures usage; does not share or search session content.

**Claudebin, claude-memory, Session-recall (community)** (snippet) <https://lethain.com/sharing-claude-transcripts/>
- Facts: Community tools: Claudebin gives a shareable URL for an exported session; claude-memory syncs session markdown over Git; Session-recall searches past Claude Code and Codex chats; Lethain describes an internal transcript repository and viewer. From search snippets plus one opened post; license and maintenance unchecked.
- Versus us: Ad hoc session sharing; no permission model or index across apps.


## Features they have that Devx Brain lacks (each cited above)

1. Agents that act and write: Microsoft Copilot Studio, Notion Agent, Slack/Agentforce, Moveworks, Writer, Tana (approval-gated writes), Claude M365 write tools. We are read-only retrieval.
2. Agent builders and marketplaces: Dust, Moveworks, Copilot Studio, Gemini Agent Gallery, Glean Agents.
3. Content curation and verification: Guru verifies, merges duplicates and flags stale pages.
4. Time-versioned facts and ontologies: Zep context graphs with dated facts, Cognee generated ontologies, Atlassian Teamwork Graph.
5. Hallucination scoring and multimodal parsing: Vectara.
6. Embeddable search UI, personalization and analytics: Coveo.
7. Capture sources we do not have: meetings (Granola, Fireflies, Otter, Fathom), screen (Screenpipe, Recall), agent sessions tied to commits (Entire), Copilot Memory with 28-day expiry.
8. Admin surfaces: per-role tool control (Claude), SCIM groups, usage-based spend controls (Microsoft Copilot Credits).
9. Public pricing and compliance badges (Otter, AgentOps, Microsoft, Fathom: SOC 2 Type II, HIPAA).
10. Large connector claims: Glean 275+, Dust 70+, Fireflies 100+, Coveo 100+.

## What we do that they do not (evidence-limited)

1. Pointer-only index with live fetch: none of the opened pages describe this. Glean, Coveo, Onyx, Elastic, Vectara, Dust store or index content. Claude and ChatGPT are live but have no index. Caveat: absence on a marketing page is not proof.
2. Query-time permission check with the asking user's token on top of mirrored ACLs: Onyx states query-time enforcement and GitHub Spaces states viewers see only their sources; neither describes a live per-user recheck of top results.
3. Neutral REST plus MCP index over many apps, deployable in VPC or air-gapped: Vectara, Onyx and Supermemory offer similar deployment, so this is shared, not unique.
4. Slack handled by contract (live only): no opened vendor page mentions Slack API terms.

## Gaps and cautions
- Mem and Heyday pages failed. ChatGPT company knowledge, Sana and the session-sharing tools rest on search snippets.
- Gemini Enterprise product page returned a title only; docs page used.
- Pricing found: Microsoft (above), Otter Business $19.99, AgentOps Pro $40, Notion credits. Glean, Dust, Gemini, Moveworks, Coveo, Vectara: not public.
