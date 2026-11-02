# tests

Tests for `@anvesx/change-cursor`, split by how real the setup is.

- `unit/`: `diffListing`, `CursorError` and the store's `seen`/`forget` rules.
- `unit/cursor/`: cursor reads, writes and input limits.
- `integration/`: real file databases on disk, tenant scoping, expiry pruning and concurrent handles racing on one file.
- `scale/`: large inputs against the store and the diff.

Integration and scale tests use temp files under the operating-system temp directory, never `:memory:`.
