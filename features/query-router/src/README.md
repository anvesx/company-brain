# Source layout

- `signals.ts` bounds input to 4 KiB and detects graph, RAG, and conversational signals.
- `sources.ts` detects supported source names and intersects them with connected sources.
- `route.ts` selects a requested route, degrades unavailable legs, and owns public types.
- `index.ts` exposes the package API.
