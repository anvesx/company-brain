# integration

One folder per scenario. See the package README for what is real and what is a gap.

- `feed/` connector feed into the graph, then the listing
- `acl/` listing readers and graph reads agree
- `zone/` zone-policy gates the readers
- `resume/` restart mid-feed
- `delete/` tombstone reaches the listing
