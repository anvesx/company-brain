# Brief: write "How to build it" blocks for the company brain cards

Work dir: `docs/brain/`. The brain is a STANDALONE product (working name "Devx Brain"). It is not part of any OS.
Never write "Devx OS", "Company OS" or "v2". Where a card leans on a gateway, identity, policy, memory or
observability service, name a standalone pick instead (LLM gateway such as LiteLLM, OIDC provider such as Keycloak/Ory,
OPA or Cedar, OpenTelemetry). No em dashes, no emoji. Plain short sentences.

## Inputs
- `skeleton.json` (ids, labels, kinds, PINs), `stages/<stage>/<group>.json` (the existing spec card: read `deep.algorithm`,
  `inn`, `out`, `store`), `research/INDEX.md`, `research/repos.md`, `research/techniques.md`, `research/products.md`.
- Read `EXAMPLE-build.json` for the exact shape.

## Output
One file per group you own: `builds/<group>.json` = `{ "<comp_id>": <build block>, ... }` for EVERY id in the group.
Build block keys (all required):
- `milestone`: "M0".."M5". M0 walking skeleton (one app, memory adapters, one MCP search tool returning pointers). M1 freshness.
  M2 permissions. M3 retrieval quality. M4 AI-client distribution. M5 scale and governance.
- `effort_days`: number 0.5..30 (one engineer, honest).
- `depends_on`: component ids (from skeleton.json) to build first. No self reference.
- `stack`: list of `{part, pick, why}`, at least 2. Pick real, named tools/libraries with versions or the exact managed service.
  Say what NOT to pick when the choice is a trap.
- `install`: list of exact shell lines (pip/npm/docker/brew/psql), at least 2.
- `layout`: list of files/dirs to create, each as `path : what it holds`, at least 2.
- `schema`: ONE string. The real DDL / JSON schema / proto the card owns. Runnable, not pseudo.
- `interface`: ONE string. The function signature, HTTP route, or MCP tool definition other cards call.
- `code`: ONE string, 15 to 40 lines of the core logic in Python or TypeScript. Real, not pseudo. Include the one tricky part.
- `steps`: list of `{do, done_when}`, 4 to 8. Ordered. `done_when` is observable (a command output, a row count, a passing test).
- `config`: object key -> "value // why", at least 3 keys.
- `verify`: list of exact commands/tests with the expected output, at least 2.
- `pitfalls`: list, at least 2. Concrete traps with the symptom.

## Truth rules
- Only vendor facts present in `research/*`. Do not invent API fields or version numbers; if unsure write "check current docs" in `why`.
- Use the card's PIN as the core of `code`.
- Keep each string under 1500 chars except `code`.

## Gate
`python3 -I build_brain.py --gate-only --all 2>&1 | grep "build <ids>"` shows your remaining errors. Fix until none for your ids.
Write only `builds/<your groups>.json`. Do not edit anything else. Do not commit. Report in under 80 words.
