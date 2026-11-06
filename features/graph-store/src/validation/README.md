# validation

Checks the `props` of a node before it is stored. Props are metadata only, so keys that usually hold document text are refused.

- Keys are compared with case and punctuation removed, so `Raw_Text` and `html-body` are caught along with `text` and `body`.
- Each value must be a string of at most 1 KiB, measured in bytes.
- This is a denylist, because callers use free-form metadata keys. A caller that stores body text under an unlisted key gets through. A per-kind allowlist would close that, at the cost of every new key needing a schema change.
- `fields.ts`: byte caps for `title`, `address`, `version`, `source` and the control-character check. Limits are in the package README.
- Props keys must be identifiers (at most 64 bytes), at most 32 entries, at most 4 KiB in total, no control characters in values.
- `query.ts`: `checkNeedle`, the search text: a string, at most 512 characters, no control characters.
