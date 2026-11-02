# Filesystem traversal

`walk.ts` discovers immediate workspace packages and recursively enumerates real directories. It
does not follow symbolic links or mutate the scanned tree.

- `findPackages`: packages directly under the tier folders.
- `lintDirectories` and `codeFiles`: the recursive walk over `src`, `tests`, `bin` and `scripts`;
  code files are `.ts .mjs .cjs .js .css .html`.
- `filesIn`: the files of one folder, used for fanout and the denominators.
- `dataOnly`: the narrow README exemption for folders made purely of `.json` files.
