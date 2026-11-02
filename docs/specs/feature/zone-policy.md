# Spec: zone-policy

Tier: feature. Design cards: zn_tag, zn_scope, zn_promote, zn_taint. Core types already hold `zone.ts`.

Exact source: our proposal, no exact source backs it. Audit table: [exact research README](../../brain/research/exact/README.md).

## Purpose
Personal, team and company zones. Anything in a personal zone is visible to its owner only; moving outward needs consent from the owner (personal) or a proven team member (team); derived data gets the intersection of its inputs' audiences, never a wider one.

## Reuse decision
Pure functions. Does not use `@anvesx/core-types`: its `Zone` is a bare enum with no owner or team, so `Zone` is defined locally. Feature packages may not depend on other feature packages, so no `acl-filter` either. Membership is caller-supplied proof; absent proof means not a member.

## Public interface
```ts
type Zone = { kind: "personal"; owner: string } | { kind: "team"; team: string } | { kind: "company" };
function canSee(zone: Zone, p: { user: string; teams: string[] }): boolean;
type Membership = (user: string, team: string) => boolean;
function promote(from: Zone, to: Zone, consent: { by: string; at: number } | undefined, isMember?: Membership): Zone;   // throws PromotionError
function derive(inputs: Zone[], isMember?: Membership): Zone;        // intersection of audiences; empty throws
class PromotionError extends Error { code: "NO_CONSENT"|"NOT_OUTWARD"|"NOT_OWNER"|"NO_COMMON_ZONE"|"NOT_MEMBER" }
```

## Behaviour
1. Personal visible to owner only, even to admins.
2. Promotion is outward only (personal to team to company); consent must be by the owner (personal source) or a proven member of the team (team source, else NOT_MEMBER). Empty identity strings never match: `by`, owner and team must be non-empty.
3. Demotion throws NOT_OUTWARD; going personal to company directly is allowed with consent.
4. derive returns the intersection of audiences and never widens. [company, personal(u)] is personal(u). Two different personal owners, two different teams, or personal(u) with team(t) without proof that u is in t throw NO_COMMON_ZONE. With proof, [team(t), personal(u)] is personal(u).
5. Empty team list, unicode names, and repeated calls are safe and pure. An empty user, owner or team string matches nothing in canSee.

## Acceptance tests
- unit + property (derive is commutative and idempotent), mutation >= 80.

## Layout
`features/zone-policy/{src,tests}`: visibility.ts, promote.ts, derive.ts, index.ts, plus `model/` (types, errors).

## Out of scope
Storage, UI preview-and-approve.
