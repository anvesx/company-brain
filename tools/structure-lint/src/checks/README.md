# checks

One module per structural rule. Each exports `check*(root, packageDirs)` and returns `Violation[]`;
none prints or mutates anything.

- `lines.ts`: code files (`.ts .mjs .cjs .js .css .html`) have at most 80 lines.
- `fanout.ts`: every folder under `src`, `tests`, `bin` and `scripts` holds at most 5 files, the
  README included. Nested folders count separately.
- `readme.ts`: each of those folders has a `README.md`. Only folders made purely of `.json` files
  (data fixtures) are exempt, so a full fixture folder does not break the fanout count.
- `beside.ts`: tests live in the package `tests/` folder next to `src/`. `src` code needs at least
  one `.test` or `.spec` file there, and test files inside `src`, `bin` or `scripts` are violations.
