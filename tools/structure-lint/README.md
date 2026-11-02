# structure-lint

`@anvesx/structure-lint` is the repository's structural CI gate. It checks every package directly
under `features`, `services`, `modules`, `apps`, and `tools`, then prints deterministic
`file:rule:message` diagnostics.

## Rules

- Code files (`.ts .mjs .cjs .js .css .html`) below `src/`, `tests/`, `bin/` and `scripts/` are
  limited to 80 physical lines.
- Each of those folders, nested ones included, holds at most five files, the README counted.
- Each of those folders has its own `README.md`. The only exemption is a folder made purely of
  `.json` data files, which may omit it so a full fixture folder stays within five files.
- The package root holds at most five files (`root-files`): `README.md`, `package.json` and every
  config file count, dotfiles included. Folders in the root are not counted. Shared configs live in
  the workspace root (ADR 0007).
- Each package needs `README.md`, `src/` and `tests/`, side by side. `src` code needs a `.test`
  file in that `tests/` folder, and `.test`/`.spec` files outside `tests/` are violations.
- Workspace dependencies must point down: feature to core-types, service to feature, module to
  service/feature, app to module, and tool to feature, service or module (a tool is a leaf: nothing depends on it, and it never depends on an app).

## Run

```sh
node tools/structure-lint/bin/cli.mjs [--root /path/to/workspace]
```

Exit `0` means clean, `1` means violations or invalid package metadata, and `2` means zero packages
were found. Every run prints package, file and folder counts, so an empty gate cannot look green.

## Limits and development

Packages must be immediate children of the five tier folders. Symlinked directories are not
followed. The tool reports violations but does not auto-fix them. Run `pnpm test`, `pnpm typecheck`,
and `pnpm mutation` from this directory; tests create fixtures only in the operating-system temp
directory. The mutation command replaces only Stryker's worker-log socket with an in-memory sink,
so it also runs in CI sandboxes that prohibit listeners; worker control still uses process IPC.
