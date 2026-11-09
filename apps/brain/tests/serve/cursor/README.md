# tests/serve/cursor

- `support.ts`: boots `startBrain` on a free port and seeds readable documents through a second identity port and graph-store handle on the same files.
- `shared.test.ts`: boots `startBrain` twice over the same graph and auth databases with one `BRAIN_AUTH_SECRET`. A `next` cursor from `/v1/graph` on the first instance is accepted by the second (same key, no overlap between pages) and a cursor with one changed character is refused with 400. Proves the cursor key is derived from the secret, not random per process, so a multi-instance deployment behind a load balancer keeps Load more working.
