# Package registry

Eight packages are published to GitHub Packages (`https://npm.pkg.github.com`, scope `@anvesx`), all MIT, all public. Everything under `features/` and `services/` is published. `apps/` and `tools/` stay private.

## Decision per package

A package is published when it is MIT, has no secrets, and depends on no private or unpublished package. Dependencies are checked in `package.json` and in the `src/` imports.

| Package | Path | Decision | Reason |
| --- | --- | --- | --- |
| `@anvesx/core-types` | `features/core-types` | Published | Only dep is `zod`. The shared contract the others build on. |
| `@anvesx/connector-kit` | `features/connector-kit` | Published | Depends only on `core-types`. Exports `./testing` for connector authors. |
| `@anvesx/change-cursor` | `features/change-cursor` | Published | Depends only on `core-types`. Pure logic. |
| `@anvesx/graph-store` | `features/graph-store` | Published | No dependencies. Uses `node:sqlite`. Metadata only, no document text (ADR 0004). |
| `@anvesx/query-router` | `features/query-router` | Published | No runtime dependencies. |
| `@anvesx/rank` | `features/rank` | Published | No runtime dependencies. Uses `node:sqlite`. The term-hash key is supplied by the caller and never stored. |
| `@anvesx/zone-policy` | `features/zone-policy` | Published | No runtime dependencies. |
| `@anvesx/graph-sync` | `services/graph-sync` | Published | Depends on `connector-kit`, `core-types` and `graph-store`, all published above. It is a library; it reads no env vars and holds no credentials. |
| `apps/brain`, `apps/connections` | `apps/` | Private | Deployable apps, out of scope. |
| `tools/*` | `tools/` | Private | Repo tooling, out of scope. |

Publish order is dependency order. `changeset publish` handles it: `core-types`, then `connector-kit`, `change-cursor` and `graph-store`, then `graph-sync`.

`graph-store`, `rank` and `graph-sync` need Node 22.5 or newer for `node:sqlite`.

## Install

Point the scope at the registry once, in the consumer's `.npmrc`:

```
@anvesx:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

GitHub Packages asks for a token with `read:packages` even for public packages. Then:

```
pnpm add @anvesx/core-types @anvesx/connector-kit @anvesx/graph-store
```

## Versioning with Changesets

1. Add a changeset with your change: `pnpm changeset`. Pick the packages and the bump (patch, minor, major).
2. When releasing, run `pnpm changeset version` and commit the version bumps and changelogs. Internal dependents get a patch bump (`updateInternalDependencies`).
3. Merge to `main`. `.github/workflows/release.yml` builds the eight packages, runs `pnpm release` (`changeset publish`), and confirms each one is on the registry. Only versions not yet on the registry are published.

CI publishes with `GITHUB_TOKEN`. No personal token is stored in the repo.

## Adding a package

Set `publishConfig` (registry and `access: public`), `files: ["dist"]`, `license`, `repository` with `directory`, and `prepack: pnpm run build` in its `package.json`. Add it to the `--filter` list and the confirm loop in `release.yml`, and to the table above.

## Not covered

Provenance attestations, per-package LICENSE files in the tarballs, and publishing from forks.
