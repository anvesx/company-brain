# tests

Tests for `@anvesx/connector-kit`, split by how real the setup is.

- `unit/`: registry, hashing, paging validation and the user-token enforcement helper.
- `integration/`: the folder connector against real temp directories (paging, fetch, symlinks, path security, walks).
- `resilience/`: bad entries and sidecar files must not break or leak through listing and fetch.
- `version/`: the folder connector's document version.
- `scale/`: large listings.
- `support/`: shared helpers.
