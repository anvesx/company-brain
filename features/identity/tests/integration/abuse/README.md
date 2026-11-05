# abuse

Limits and checks that refuse a caller, with their exact answers.

- `limits.test.ts`: sign-in lockout `Retry-After` at 900, 800, 1 s, and unlocked at 900 000 ms.
- `origin.test.ts`: the 403 `forbidden_origin` body, and the paths that need no Origin.
- `port.test.ts`: bearer header shape, caller fields, tenant fallback, the 401 body and challenge.
