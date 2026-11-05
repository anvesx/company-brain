# input

- `numbers.ts` holds the field checks (non-empty text, 4096-byte values, integer times) and
  `checkOptions` for every options row of spec rule 12.
- `validate.ts` checks sources, claims, copy edges and corrections before any maths and throws
  `badInput(field, reason)` from `../errors.ts` on the first failure. Field paths look like
  `claims[0].value`, `sources[1].id`, `corrections[0].item`, `copies[0].share`, `options.now`,
  `options.priors.chat`. A copy edge whose copier equals its original is reported on
  `copies[i].original`. A duplicate id is reported on the later element, for example `claims[1].id`.
- `newest.ts` picks the newest claim per source and item (rule 16), the newest correction per item
  (rules 9, 17), sorts copy edges, and holds the one string order `cmp`.
- `prepare.ts` turns a validated call into the sorted `Model`: newest claim per source and item
  (rule 16), NFC values (rule 13), copy and decay factors, newest correction per item (rules 9, 17).

Tests: `tests/unit/input/`.
