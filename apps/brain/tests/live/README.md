# live tests

`source-recheck.test.ts`: the source-backed recheck asks the right connector with the asker's own token and denies when it cannot ask. The GitHub half is covered in `services/connectors/tests/replay/github-can-read.test.ts` over a real local HTTP server.
