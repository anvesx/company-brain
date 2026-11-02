# @anvesx/query-router

Routes a question to graph retrieval, RAG retrieval, both, or neither without an LLM.

## Contract

`route(question, context)` is synchronous and deterministic. `context` lists connected sources and
states whether graph and RAG retrieval are available. Retrieval routes include the selected sources
and a `single` or `multi` depth. Greetings, thanks, empty input, or no available retrieval return
`{ mode: "none" }`.

Graph signals cover people, ownership, membership, teams, and links. RAG signals cover quotations,
summaries, content questions, and document lookup. Both signal classes, or two named sources, select
both legs with multi depth. If a requested leg is unavailable, the route degrades to the available
leg while retaining the requested depth.

Supported source mentions are Slack, GitHub, Drive, Jira, and Notion, matched case-insensitively.
Mentioned sources restrict the result and disconnected names are dropped. With no source mention,
all connected sources are returned in input order. Duplicates are removed without mutating context.

Questions are bounded to 4096 UTF-8 bytes before matching. Truncation removes an incomplete trailing
code point, so matching is Unicode-safe. Unmatched non-conversational questions default to RAG.

## Usage

```ts
import { route } from "@anvesx/query-router";

route("Who owns the handbook in Drive?", {
  sources: ["slack", "drive"],
  hasGraph: true,
  hasRag: true,
});
// { mode: "both", sources: ["drive"], depth: "multi" }
```

Run `pnpm --filter @anvesx/query-router build`, `typecheck`, `test`, or `mutation` from the repo root.
The package has no runtime dependencies. LLM routing and feedback learning are out of scope.
