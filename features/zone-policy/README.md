# @anvesx/zone-policy

Pure rules for personal, team and company zones. Anything in a personal zone is visible to its owner only. Moving data outward needs the owner's consent. Derived data takes the strictest zone of its inputs, and never a wider audience than any input.

Spec: `docs/specs/feature/zone-policy.md`.

## Dependencies

None. The package does not depend on `@anvesx/acl-filter`, because feature packages may not depend on other feature packages (`tools/structure-lint`). It also does not use `@anvesx/core-types`: its `Zone` is a bare enum with no owner or team, so the spec's `Zone` is defined locally in `src/model/zone.ts`.

## API

```ts
type Zone = { kind: "personal"; owner: string } | { kind: "team"; team: string } | { kind: "company" };

canSee(zone, { user, teams }): boolean;
type Membership = (user: string, team: string) => boolean;   // caller-supplied proof
promote(from, to, consent | undefined, isMember?): Zone;     // throws PromotionError
derive(zones, isMember?): Zone;                              // throws RangeError or PromotionError
class PromotionError extends Error { code: "NO_CONSENT" | "NOT_OUTWARD" | "NOT_OWNER" | "NO_COMMON_ZONE" | "NOT_MEMBER" }
```

## Rules

- Order is personal < team < company. Lower is stricter.
- `canSee`: personal is shown to its owner only, even to admins. Team is shown to members. Company is shown to everyone. An empty identity (user, owner or team `""`) matches nothing: `canSee(personal(""), { user: "" })` is `false`.
- `promote`: the target must be strictly less restricted than the source. Same-zone, lateral and downward moves throw `NOT_OUTWARD`. The check runs before the consent check.
- `promote` consent: a missing consent, or a `by` that is the empty string, throws `NO_CONSENT`. When the source is personal, `by` must equal the owner, or it throws `NOT_OWNER`. When the source is a team, `isMember(by, team)` must return true, or it throws `NOT_MEMBER`. Without `isMember` a team promotion always throws. There is no admin role in this package. `at` is not validated. The target team of a personal-to-team move is not checked.
- `derive` rule: the result audience is the intersection of the input audiences, so it can only shrink. Zones are not a chain: `personal(u)` is stricter than `team(t)` only when `u` is in `t`. An empty list throws `RangeError`. Two different personal owners, or two different teams, throw `NO_COMMON_ZONE`. Personal plus team throws `NO_COMMON_ZONE` unless `isMember(owner, team)` is true, then the result is `personal(owner)`. Company inputs never widen: `derive([team, company])` is the team.
- Why a function and not a lookup: membership lives with the caller (the identity store). The package takes proof as a function and treats no proof as no membership, so it fails closed.
- All functions are pure.

## Tests

`tests/unit`: example tests plus fast-check properties. `derive` is commutative and idempotent.

Run `pnpm --filter @anvesx/zone-policy test` and `pnpm --filter @anvesx/zone-policy mutation`.
