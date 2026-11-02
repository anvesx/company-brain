# tests

Tests for the linter, sorted by what they exercise. All fixtures are built in the operating-system
temp directory and removed after each test; nothing writes into the repository.

- `unit/`: the line, fanout and tier-direction rules.
- `layout/`: package layout, folder README and tests-beside-src rules.
- `walk/`: package discovery and the code-folder walker.
- `integration/`: the CLI end to end, including a run over the real repository.
- `support/`: the shared fixture builder.
