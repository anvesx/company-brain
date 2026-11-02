# Progress

Completion is 62% (25 of 40 units), computed on 2 Nov 2026. The number on line 1 of the README
comes from this file. A unit counts only when working software exists and CI is green for it.
Scaffolding, specs and design cards count as zero.

## Denominator

The 40 units are the committed backlog, not the whole design. The design in docs/brain has 152
components in 28 groups, and no group is closed on the board, so the percentage overstates
progress against the full vision. It measures how much of the committed backlog works.

- 28 shippable packages across the three repos.
- 6 capabilities the README lists as not built: validity and supersession of facts, memory
  distillation, governance (erasure and tenant keys), the evaluation harness, the capture daemon
  and the action agent.
- 6 open gates: Playwright e2e, k6 scale, cross-package integration, the two apps consuming the
  registry instead of `link:`, the Opus and Codex review of features after 2026-11-04, and live
  checks against real GitHub and Drive accounts.

## Numerator

| Repo | Packages | Counted | Evidence |
| --- | --- | --- | --- |
| company-brain | 10 (7 features, 1 service, 2 apps) | 10 | ci success on main, run 41417260679 |
| connectors | 1 (services/connectors) | 1 | ci success, release published @anvesx/connectors@0.1.0, run 41418112440 |
| rag | 17 (7 features, 3 modules, 6 services, 1 app) | 14 | ci success on the merged ci/registry-consume branch, run 41432406130 |

rag is counted from the branch run because the latest main run (41436491134) was still in progress
and the earlier main runs failed before the registry fix. Re-check once it finishes.

Three rag packages are not counted because the board shows a quality gate not green: hybrid-search
(mutation 73.81 against a break of 80), mcp-service and connector-runtime (Stryker not green).

Planned capabilities counted: 0 of 6. Gates counted: 0 of 6. The registry publish for connectors
is already inside the connectors package above, so it is not counted twice.

## Total

25 counted, 40 in the denominator, 62.5 percent, rounded down to 62%.

## Not counted and why

- Every package still lacks Playwright e2e and k6 scale tests, which docs/architecture lists as
  gates. They are counted once as gate units, not per package.
- The brain app in rag keeps its registry and index in memory (board issue 50).
- Nothing was run against real GitHub or Drive accounts.

## Recompute

Update the counts here, then line 1 of the README. Do the same in the rag and connectors repos.
