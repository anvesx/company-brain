# 0007: Package-root files count toward the five-file limit

Status: accepted, 3 Nov 2026. Closes item 13 of anvesx/company-brain#64.

## Decision

The five-file folder limit applies to the root of every package too. `README.md`, `package.json`, `tsconfig.json`, `tsconfig.build.json`, `stryker.config.json` and any other file there count, dotfiles included. Folders do not. `structure-lint` reports `root-files` when a package root holds more than five files.

The rule was never ruled on before: structure-lint walked only `src`, `tests`, `bin` and `scripts`, so six config files per package passed unnoticed. Counting them is the conservative reading of "folders hold at most five files".

## What changed to make every package pass

Before, 9 of 14 packages held six files and `change-cursor` held seven. Now none holds more than five.

- Vitest: one shared `vitest.config.ts` at the workspace root (include `tests/**/*.test.ts`, 30 s timeout, 90 percent line coverage threshold). Each package runs `vitest run --config ../../vitest.config.ts`, so it keeps no vitest file. `change-cursor`'s mutation-only config moved to the root as `vitest.stryker.config.ts`; its Stryker config points at it. The 30 s timeout now applies to every package; before only `change-cursor` and `integration` had it.
- Stryker, tsconfig and package files stay per package: their contents differ by package.

## Consequences

- Package scripts changed in 12 `package.json` files, including `apps/brain` and `apps/connections`. Open PR 82 (`registry-switch`) edits those files; the script line is a separate hunk from its dependency lines, but check on merge.
- A shared config changes for all packages at once. Turbo does not hash it into per-package test caches; clear the cache after editing it.
- Rag has the same six-file packages. Its structure-lint is unchanged here; applying the rule there is a follow-up.
- A new config file per package needs a slot: a package already at five must share it from the root instead.
