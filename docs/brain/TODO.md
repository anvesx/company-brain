# Company Brain rebuild: completion index

Overall: **5.7% (75/1306)** of weighted items, 31 of 437 items ticked. Evidence date 2026-11-13.

Each module keeps its own checklist next to its code (`<package>/todo/TODO.md`). Planned packages keep theirs in `docs/brain/todo/` until the package exists.

Percent = sum(weight of ticked items) / sum(weight of all items). The overall figure sums the module rows, not their percents.

One agent owns one module at a time; a different vendor reviews; an item is ticked only with executed evidence.

Ticked items stay ticked and stay in their file; they are never deleted, archived or reworded. A proof is an executed command or an explicit sign-off rubric, never a file-existence check, an `rg -c` count or a subjective judgement alone.

| Module | Percent (ticked/total weight) | Ticked / total items | Lead WP | Owner agent | Checklist |
|---|---|---|---|---|---|
| core-types | 12.5% (2/16) | 1/7 | WP-23 | unassigned | [CT](../../features/core-types/todo/TODO.md) |
| graph-store (graph) | 18.0% (9/50) | 3/16 | WP-23 | unassigned | [GS](../../features/graph-store/todo/TODO.md) |
| change-cursor | 9.1% (2/22) | 1/8 | WP-21 | unassigned | [CC](../../features/change-cursor/todo/TODO.md) |
| connector-kit | 6.1% (2/33) | 1/10 | WP-21 | unassigned | [CK](../../features/connector-kit/todo/TODO.md) |
| identity (Google-only sign-in) | 13.2% (7/53) | 2/16 | WP-11 | unassigned | [ID](../../features/identity/todo/TODO.md) |
| query-router | 12.5% (2/16) | 1/6 | WP-25 | unassigned | [QR](../../features/query-router/todo/TODO.md) |
| source-trust | 15.4% (2/13) | 1/6 | WP-25 | unassigned | [STR](../../features/source-trust/todo/TODO.md) |
| zone-policy | 10.0% (2/20) | 1/6 | WP-10 | unassigned | [ZP](../../features/zone-policy/todo/TODO.md) |
| graph-view | 6.1% (2/33) | 1/11 | WP-34 | unassigned | [GV](../../modules/graph-view/todo/TODO.md) |
| graph-sync | 18.5% (5/27) | 2/9 | WP-21 | unassigned | [GSY](../../services/graph-sync/todo/TODO.md) |
| token-refresh | 8.0% (2/25) | 1/8 | WP-14 | unassigned | [TR](../../services/token-refresh/todo/TODO.md) |
| brain-mcp (MCP) | 20.3% (12/59) | 4/17 | WP-26 | unassigned | [MCP](../../services/brain-mcp/todo/TODO.md) |
| apps/brain (the deployable) | 6.2% (2/32) | 1/11 | WP-40 | unassigned | [APP](../../apps/brain/todo/TODO.md) |
| apps/connections (to delete) | 0.0% (0/10) | 0/3 | WP-40 | unassigned | [ACN](../../apps/connections/todo/TODO.md) |
| deploy | 5.0% (2/40) | 1/13 | WP-42 | unassigned | [DEP](../../tools/deploy/todo/TODO.md) |
| e2e harness | 9.1% (2/22) | 1/8 | WP-41 | unassigned | [E2E](../../tools/e2e/todo/TODO.md) |
| fake-guard | 29.4% (5/17) | 2/6 | WP-44 | unassigned | [FG](../../tools/fake-guard/todo/TODO.md) |
| integration harness | 13.3% (2/15) | 1/6 | WP-41 | unassigned | [INT](../../tools/integration/todo/TODO.md) |
| scale (k6) | 5.0% (2/40) | 1/23 | WP-46 | unassigned | [SCL](../../tools/scale-k6/todo/TODO.md) |
| structure-lint | 57.9% (11/19) | 5/9 | WP-00 | unassigned | [SL](../../tools/structure-lint/todo/TODO.md) |
| migrations | 0.0% (0/36) | 0/12 | WP-02 | unassigned | [MIG](todo/features-1/migrations.md) |
| job queue | 0.0% (0/37) | 0/12 | WP-03 | unassigned | [JQ](todo/features-1/job-queue.md) |
| connector vault (OAuth tokens) | 0.0% (0/36) | 0/10 | WP-14 | unassigned | [VLT](todo/features-1/connector-vault.md) |
| webhook verification | 0.0% (0/27) | 0/8 | WP-22 | unassigned | [WV](todo/features-1/webhook-verify.md) |
| visibility gate (permissions) | 0.0% (0/53) | 0/14 | WP-10 | unassigned | [VIS](todo/features-1/visibility.md) |
| cluster engine (clusters) | 0.0% (0/39) | 0/12 | WP-30 | unassigned | [CLE](todo/features-2/cluster-engine.md) |
| entity resolver | 0.0% (0/21) | 0/7 | WP-24 | unassigned | [ER](todo/features-2/entity-resolver.md) |
| audit log | 0.0% (0/27) | 0/9 | WP-15 | unassigned | [AUD](todo/features-2/audit-log.md) |
| observability | 0.0% (0/27) | 0/10 | WP-15 | unassigned | [OBS](todo/features-2/observability.md) |
| design system (UI) | 0.0% (0/26) | 0/9 | WP-31 | unassigned | [DS](todo/features-2/design-system.md) |
| sync runner (connectors) | 0.0% (0/43) | 0/13 | WP-21 | unassigned | [SYN](todo/services-1/sync-runner.md) |
| webhooks | 0.0% (0/29) | 0/9 | WP-22 | unassigned | [WH](todo/services-1/webhooks.md) |
| search | 0.0% (0/34) | 0/10 | WP-25 | unassigned | [SRCH](todo/services-1/search.md) |
| cluster service (files view API) | 0.0% (0/26) | 0/9 | WP-32 | unassigned | [CLS](todo/services-2/cluster-service.md) |
| upkeep (memory hygiene) | 0.0% (0/23) | 0/9 | WP-33 | unassigned | [UPK](todo/services-2/upkeep.md) |
| review queue | 0.0% (0/24) | 0/8 | WP-33 | unassigned | [RVQ](todo/services-2/review-queue.md) |
| connections (OAuth lifecycle) | 0.0% (0/42) | 0/13 | WP-20 | unassigned | [CON](todo/modules-1/connections.md) |
| UI shell and sign-in | 0.0% (0/27) | 0/10 | WP-31 | unassigned | [UIS](todo/modules-1/ui-shell.md) |
| UI: Sources screen | 0.0% (0/24) | 0/9 | WP-31 | unassigned | [UIC](todo/modules-1/ui-connections.md) |
| UI: Files view | 0.0% (0/32) | 0/10 | WP-32 | unassigned | [UIF](todo/modules-2/ui-files.md) |
| UI: Search and Ask | 0.0% (0/21) | 0/7 | WP-35 | unassigned | [UIQ](todo/modules-2/ui-search.md) |
| UI: Activity and review | 0.0% (0/18) | 0/7 | WP-36 | unassigned | [UIA](todo/modules-2/ui-activity.md) |
| contract and acceptance suites | 0.0% (0/15) | 0/4 | WP-01 | unassigned | [CTR](todo/cross/contract-suites.md) |
| RAG contract (apps/rag, separate repo) | 0.0% (0/17) | 0/4 | WP-37 | unassigned | [RAG](todo/cross/rag-contract.md) |
| security | 0.0% (0/27) | 0/8 | WP-45 | unassigned | [SEC](todo/cross/security.md) |
| docs | 0.0% (0/13) | 0/5 | WP-43 | unassigned | [DOC](todo/cross/docs.md) |
| **Total** | **5.7% (75/1306)** | **31/437** | | | |
