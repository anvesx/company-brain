# support

`fixture.ts` builds throwaway workspaces in the OS temp directory (`fixture`, `packageJson`) and
removes them in `cleanFixtures`. Shared by every test folder; contains no assertions.
