# Unit tests

Pure checks that need no server. `config.test.ts` covers settings validation; `no-password.test.ts` scans the source and
dependencies and fails if a password, email-password or passkey path appears.
