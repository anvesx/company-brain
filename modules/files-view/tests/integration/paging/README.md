# tests/integration/paging

Spec items 11, 12 and 18: keyset pagination over 5,000 rows in every sort order (no gaps, no duplicates, stable
under inserts), tampered cursors answer 400, search and filters on the seeded world, the bounded over-fetch loop
(a viewer who sees 1 file in 50), and the page-size cap.
- `dates.test.ts`: modified range as instants (second inclusive, offsets, date-only, bad dates).
