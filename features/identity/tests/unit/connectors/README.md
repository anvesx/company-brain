# tests/unit/connectors

Pure checks of the connector building blocks, spec
[connector-accounts](../../../../../docs/specs/feature/connector-accounts.md).

| File              | Rules                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------- |
| `seal.test.ts`    | 3: AES-256-GCM seal format, fresh nonce, wrong key or tamper throws, key parsing       |
| `catalog.test.ts` | 11: client id and secret from `<ID>_CLIENT_ID` / `<ID>_CLIENT_SECRET`, configured flag |
