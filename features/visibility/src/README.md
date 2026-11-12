# src

- `index.ts`: `decide`, the one permission decision (tenant, zone, current ACL, aliases, reader disclosure). Fails closed.
- `gate.ts`: `openGate`, the gate every read route calls. It reads the current graph (never `asOf`), judges each
  document with `decide`, then asks the source with the live check. Import it as `@anvesx/visibility/gate`.
- `zone.ts`: the zone string of a node (`company`, `team:<id>`, `personal:<owner>`) and the zones a viewer may see.
  Same rule as `@anvesx/zone-policy` `canSee`; a feature package may not import another, so the rule is repeated
  here and `apps/brain/tests/gate/zone.test.ts` proves the two agree.
- `live.ts`: `stillReadable` and its limits. No check means every document is hidden.
