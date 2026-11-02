# integration

`cli.test.ts` runs `bin/cli.mjs` as a child process against temp fixtures: every rule's output
and exit code, exact file and folder denominators, the empty-workspace exit `2`, concurrent runs,
and a run over this repository that must exit `0`.
