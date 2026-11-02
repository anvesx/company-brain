# tests/net

Tests for `src/net`: which addresses count as public (`ranges.test.ts`) and which urls a tenant may register (`guard.test.ts`). The only stand-in is the DNS resolver, passed as an argument; the address checks and the url rules are the real code.
