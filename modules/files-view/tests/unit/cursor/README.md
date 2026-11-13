# cursor tests

`cursor.test.ts` covers encode and decode of the opaque keyset cursor, including every way to tamper with it.
`sql.test.ts` checks the SQL text the list and cluster builders produce: parameterised, tenant-scoped, no OFFSET.
