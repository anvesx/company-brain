# spend

`spend.test.ts`: the two `scanTitles` fields a caller uses to spend one candidate budget over several calls,
on SQLite and Postgres. `examined` is how many candidates a call looked at; `cursors[i]` resumes right after
`nodes[i]`, so a caller that keeps only part of a page loses no rows.
