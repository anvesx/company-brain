# src

Source for `@anvesx/zone-policy`. Public entry is `index.ts`.

- `visibility.ts`: `canSee`. Personal is owner-only, team is members-only, company is everyone.
- `promote.ts`: `promote`. Outward moves only, with consent. Personal consent must come from the owner.
- `derive.ts`: `derive`. The strictest input zone wins. Conflicting owners or teams throw.
- `index.ts`: public exports.
- `model/`: the `Zone` type, `Principal`, `Consent` and `PromotionError`.
