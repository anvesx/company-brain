# tests/integration/listing

Spec items 9 and 15 data side: the seeded world (3 tenants, 500 files, 40 clusters over 3 levels) listed
for three viewers. Expected id sets are derived by hand in `../support/world.ts`.
- `live.test.ts`: recheck cap per request and gate re-applied on repeat cluster page requests.
