# syntax=docker/dockerfile:1
# The brain app as one image: build everything, keep only the production files, run as the non-root `node` user.
# Build:  docker build --secret id=npm_token,env=NODE_AUTH_TOKEN -t company-brain:test .
# The token (for @anvesx packages on GitHub Packages) is a BuildKit secret: it is never an ARG, ENV or layer.

# deps: install every workspace dependency. Only manifests are copied, so this layer is cached until one changes.
FROM node:26-slim AS deps
# corepack is gone from Node 25+, so pnpm comes from npm. Same version as CI.
RUN npm i -g pnpm@8.15.0
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc .pnpmfile.cjs ./
COPY apps/brain/package.json ./apps/brain/package.json
COPY apps/connections/package.json ./apps/connections/package.json
COPY features/change-cursor/package.json ./features/change-cursor/package.json
COPY features/connector-kit/package.json ./features/connector-kit/package.json
COPY features/core-types/package.json ./features/core-types/package.json
COPY features/graph-store/package.json ./features/graph-store/package.json
COPY features/identity/package.json ./features/identity/package.json
COPY features/query-router/package.json ./features/query-router/package.json
COPY features/source-trust/package.json ./features/source-trust/package.json
COPY features/zone-policy/package.json ./features/zone-policy/package.json
COPY services/graph-sync/package.json ./services/graph-sync/package.json
COPY tools/deploy/package.json ./tools/deploy/package.json
COPY tools/e2e/package.json ./tools/e2e/package.json
COPY tools/fake-guard/package.json ./tools/fake-guard/package.json
COPY tools/integration/package.json ./tools/integration/package.json
COPY tools/scale-k6/package.json ./tools/scale-k6/package.json
COPY tools/structure-lint/package.json ./tools/structure-lint/package.json
RUN --mount=type=secret,id=npm_token NODE_AUTH_TOKEN=$(cat /run/secrets/npm_token) pnpm install --frozen-lockfile

# build: compile the brain app and everything it depends on.
FROM deps AS build
COPY . .
RUN pnpm turbo run build --filter=@anvesx/brain-app...

# prod: copy the built app with only its production dependencies into /out.
FROM build AS prod
RUN --mount=type=secret,id=npm_token NODE_AUTH_TOKEN=$(cat /run/secrets/npm_token) pnpm --filter @anvesx/brain-app deploy --prod /out

# runtime: nothing but Node and /out. No pnpm, no sources, no token.
FROM node:26-slim AS runtime
WORKDIR /app
COPY --from=prod --chown=node:node /out .
USER node
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
# Shell form (no JSON brackets) so sh expands ${PORT:-8080}: the check follows PORT, and uses 8080 when PORT is unset.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:${PORT:-8080}/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node","dist/bin.js","serve"]
