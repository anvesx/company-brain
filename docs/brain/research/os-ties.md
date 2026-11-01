# Brain ties to Devx OS (from the read-only mapping agent)

| id | what it does for the brain | standalone replacement |
|---|---|---|
| os_gw | model calls, spend meter, redaction, failover | LLM gateway plus per-team spend ledger |
| os_idp | principals, tenant isolation, audit log | OIDC identity provider plus hash-chained audit table |
| os_pol | allow or deny before an agent action | OPA or Cedar with versioned rule files |
| os_mem | preferences, corrections, lessons | per-tenant table store linked to eval tests |
| os_obs | eval gates, traces, incidents | OpenTelemetry plus CI eval suite plus incident tracker |
| so_admin | admin consent screen | own OAuth consent flow |
| so_oauth | token vault | KMS-wrapped secret store |
| so_svc | app-only sweep access | per-connector service accounts |
| so_obo | per-user token exchange at query | RFC 8693 exchange via the identity provider |
| so_sdk | connector manifest runtime | manifest runtime, own build |
| so_cap | capability probe | static capability descriptor per connector |
| so_rate | per-app rate budget | Redis token bucket |
| so_mcp | MCP client | MCP SDK client |
| so_norm | schema normaliser | own mapping layer |
| so_apps | vendor APIs (external) | none |

Group `xos.reuse` is in stages/xos/reuse.json. The so_* cards are in src.ident and src.rt.
92 `company-os-v2.md` cites sit in 18 stage files. "Devx OS" text appears in 19 files (about 133 hits).
Rules that force the name: BRIEF.md lines 18-32, build_brain.py lines 27, 56, 60, 81, skeleton.py lines 177-178.
