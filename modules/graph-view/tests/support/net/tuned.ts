/**
 * The keep-alive limits the brain server sets (apps/brain/src/serve/mount.ts `tune`): Node's 5 s default can close a pooled
 * socket at the instant the client reuses it, which shows as `ECONNRESET` on a loaded machine. Same numbers, 620 s and 625 s.
 */
export function tuned<S extends object>(server: S): S {
  return Object.assign(server, { keepAliveTimeout: 620_000, headersTimeout: 625_000 }); // `serve()` returns an http or http2 server
}
