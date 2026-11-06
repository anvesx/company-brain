// better-auth lists vitest as an optional peer (for its test helpers). pnpm links the workspace root's
// vitest into it, which marks vitest, chai and rolldown as production packages in the lockfile.
// This package never imports better-auth's test helpers, so the peer is dropped to keep them dev-only.
module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.name === "better-auth" || pkg.name.startsWith("@better-auth/")) {
        delete pkg.peerDependencies?.vitest;
        delete pkg.peerDependenciesMeta?.vitest;
      }
      return pkg;
    },
  },
};
