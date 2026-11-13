# tests/integration/http

Spec items 14 to 17 over real HTTP: OIDC/JWKS auth (401 for no or bad tokens), CSP and `no-store`, escaping,
rendered content (rows, cluster why, empty, next link), WCAG AA token pairs (culori) and an axe-core run in
jsdom on the served pages (the spec's fallback; the Chromium run lives in `browser/`).
