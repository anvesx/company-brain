# WP-11 evidence: Google-only sign-in (@anvesx/google-identity)

Branch wp/11-google-identity. Package: features/google-identity.

## Reproduce from a fresh clone
```
git clone <repo> && cd <repo> && git checkout wp/11-google-identity
features/google-identity/tests/support/pg-temp.sh      # Postgres 16 on 55433, temp dir, LC_ALL=en_US.UTF-8
export NODE_AUTH_TOKEN=x DATABASE_URL=postgres://postgres@127.0.0.1:55433/postgres
pnpm install --frozen-lockfile
pnpm --filter @anvesx/google-identity test
```

## Real command output (after final restore of sources)
```
$ pnpm install --frozen-lockfile
Scope: all 23 workspace projects
Lockfile is up to date, resolution step is skipped
Already up to date

Done in 502ms
exit=0

$ pnpm exec biome check features/google-identity
  
    17 │   },
    18 │   "formatter": { "indentStyle": "space", "indentWidth": 2, "lineWidth": 160 },
  > 19 │   "linter": { "enabled": true, "rules": { "recommended": true, "complexity": { "useLiteralKeys": "off" }, "style": { "noNonNullAssertion": "off" } } },
       │             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    20 │   "overrides": [
    21 │     {
  
  i Migrate the configuration with the proper command
  
  $ biome migrate
  

Checked 23 files in 10ms. No fixes applied.
exit=0

$ pnpm structure

> company-brain@0.0.0 structure /Users/rachitsrivastava/Developer/cb-rebuild/wp-11-google-identity
> node tools/structure-lint/bin/cli.mjs

checked 22 packages, 1118 files, 310 folders
exit=0

$ pnpm guard:fakes

> company-brain@0.0.0 guard:fakes /Users/rachitsrivastava/Developer/cb-rebuild/wp-11-google-identity
> node tools/fake-guard/bin/cli.mjs

checked 767 files, 4 findings, 1 baselined
exit=0

$ pnpm typecheck

> @anvesx/google-identity@0.1.0 typecheck /Users/rachitsrivastava/Developer/cb-rebuild/wp-11-google-identity/features/google-identity
> tsc --noEmit

exit=0

$ pnpm build

> @anvesx/google-identity@0.1.0 build /Users/rachitsrivastava/Developer/cb-rebuild/wp-11-google-identity/features/google-identity
> tsc -p tsconfig.build.json

exit=0

$ pnpm test

> @anvesx/google-identity@0.1.0 test /Users/rachitsrivastava/Developer/cb-rebuild/wp-11-google-identity/features/google-identity
> vitest run --config ../../vitest.config.ts --coverage --coverage.include=src/**/*.ts


 RUN  v5.0.5 /Users/rachitsrivastava/Developer/cb-rebuild/wp-11-google-identity/features/google-identity
      Coverage enabled with v8


 Test Files  5 passed (5)
      Tests  35 passed (35)
   Start at  02:00:16
   Duration  1.09s (import 49%, tests 43%, transform 4%, worker 3%)

 % Coverage report from v8
-----------|---------|----------|---------|---------|-------------------
File       | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------|---------|----------|---------|---------|-------------------
All files  |   97.82 |      100 |    92.3 |     100 |                   
 app.ts    |   95.65 |      100 |   83.33 |     100 |                   
-----------|---------|----------|---------|---------|-------------------

=============================== Coverage summary ===============================
Statements   : 97.82% ( 45/46 )
Branches     : 100% ( 20/20 )
Functions    : 92.3% ( 12/13 )
Lines        : 100% ( 37/37 )
================================================================================
exit=0

```

## Negative proof
Temporarily set emailAndPassword enabled:true and opened POST /api/auth/sign-in/email.
Result: 2 failed, 33 passed. Sources restored afterwards; the full run above is post-restore.
```
     × no source file mentions them or turns them on 10ms
     × POST /api/auth/sign-in/email is a 404 40ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  tests/integration/no-password.test.ts > no password, email-password or passkey door exists > POST /api/auth/sign-in/email is a 404
 FAIL  tests/unit/no-password.test.ts > the source has no password, email-password or passkey path > no source file mentions them or turns them on
      Tests  2 failed | 33 passed (35)
```

## NOT done
- Old features/identity (password, passkey, SQLite, email code) is not removed or split. The new package is separate; removal would break about 200 tests.
- No app is wired to @anvesx/google-identity.
- Hosted Google was not tested. Tests use a real local node-oidc-provider as the issuer.
- trustedProxies for Cloud Run is a config value, not decided here.
- Mutation tests and k6 scale evidence (plan section 16) not done.
- jose is not used; better-auth validates the ID token itself.
- tests/large/acceptance did not exist in this worktree, so no acceptance suite was run.
- Biome prints a config-migration notice (pre-existing); no lint findings.
