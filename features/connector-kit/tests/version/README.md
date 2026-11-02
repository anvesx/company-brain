# version

`folder-version.test.ts`: the folder connector's document version still changes on a same-size
edit whose mtime was restored, so sync never skips a document whose content changed.
