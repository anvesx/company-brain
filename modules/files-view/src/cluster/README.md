# src/cluster

Cluster reads. Every member id is checked by `gate.approve` before it counts or shows.

- `paths.ts`: the cluster paths (up to 3, with ancestors and the reason each exists) shown for a file.
- `members.ts`: member ids a viewer may see for a set of clusters, capped per cluster, memoised per request; reads deeper past a fully hidden batch.
- `tree.ts`: gate-approved cluster counts, detail, children and tree. A cluster with no visible file is dropped, so hidden and missing look the same (404).
- `describe.ts`: turns cluster rows into gate-approved infos (sampled member cap, "at least" counts, reads shared per request).
