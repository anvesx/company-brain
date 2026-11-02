# src

Source for `@anvesx/zone-policy`. Public entry is `index.ts`.

- `visibility.ts`: `canSee`. Personal is owner-only, team is members-only, company is everyone.
- `promote.ts`: `promote`. Outward moves only, with consent. Personal consent must come from the owner, team consent from a proven member.
- `derive.ts`: `derive`. The audience is the intersection of the inputs. Conflicting owners or teams throw. Personal plus team needs membership proof.
- `index.ts`: public exports.
- `model/`: the `Zone` type, `Principal`, `Consent` and `PromotionError`.
