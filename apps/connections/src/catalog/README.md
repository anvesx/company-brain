# catalog

`GET /v1/catalog` and `POST /v1/catalog`, and the helpers that let every other folder read the registry in `@anvesx/connectors` instead of a fixed provider list.

- `routes.ts`: `GET` lists the built-in apps plus the caller's tenant's custom ones (`id`, `name`, `auth`, `kinds`, `defaultZone`, `custom`, `liveRecheck`, `needsRepo`). `POST` is tenant admin only (403 otherwise), 400 for a bad body, 409 for a duplicate id, a built-in id or a server OAuth app name (`google`), 201 with the new row.
- `parse.ts`: `parseCustom` checks the body: `id`, `name`, `auth` (`oauth2`, `token` or `pat`), optional `defaultZone` (`personal` or `team`, default `personal`), `endpoint` (https) and `canRead`. `routes.ts` then runs `net/checkUrl` on `endpoint` and `auth.tokenURL`: a name that resolves to a private, loopback, link-local or metadata address is refused with 400. Plain http to loopback works only when the server runs with `CONNECTIONS_ALLOW_LOOPBACK=1`. A body cannot name an OAuth `app`, so it cannot borrow the server's Google or GitHub client.
- `kinds.ts`: `kindsOf` gives the credential kinds an app accepts.

A custom connector runs through the same widening rule, zone mapping and sync as a built-in one. With no `canRead` it can never be `company`. Custom entries live in memory and are gone after a restart.
