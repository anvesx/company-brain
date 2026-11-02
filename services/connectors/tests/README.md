# tests

- `unit/` mapping logic against the fixtures
- `replay/` the real SDKs against a local HTTP server that answers with fixtures
- `integration/` live API tests, skipped unless `GITHUB_TOKEN` and `GITHUB_TEST_REPO`, or `DRIVE_ACCESS_TOKEN`, are set
- `fixtures/` recorded-shape JSON responses, see the package README
- `support/` fixture loader and the local replay server
