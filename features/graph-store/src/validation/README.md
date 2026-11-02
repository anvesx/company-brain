# validation

Checks the `props` of a node before it is stored. Props are metadata only, so keys that usually hold document text are refused.

- Keys are compared with case and punctuation removed, so `Raw_Text` and `html-body` are caught along with `text` and `body`.
- Each value must be a string of at most 1 KiB, measured in bytes.
- This is a denylist, because callers use free-form metadata keys. A caller that stores body text under an unlisted key gets through. A per-kind allowlist would close that, at the cost of every new key needing a schema change.
