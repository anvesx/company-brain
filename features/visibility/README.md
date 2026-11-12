# @anvesx/visibility

The one decision that says whether a viewer may see a file (PLAN 9, leaks 1, 3, 4, 5). WP-10 builds it.

`decide` uses the current ACL even for historical content, fails closed on missing ACLs,
matches linked aliases, and requires tenant plus zone membership. Reader identities are
returned only to the target owner or a tenant admin.

Runtime is O(P + Z + A) time and O(P + Z) space for viewer principals, zones and the
current ACL. It does not scan tenants or files; callers supply one already-indexed target.

Run it: `pnpm --filter @anvesx/visibility contract`.
