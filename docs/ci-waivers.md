# CI waivers

Merges made while a check was red, on the owner's instruction. Each row is debt to clear.

## 2026-11-09: PRs 87, 88, 89, 90, 91 force-merged

- **Instruction:** the owner said CI did not pass and told us to merge all five anyway.
- **Red at merge (PR 91, run 42596142662):** identity mutation shards 2/8 and 5/8 failed the break
  threshold of 80; 1/8 and 7/8 had not finished. Local runs scored them 84.07 and 89.60 for 1 and 7,
  and 81.06 for both 2 and 5, so CI and local disagree on 2 and 5.
- **Not changed:** the break threshold stays 80. No test or mutant was removed.
- **To clear:** rerun identity shards 2/8 and 5/8 on main; add tests for their survivors if still under 80.
- **Other packages:** PRs 87, 88, 89 were merged without a fresh five-job run on top of the new
  mutation matrix. Run `mutation` on main and fix each shard that fails.
