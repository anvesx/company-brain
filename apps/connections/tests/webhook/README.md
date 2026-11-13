# tests/webhook

`github.test.ts` posts to the real route on a real port: a valid signature queues a sync for each active account that names the repository
(any tenant), a bad or missing signature is 401, ping answers 200, other events 202, a missing delivery id or repository 400, and a redelivery
queues nothing. The queue side is `tests/jobs` and `tests/auto-sync`; here `jobs.requestSync` records what it is asked.

`body.test.ts` covers `readCapped`: a small body, no body, and a streamed body that passes the cap with no content-length.
