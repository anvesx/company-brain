# Standalone Devx Brain research (2026-10-23)

Status: snippet = taken from search-result text, page not fully read; failed = not researched.

- **ip-range** [snippet] Anthropic docs list 160.79.104.0/21 as stable outbound range (MCP tool calls to external servers); inbound 160.79.104.0/23 + 2607:6bc0::/48. Shared across services; no per-org egress. https://platform.claude.com/docs/en/api/ip-addresses
- **ip-range-net** [snippet] Same range reported on network-requirements page. https://claude.com/docs/claude-tag/admins/network-requirements
- **ip-range-issue** [snippet] UNVERIFIED user report that some traffic did not arrive from the published range; do not rely on IP allowlist alone, keep OAuth. https://github.com/anthropics/claude-ai-mcp/issues/422
- **dir-submit** [snippet] Requirements: security standards, tool annotations (title + readOnlyHint/destructiveHint on every tool), OAuth 2.0 for authenticated services, clear docs; need production remote server, support channel, test account with sample data. https://claude.com/docs/connectors/building/submission
- **dxt-allow** [snippet] Owners of Team/Enterprise can enable allowlist (Desktop 0.13.91+); off by default; non-listed extensions removed; users cannot drag in .mcpb; owners can upload internal .mcpb; update by bumping manifest version, same name; machine-level policy overrides; does not stop local file edits. https://support.claude.com/en/articles/12592343-enabling-and-using-the-desktop-extension-allowlist
- **local-mcp** [snippet] Local MCP servers and .mcpb covered here (only seen in search snippet). https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop
- **glean-dep** [snippet] Glean offers Glean-hosted and customer-hosted (formerly Cloud-Prem, in customer GCP/AWS) tenants; same product; Glean handles upgrades and support access. https://docs.glean.com/get-started/prepare/about-deployment
- **glean-tenancy** [snippet] Glean says it is always single-tenant, hosted centrally or in customer cloud. https://help.glean.com/en/articles/10093412-glean-deployment-options
- **glean-cmk** [snippet] Job posting only: team works on BYO-VPC, CMK, air-gapped. UNVERIFIED as GA feature. https://www.theladders.com/job/software-engineer-cloud-infrastructure-glean-san-francisco-ca_88164829
- **dust-onyx-sana-moveworks** [failed] Not researched; no source read. 
- **ai-act-26** [snippet] Art 26(7): before using a high-risk system at work, deployers inform workers' representatives and affected workers; 26(6) keep logs at least 6 months; applies to high-risk (Annex III employment) only. Application dates not checked (possible delay) - UNVERIFIED. https://artificialintelligenceact.eu/article/26/
- **ai-act-art4-emotion** [failed] Not researched; no source read. 
- **betrvg** [snippet] BAG reads 87(1) no.6 broadly (objectively suitable monitoring devices; intent irrelevant). Hamburg ArbG 24 BVGa 1/24 (interim) reportedly rejected co-determination for browser ChatGPT use; secondary sources, outcome from Roedl. https://technologyquotient.freshfields.com/post/102jnt2/eu-ai-act-unpacked-17-the-role-of-employee-representatives
- **betrvg-roedl** [snippet] Describes Hamburg ChatGPT dispute and rejection under no.6. https://roedl.com/insights/ki-systeme-arbeitsverhaeltnis-betriebsrat
- **erasure** [snippet] Art 17(3) refusal must be justified, only strictly necessary data retained; a Cyprus decision accepted 6-year retention of dismissal records for legal claims (relied on 17(1)(b)). No EDPB legal-hold guidance found. https://edpb.europa.eu/sites/default/files/article-60-final-decisions/summary/publishable_fr_2019-10_right_to_erasure_ignored_summarypublic.pdf
- **offboarding-tokens** [failed] Not researched. 
- **gdpr15-ca-ny-notice** [failed] Not researched. 
- **scim-sso** [failed] Not researched. 
- **embed-price** [snippet] text-embedding-3-small $0.02 per 1M input tokens; large $0.13 (third party). https://developers.openai.com/api/docs/models/text-embedding-3-small
- **pinecone** [snippet] Serverless storage $0.33/GB/month on paid plans; billed hourly. Cost per million docs not computed. https://www.pinecone.io/pricing.md
- **competitor-pricing** [failed] Not researched. 
- **rag-leak** [snippet] SBSeg paper proposes synthetic benchmark for RAG authorization; only intro seen. No established public leak benchmark found; OWASP LLM Top 10 2025 has Vector and Embedding Weaknesses (LLM08, from practitioner summary). https://sol.sbc.org.br/index.php/sbseg_estendido/article/download/44552/44315/
- **soc2-iso** [failed] Not researched. 
- **mdm-notarize** [failed] Not researched. 
