# Evidence

## Passed

`pnpm exec biome check --write features/migrations` (exit 0): `Checked 18 files ... No fixes applied.`

`pnpm --filter @anvesx/migrations typecheck && pnpm --filter @anvesx/migrations build` (exit 0):
both TypeScript commands completed without diagnostics.

`pnpm structure && pnpm guard:fakes` (exit 0): `checked 21 packages, 1091 files, 303 folders` and
`checked 748 files, 4 findings, 1 baselined`.

`bash ~/.claude/skills/l8-code/scripts/selfcheck.sh features/migrations` (exit 0):
`checked 9 file(s): 0 FAIL, 0 warn`; the scanner selected the nine executable source/test files.

## Blocked

`pnpm --filter @anvesx/migrations test` (exit 1): 4/4 integration tests reached their real-Postgres
setup and failed with `DATABASE_URL must point to disposable Postgres 16`; no test was skipped.

No `DATABASE_URL` is set. Docker 27.4.0 is installed, but the sandbox denies its Unix socket.
Docker UI control was not approved. Native Postgres 15 was also tried only as a diagnostic; `initdb`
failed because the sandbox denies `shmget`, including the mmap configuration attempt.

Therefore these runtime claims are **not done**: empty migration, migration over graph-store's current
shape, wrong-tenant zero-row behavior and applied-migration checksum rejection on Postgres 16.

`git add features/migrations && git commit -m "feat(migrations): add versioned postgres schema"`
(exit 128) failed before staging: Git could not create `.git/worktrees/wp-02-migrations/index.lock`
because the worktree metadata is outside the writable sandbox. No hook was bypassed or reached.
