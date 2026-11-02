# github tests

- `github.test.ts`: the full GitHub flow against the replay provider.
- `github-state.test.ts`: bad input is refused, each state is used once and only for its provider, and unknown or expired states never reach the provider.
