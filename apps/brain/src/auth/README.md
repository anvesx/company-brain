# src/auth

| File           | Job                                                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `token.ts`     | `mintToken`, `signedPrincipalFor`, `TokenExpiredError` (default 1 h): HMAC-SHA256 bearer tokens `user:tenant:exp:hex`, constant-time compare. |
| `audit-key.ts` | `resolveAuditKey`: requires `BRAIN_AUDIT_KEY` in persistent or signed mode; demo fallback with a warning.                                     |
