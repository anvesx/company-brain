# integration

The MCP OAuth flow end to end, as a client does it, through the mounted Hono app over a real
SQLite file in a temp folder and a real HTTP server on a free port.

| File or folder      | Rules                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `discovery.test.ts` | 4: the 401 challenge, the RFC 9728 resource metadata, the RFC 8414 server metadata.          |
| `flow.test.ts`      | 6: authorize with PKCE, token claims, call the resource, refresh rotation and reuse.         |
| `inputs.test.ts`    | 1, 2, 13: bad body and content type, a field named once, taken email, email kept on sign-in. |
| `guard.test.ts`     | 8: expired, wrong audience, forged and foreign tokens are 401 with the challenge, never 403. |
| `tenancy/`          | 3, 6, 7: consent fixes the organization; a removed member cannot refresh; set-active guard.  |
| `pages/`            | 2, 3, 7, 10: the pages as an anonymous or signed-in browser sees them.                       |
| `clients/`          | 5, 6, 11, 12, 13: registration, authorize errors, revocation, CSRF and Origin.               |
| `bearer/`           | 8: key-set cache, cooldown and error messages through the boot clock.                        |
| `abuse/`            | 2, 6, 8: exact Retry-After, forbidden_origin, port header shape and 401 challenge.           |
| `posts/`            | 10, 11, 12: Origin and CSRF on form posts, install guide, account page.                      |
| `passkey/`          | 16: plugin endpoints behind the Origin guard, the two script files, account section, delete. |
