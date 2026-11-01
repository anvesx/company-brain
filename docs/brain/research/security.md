# Devx Brain security research (2026-10-23)

Status: ok = page read; snippet = search summary only; failed = not read. Gaps listed at the end.

## A. Personal vs company data
- [snippet] From search summary only (page not fetched): Glean mirrors source-system ACLs and checks user identity at query time; indexed mode relies on crawl snapshots so revocations lag (third-party deepinspect.ai view, unverified). (Glean security principles, https://docs.glean.com/security/security-principles)
- [ok] OAuth preferred for per-user integrations; Glean-issued tokens with X-Glean-ActAs for global permissions; Indexing API needs Glean-issued tokens. Page does not describe permission enforcement. (Glean API authentication, https://developers.glean.com/get-started/authentication)
- [ok] Copilot honors EXTRACT usage right; will not summarize content lacking EXTRACT; DLP can block summarizing labeled files; DKE and user-defined-permission labeled unopened files are inaccessible; container labels are not inherited by items; Teams chat labels not recognized; Graph connector/plugin data labels not recognized; Channel Agent does not check permissions for all channel users. (Purview considerations for M365 Copilot, https://learn.microsoft.com/en-us/purview/ai-m365-copilot-considerations)
- [ok] Shared vector DB in multi-tenant setups can leak one group's embeddings to another; embedding inversion; poisoning via hidden text; mitigate with permission-aware vector stores, logical partitioning, classification tags, immutable retrieval logs. (OWASP LLM08 Vector and Embedding Weaknesses, https://genai.owasp.org/llmrisk/llm082025-vector-and-embedding-weaknesses/)
- [snippet] From search summary: Vec2Text recovers 92% of 32-token inputs exactly; authors say embeddings should be protected like raw text; recovered names from clinical notes. Paper not fetched. (Morris et al. Text Embeddings Reveal (Almost) As Much As Text (EMNLP 2023), https://arxiv.org/pdf/2310.06816)

## B. Credentials
- [ok] Refresh tokens for public clients MUST be sender-constrained or use rotation (4.14); access tokens SHOULD be audience-restricted and sender-constrained; a resource server MUST refuse tokens not meant for it. Sec 4.14 body not read. (RFC 9700 s2.2.2, 2.3, 4.10, https://www.rfc-editor.org/rfc/rfc9700)
- [ok] The resource parameter names the target resource so the AS can audience-restrict the token, reducing redirect risk; distinct from scope. (RFC 8707 Resource Indicators, https://www.rfc-editor.org/rfc/rfc8707)
- [ok] Token exchange via grant type token-exchange with subject_token and optional actor_token; impersonation hides the actor, delegation keeps actor identity (act claim). (RFC 8693 Token Exchange, https://www.rfc-editor.org/rfc/rfc8693)
- [ok] Clients MUST send RFC 8707 resource on auth and token requests; servers MUST validate audience and MUST NOT accept or transit other tokens; clients MUST keep refresh tokens confidential in transit and storage; STDIO servers should take credentials from env. (MCP Authorization spec (draft), https://modelcontextprotocol.io/specification/draft/basic/authorization)
- [ok] Token passthrough is forbidden (servers MUST NOT accept tokens not issued to them); confused-deputy proxies MUST do per-client consent, exact redirect_uri match; state handles are not auth and must be bound server-side to the verified user (draft replaced 2025-11-25 session hijacking section); local servers need sandboxing and consent; scope minimization. (MCP Security Best Practices (draft), https://modelcontextprotocol.io/specification/draft/basic/security_best_practices)
- [ok] Token Vault stores external-provider access and refresh tokens; the app presents an Auth0 refresh token and receives the provider access token via exchange; AI agent calendar example. Only the page's own summary; internals not verified. (Auth0 Token Vault, https://auth0.com/docs/secure/call-apis-on-users-behalf/token-vault)
- [ok] Rotation is opt-in and cannot be turned off; access tokens expire in 12 hours; refresh tokens are single-use and revoked after a short grace period; only 2 active tokens kept if refreshed repeatedly. (Slack token rotation, https://docs.slack.dev/authentication/using-token-rotation)
- [ok] Admin consent grants permissions on behalf of the whole org and lets all users access the app unless assignment is required; Privileged Role Admin needed for Graph application permissions; granting may revoke prior tenant-wide grants; user-granted permissions unaffected. Behavior on consent revocation not covered by page. (Entra tenant-wide admin consent, https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/grant-admin-consent)
- [ok] DWD gives the app access to data of all users in the domain without per-user consent; super admin lists client ID and narrow scopes; deleting the client stops dependent apps immediately; changes can take up to 24 hours. (Google Workspace domain-wide delegation, https://knowledge.workspace.google.com/admin/apps/control-api-access-with-domain-wide-delegation)

## C. Agent security
- [ok] LLM01 Prompt Injection, LLM02 Sensitive Information Disclosure, LLM03 Supply Chain, LLM04 Data and Model Poisoning, LLM05 Improper Output Handling, LLM06 Excessive Agency, LLM07 System Prompt Leakage, LLM08 Vector and Embedding Weaknesses, LLM09 Misinformation, LLM10 Unbounded Consumption. (OWASP Top 10 for LLM Apps 2025, https://genai.owasp.org/llm-top-10/)
- [ok] Root causes: excessive functionality, permissions, autonomy. Mitigations: minimal tools, narrow read-only extensions, run in the user's context, human approval for high impact, complete mediation downstream. (OWASP LLM06 Excessive Agency, https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)
- [ok] Three legs: access to private data, exposure to untrusted content, external communication. Avoid combining all three; guardrail products are not a reliable fix. (Simon Willison, The lethal trifecta, https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/)
- [ok] CaMeL separates control and data flow from the trusted query and uses capabilities enforced at tool calls; solves 77% of AgentDojo tasks with provable security vs 84% undefended. (Debenedetti et al., Defeating Prompt Injections by Design (CaMeL), https://arxiv.org/abs/2503.18813)
- [ok] Detects secrets in git, dirs, stdin; TOML rules, baselines, base64/hex decode, SARIF output; feature complete, security patches only, maintainer moving to Betterleaks. (gitleaks, https://github.com/gitleaks/gitleaks)

## D. Local companion app
- [ok] Recall is off and removed on managed devices by default; snapshots need user opt-in; Windows Hello required; snapshots and vector DB always encrypted with TPM-protected keys used in a VBS enclave; sensitive information filtering on by default; app, URI, retention, storage and Purview DLP policies; WDA_EXCLUDEFROMCAPTURE excludes a window. (Manage Recall (Microsoft Learn), https://learn.microsoft.com/en-us/windows/client-management/manage-recall)
- [snippet] From search summaries: 2024 preview stored data in a readable local SQLite DB; Microsoft pulled and redesigned it (relaunched April 2025); 2026 TotalRecall Reloaded claims same-user malware can still extract data, Microsoft closed as by design (researcher's claim, unverified). (TotalRecall coverage (Hagenah, Beaumont), https://www.bankinfosecurity.com/microsoft-recall-again-spills-secrets-a-31083)
- [snippet] From search summaries: Meta acquired Limitless on Dec 5 2025; Rewind desktop capture ended Dec 19 2025; users can export or delete data; service ended in EU, UK and several other regions. Page not fetched. (Meta acquires Limitless (Rewind), https://9to5mac.com/2025/12/05/rewind-limitless-meta-acquisition/)
- [snippet] WebFetch returned no page body; the summary was model background, not the page. Treat Developer ID, hardened runtime and notarytool as unverified. (Apple notarization, https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)

## Design implications (inference, not sourced)
- Per RFC 9700 and MCP spec: audience-restrict tokens, never pass through; refresh tokens stay server-side in a vault.
- Agent tools must never return credentials; apply the lethal-trifecta rule: no agent with private data, untrusted content and egress together.
- Partition vector indexes per user and per tenant; treat embeddings as sensitive as text.

## Gaps (failed/unresearched)
- Microsoft Presidio: Page only says it moved to data-privacy-stack.github.io/presidio; not read. No claim made.
- trufflehog: Not researched; no source read.
- Sparkle security: 404; not read. No claim made.
- Screenpipe / Granola privacy: Not researched; no source read.
- macOS Keychain, Jamf/Intune rollout: Not researched; no source read.
- Nango, Composio, Arcade token vaults: Not researched; no source read.
- Google and Atlassian refresh token specifics: Not researched; no source read.
