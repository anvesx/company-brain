# cursor

- `store-cursor-basic.test.ts`: `getCursor` and `setCursor` round trip per (tenant, source).
- `store-cursor-limits.test.ts`: cursor size limit in code points and the input rules, each refused with `CursorError`.
