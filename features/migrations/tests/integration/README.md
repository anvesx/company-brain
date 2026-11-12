# Integration

`migrations.test.ts` drives the built migration contract through a real `pg.Pool`. `support.ts`
owns schema isolation and graph-store's current `nodes`/`edges` bootstrap shape.
