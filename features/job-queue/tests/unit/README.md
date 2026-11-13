# Unit tests

Pure functions only, no database: idempotency ids and the library-to-port mappers. Everything that
touches the queue runs against real Postgres 16 under `../integration`.
