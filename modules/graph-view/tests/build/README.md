# tests/build

Guards the build step that copies the browser scripts (`src/page/script`) into `dist/page/script`.

`dist.test.ts` runs `pnpm run copy:page` twice and checks that the copy is idempotent: no nested
`script/script` folder appears, and every file in `dist` is byte-for-byte the file in `src`.
