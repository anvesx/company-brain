# e2e

Playwright end-to-end tests for the real Brain server. They spawn `apps/brain/dist/bin.js` with `BRAIN_DEMO=1`, speak MCP over real HTTP, and check authentication, tenant isolation, ACL filtering and clean shutdown on SIGTERM. No browser is used, so no browser download is needed.

Run: `pnpm -r build`, then `pnpm --filter @brain/e2e test`.
