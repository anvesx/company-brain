# Builder briefs

One brief per builder session. A brief names the goal, the files the builder owns (no overlap between
builders), the public interface with real signatures, the acceptance tests that were written first, and
the commands that prove it is done. The tests are the spec: a builder makes them pass and never edits them.

| Brief | Slice | Tests |
|---|---|---|
| [connector-accounts](connector-accounts.md) | connector accounts, token refresh sweep, Google login | `features/identity/tests/{unit/connectors,integration/connectors,integration/google}`, `services/token-refresh/tests` |
| [deploy](deploy.md) | Postgres graph store, root Dockerfile, image workflow (spec `docs/specs/infra/deploy.md`) | `features/graph-store/tests/{contract,postgres}`, `tools/deploy/tests` |
| [brain-mcp](brain-mcp.md) | `@anvesx/brain-mcp` (`services/brain-mcp`), `searchTitles` and `scanTitles`, two install templates (spec `docs/specs/feature/mcp-server.md`) | `services/brain-mcp/tests` |
| [graph-view](graph-view.md) | `modules/graph-view`, `apps/brain`, graph-store batch reads | `modules/graph-view/tests`, `features/graph-store/tests/unit/batch` |

Rules for every brief: builders never edit the lead-owned test folders named in the brief; a diff touching
them is rejected. The verifier's PASS plus the pasted evidence decides the merge.
