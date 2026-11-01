# Process

1. Ticket: every unit of work is a GitHub issue with labels `tier:*`, `milestone M*`, `agent:*`.
2. Spec: architect writes `docs/specs/<tier>/<name>.md` from the template. Spec merges first.
3. Dispatch: one builder per spec, own branch `feat/<name>`, own worktree, in parallel.
   Builders: Codex, Kiro, Qwen Coder, Claude (Haiku/Sonnet). Antigravity is not used.
4. Verify: a different model than the builder runs the gates and an executable check.
5. Review: after every 5 features land, Opus and Codex review the batch. Findings become tickets.
6. Merge: squash to main, Conventional Commit title, a changeset for any published package.
7. Release: Changesets versions packages and publishes to the registry.
