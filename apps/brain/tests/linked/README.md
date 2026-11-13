# linked (tests)

The connect flow end to end: tile, "+" post, redirect to the provider, callback, sealed tokens, check, data page.

- `provider.ts`: a local provider on one port. OAuth (authorize, token, userinfo) is identity's own replay server, reached through a pass-through; the API paths GitHub, Drive and Slack serve (`/user/repos`, `/drive/v3/files`, `/api/conversations.list`) answer only for a token the replay issued.
- `base.test.ts`: `<ID>_BASE_URL` parsing (origin only, bad scheme refused) and the generic-OAuth swap.
- `connect.test.ts`: the flow for all three providers with `<ID>_BASE_URL` pointing here.

This is a local stand-in for the providers, not the providers. What it proves is our side of OAuth and our data calls; real GitHub, Google and Slack need real client ids.
