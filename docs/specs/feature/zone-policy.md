# Spec: zone-policy

Tier: feature. Design cards: zn_tag, zn_scope, zn_promote, zn_taint. Core types already hold `zone.ts`.

Exact source: our proposal, no exact source backs it. Audit table: [exact research README](../../brain/research/exact/README.md).

## Purpose
Personal, team and company zones. Anything in a personal zone is visible to its owner only; moving outward needs the owner's consent; derived data inherits the strictest zone of its inputs.

## Reuse decision
Build on `@brain/core-types` zone types and `@brain/acl-filter`. Pure functions.

## Public interface
```ts
type Zone = { kind: "personal"; owner: string } | { kind: "team"; team: string } | { kind: "company" };
function canSee(zone: Zone, p: { user: string; teams: string[] }): boolean;
function promote(from: Zone, to: Zone, consent: { by: string; at: number } | undefined): Zone;   // throws PromotionError
function derive(inputs: Zone[]): Zone;        // strictest wins; empty throws
class PromotionError extends Error { code: "NO_CONSENT"|"NOT_OUTWARD"|"NOT_OWNER" }
```

## Behaviour
1. Personal visible to owner only, even to admins.
2. Promotion is outward only (personal to team to company); consent must be by the owner.
3. Demotion throws NOT_OUTWARD; going personal to company directly is allowed with consent.
4. derive of [company, personal(u)] is personal(u); two different personal owners give a throw (no common zone).
5. Empty team list, unicode names, and repeated calls are safe and pure.

## Acceptance tests
- unit + property (derive is commutative and idempotent), mutation >= 80.

## Layout
`features/zone-policy/{src,tests}`: visibility.ts, promote.ts, derive.ts, index.ts.

## Out of scope
Storage, UI preview-and-approve.
