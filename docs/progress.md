# Progress

Completion is 63% (26 of 41 units), computed on 6 Nov 2026. The number on line 1 of the README
comes from this file. A unit counts only when working software exists and CI is green for it.
Scaffolding, specs and design cards count as zero.

## Denominator

The 41 units are the committed backlog, not the whole design. The design in docs/brain has 152
components in 28 groups, and no group is closed on the board, so the percentage overstates
progress against the full vision. It measures how much of the committed backlog works.

- 29 shippable packages across the three repos.
- 6 capabilities the README lists as not built: validity and supersession of facts, memory
  distillation, governance (erasure and tenant keys), the evaluation harness, the capture daemon
  and the action agent.
- 5 open gates: Playwright e2e, k6 scale, cross-package integration, the Opus and Codex review of
  features after 2026-11-04, and live checks against real GitHub and Drive accounts.

## Numerator

| Repo | Packages | Counted | Evidence |
| --- | --- | --- | --- |
| company-brain | 11 (8 features, 1 service, 2 apps) | 11 | ci success on main, run 42111951617 |
| connectors | 1 (services/connectors) | 1 | ci success on main 113dd50, run 42120305596; release run 42120305695 published @anvesx/connectors@0.1.0 |
| rag | 17 (7 features, 3 modules, 6 services, 1 app) | 14 | ci success on the merged ci/registry-consume branch, run 41432406130 |

rag is counted from the branch run because the latest main run (41436491134) was still in progress
and the earlier main runs failed before the registry fix. Re-check once it finishes.

Three rag packages are not counted because the board shows a quality gate not green: hybrid-search
(mutation 73.81 against a break of 80), mcp-service and connector-runtime (Stryker not green).

Planned capabilities counted: 0 of 6. Gates counted: 0 of 6. The registry publish for connectors
is already inside the connectors package above, so it is not counted twice.

## Total

26 counted, 41 in the denominator, 63.4 percent, rounded down to 63%.

## Not counted and why

- Every package still lacks Playwright e2e and k6 scale tests, which docs/architecture lists as
  gates. They are counted once as gate units, not per package.
- The Playwright e2e suite (tools/e2e) runs in CI as the `e2e` job, against the registry build of
  `@anvesx/connectors`. It passed locally (21 tests) against a built app.
- The brain app in rag keeps its registry and index in memory (board issue 50).
- Nothing was run against real GitHub or Drive accounts.
- The research gap table (docs/brain/research/scale/README.md) has 24 rows marked missing and
  12 partial against the feature specs. None of them is in the denominator; the backlog above is
  the committed scope, the gap table is the research scope.

## Recompute

Update the counts here, then line 1 of the README. Do the same in the rag and connectors repos.
