# Source layout

At most five files live here, the README included, so validation sits in `input/`.

- `index.ts` re-exports the public API. No logic.
- `types.ts` holds the public interface from the spec, one doc line per field.
- `errors.ts` holds `TrustError` (code `BAD_INPUT`, `field` path) and the `badInput` helper.
- `resolve.ts` exports `resolveClaims`: validate, normalise (NFC, dedupe, sort by id) through
  `input/`, run `score/rounds.ts`, then build each item with `answer/groups.ts`.
- `input/` validates and normalises the call. `score/` holds the vote and accuracy maths.
  `answer/` turns scores into groups and labels passages.
