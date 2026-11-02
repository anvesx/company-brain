# membership

`sync.ts` `syncMemberships`: copies the connector's group membership into `member-of` edges (person to team), so a document readable by a group is readable by its members.

- Runs only when the connector implements the optional `listMemberships()`. The folder connector does not.
- The list must be complete. The run adds missing edges and closes edges this connector wrote that it no longer reports. Edges from other sources are left alone.
- If `listMemberships` throws, the run fails with `CONNECTOR_FAILED` before any edge is closed, so a partial list never revokes access.
- A group emptied of members is still pruned when an ACL names it. A group no ACL names and no pair mentions keeps its old edges until it reappears.
