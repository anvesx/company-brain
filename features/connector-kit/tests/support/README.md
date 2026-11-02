# Test support

`fake.ts` holds `createFakeConnector`, a deterministic in-memory `Connector` for tests and demos. It is
published as the `@brain/connector-kit/testing` subpath, not from the package entry, so production code
cannot import it by accident.
