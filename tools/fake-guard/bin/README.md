# bin

`cli.mjs` is the `fake-guard` executable (`pnpm guard:fakes` at the repo root). It scans every
package with `scanRepo`, compares the findings with `fake-baseline.json` through `compare`, prints
one line per problem, then a summary `checked N files, F findings, B baselined`.

`--init` rewrites the baseline from the current findings; `--root dir` points it at another
workspace. Exit codes: `0` clean, `1` a new finding or a stale baseline entry, `2` zero files
were scanned (an empty gate is never green).
