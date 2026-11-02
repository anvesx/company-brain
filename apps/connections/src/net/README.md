# net

Keeps tenant-supplied urls from pointing this server at its own network (SSRF).

- `ranges.ts`: `isPublicIp` (only global unicast; private, loopback, link-local and cloud-metadata, CGNAT, multicast, reserved, 6to4/NAT64/Teredo and IPv4-mapped IPv6 of any of those are not) and `isLoopbackIp`. The range tables come from `ipaddr.js` (MIT).
- `guard.ts`: `checkUrl(url, policy)` returns why a url is refused, or undefined. https only; a name is resolved and every address must be public, so a name that resolves inside the network, or does not resolve, is refused.

`allowLoopback` (env `CONNECTIONS_ALLOW_LOOPBACK=1`, off by default) lets plain http to a loopback address through, for a connector under development. `resolve` replaces DNS in tests.

`POST /v1/catalog` calls `checkUrl` on a custom connector's `endpoint` and `auth.tokenURL`. Not covered: the connector adapter that fetches `endpoint` lives in `@anvesx/connectors`, so the address is checked at registration, not pinned per request, and redirects are not refused there.
