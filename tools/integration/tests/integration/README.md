# integration

One folder per scenario. See the package README for what is real and what is a gap.

- `feed/` connector feed into the graph, then rank, then search
- `acl/` rank pre-filter and graph reads agree
- `zone/` zone-policy gates the results
- `resume/` restart mid-feed
- `delete/` tombstone reaches search
