# @brain/zone-policy

Pure rules for personal, team and company zones. Anything in a personal zone is visible to its owner only. Moving data outward needs the owner's consent. Derived data takes the strictest zone of its inputs.

Spec: `docs/specs/feature/zone-policy.md`.

## Dependencies

None. The package does not depend on `@brain/acl-filter`, because feature packages may not depend on other feature packages (`tools/structure-lint`). It also does not use `@brain/core-types`: its `Zone` is a bare enum with no owner or team, so the spec's `Zone` is defined locally in `src/model/zone.ts`.

## API

```ts
type Zone = { kind: "personal"; owner: string } | { kind: "team"; team: string } | { kind: "company" };

canSee(zone, { user, teams }): boolean;
promote(from, to, consent | undefined): Zone;   // throws PromotionError
derive(zones): Zone;                            // throws RangeError or PromotionError
class PromotionError extends Error { code: "NO_CONSENT" | "NOT_OUTWARD" | "NOT_OWNER" | "NO_COMMON_ZONE" }
```

## Rules

- Order is personal < team < company. Lower is stricter.
- `canSee`: personal is shown to its owner only, even to admins. Team is shown to members. Company is shown to everyone.
- `promote`: the target must be strictly less restricted than the source. Same-zone, lateral and downward moves throw `NOT_OUTWARD`. The check runs before the consent check.
- `promote` consent: a missing consent, or a `by` that is the empty string, throws `NO_CONSENT`. When the source is personal, `by` must equal the owner, or it throws `NOT_OWNER`. A team-to-company promotion accepts any non-empty `by`. `at` is not validated.
- `derive`: an empty list throws `RangeError`. Two different personal owners, or two different teams, throw `NO_COMMON_ZONE`. Otherwise the strictest input is returned. `derive([team, company])` is the team. `derive([team, personal(u)])` is `personal(u)`.
- All functions are pure.

## Tests

`tests/unit`: example tests plus fast-check properties. `derive` is commutative and idempotent.

Run `pnpm --filter @brain/zone-policy test` and `pnpm --filter @brain/zone-policy mutation`.
