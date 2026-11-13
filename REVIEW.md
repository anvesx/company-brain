# WP-00 Independent Review

Review scope: `PLAN.md` section 11.2, WP-00. This review did not edit source files.

## 1. Repository structure lint — FAIL

Command:

```text
pnpm structure
```

Exit code: `1`

Real output:

```text
 WARN  Issue while reading "/Users/rachitsrivastava/Developer/cb-rebuild/wp-00-hygiene/.npmrc". Failed to replace env in config: ${NODE_AUTH_TOKEN}
 WARN  Issue while reading "/Users/rachitsrivastava/Developer/cb-rebuild/wp-00-hygiene/.npmrc". Failed to replace env in config: ${NODE_AUTH_TOKEN}

> company-brain@0.0.0 structure /Users/rachitsrivastava/Developer/cb-rebuild/wp-00-hygiene
> node tools/structure-lint/bin/cli.mjs

tools/structure-lint/src/checks:fanout:6 files exceeds 5
checked 20 packages, 1080 files, 299 folders
 ELIFECYCLE  Command failed with exit code 1.
 WARN   Local package.json exists, but node_modules missing, did you mean to install?
```

Denominator: **20 packages checked**. The gate is red because `tools/structure-lint/src/checks` has 6 files, above the configured maximum of 5.

## 2. Module-shape unit test — FAIL

Command, run from `tools/structure-lint`:

```text
pnpm test tests/unit/module-shape.test.ts
```

Exit code: `1`

Real output:

```text
 WARN  Issue while reading "/Users/rachitsrivastava/Developer/cb-rebuild/wp-00-hygiene/.npmrc". Failed to replace env in config: ${NODE_AUTH_TOKEN}

> @anvesx/structure-lint@0.1.0 test /Users/rachitsrivastava/Developer/cb-rebuild/wp-00-hygiene/tools/structure-lint
> vitest run --config ../../vitest.config.ts "tests/unit/module-shape.test.ts"

sh: vitest: command not found
 ELIFECYCLE  Test failed. See above for more details.
 WARN   Local package.json exists, but node_modules missing, did you mean to install?
```

The requested unit test did not execute because dependencies are not installed. The test file currently defines 6 tests, not the 7 claimed in `EVIDENCE.md`.

## 3. Missing README.md, src, or tests makes lint non-zero — PASS

Each case used a fresh `mktemp -d` repository containing one package and invoked the real CLI with `node tools/structure-lint/bin/cli.mjs --root <fixture>`.

Missing `README.md`, exit code `1`:

```text
features/broken/README.md:layout:package README.md is missing
features/broken/README.md:module-shape:README.md is missing
checked 1 packages, 2 files, 2 folders
```

Missing `src`, exit code `1`:

```text
features/broken/src:layout:package src directory is missing
features/broken/src:module-shape:src/ directory is missing
checked 1 packages, 1 files, 1 folders
```

Missing `tests`, exit code `1`:

```text
features/broken/tests:layout:package tests directory is missing
features/broken/tests:module-shape:tests/ directory is missing
checked 1 packages, 1 files, 1 folders
```

The behavior is proven end to end. Note that both the pre-existing `layout` rule and the new `module-shape` rule report the same missing folder.

## 4. Vitest 90% coverage enforcement — FAIL

`vitest.config.ts` contains:

```text
coverage: { thresholds: { lines: 90, branches: 90, functions: 90 } }
```

The threshold values are configured, but coverage is not switched on: the config has no `coverage.enabled: true`, and the package test command is only `vitest run --config ../../vitest.config.ts` with no `--coverage` flag. This is the exact gap identified by `PLAN.md` section 10: thresholds existed before WP-00, but no script enabled coverage.

## 5. Dockerfile COPY lines match workspace manifests — FAIL

Read-only comparison of real `package.json` files under `apps`, `features`, `services`, `modules`, and `tools` against workspace-manifest COPY lines:

```text
workspace manifests: 20
Docker workspace COPY manifests: 17
Missing from Dockerfile:
modules/graph-view/package.json
services/brain-mcp/package.json
services/token-refresh/package.json
Dockerfile paths absent on disk:
```

All 17 paths copied by the Dockerfile exist, but 3 real workspace manifests are omitted. This matches the plan's known image-manifest gap and invalidates the frozen-install layer for the complete workspace.

## 6. Stray review artifact — FAIL

`git status --short` reports:

```text
?? find-leftovers.sh
```

`find-leftovers.sh` is an untracked, hard-coded developer helper at repository root and is not a WP-00 product artifact. It is stray and should not be included in the change.

The required changed-source defect scan independently flags it:

```text
selfcheck 1.0.0 — 5 file(s) in scope [explicit]
FAIL  D8    hardcoded developer home path (breaks on every other machine)
            find-leftovers.sh:3:cd /Users/rachitsrivastava/Developer/cb-rebuild/wp-00-hygiene

checked 5 file(s): 1 FAIL, 0 warn
failing detectors: D8
Each is a defect or needs a one-line comment saying why it is deliberate.
```

Selfcheck exit code: `6`.

FINAL VERDICT: FAIL — WP-00 is not ready to accept.
