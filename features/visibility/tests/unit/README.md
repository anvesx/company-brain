# unit

Boundary cases for the decision, the zone strings, the live check and the gate. `support/sql-store.ts` is a real SQL
database (`node:sqlite`) with the graph-store tables; `gate.test.ts` reads it through the same two calls the gate
makes on the real stores. The same cases run on the real SQLite and Postgres 16 stores in `apps/brain/tests/gate`.
