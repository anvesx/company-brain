# src

Source for `@brain/chunker`. Public entry is `index.ts`.

- `chunk.ts`: `chunkText` and the code-point splitter subclass. Validates options, returns `[]` for blank text, splits, locates each piece, and builds chunks with ids.
- `offsets.ts`: `locate(text, pieces)`. Places each library piece in the source text by depth-first backtracking with a dead-state memo. A placement needs non-decreasing starts and ends and whitespace-only gaps, which holds for the library output, so a valid input always places. `OFFSET_LOST` is an internal-invariant error.
- `ids.ts`: `chunkId(docId, index, text)`, sha256 hex via `node:crypto`, synchronous.
- `errors.ts`: `ChunkError` with codes `BAD_OPTIONS` and `OFFSET_LOST`.
- `index.ts`: re-exports `chunkText`, `Chunk`, `ChunkOptions`, `ChunkError`, `ChunkErrorCode`.
