# docs/briefs

Builder briefs written by the lead, one file per slice. Each brief names the spec it serves, the red tests that
define done, the files each builder owns (no overlap between builders), the commands to run and the order.

- [deploy.md](deploy.md): Postgres graph store, root Dockerfile, image workflow (spec `docs/specs/infra/deploy.md`).

Rules for every brief: builders never edit `tests/contract/**`, `tests/postgres/**` or other lead-owned test folders
named in the brief; a diff touching them is rejected. The verifier's PASS plus the pasted evidence decides the merge.
