# answer

- `groups.ts` builds one `ValueGroup` per value, sorted by score then value, picks the winner and
  applies the tie rule: newest claim wins, equal `at` gives the smaller value and `tie: true`
  (rule 6). A corrected value nobody claimed is a group with no sources (rule 17).
- `label.ts` exports `labelPassages`: trust is the source accuracy; group is `best`, `other` or
  `unresolved`; output length always equals input length (rules 11, 18).
