# routes

- `documents.ts`: behind `identity.protect`: no valid session or token is identity's 401 body and `www-authenticate` challenge. `GET /v1/documents` and `/v1/documents/:id`. Read-only; anything but GET is 405. A document the caller cannot read, or that is not a document, is the same 404.

The routes only read, so identity's CSRF check (an `Origin` header on writes) is not needed here. A write is refused with 405 after the sign-in check.
