# rules tests

- `corrections.test.ts` rules 7, 9 and 17: corrections move accuracy, newest wins, clamps, unclaimed newestAt.
- `unicode.test.ts` rules 12, 13 and 15: NFC, case, empty claims, one bad claim fails the call.
- `pinned.test.ts` rules 16 to 18: newest claim per source and item, items sorted, unclaimed
  corrected value as its own group, same-time corrections, unknown source and unmatched value.
- `settled.test.ts` rules 6 and 9: winner inside and outside epsilon, correction to value index 0.
