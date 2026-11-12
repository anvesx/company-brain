# contract

The spec for `@anvesx/visibility`, written before the code. It proves: past views use current permissions, aliases count, reader lists are owner-only, zones are enforced, unknown means hidden.

`api.ts` declares the public surface the builder must export from `src/index.ts` and loads it at run time, so the suite compiles today and fails with a missing-module error until the code exists.
