# integration

- `folder.test.ts` real folder connector over a temp directory into a real graph file: sync, mutate files and ACLs, re-sync, assert `reach` and `neighbors`; reopen; two handles on one file
- `tenants.test.ts` two tenants syncing the same address concurrently on one store
