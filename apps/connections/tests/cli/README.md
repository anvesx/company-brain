# cli tests

`config.test.ts` and `oauth-env.test.ts` check every setting the launcher reads and that bad ones are refused together. `start.test.ts` starts the real server over real SQLite files and calls it. `bin.test.ts` compiles the package and runs `dist/bin.js` as a child process.
