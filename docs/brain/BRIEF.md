# Brief: write spec cards for the standalone company brain drill-down (working name "Devx Brain")

Work dir: `/Users/rachitsrivastava/youtube/Principal Engineering/Company-OS-v2/docs/brain/`.

## What the brain is (design intent, from the owner)
A company brain that connects to every app the company uses. It keeps an automatically updating INDEX of pointers
and does NOT keep its own copy of the content. At question time it fetches the real text live from the app.
It must be auto-updating, indexable and queryable by LLMs (MCP and REST). Permissions follow the asking user.
Core design (our inference, not a documented vendor design): the index stores embeddings, metadata, ACLs and pointers
{uri, version, content_hash, acl_version}; it fetches live content at query time through connectors or MCP.
Freshness = webhook doorbell + delta cursor + polling backstop + reconciliation sweep, with tombstones for deletes,
idempotent compare-and-set by (doc_id, version), durable resumable workflows, and a backfill lane separate from live.
Permissions: sync ACLs and groups as data; pre-filter inside the ANN and BM25 query; live recheck of the top N
with the user's on-behalf-of token (RFC 8693 exchange; MCP forbids token passthrough, requires RFC 8707 + PKCE);
revocation fast path. Retrieval: BM25 + dense, reciprocal rank fusion (k=60), cross-encoder rerank, contextual
retrieval (Anthropic: failures 5.7% to 1.9%). Retrieved text is untrusted data. Slack API terms (date still to confirm with legal)
bar persistent third-party copies or indexes of Slack RTS/Data Access API data, so Slack is queried live only.
The brain is its own product and is not part of any OS. Never write "Devx OS", "v2" or "Company OS". No em dashes. No emoji.

## Inputs (read these first)
1. `skeleton.json`: 9 stages, 18 groups, 88 components + edges. Each comp has label, sub, kind, stage, group, pin.
   The PIN is the single algorithm / data structure / model technique / external call the card must be about.
   Do not change ids, labels, kinds or pins in skeleton.json. If a PIN is wrong, say so in your report.
2. `EXAMPLE-card.json`: the exact JSON shape of a group file (`group`, `comps`, `edges`). Read it fully.
3. `../lld/AUTHORING.md` lines 20-85: the field rules table (card fields, deep.* rules, math, ml, tests, security,
   performance, edge cases). Follow it exactly EXCEPT: the "Extensibility" section there refers to a different
   project's stage ids, ignore it; instead say in `deep.edge_cases` or `deep.purpose` how a new app joins through the
   connector manifest (`so_sdk`) or the MCP bridge (`so_mcp`), where relevant.
4. `research/INDEX.md`: every citable source with key and what it says. Cite only those keys.
5. Requirements: set `req` to `Requirement: '<quote of at most 15 words>'` only if a source in research/ says it; set `prop` to
   `Proposal: <why this exists>`. Every card needs at least one of the two, plus at least one ref key in `deep.refs`.
   Also read `research/clients.md` and `research/clients.json` for AI-client cards.
6. Full research prose if you need more than the index: `research/papers.md`, `repos.md`, `products.md`, `techniques.md`.

## Output
For each group you own, write `stages/<stage>/<group>.json` (create dirs) with:
- `group.line` (one sentence naming the mechanisms) and `group.dumb` (2 to 4 plain-English sentences).
- `comps`: one full card per component id of that group. All fields from the AUTHORING table: `line` (1 to 2 rows
  separated by `\n`, each row at most 108 chars), `dumb` (60+ chars, no unexplained acronym), `inn`, `out`, `store`,
  `fail` (counts and durations, never just "retries"), `req`, `hard` (what is still open), `prop`, and `deep`
  (purpose 30+ chars, expected 2+, not_expected 1+, algorithm {name, formula, steps 3+, params 2+},
  math (all 7 keys) whenever the PIN has a formula/bound/statistic/complexity, with a worked example using real
  numbers, alternatives, security 2+ naming attack and control, performance {slo, complexity, scaling},
  edge_cases 3+, tests 3+ {name, given, expect} concrete, cost_levers, feedback_events,
  analytics_events [{name, fields[], when}], papers [{ref, key_idea, how}], repos [{ref, name, take}], industry, refs[]).
  Kind `ml` or `llm` also needs `deep.ml` {technique, model, input, output_schema, prompt_sketch, guardrails[],
  cost_estimate} naming a Claude model family via the LLM gateway (pl_gw) and a fallback.
- `edges`: only edges whose SOURCE is in your group, additional to the ones already in skeleton.json (do not repeat
  those; no duplicates of (a,b,label)). Add edges until every component has a sensible in and out. Fields a,b,l,k,d
  (k one of n,e,s,d; d names the fields that travel). No self loops, no dangling ids.

## Truth rules
- Numbers need a source key, or the word "default" / "tune" with how it is chosen, or `(design)`.
- Do not invent URLs, API fields, benchmark numbers or quotes. Quote at most 15 words from any source.
- Vendor facts (webhook expiries, delta APIs, rate limits) come only from `research/INDEX.md` rows. Where
  research found no delta API (Notion, Jira, GitHub, HubSpot, Linear, Figma), say the sweep or poll covers it.
- Honest limits: no paper tests a pointer-index with live fetch against a full-copy index; say "our inference".
- Plain words, short sentences, define a term on first use per card. Security and performance sections must be
  specific to this component, not pasteable onto another.

## Gate
Run from the `docs/brain` directory: `python3 -I build_brain.py --gate-only --all 2>&1 | grep -E "<your ids or group ids>"`.
If `build_brain.py` does not exist yet, validate by loading your JSON with `python3 -c "import json;json.load(open(f))"`
and checking the field list by eye; the orchestrator will run the real gate and may send fixes back.
Do not edit any file outside `stages/<your stages>/`. Do not commit.

## Report (under 150 words)
Files written, cards count, PINs you think are wrong, claims marked (design), research gaps hit.
